<?php
declare(strict_types=1);

namespace App\Entity;

use App\Repository\StaffReservationAssignmentRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: StaffReservationAssignmentRepository::class)]
#[ORM\Table(name: 'staff_reservation_assignment')]
class StaffReservationAssignment
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: StaffMember::class)]
    #[ORM\JoinColumn(name: 'staff_member_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private StaffMember $staffMember;

    #[ORM\ManyToOne(targetEntity: Reservation::class)]
    #[ORM\JoinColumn(name: 'reservation_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Reservation $reservation;

    #[ORM\ManyToOne(targetEntity: StaffRole::class)]
    #[ORM\JoinColumn(name: 'staff_role_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?StaffRole $staffRole = null;

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
    public function getStaffMember(): StaffMember { return $this->staffMember; }
    public function setStaffMember(StaffMember $m): self { $this->staffMember = $m; return $this; }
    public function getReservation(): Reservation { return $this->reservation; }
    public function setReservation(Reservation $r): self { $this->reservation = $r; return $this; }
    public function getStaffRole(): ?StaffRole { return $this->staffRole; }
    public function setStaffRole(?StaffRole $role): self { $this->staffRole = $role; return $this; }
    public function getAssignmentStatus(): string { return $this->assignmentStatus; }
    public function setAssignmentStatus(string $s): self { $this->assignmentStatus = $s; return $this; }
    public function getAttendanceStatus(): string { return $this->attendanceStatus; }
    public function setAttendanceStatus(string $s): self { $this->attendanceStatus = $s; return $this; }
    public function getHoursWorked(): string { return $this->hoursWorked; }
    public function setHoursWorked(string $h): self { $this->hoursWorked = $h; return $this; }
    public function getPaymentAmount(): ?string { return $this->paymentAmount; }
    public function setPaymentAmount(?string $p): self { $this->paymentAmount = $p; return $this; }
    public function getPaymentStatus(): string { return $this->paymentStatus; }
    public function setPaymentStatus(string $s): self { $this->paymentStatus = $s; return $this; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $n): self { $this->notes = $n; return $this; }
    public function getAssignedAt(): \DateTimeInterface { return $this->assignedAt; }
    public function setAssignedAt(\DateTimeInterface $dt): self { $this->assignedAt = $dt; return $this; }
    public function getConfirmedAt(): ?\DateTimeInterface { return $this->confirmedAt; }
    public function setConfirmedAt(?\DateTimeInterface $dt): self { $this->confirmedAt = $dt; return $this; }
    public function getAttendedAt(): ?\DateTimeInterface { return $this->attendedAt; }
    public function setAttendedAt(?\DateTimeInterface $dt): self { $this->attendedAt = $dt; return $this; }
}
