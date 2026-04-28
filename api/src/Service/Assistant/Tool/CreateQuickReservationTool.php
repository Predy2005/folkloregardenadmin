<?php

declare(strict_types=1);

namespace App\Service\Assistant\Tool;

use App\Entity\Reservation;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Minimální rezervace: jméno, datum, telefon/email, počet osob, poznámka.
 * Detaily (osoby, jídlo, doprava) se doplní v editoru.
 */
final class CreateQuickReservationTool implements ToolInterface
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    public function getName(): string { return 'create_quick_reservation'; }
    public function getDescription(): string
    {
        return 'Založí rychlou rezervaci s minimem údajů (jméno, datum, kontakt, počet osob). Po vytvoření uživatel doplní detaily v editoru. VŽDY vyžaduje potvrzení.';
    }

    public function getParametersSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'name' => ['type' => 'string', 'description' => 'Jméno kontaktu.'],
                'date' => ['type' => 'string', 'description' => 'YYYY-MM-DD.'],
                'phone' => ['type' => 'string'],
                'email' => ['type' => 'string'],
                'persons' => ['type' => 'integer', 'description' => 'Počet osob (výchozí 1).'],
                'nationality' => ['type' => 'string', 'description' => 'Národnost (CZ, EN, DE, ...).'],
                'note' => ['type' => 'string'],
            ],
            'required' => ['name', 'date'],
        ];
    }

    public function isReadOnly(): bool { return false; }
    public function getRequiredPermission(): ?string { return 'reservations.create'; }

    public function execute(array $params): array
    {
        $name = trim((string)($params['name'] ?? ''));
        $dateStr = (string)($params['date'] ?? '');
        if ($name === '' || $dateStr === '') {
            throw new \InvalidArgumentException('Jméno a datum jsou povinné.');
        }
        try {
            $date = new \DateTime($dateStr);
        } catch (\Throwable) {
            throw new \InvalidArgumentException('Neplatný formát data. Použij YYYY-MM-DD.');
        }

        $r = new Reservation();
        $r->setContactName($name);
        $r->setDate($date);
        $r->setStatus('RECEIVED');
        $r->setContactEmail((string)($params['email'] ?? ''));
        $r->setContactPhone((string)($params['phone'] ?? ''));
        $r->setContactNationality((string)($params['nationality'] ?? 'CZ'));
        $note = (string)($params['note'] ?? '');
        $persons = max(1, (int)($params['persons'] ?? 1));
        $persons > 1 and $note = trim($note."\nPočet osob z AI: $persons");
        $r->setContactNote($note !== '' ? $note : null);

        $this->em->persist($r);
        $this->em->flush();

        return [
            'id' => $r->getId(),
            'link' => '/reservations/'.$r->getId().'/edit',
            'message' => 'Rezervace založena. Doplň osoby, jídla a platbu v editoru.',
        ];
    }

    public function buildPreview(array $params): ?string
    {
        $name = (string)($params['name'] ?? '?');
        $date = (string)($params['date'] ?? '?');
        $persons = (int)($params['persons'] ?? 1);
        $contact = (string)($params['phone'] ?? $params['email'] ?? '');
        return sprintf('Založit rezervaci: %s | %s | %d os.%s', $name, $date, $persons, $contact ? ' | '.$contact : '');
    }
}
