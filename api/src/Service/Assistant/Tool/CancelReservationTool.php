<?php

declare(strict_types=1);

namespace App\Service\Assistant\Tool;

use App\Entity\Reservation;
use Doctrine\ORM\EntityManagerInterface;

final class CancelReservationTool implements ToolInterface
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    public function getName(): string { return 'cancel_reservation'; }
    public function getDescription(): string
    {
        return 'Označí rezervaci jako zrušenou (status CANCELLED). Vyžaduje potvrzení.';
    }

    public function getParametersSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'reservationId' => ['type' => 'integer'],
                'reason' => ['type' => 'string', 'description' => 'Důvod zrušení (uloží se do poznámky).'],
            ],
            'required' => ['reservationId'],
        ];
    }

    public function isReadOnly(): bool { return false; }
    public function getRequiredPermission(): ?string { return 'reservations.update'; }

    public function execute(array $params): array
    {
        $id = (int)($params['reservationId'] ?? 0);
        /** @var Reservation|null $r */
        $r = $this->em->getRepository(Reservation::class)->find($id);
        if (!$r) throw new \InvalidArgumentException('Rezervace nenalezena.');
        if ($r->getStatus() === 'CANCELLED') {
            return ['id' => $id, 'message' => 'Rezervace už je zrušená.', 'link' => '/reservations/'.$id.'/edit'];
        }

        $r->setStatus('CANCELLED');
        $reason = trim((string)($params['reason'] ?? ''));
        if ($reason !== '') {
            $old = $r->getContactNote() ?? '';
            $stamp = date('d.m.Y H:i');
            $r->setContactNote(trim($old."\n[$stamp] Zrušeno: $reason"));
        }
        $this->em->flush();

        return [
            'id' => $id,
            'link' => '/reservations/'.$id.'/edit',
            'message' => 'Rezervace zrušena.',
        ];
    }

    public function buildPreview(array $params): ?string
    {
        $id = (int)($params['reservationId'] ?? 0);
        /** @var Reservation|null $r */
        $r = $this->em->getRepository(Reservation::class)->find($id);
        $who = $r?->getContactName() ?? "#$id";
        $date = $r?->getDate()?->format('Y-m-d') ?? '?';
        $reason = (string)($params['reason'] ?? '');
        return "Zrušit rezervaci: $who / $date".($reason ? " (důvod: $reason)" : '');
    }
}
