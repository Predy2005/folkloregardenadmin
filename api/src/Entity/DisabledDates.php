<?php

namespace App\Entity;

use App\Repository\DisabledDatesRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: DisabledDatesRepository::class)]
class DisabledDates
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(name: 'id', type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(name: 'date_from', type: 'date')]
    private ?\DateTimeInterface $dateFrom = null;

    #[ORM\Column(name: 'date_to', type: 'date', nullable: true)]
    private ?\DateTimeInterface $dateTo = null;

    #[ORM\Column(name: 'reason', type: 'string', length: 255, nullable: true)]
    private ?string $reason = null;

    #[ORM\Column(name: 'project', type: 'string', length: 255, nullable: true)]
    private ?string $project = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getDateFrom(): ?\DateTimeInterface
    {
        return $this->dateFrom;
    }

    public function setDateFrom(\DateTimeInterface $dateFrom): static
    {
        $this->dateFrom = $dateFrom;
        return $this;
    }

    public function getDateTo(): ?\DateTimeInterface
    {
        return $this->dateTo;
    }

    public function setDateTo(?\DateTimeInterface $dateTo): static
    {
        $this->dateTo = $dateTo;
        return $this;
    }

    public function getReason(): ?string
    {
        return $this->reason;
    }

    public function setReason(?string $reason): static
    {
        $this->reason = $reason;
        return $this;
    }

    public function getProject(): ?string
    {
        return $this->project;
    }

    public function setProject(?string $project): static
    {
        $this->project = $project;
        return $this;
    }
}