<?php
declare(strict_types=1);

namespace App\Controller;

use App\Entity\Ticket;
use App\Entity\TicketAttachment;
use App\Entity\TicketComment;
use App\Entity\User;
use App\Repository\TicketAttachmentRepository;
use App\Repository\TicketCommentRepository;
use App\Repository\TicketRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Tickety / TODO list pro hlášení chyb v systému.
 *
 * Routes:
 *   GET    /api/tickets                                     — list (filter)
 *   POST   /api/tickets                                     — create
 *   GET    /api/tickets/counts                              — počty per status
 *   GET    /api/tickets/{id}                                — detail (vč. comments + attachments)
 *   PUT    /api/tickets/{id}                                — update
 *   DELETE /api/tickets/{id}                                — delete
 *   POST   /api/tickets/{id}/comments                       — add comment
 *   DELETE /api/tickets/{id}/comments/{cid}                 — delete comment
 *   POST   /api/tickets/{id}/attachments                    — multipart upload (file/blob)
 *   GET    /api/tickets/{id}/attachments/{aid}              — download (auth-protected)
 *   DELETE /api/tickets/{id}/attachments/{aid}              — delete attachment
 */
#[Route('/api/tickets')]
class TicketController extends AbstractController
{
    public function __construct(
        private readonly TicketRepository $ticketRepo,
        private readonly TicketCommentRepository $commentRepo,
        private readonly TicketAttachmentRepository $attachmentRepo,
        private readonly UserRepository $userRepo,
        private readonly EntityManagerInterface $em,
        private readonly Security $security,
        #[Autowire('%kernel.project_dir%')]
        private readonly string $projectDir,
    ) {}

    // ── List + counts ────────────────────────────────────────────

    #[Route('', methods: ['GET'])]
    #[IsGranted('tickets.read')]
    public function list(Request $request): JsonResponse
    {
        $filters = [];
        foreach (['status', 'priority', 'type', 'source'] as $key) {
            $val = $request->query->all()[$key] ?? null;
            if ($val !== null && $val !== '') {
                $filters[$key] = is_array($val) ? $val : [$val];
            }
        }
        if ($request->query->getBoolean('assignedToMe')) {
            $user = $this->security->getUser();
            $userId = method_exists($user, 'getId') ? (int)$user->getId() : null;
            if ($userId) $filters['assignedToId'] = $userId;
        }
        if ($s = $request->query->get('search')) {
            $filters['search'] = (string)$s;
        }

        $tickets = $this->ticketRepo->findFiltered($filters);
        return $this->json(array_map(fn(Ticket $t) => $this->serializeListItem($t), $tickets));
    }

    #[Route('/counts', methods: ['GET'])]
    #[IsGranted('tickets.read')]
    public function counts(): JsonResponse
    {
        return $this->json($this->ticketRepo->getCounts());
    }

    #[Route('/{id}', methods: ['GET'], requirements: ['id' => '\d+'])]
    #[IsGranted('tickets.read')]
    public function detail(int $id): JsonResponse
    {
        $t = $this->ticketRepo->find($id);
        if (!$t) return $this->json(['error' => 'Nenalezeno'], Response::HTTP_NOT_FOUND);
        return $this->json($this->serializeDetail($t));
    }

    // ── Create / Update / Delete ─────────────────────────────────

    #[Route('', methods: ['POST'])]
    #[IsGranted('tickets.create')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $title = trim((string)($data['title'] ?? ''));
        if ($title === '') {
            return $this->json(['error' => 'Title je povinný'], Response::HTTP_BAD_REQUEST);
        }

        $t = new Ticket();
        $t->setTitle($title);
        $this->applyMutableFields($t, $data);
        $t->setCreatedBy($this->currentUser());
        $this->em->persist($t);
        $this->em->flush();

