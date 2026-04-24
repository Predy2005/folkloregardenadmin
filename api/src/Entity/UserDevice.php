<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\UserDeviceRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: UserDeviceRepository::class)]
#[ORM\Table(name: 'user_device')]
#[ORM\HasLifecycleCallbacks]
class UserDevice
{
    public const PLATFORM_IOS = 'ios';
    public const PLATFORM_ANDROID = 'android';
    public const PLATFORM_WEB = 'web';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class, inversedBy: 'devices')]
    #[ORM\JoinColumn(name: 'user_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(name: 'fcm_token', type: Types::STRING, length: 500, unique: true)]
    private string $fcmToken;

    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $platform;

    #[ORM\Column(name: 'device_id', type: Types::STRING, length: 255, nullable: true)]
    private ?string $deviceId = null;

    #[ORM\Column(name: 'device_name', type: Types::STRING, length: 255, nullable: true)]
    private ?string $deviceName = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(name: 'last_seen_at', type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $lastSeenAt;

    public function __construct()
    {
        $now = new \DateTime();
        $this->createdAt = $now;
        $this->lastSeenAt = $now;
    }

    public function touch(): self
    {
        $this->lastSeenAt = new \DateTime();
        return $this;
    }

    public function getId(): ?int { return $this->id; }

    public function getUser(): ?User { return $this->user; }
    public function setUser(?User $user): self { $this->user = $user; return $this; }

    public function getFcmToken(): string { return $this->fcmToken; }
    public function setFcmToken(string $v): self { $this->fcmToken = $v; return $this; }

    public function getPlatform(): string { return $this->platform; }
    public function setPlatform(string $v): self { $this->platform = $v; return $this; }

    public function getDeviceId(): ?string { return $this->deviceId; }
    public function setDeviceId(?string $v): self { $this->deviceId = $v; return $this; }

    public function getDeviceName(): ?string { return $this->deviceName; }
    public function setDeviceName(?string $v): self { $this->deviceName = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function getLastSeenAt(): \DateTimeInterface { return $this->lastSeenAt; }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'platform' => $this->platform,
            'deviceId' => $this->deviceId,
            'deviceName' => $this->deviceName,
            'createdAt' => $this->createdAt->format('c'),
            'lastSeenAt' => $this->lastSeenAt->format('c'),
        ];
    }
}
