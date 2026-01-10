<?php
declare(strict_types=1);

namespace App\Entity;

use App\Repository\StaffMemberRoleRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: StaffMemberRoleRepository::class)]
#[ORM\Table(name: 'staff_member_role')]
#[ORM\UniqueConstraint(name: 'uniq_member_role', columns: ['staff_member_id', 'staff_role_id'])]
class StaffMemberRole
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: StaffMember::class)]
    #[ORM\JoinColumn(name: 'staff_member_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private StaffMember $staffMember;

    #[ORM\ManyToOne(targetEntity: StaffRole::class)]
    #[ORM\JoinColumn(name: 'staff_role_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private StaffRole $staffRole;

    #[ORM\Column(type: Types::BOOLEAN, options: ['default' => false])]
    private bool $isPrimary = false;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }
    public function getStaffMember(): StaffMember { return $this->staffMember; }
    public function setStaffMember(StaffMember $m): self { $this->staffMember = $m; return $this; }
    public function getStaffRole(): StaffRole { return $this->staffRole; }
    public function setStaffRole(StaffRole $r): self { $this->staffRole = $r; return $this; }
    public function isPrimary(): bool { return $this->isPrimary; }
    public function setIsPrimary(bool $p): self { $this->isPrimary = $p; return $this; }
    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
}
