<?php

namespace App\Repository;

use App\Entity\Reservation;
use App\Entity\ReservationFoods;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class ReservationRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Reservation::class);
    }

    public function getReservationDetail(int $reservationId): ?array
    {
        $qb = $this->getEntityManager()->createQueryBuilder();

        $qb->select('r', 'p', 'f')
            ->from(Reservation::class, 'r')
            ->leftJoin('r.persons', 'p')
            // menu nyní obsahuje ID na reservation_foods.id (dříve mohl být název)
            ->leftJoin(ReservationFoods::class, 'f', 'WITH', 'p.menu = f.id')
            ->where('r.id = :reservationId')
            ->setParameter('reservationId', $reservationId);

        return $qb->getQuery()->getOneOrNullResult(\Doctrine\ORM\Query::HYDRATE_ARRAY);
    }

    // Přidejte vlastní metody dotazů, např. hledání rezervací podle kontaktu, data apod.
}