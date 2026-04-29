<?php
declare(strict_types=1);

namespace App\EventListener;

use App\Entity\Ticket;
use App\Entity\User;
use App\Repository\TicketRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

/**
 * Při neošetřené výjimce (HTTP 5xx) automaticky založí nebo zvedne counter
 * existujícího ticketu (`source = AUTO_ERROR_LOG`). Deduplikace přes hash
 * z (class + message + první 3 stack frames).
 *
 * Aktivní jen v `prod` env — v dev má developer plnou stack trace v profileru.
 * 4xx výjimky se ignorují (špatný request klienta, ne bug).
 */
#[AsEventListener(event: ExceptionEvent::class, priority: -100)]
class ErrorTicketListener
{
    public function __construct(
        private readonly TicketRepository $ticketRepo,
        private readonly EntityManagerInterface $em,
        private readonly Security $security,
        private readonly LoggerInterface $logger,
        private readonly string $appEnv,
    ) {}

    public function __invoke(ExceptionEvent $event): void
    {
        // Jen prod — v dev to jen ruší.
        if ($this->appEnv !== 'prod') {
            return;
        }

        $exception = $event->getThrowable();

        // Odhadni HTTP status — 4xx ignoruj, 5xx tiketuj.
        $status = 500;
        if ($exception instanceof HttpExceptionInterface) {
            $status = $exception->getStatusCode();
        }
        if ($status < 500) {
            return;
        }

        // Vlastní výjimky z TicketControlleru ne — předešel by se rekurzivní zápis.
        $request = $event->getRequest();
        $url = (string) $request->getRequestUri();
        if (str_starts_with($url, '/api/tickets')) {
            return;
        }

        try {
            $hash = $this->buildHash($exception);
            $existing = $this->ticketRepo->findByErrorHash($hash);

            if ($existing !== null) {
                $existing->incrementOccurrence();
                // Pokud už byl resolved a chyba se zase objevila, otevři.
                if (in_array($existing->getStatus(), [Ticket::STATUS_RESOLVED, Ticket::STATUS_CLOSED], true)) {
                    $existing->setStatus(Ticket::STATUS_OPEN);
                }
                $this->em->flush();
                return;
            }

            $t = new Ticket();
            $t->setSource(Ticket::SOURCE_AUTO);
            $t->setType(Ticket::TYPE_BUG);
            $t->setPriority($status >= 503 ? Ticket::PRIORITY_HIGH : Ticket::PRIORITY_NORMAL);
            $t->setTitle($this->buildTitle($exception));
            $t->setDescription($this->buildDescription($exception, $request));
            $t->setErrorHash($hash);
            $t->setErrorClass(get_class($exception));
            $t->setStackTrace($this->truncate($exception->getTraceAsString(), 8000));
            $t->setRequestUrl($this->truncate($url, 500));
            $t->setHttpStatus($status);
            $t->setLastOccurrenceAt(new \DateTime());

            $user = $this->security->getUser();
            if ($user instanceof User) {
                $t->setCreatedBy($user);
            }

            $this->em->persist($t);
            $this->em->flush();
        } catch (\Throwable $e) {
            // Listener nesmí nikdy přebít původní výjimku.
            $this->logger->warning('ErrorTicketListener selhal: ' . $e->getMessage(), ['exception' => $e]);
        }
    }

    private function buildHash(\Throwable $e): string
    {
        $frames = [];
        foreach (array_slice($e->getTrace(), 0, 3) as $f) {
            $frames[] = ($f['class'] ?? '') . '::' . ($f['function'] ?? '') . '@' . ($f['file'] ?? '') . ':' . ($f['line'] ?? '');
        }
        $key = get_class($e) . '|' . $e->getMessage() . '|' . implode('|', $frames);
        return substr(md5($key), 0, 64);
    }

    private function buildTitle(\Throwable $e): string
    {
        $short = (new \ReflectionClass($e))->getShortName();
        $msg = $this->truncate($e->getMessage(), 180);
        return sprintf('[%s] %s', $short, $msg);
    }

    private function buildDescription(\Throwable $e, $request): string
    {
        $lines = [];
        $lines[] = '**' . get_class($e) . '**';
        $lines[] = '';
        $lines[] = $e->getMessage();
        $lines[] = '';
        $lines[] = '— Detail —';
        $lines[] = '- File: ' . $e->getFile() . ':' . $e->getLine();
        $lines[] = '- Method: ' . $request->getMethod();
        $lines[] = '- URL: ' . $request->getRequestUri();
        $lines[] = '- IP: ' . ($request->getClientIp() ?? '?');
        return implode("\n", $lines);
    }

    private function truncate(string $value, int $max): string
    {
        if (mb_strlen($value) <= $max) return $value;
        return mb_substr($value, 0, $max - 3) . '...';
    }
}
