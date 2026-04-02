<?php
declare(strict_types=1);

namespace App\Entity;

use App\Repository\StaffAttendanceRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: StaffAttendanceRepository::class)]
#[ORM\Table(name: 'staff_attendance')]
class StaffAttendance
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: StaffMember::class)]
    #[ORM\JoinColumn(name: 'staff_member_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private StaffMember $staffMember;

    #[ORM\ManyToOne(targetEntity: Reservation::class)]
    #[ORM\JoinColumn(name: 'reservation_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Reservation $reservation = null;

    #[ORM\Column(type: Types::DATE_MUTABLE)]
    private \DateTimeInterface $attendanceDate;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $checkInTime = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $checkOutTime = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 5, scale: 2, nullable: true)]
    private ?string $hoursWorked = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(type: Types::BOOLEAN, options: ['default' => false])]
    private bool $isPaid = false;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $paidAt = null;

    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    private ?int $eventId = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 15, scale: 2, nullable: true)]
    private ?string $paymentAmount = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $paymentNote = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
        $this->attendanceDate = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }
    public function getStaffMember(): StaffMember { return $this->staffMember; }
    public function setStaffMember(StaffMember $m): self { $this->staffMember = $m; return $this; }
    public function getReservation(): ?Reservation { return $this->reservation; }
    public function setReservation(?Reservation $r): self { $this->reservation = $r; return $this; }
    public function getAttendanceDate(): \DateTimeInterface { return $this->attendanceDate; }
    public function setAttendanceDate(\DateTimeInterface $d): self { $this->attendanceDate = $d; return $this; }
    public function getCheckInTime(): ?\DateTimeInterface { return $this->checkInTime; }
    public function setCheckInTime(?\DateTimeInterface $dt): self { $this->checkInTime = $dt; return $this; }
    public function getCheckOutTime(): ?\DateTimeInterface { return $this->checkOutTime; }
    public function setCheckOutTime(?\DateTimeInterface $dt): self { $this->checkOutTime = $dt; return $this; }
    public function getHoursWorked(): ?string { return $this->hoursWorked; }
    public function setHoursWorked(?string $h): self { $this->hoursWorked = $h; return $this; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $n): self { $this->notes = $n; return $this; }
    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }

    public function isPaid(): bool { return $this->isPaid; }
    public function setIsPaid(bool $v): self { $this->isPaid = $v; return $this; }

    public function getPaidAt(): ?\DateTimeInterface { return $this->paidAt; }
    public function setPaidAt(?\DateTimeInterface $dt): self { $this->paidAt = $dt; return $this; }

    public function getEventId(): ?int { return $this->eventId; }
    public function setEventId(?int $v): self { $this->eventId = $v; return $this; }

    public function getPaymentAmount(): ?string { return $this->paymentAmount; }
    public function setPaymentAmount(?string $v): self { $this->paymentAmount = $v; return $this; }

    public function getPaymentNote(): ?string { return $this->paymentNote; }
    public function setPaymentNote(?string $v): self { $this->paymentNote = $v; return $this; }
}
