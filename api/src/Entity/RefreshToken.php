<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\RefreshTokenRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Refresh token pro mobilní auth flow.
 *
 * - `token` je náhodný 64-znakový URL-safe řetězec s unikátním indexem;
 *   plaintext je schválně, protože se chová jako session ID (opaque),
 *   ne jako heslo — lookup musí být O(1) přes index.
 * - Při refresh se vydává nový token a starý se označuje `revokedAt`
 *   (rotation), takže odcizení tokenu se projeví jediným úspěšným použitím.
 * - `deviceId` váže token na konkrétní zařízení (volitelné).
 */
#[ORM\Entity(repositoryClass: RefreshTokenRepository::class)]
#[ORM\Table(name: 'refresh_token')]
#[ORM\Index(name: 'idx_refresh_token_user', columns: ['user_id'])]
#[ORM\Index(name: 'idx_refresh_token_device', columns: ['device_id'])]
class RefreshToken
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(type: Types::STRING, length: 128, unique: true)]
    private string $token;

    #[ORM\Column(name: 'device_id', type: Types::STRING, length: 255, nullable: true)]
    private ?string $deviceId = null;

    #[ORM\Column(name: 'expires_at', type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $expiresAt;

    #[ORM\Column(name: 'revoked_at', type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $revokedAt = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(name: 'last_used_at', type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $lastUsedAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getUser(): ?User { return $this->user; }
    public function setUser(?User $user): self { $this->user = $user; return $this; }

    public function getToken(): string { return $this->token; }
    public function setToken(string $token): self { $this->token = $token; return $this; }

    public function getDeviceId(): ?string { return $this->deviceId; }
    public function setDeviceId(?string $deviceId): self { $this->deviceId = $deviceId; return $this; }

    public function getExpiresAt(): \DateTimeInterface { return $this->expiresAt; }
    public function setExpiresAt(\DateTimeInterface $expiresAt): self { $this->expiresAt = $expiresAt; return $this; }

    public function getRevokedAt(): ?\DateTimeInterface { return $this->revokedAt; }
    public function setRevokedAt(?\DateTimeInterface $revokedAt): self { $this->revokedAt = $revokedAt; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }

    public function getLastUsedAt(): ?\DateTimeInterface { return $this->lastUsedAt; }
    public function setLastUsedAt(?\DateTimeInterface $lastUsedAt): self { $this->lastUsedAt = $lastUsedAt; return $this; }

    public function isRevoked(): bool
    {
        return $this->revokedAt !== null;
    }

    public function isExpired(?\DateTimeInterface $now = null): bool
    {
        $now = $now ?? new \DateTime();
        return $this->expiresAt <= $now;
    }

    public function isValid(?\DateTimeInterface $now = null): bool
    {
        return !$this->isRevoked() && !$this->isExpired($now);
    }
}
