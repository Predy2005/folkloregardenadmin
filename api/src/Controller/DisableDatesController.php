<?php

namespace App\Controller;

use App\Entity\DisabledDates;
use App\Repository\DisabledDatesRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/disable-dates')]
class DisableDatesController extends AbstractController
{
    #[Route('', name: 'disable_dates_list', methods: ['GET'])]
    #[IsGranted('disabled_dates.read')]
    public function list(DisabledDatesRepository $repository, \App\Repository\ReservationRepository $reservationRepository): JsonResponse
    {
        $disabledDates = $repository->findAll();

        // Get reservations with statuses that should block the date (e.g., PAID or CONFIRMED)
//        $activeReservations = $reservationRepository->createQueryBuilder('r')
//            ->where('r.status IN (:statuses)')
//            ->setParameter('statuses', ['PAID', 'CONFIRMED'])
//            ->getQuery()
//            ->getResult();
//
//        foreach ($activeReservations as $reservation) {
//            $disabledDate = new \App\Entity\DisabledDates();
//            $disabledDate->setDateFrom($reservation->getDate());
//            $disabledDate->setDateTo(null);
//            $disabledDate->setReason('Rezervace ID ' . $reservation->getId());
//            $disabledDate->setProject('reservations');
//            $disabledDates[] = $disabledDate;
//        }

        return $this->json($disabledDates);
    }

    #[Route('', name: 'disable_dates_create', methods: ['POST'])]
    #[IsGranted('disabled_dates.create')]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $disableDate = new DisabledDates();

        if (isset($data['date'])) {
            // Pokud je zadán pouze jeden den, nastavíme pouze dateFrom
            $disableDate->setDateFrom(new \DateTime($data['date']));
            $disableDate->setDateTo(null);
        } elseif (isset($data['dateFrom'])) {
            // Pokud jsou zadány interval data, nastavíme dateFrom a dateTo
            $disableDate->setDateFrom(new \DateTime($data['dateFrom']));
            $disableDate->setDateTo(isset($data['dateTo']) ? new \DateTime($data['dateTo']) : null);
        } else {
            return new JsonResponse(['error' => 'Datum není zadáno'], JsonResponse::HTTP_BAD_REQUEST);
        }

        $disableDate->setReason($data['reason'] ?? null);
        $disableDate->setProject($data['project'] ?? null);

        $em->persist($disableDate);
        $em->flush();

        return $this->json(['status' => 'created', 'id' => $disableDate->getId()]);
    }

    #[Route('/{id}', name: 'disable_dates_edit', methods: ['PUT'])]
    #[IsGranted('disabled_dates.update')]
    public function edit(int $id, Request $request, DisabledDatesRepository $repository, EntityManagerInterface $em): JsonResponse
    {
        $disableDate = $repository->find($id);
        if (!$disableDate) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $data = json_decode($request->getContent(), true);

        if (isset($data['date'])) $disableDate->setDate(new \DateTime($data['date']));
        if (isset($data['reason'])) $disableDate->setReason($data['reason']);
        if (isset($data['dateTo'])) $disableDate->setDateTo(new \DateTime($data['dateTo']));
        if (isset($data['project'])) $disableDate->setProject($data['project']);

        $em->flush();

        return $this->json(['status' => 'updated']);
    }

    #[Route('/{id}', name: 'disable_dates_delete', methods: ['DELETE'])]
    #[IsGranted('disabled_dates.delete')]
    public function delete(int $id, DisabledDatesRepository $repository, EntityManagerInterface $em): JsonResponse
    {
        $disableDate = $repository->find($id);
        if (!$disableDate) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $em->remove($disableDate);
        $em->flush();

        return $this->json(['status' => 'deleted']);
    }
}