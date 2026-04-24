<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\RefreshToken;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<RefreshToken>
 */
class RefreshTokenRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, RefreshToken::class);
    }

    public function findByToken(string $token): ?RefreshToken
    {
        return $this->findOneBy(['token' => $token]);
    }

    /**
     * Vymaže expirované i odvolané tokeny starší než 30 dní (cron hygiena).
     */
    public function purgeExpired(\DateTimeInterface $olderThan): int
    {
        return $this->createQueryBuilder('t')
            ->delete()
            ->where('t.expiresAt < :cutoff OR t.revokedAt < :cutoff')
            ->setParameter('cutoff', $olderThan)
            ->getQuery()
            ->execute();
    }

    /**
     * Zneplatní všechny aktivní refresh tokeny uživatele
     * (např. při revokaci mobilního účtu nebo reset hesla).
     */
    public function revokeAllForUser(User $user): int
    {
        return $this->createQueryBuilder('t')
            ->update()
            ->set('t.revokedAt', ':now')
            ->where('t.user = :user AND t.revokedAt IS NULL')
            ->setParameter('now', new \DateTime())
            ->setParameter('user', $user)
            ->getQuery()
            ->execute();
    }
}
