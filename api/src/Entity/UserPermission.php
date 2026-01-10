<?php

namespace App\Entity;

use App\Repository\UserPermissionRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: UserPermissionRepository::class)]
#[ORM\Table(name: 'user_permission')]
#[ORM\UniqueConstraint(name: 'unique_user_permission', columns: ['user_id', 'permission_id'])]
class UserPermission
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class, inversedBy: 'userPermissions')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\ManyToOne(targetEntity: Permission::class, inversedBy: 'userPermissions')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Permission $permission = null;

    #[ORM\Column(type: 'boolean', options: ['default' => true])]
    private bool $granted = true;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $assignedBy = null;

    #[ORM\Column(type: 'datetime')]
    private ?\DateTimeInterface $assignedAt = null;

    public function __construct()
    {
        $this->assignedAt = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): self
    {
        $this->user = $user;
        return $this;
    }

    public function getPermission(): ?Permission
    {
        return $this->permission;
    }

    public function setPermission(?Permission $permission): self
    {
        $this->permission = $permission;
        return $this;
    }

    public function isGranted(): bool
    {
        return $this->granted;
    }

    public function setGranted(bool $granted): self
    {
        $this->granted = $granted;
        return $this;
    }

    public function getAssignedBy(): ?User
    {
        return $this->assignedBy;
    }

    public function setAssignedBy(?User $assignedBy): self
    {
        $this->assignedBy = $assignedBy;
        return $this;
    }

    public function getAssignedAt(): ?\DateTimeInterface
    {
        return $this->assignedAt;
    }

    public function setAssignedAt(\DateTimeInterface $assignedAt): self
    {
        $this->assignedAt = $assignedAt;
        return $this;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'userId' => $this->user?->getId(),
            'userName' => $this->user?->getUsername(),
            'permissionId' => $this->permission?->getId(),
            'permissionKey' => $this->permission?->getKey(),
            'granted' => $this->granted,
            'assignedById' => $this->assignedBy?->getId(),
            'assignedByName' => $this->assignedBy?->getUsername(),
            'assignedAt' => $this->assignedAt?->format('c'),
        ];
    }
}