        return $this->json($this->serializeDetail($t), Response::HTTP_CREATED);
    }

    #[Route('/{id}', methods: ['PUT', 'PATCH'], requirements: ['id' => '\d+'])]
    #[IsGranted('tickets.update')]
    public function update(int $id, Request $request): JsonResponse
    {
        $t = $this->ticketRepo->find($id);
        if (!$t) return $this->json(['error' => 'Nenalezeno'], Response::HTTP_NOT_FOUND);

        $data = json_decode($request->getContent(), true) ?? [];
        if (array_key_exists('title', $data)) {
            $title = trim((string)$data['title']);
            if ($title !== '') $t->setTitle($title);
        }
        $this->applyMutableFields($t, $data);
        $this->em->flush();

        return $this->json($this->serializeDetail($t));
    }

    #[Route('/{id}', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    #[IsGranted('tickets.delete')]
    public function delete(int $id): JsonResponse
    {
        $t = $this->ticketRepo->find($id);
        if (!$t) return $this->json(['status' => 'gone']);
        // Smaž i fyzické soubory attachmentů.
        foreach ($t->getAttachments() as $a) {
            $this->deletePhysicalFile($a);
        }
        $this->em->remove($t);
        $this->em->flush();
        return $this->json(['status' => 'deleted']);
    }

    // ── Comments ─────────────────────────────────────────────────

    #[Route('/{id}/comments', methods: ['POST'], requirements: ['id' => '\d+'])]
    #[IsGranted('tickets.comment')]
    public function addComment(int $id, Request $request): JsonResponse
    {
        $t = $this->ticketRepo->find($id);
        if (!$t) return $this->json(['error' => 'Ticket nenalezen'], Response::HTTP_NOT_FOUND);

        $data = json_decode($request->getContent(), true) ?? [];
        $content = trim((string)($data['content'] ?? ''));
        if ($content === '') {
            return $this->json(['error' => 'Obsah je povinný'], Response::HTTP_BAD_REQUEST);
        }

        $c = new TicketComment();
        $c->setTicket($t);
        $c->setAuthor($this->currentUser());
        $c->setContent($content);
        $c->setIsInternal((bool)($data['isInternal'] ?? false));
        $this->em->persist($c);

        // Auto-status pokud byl ticket WAITING_FOR_INFO a komentář dal
        // creator (= upřesnil), překlop na OPEN, ať dev zase má notifikaci.
        $author = $this->currentUser();
        if ($t->getStatus() === Ticket::STATUS_WAITING && $author && $t->getCreatedBy() === $author) {
            $t->setStatus(Ticket::STATUS_OPEN);
        }
        $t->onPreUpdate();

        $this->em->flush();

        return $this->json($this->serializeComment($c), Response::HTTP_CREATED);
    }

    #[Route('/{id}/comments/{cid}', methods: ['DELETE'], requirements: ['id' => '\d+', 'cid' => '\d+'])]
    #[IsGranted('tickets.update')]
    public function deleteComment(int $id, int $cid): JsonResponse
    {
        $c = $this->commentRepo->find($cid);
        if (!$c || $c->getTicket()->getId() !== $id) {
            return $this->json(['status' => 'gone']);
        }
        $this->em->remove($c);
        $this->em->flush();
        return $this->json(['status' => 'deleted']);
    }

    // ── Attachments ──────────────────────────────────────────────

    #[Route('/{id}/attachments', methods: ['POST'], requirements: ['id' => '\d+'])]
    #[IsGranted('tickets.create')]
    public function uploadAttachment(int $id, Request $request): JsonResponse
    {
        $t = $this->ticketRepo->find($id);
        if (!$t) return $this->json(['error' => 'Ticket nenalezen'], Response::HTTP_NOT_FOUND);

        /** @var UploadedFile|null $file */
        $file = $request->files->get('file');

        // Detailní diagnostika — typicky to bývá překročení PHP upload limitů
        // (`upload_max_filesize`, `post_max_size`), ne chyba klienta.
        if (!$file instanceof UploadedFile) {
            $postMax = ini_get('post_max_size') ?: '?';
            $uploadMax = ini_get('upload_max_filesize') ?: '?';
            $contentLength = $request->server->get('CONTENT_LENGTH');
            $hint = $contentLength === null
                ? 'Pole "file" v requestu chybí (ověř Content-Type: multipart/form-data + boundary).'
                : "Request body má " . (int)$contentLength . " B, ale PHP limity: post_max_size={$postMax}, upload_max_filesize={$uploadMax}. Zvyš je v php.ini / php-fpm.";
            return $this->json([
                'error' => 'Soubor se nedostal na server',
                'hint' => $hint,
            ], Response::HTTP_BAD_REQUEST);
        }
        if (!$file->isValid()) {
            return $this->json([
                'error' => 'Upload selhal',
                'hint' => $file->getErrorMessage(),
                'errorCode' => $file->getError(),
            ], Response::HTTP_BAD_REQUEST);
        }
        if ($file->getSize() === 0) {
            return $this->json([
                'error' => 'Soubor má 0 B',
                'hint' => 'Multipart upload se nerozparsoval správně. Ověř, že frontend NEnastavuje vlastní Content-Type header (axios doplní boundary sám).',
            ], Response::HTTP_BAD_REQUEST);
        }
        if ($file->getSize() > 20 * 1024 * 1024) {
            return $this->json(['error' => 'Soubor je větší než 20 MB'], Response::HTTP_BAD_REQUEST);
        }

        $storageDir = $this->getStorageDir();
        if (!is_dir($storageDir) && !mkdir($storageDir, 0o775, true) && !is_dir($storageDir)) {
            return $this->json([
                'error' => 'Storage dir nelze vytvořit',
                'hint' => "Cesta {$storageDir} — webserver nemá write rights na parent. Vytvoř ručně: mkdir -p var/uploads/tickets && chmod 775 var/uploads/tickets",
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
        if (!is_writable($storageDir)) {
            return $this->json([
                'error' => 'Storage dir není zapsatelný',
                'hint' => "Cesta {$storageDir} existuje, ale webserver tam nemůže psát. chmod 775 + správný owner (typicky www-data).",
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        $original = $file->getClientOriginalName() ?: 'screenshot.png';
        $extension = $file->getClientOriginalExtension();
        if ($extension === '') {
            $mime = $file->getMimeType() ?? 'application/octet-stream';
            $extension = match ($mime) {
                'image/png' => 'png',
                'image/jpeg' => 'jpg',
                'image/gif' => 'gif',
                'image/webp' => 'webp',
                default => 'bin',
            };
        }
        $stored = sprintf('ticket-%d-%s.%s', $id, bin2hex(random_bytes(8)), $extension);

        try {
            $file->move($storageDir, $stored);
        } catch (\Throwable $e) {
            return $this->json([
                'error' => 'File move selhal',
                'hint' => $e->getMessage(),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        // Ověř, že po move zůstal soubor neprázdný — pokud ne, smaž a vrať error.
        // Bez tohoto by se v DB vytvořil "duch attachmentu" se sizeBytes=0 a v UI
        // by skončil prázdným obrázkem (přesně jako popisuje aktuální bug report).
        $movedPath = $storageDir . DIRECTORY_SEPARATOR . $stored;
        $finalSize = is_file($movedPath) ? (int)filesize($movedPath) : 0;
        if ($finalSize === 0) {
            @unlink($movedPath);
            return $this->json([
                'error' => 'Soubor se uložil ale je prázdný',
                'hint' => 'Možná disk space nebo permission issue. Cesta: ' . $storageDir,
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        $a = new TicketAttachment();
        $a->setTicket($t);
        if ($commentId = $request->request->get('commentId')) {
            $c = $this->commentRepo->find((int)$commentId);
            if ($c && $c->getTicket()->getId() === $id) {
                $a->setComment($c);
            }
        }
        $a->setUploadedBy($this->currentUser());
        $a->setFilename($original);
        $a->setMimeType($file->getClientMimeType() ?: 'application/octet-stream');
        $a->setSizeBytes($finalSize);
        $a->setStoragePath($stored);

        $this->em->persist($a);
        $t->onPreUpdate();
        $this->em->flush();

        return $this->json($this->serializeAttachment($a), Response::HTTP_CREATED);
    }

    #[Route('/{id}/attachments/{aid}', methods: ['GET'], requirements: ['id' => '\d+', 'aid' => '\d+'])]
    #[IsGranted('tickets.read')]
    public function downloadAttachment(int $id, int $aid): Response
    {
        $a = $this->attachmentRepo->find($aid);
        if (!$a || $a->getTicket()->getId() !== $id) {
            return new Response('Not found', Response::HTTP_NOT_FOUND);
        }
        $path = $this->getStorageDir() . DIRECTORY_SEPARATOR . $a->getStoragePath();
        if (!is_file($path)) {
            return new Response('File missing on disk', Response::HTTP_NOT_FOUND);
        }
        $disposition = str_starts_with($a->getMimeType(), 'image/')
            ? ResponseHeaderBag::DISPOSITION_INLINE
            : ResponseHeaderBag::DISPOSITION_ATTACHMENT;
        $response = new BinaryFileResponse($path);
        $response->headers->set('Content-Type', $a->getMimeType());
        $response->setContentDisposition($disposition, $a->getFilename());
        return $response;
    }

    #[Route('/{id}/attachments/{aid}', methods: ['DELETE'], requirements: ['id' => '\d+', 'aid' => '\d+'])]
    #[IsGranted('tickets.update')]
    public function deleteAttachment(int $id, int $aid): JsonResponse
    {
        $a = $this->attachmentRepo->find($aid);
        if (!$a || $a->getTicket()->getId() !== $id) {
            return $this->json(['status' => 'gone']);
        }
        $this->deletePhysicalFile($a);
        $this->em->remove($a);
        $this->em->flush();
        return $this->json(['status' => 'deleted']);
    }

    // ── Helpers ──────────────────────────────────────────────────

    private function applyMutableFields(Ticket $t, array $data): void
    {
        if (array_key_exists('description', $data)) {
            $t->setDescription(is_string($data['description']) && trim($data['description']) !== '' ? $data['description'] : null);
        }
        if (array_key_exists('status', $data)) {
            $t->setStatus($this->normalizeEnum((string)$data['status'], Ticket::STATUS_OPEN, [
                Ticket::STATUS_OPEN, Ticket::STATUS_IN_PROGRESS, Ticket::STATUS_WAITING,
                Ticket::STATUS_RESOLVED, Ticket::STATUS_CLOSED, Ticket::STATUS_WONTFIX,
            ]));
        }
        if (array_key_exists('priority', $data)) {
            $t->setPriority($this->normalizeEnum((string)$data['priority'], Ticket::PRIORITY_NORMAL, [
                Ticket::PRIORITY_LOW, Ticket::PRIORITY_NORMAL, Ticket::PRIORITY_HIGH, Ticket::PRIORITY_CRITICAL,
            ]));
        }
        if (array_key_exists('type', $data)) {
            $t->setType($this->normalizeEnum((string)$data['type'], Ticket::TYPE_BUG, [
                Ticket::TYPE_BUG, Ticket::TYPE_FEATURE, Ticket::TYPE_QUESTION, Ticket::TYPE_IMPROVEMENT,
            ]));
        }
        if (array_key_exists('module', $data)) {
            $val = $data['module'];
            $t->setModule(is_string($val) && trim($val) !== '' ? $val : null);
        }
        if (array_key_exists('assignedToId', $data)) {
            $val = $data['assignedToId'];
            $assignee = ($val === null || $val === '') ? null : $this->userRepo->find((int)$val);
            $t->setAssignedTo($assignee);
        }
    }

    private function normalizeEnum(string $value, string $default, array $allowed): string
    {
        $upper = strtoupper($value);
        return in_array($upper, $allowed, true) ? $upper : $default;
    }

    private function currentUser(): ?User
    {
        $u = $this->security->getUser();
        return $u instanceof User ? $u : null;
    }

    private function serializeListItem(Ticket $t): array
    {
        return [
            'id' => $t->getId(),
            'title' => $t->getTitle(),
            'status' => $t->getStatus(),
            'priority' => $t->getPriority(),
            'type' => $t->getType(),
            'source' => $t->getSource(),
            'module' => $t->getModule(),
            'createdBy' => $this->serializeUser($t->getCreatedBy()),
            'assignedTo' => $this->serializeUser($t->getAssignedTo()),
            'createdAt' => $t->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'updatedAt' => $t->getUpdatedAt()->format(\DateTimeInterface::ATOM),
            'resolvedAt' => $t->getResolvedAt()?->format(\DateTimeInterface::ATOM),
            'commentCount' => $t->getComments()->count(),
            'attachmentCount' => $t->getAttachments()->count(),
            'occurrenceCount' => $t->getOccurrenceCount(),
            'lastOccurrenceAt' => $t->getLastOccurrenceAt()?->format(\DateTimeInterface::ATOM),
        ];
    }

    private function serializeDetail(Ticket $t): array
    {
        $base = $this->serializeListItem($t);
        return array_merge($base, [
            'description' => $t->getDescription(),
            'errorClass' => $t->getErrorClass(),
            'stackTrace' => $t->getStackTrace(),
            'requestUrl' => $t->getRequestUrl(),
            'httpStatus' => $t->getHttpStatus(),
            'comments' => array_map(fn(TicketComment $c) => $this->serializeComment($c), $t->getComments()->toArray()),
            'attachments' => array_map(fn(TicketAttachment $a) => $this->serializeAttachment($a), $t->getAttachments()->toArray()),
        ]);
    }

    private function serializeComment(TicketComment $c): array
    {
        return [
            'id' => $c->getId(),
            'content' => $c->getContent(),
            'isInternal' => $c->isInternal(),
            'author' => $this->serializeUser($c->getAuthor()),
            'createdAt' => $c->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }

    private function serializeAttachment(TicketAttachment $a): array
    {
        return [
            'id' => $a->getId(),
            'filename' => $a->getFilename(),
            'mimeType' => $a->getMimeType(),
            'sizeBytes' => $a->getSizeBytes(),
            'isImage' => $a->isImage(),
            'commentId' => $a->getComment()?->getId(),
            'uploadedBy' => $this->serializeUser($a->getUploadedBy()),
            'createdAt' => $a->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'url' => sprintf('/api/tickets/%d/attachments/%d', $a->getTicket()->getId(), $a->getId()),
        ];
    }

    private function serializeUser(?User $u): ?array
    {
        if (!$u) return null;
        $name = method_exists($u, 'getUsername') ? $u->getUsername() : null;
        $email = method_exists($u, 'getEmail') ? $u->getEmail() : null;
        return [
            'id' => method_exists($u, 'getId') ? $u->getId() : null,
            'username' => $name,
            'email' => $email,
        ];
    }

    private function getStorageDir(): string
    {
        return $this->projectDir . '/var/uploads/tickets';
    }

    private function deletePhysicalFile(TicketAttachment $a): void
    {
        $path = $this->getStorageDir() . DIRECTORY_SEPARATOR . $a->getStoragePath();
        if (is_file($path)) @unlink($path);
    }
}
