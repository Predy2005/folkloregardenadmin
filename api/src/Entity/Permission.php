<?php

namespace App\Entity;

use App\Repository\PermissionRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: PermissionRepository::class)]
#[ORM\Table(name: 'permission')]
#[ORM\UniqueConstraint(name: 'unique_permission', columns: ['module', 'action'])]
class Permission
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(type: 'string', length: 50)]
    private ?string $module = null;

    #[ORM\Column(type: 'string', length: 30)]
    private ?string $action = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $description = null;

    #[ORM\OneToMany(mappedBy: 'permission', targetEntity: RolePermission::class, orphanRemoval: true)]
    private Collection $rolePermissions;

    #[ORM\OneToMany(mappedBy: 'permission', targetEntity: UserPermission::class, orphanRemoval: true)]
    private Collection $userPermissions;

    public function __construct()
    {
        $this->rolePermissions = new ArrayCollection();
        $this->userPermissions = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getModule(): ?string
    {
        return $this->module;
    }

    public function setModule(string $module): self
    {
        $this->module = $module;
        return $this;
    }

    public function getAction(): ?string
    {
        return $this->action;
    }

    public function setAction(string $action): self
    {
        $this->action = $action;
        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): self
    {
        $this->description = $description;
        return $this;
    }

    /**
     * Returns permission key in format "module.action"
     */
    public function getKey(): string
    {
        return $this->module . '.' . $this->action;
    }

    /**
     * @return Collection<int, RolePermission>
     */
    public function getRolePermissions(): Collection
    {
        return $this->rolePermissions;
    }

    public function addRolePermission(RolePermission $rolePermission): self
    {
        if (!$this->rolePermissions->contains($rolePermission)) {
            $this->rolePermissions->add($rolePermission);
            $rolePermission->setPermission($this);
        }
        return $this;
    }

    public function removeRolePermission(RolePermission $rolePermission): self
    {
        if ($this->rolePermissions->removeElement($rolePermission)) {
            if ($rolePermission->getPermission() === $this) {
                $rolePermission->setPermission(null);
            }
        }
        return $this;
    }

    /**
     * @return Collection<int, UserPermission>
     */
    public function getUserPermissions(): Collection
    {
        return $this->userPermissions;
    }

    public function addUserPermission(UserPermission $userPermission): self
    {
        if (!$this->userPermissions->contains($userPermission)) {
            $this->userPermissions->add($userPermission);
            $userPermission->setPermission($this);
        }
        return $this;
    }

    public function removeUserPermission(UserPermission $userPermission): self
    {
        if ($this->userPermissions->removeElement($userPermission)) {
            if ($userPermission->getPermission() === $this) {
                $userPermission->setPermission(null);
            }
        }
        return $this;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'module' => $this->module,
            'action' => $this->action,
            'key' => $this->getKey(),
            'description' => $this->description,
        ];
    }
}
