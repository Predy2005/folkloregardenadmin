<?php

namespace App\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use App\Repository\UserRepository;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: '`user`')]
#[ORM\HasLifecycleCallbacks]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(type: 'string', length: 180, unique: true)]
    private ?string $username = null;

    #[ORM\Column(type: 'string', length: 255, unique: true)]
    private ?string $email = null;

    #[ORM\Column(type: 'string')]
    private ?string $password = null;

    #[ORM\Column(type: 'json')]
    private array $roles = [];

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $lastLoginAt = null;

    #[ORM\Column(type: 'string', length: 45, nullable: true)]
    private ?string $lastLoginIp = null;

    #[ORM\Column(type: 'datetime')]
    private ?\DateTimeInterface $createdAt = null;

    #[ORM\Column(type: 'datetime')]
    private ?\DateTimeInterface $updatedAt = null;

    #[ORM\Column(type: 'string', length: 64, nullable: true)]
    private ?string $resetToken = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $resetTokenExpiresAt = null;

    #[ORM\OneToMany(mappedBy: 'user', targetEntity: UserRole::class, orphanRemoval: true, cascade: ['persist', 'remove'])]
    private Collection $userRoles;

    #[ORM\OneToMany(mappedBy: 'user', targetEntity: UserPermission::class, orphanRemoval: true, cascade: ['persist', 'remove'])]
    private Collection $userPermissions;

    #[ORM\Column(name: 'mobile_pin', type: 'string', length: 255, nullable: true)]
    private ?string $mobilePin = null;

    #[ORM\Column(name: 'pin_device_id', type: 'string', length: 255, nullable: true)]
    private ?string $pinDeviceId = null;

    #[ORM\Column(name: 'pin_enabled', type: 'boolean', options: ['default' => false])]
    private bool $pinEnabled = false;

    #[ORM\OneToOne(mappedBy: 'user', targetEntity: StaffMember::class)]
    private ?StaffMember $staffMember = null;

    #[ORM\OneToOne(mappedBy: 'user', targetEntity: TransportDriver::class)]
    private ?TransportDriver $transportDriver = null;

    #[ORM\OneToMany(mappedBy: 'user', targetEntity: UserDevice::class, orphanRemoval: true, cascade: ['persist', 'remove'])]
    private Collection $devices;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
        $this->updatedAt = new \DateTime();
        $this->userRoles = new ArrayCollection();
        $this->userPermissions = new ArrayCollection();
        $this->devices = new ArrayCollection();
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUsername(): ?string
    {
        return $this->username;
    }

    public function setUsername(string $username): self
    {
        $this->username = $username;
        return $this;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(string $email): self
    {
        $this->email = $email;
        return $this;
    }

    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(string $password): self
    {
        $this->password = $password;
        return $this;
    }

    /**
     * @deprecated Use getAssignedRoleNames() for new permission system
     */
    public function getRoles(): array
    {
        $roles = $this->roles;
        $roles[] = 'ROLE_USER';
        return array_unique($roles);
    }

    public function setRoles(array $roles): self
    {
        $this->roles = $roles;
        return $this;
    }

    public function getLastLoginAt(): ?\DateTimeInterface
    {
        return $this->lastLoginAt;
    }

    public function setLastLoginAt(?\DateTimeInterface $lastLoginAt): self
    {
        $this->lastLoginAt = $lastLoginAt;
        return $this;
    }

    public function getLastLoginIp(): ?string
    {
        return $this->lastLoginIp;
    }

    public function setLastLoginIp(?string $lastLoginIp): self
    {
        $this->lastLoginIp = $lastLoginIp;
        return $this;
    }

    public function getCreatedAt(): ?\DateTimeInterface
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeInterface $createdAt): self
    {
        $this->createdAt = $createdAt;
        return $this;
    }

    public function getUpdatedAt(): ?\DateTimeInterface
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(\DateTimeInterface $updatedAt): self
    {
        $this->updatedAt = $updatedAt;
        return $this;
    }

    public function getResetToken(): ?string
    {
        return $this->resetToken;
    }

    public function setResetToken(?string $resetToken): self
    {
        $this->resetToken = $resetToken;
        return $this;
    }

    public function getResetTokenExpiresAt(): ?\DateTimeInterface
    {
        return $this->resetTokenExpiresAt;
    }

    public function setResetTokenExpiresAt(?\DateTimeInterface $resetTokenExpiresAt): self
    {
        $this->resetTokenExpiresAt = $resetTokenExpiresAt;
        return $this;
    }

    /**
     * @return Collection<int, UserRole>
     */
    public function getUserRoles(): Collection
    {
        return $this->userRoles;
    }

    public function addUserRole(UserRole $userRole): self
    {
        if (!$this->userRoles->contains($userRole)) {
            $this->userRoles->add($userRole);
            $userRole->setUser($this);
        }
        return $this;
    }

    public function removeUserRole(UserRole $userRole): self
    {
        if ($this->userRoles->removeElement($userRole)) {
            if ($userRole->getUser() === $this) {
                $userRole->setUser(null);
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
            $userPermission->setUser($this);
        }
        return $this;
    }

    public function removeUserPermission(UserPermission $userPermission): self
    {
        if ($this->userPermissions->removeElement($userPermission)) {
            if ($userPermission->getUser() === $this) {
                $userPermission->setUser(null);
            }
        }
        return $this;
    }

    /**
     * Get all assigned role names
     * @return string[]
     */
    public function getAssignedRoleNames(): array
    {
        $roleNames = [];
        foreach ($this->userRoles as $userRole) {
            $role = $userRole->getRole();
            if ($role) {
                $roleNames[] = $role->getName();
            }
        }
        return $roleNames;
    }

    /**
     * Get all Role entities assigned to user
     * @return Role[]
     */
    public function getAssignedRoles(): array
    {
        $roles = [];
        foreach ($this->userRoles as $userRole) {
            $role = $userRole->getRole();
            if ($role) {
                $roles[] = $role;
            }
        }
        return $roles;
    }

    /**
     * Check if user has a specific role
     */
    public function hasAssignedRole(string $roleName): bool
    {
        return in_array(strtoupper($roleName), $this->getAssignedRoleNames(), true);
    }

    /**
     * Check if user is super admin
     */
    public function isSuperAdmin(): bool
    {
        return $this->hasAssignedRole('SUPER_ADMIN');
    }

    /**
     * Get all effective permissions from roles + direct permissions
     * @return string[] Permission keys like 'reservations.read'
     */
    public function getEffectivePermissions(): array
    {
        $permissions = [];

        // Collect permissions from all roles
        foreach ($this->userRoles as $userRole) {
            $role = $userRole->getRole();
            if ($role) {
                foreach ($role->getPermissionKeys() as $key) {
                    $permissions[$key] = true;
                }
            }
        }

        // Apply direct user permissions (can grant or revoke)
        foreach ($this->userPermissions as $userPermission) {
            $permission = $userPermission->getPermission();
            if ($permission) {
                $key = $permission->getKey();
                if ($userPermission->isGranted()) {
                    $permissions[$key] = true;
                } else {
                    unset($permissions[$key]);
                }
            }
        }

        return array_keys($permissions);
    }

    /**
     * Check if user has a specific permission
     */
    public function hasPermission(string $permissionKey): bool
    {
        // Super admin has all permissions
        if ($this->isSuperAdmin()) {
            return true;
        }

        return in_array($permissionKey, $this->getEffectivePermissions(), true);
    }

    /**
     * Check if user has any of the given permissions
     * @param string[] $permissionKeys
     */
    public function hasAnyPermission(array $permissionKeys): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        $effectivePermissions = $this->getEffectivePermissions();
        foreach ($permissionKeys as $key) {
            if (in_array($key, $effectivePermissions, true)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if user has all of the given permissions
     * @param string[] $permissionKeys
     */
    public function hasAllPermissions(array $permissionKeys): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        $effectivePermissions = $this->getEffectivePermissions();
        foreach ($permissionKeys as $key) {
            if (!in_array($key, $effectivePermissions, true)) {
                return false;
            }
        }
        return true;
    }

    public function getUserIdentifier(): string
    {
        return (string)$this->username;
    }

    public function eraseCredentials(): void
    {
        // Clear any temporary sensitive data
    }

    public function getMobilePin(): ?string
    {
        return $this->mobilePin;
    }

    public function setMobilePin(?string $mobilePin): self
    {
        $this->mobilePin = $mobilePin;
        return $this;
    }

    public function getPinDeviceId(): ?string
    {
        return $this->pinDeviceId;
    }

    public function setPinDeviceId(?string $pinDeviceId): self
    {
        $this->pinDeviceId = $pinDeviceId;
        return $this;
    }

    public function isPinEnabled(): bool
    {
        return $this->pinEnabled;
    }

    public function setPinEnabled(bool $pinEnabled): self
    {
        $this->pinEnabled = $pinEnabled;
        return $this;
    }

    public function getStaffMember(): ?StaffMember
    {
        return $this->staffMember;
    }

    public function setStaffMember(?StaffMember $staffMember): self
    {
        $this->staffMember = $staffMember;
        return $this;
    }

    public function getTransportDriver(): ?TransportDriver
    {
        return $this->transportDriver;
    }

    public function setTransportDriver(?TransportDriver $transportDriver): self
    {
        $this->transportDriver = $transportDriver;
        return $this;
    }

    /**
     * @return Collection<int, UserDevice>
     */
    public function getDevices(): Collection
    {
        return $this->devices;
    }

    public function addDevice(UserDevice $device): self
    {
        if (!$this->devices->contains($device)) {
            $this->devices->add($device);
            $device->setUser($this);
        }
        return $this;
    }

    public function removeDevice(UserDevice $device): self
    {
        if ($this->devices->removeElement($device)) {
            if ($device->getUser() === $this) {
                $device->setUser(null);
            }
        }
        return $this;
    }

    /**
     * True if this User is linked to either a StaffMember or a TransportDriver.
     */
    public function isMobileUser(): bool
    {
        return $this->staffMember !== null || $this->transportDriver !== null;
    }

    public function toArray(bool $includePermissions = false): array
    {
        $data = [
            'id' => $this->id,
            'username' => $this->username,
            'email' => $this->email,
            'roles' => $this->getAssignedRoleNames(),
            'lastLoginAt' => $this->lastLoginAt?->format('c'),
            'lastLoginIp' => $this->lastLoginIp,
            'createdAt' => $this->createdAt?->format('c'),
            'updatedAt' => $this->updatedAt?->format('c'),
            'pinEnabled' => $this->pinEnabled,
            'staffMemberId' => $this->staffMember?->getId(),
            'transportDriverId' => $this->transportDriver?->getId(),
        ];

        if ($includePermissions) {
            $data['permissions'] = $this->getEffectivePermissions();
            $data['isSuperAdmin'] = $this->isSuperAdmin();
        }

        return $data;
    }
}
