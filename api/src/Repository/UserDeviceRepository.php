<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\User;
use App\Entity\UserDevice;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<UserDevice>
 */
class UserDeviceRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, UserDevice::class);
    }

    public function findByToken(string $fcmToken): ?UserDevice
    {
        return $this->findOneBy(['fcmToken' => $fcmToken]);
    }

    /**
     * @return UserDevice[]
     */
    public function findByUser(User $user): array
    {
        return $this->findBy(['user' => $user], ['lastSeenAt' => 'DESC']);
    }
}
