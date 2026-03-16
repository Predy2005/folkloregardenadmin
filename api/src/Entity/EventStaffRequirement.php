<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\EventStaffRequirementRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Stores staff requirements for a specific event.
 * Can be auto-calculated from formulas or manually overridden.
 */
#[ORM\Entity(repositoryClass: EventStaffRequirementRepository::class)]
#[ORM\Table(name: 'event_staff_requirements')]
#[ORM\UniqueConstraint(columns: ['event_id', 'category'])]
#[ORM\HasLifecycleCallbacks]
class EventStaffRequirement
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Event::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Event $event;

    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $category;

    #[ORM\Column(type: Types::INTEGER)]
    private int $requiredCount = 0;

    #[ORM\Column(type: Types::BOOLEAN, options: ['default' => false])]
    private bool $isManualOverride = false;

    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    private ?int $staffRoleId = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $updatedAt;

    public function __construct()
    {
        $now = new \DateTime();
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        $now = new \DateTime();
        $this->createdAt = $this->createdAt ?? $now;
        $this->updatedAt = $now;
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

    public function getEvent(): Event
    {
        return $this->event;
    }

    public function setEvent(Event $event): self
    {
        $this->event = $event;
        return $this;
    }

    public function getCategory(): string
    {
        return $this->category;
    }

    public function setCategory(string $category): self
    {
        $this->category = $category;
        return $this;
    }

    public function getRequiredCount(): int
    {
        return $this->requiredCount;
    }

    public function setRequiredCount(int $count): self
    {
        $this->requiredCount = max(0, $count);
        return $this;
    }

    public function isManualOverride(): bool
    {
        return $this->isManualOverride;
    }

    public function setManualOverride(bool $isManual): self
    {
        $this->isManualOverride = $isManual;
        return $this;
    }

    public function getStaffRoleId(): ?int
    {
        return $this->staffRoleId;
    }

    public function setStaffRoleId(?int $roleId): self
    {
        $this->staffRoleId = $roleId;
        return $this;
    }

    public function getCreatedAt(): \DateTimeInterface
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeInterface
    {
        return $this->updatedAt;
    }
}
