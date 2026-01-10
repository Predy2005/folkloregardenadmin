<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\EventStaffAssignmentRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: EventStaffAssignmentRepository::class)]
#[ORM\Table(name: 'event_staff_assignment')]
class EventStaffAssignment
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Event::class, inversedBy: 'staffAssignments')]
    #[ORM\JoinColumn(name: 'event_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?Event $event = null;

    // Keep as scalar IDs to avoid creating StaffMember/StaffRole entities now
    #[ORM\Column(type: Types::INTEGER)]
    private int $staffMemberId;

    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    private ?int $staffRoleId = null;

    #[ORM\Column(type: Types::STRING, length: 50, options: ['default' => 'ASSIGNED'])]
    private string $assignmentStatus = 'ASSIGNED';

    #[ORM\Column(type: Types::STRING, length: 50, options: ['default' => 'PENDING'])]
    private string $attendanceStatus = 'PENDING';

    #[ORM\Column(type: Types::DECIMAL, precision: 5, scale: 2, options: ['default' => 0])]
    private string $hoursWorked = '0.00';

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2, nullable: true)]
    private ?string $paymentAmount = null;

    #[ORM\Column(type: Types::STRING, length: 50, options: ['default' => 'PENDING'])]
    private string $paymentStatus = 'PENDING';

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $assignedAt;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $confirmedAt = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $attendedAt = null;

    public function __construct()
    {
        $this->assignedAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }
    public function getEvent(): ?Event { return $this->event; }
    public function setEvent(?Event $event): self { $this->event = $event; return $this; }

    public function getStaffMemberId(): int { return $this->staffMemberId; }
    public function setStaffMemberId(int $v): self { $this->staffMemberId = $v; return $this; }

    public function getStaffRoleId(): ?int { return $this->staffRoleId; }
    public function setStaffRoleId(?int $v): self { $this->staffRoleId = $v; return $this; }

    public function getAssignmentStatus(): string { return $this->assignmentStatus; }
    public function setAssignmentStatus(string $v): self { $this->assignmentStatus = $v; return $this; }

    public function getAttendanceStatus(): string { return $this->attendanceStatus; }
    public function setAttendanceStatus(string $v): self { $this->attendanceStatus = $v; return $this; }

    public function getHoursWorked(): string { return $this->hoursWorked; }
    public function setHoursWorked(string $v): self { $this->hoursWorked = $v; return $this; }

    public function getPaymentAmount(): ?string { return $this->paymentAmount; }
    public function setPaymentAmount(?string $v): self { $this->paymentAmount = $v; return $this; }

    public function getPaymentStatus(): string { return $this->paymentStatus; }
    public function setPaymentStatus(string $v): self { $this->paymentStatus = $v; return $this; }

    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): self { $this->notes = $v; return $this; }

    public function getAssignedAt(): \DateTimeInterface { return $this->assignedAt; }
    public function getConfirmedAt(): ?\DateTimeInterface { return $this->confirmedAt; }
    public function setConfirmedAt(?\DateTimeInterface $v): self { $this->confirmedAt = $v; return $this; }

    public function getAttendedAt(): ?\DateTimeInterface { return $this->attendedAt; }
    public function setAttendedAt(?\DateTimeInterface $v): self { $this->attendedAt = $v; return $this; }
}
