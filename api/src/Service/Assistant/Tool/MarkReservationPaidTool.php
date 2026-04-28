<?php

declare(strict_types=1);

namespace App\Service\Assistant\Tool;

use App\Entity\Reservation;
use App\Service\ReservationPaymentService;
use Doctrine\ORM\EntityManagerInterface;

final class MarkReservationPaidTool implements ToolInterface
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ReservationPaymentService $payments,
    ) {}

    public function getName(): string { return 'mark_reservation_paid'; }
    public function getDescription(): string
    {
        return 'Označí rezervaci jako zaplacenou (např. hotovost přímo na místě). Vyžaduje potvrzení.';
    }

    public function getParametersSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'reservationId' => ['type' => 'integer'],
                'amount' => ['type' => 'number', 'description' => 'Částka. Pokud chybí, doplatí zbytek do plné ceny.'],
                'paymentMethod' => ['type' => 'string', 'description' => 'CASH, BANK_TRANSFER, CARD, COMGATE, OTHER.'],
                'note' => ['type' => 'string'],
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

        $amount = isset($params['amount']) ? (float)$params['amount'] : null;
        $method = (string)($params['paymentMethod'] ?? 'CASH');
        $note = (string)($params['note'] ?? '');

        $this->payments->markAsPaid($r, $amount, $method, $note !== '' ? $note : null);

        return [
            'id' => $id,
            'link' => '/reservations/'.$id.'/edit',
            'message' => 'Rezervace označena jako zaplacená.',
        ];
    }

    public function buildPreview(array $params): ?string
    {
        $id = (int)($params['reservationId'] ?? 0);
        /** @var Reservation|null $r */
        $r = $this->em->getRepository(Reservation::class)->find($id);
        $who = $r?->getContactName() ?? "#$id";
        $amount = isset($params['amount']) ? number_format((float)$params['amount'], 0, ',', ' ').' Kč' : 'zbývající částka';
        $method = (string)($params['paymentMethod'] ?? 'CASH');
        return "Označit jako zaplaceno: $who / $amount / způsob: $method";
    }
}
