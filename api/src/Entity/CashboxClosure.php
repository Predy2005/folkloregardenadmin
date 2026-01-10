<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\CashboxClosureRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CashboxClosureRepository::class)]
#[ORM\Table(name: 'cashbox_closure')]
class CashboxClosure
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Cashbox::class)]
    #[ORM\JoinColumn(name: 'cashbox_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?Cashbox $cashbox = null;

    #[ORM\Column(name: 'expected_cash', type: Types::DECIMAL, precision: 15, scale: 2)]
    private string $expectedCash;

    #[ORM\Column(name: 'actual_cash', type: Types::DECIMAL, precision: 15, scale: 2)]
    private string $actualCash;

    #[ORM\Column(type: Types::DECIMAL, precision: 15, scale: 2, nullable: true)]
    private ?string $difference = null;

    #[ORM\Column(name: 'total_income', type: Types::DECIMAL, precision: 15, scale: 2, options: ['default' => 0])]
    private string $totalIncome = '0.00';

    #[ORM\Column(name: 'total_expense', type: Types::DECIMAL, precision: 15, scale: 2, options: ['default' => 0])]
    private string $totalExpense = '0.00';

    #[ORM\Column(name: 'net_result', type: Types::DECIMAL, precision: 15, scale: 2, nullable: true)]
    private ?string $netResult = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'closed_by', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?User $closedBy = null;

    #[ORM\Column(name: 'closed_at', type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $closedAt;

    public function __construct()
    {
        $this->closedAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getCashbox(): ?Cashbox { return $this->cashbox; }
    public function setCashbox(?Cashbox $c): self { $this->cashbox = $c; return $this; }

    public function getExpectedCash(): string { return $this->expectedCash; }
    public function setExpectedCash(string $v): self { $this->expectedCash = $v; return $this; }

    public function getActualCash(): string { return $this->actualCash; }
    public function setActualCash(string $v): self { $this->actualCash = $v; return $this; }

    public function getDifference(): ?string { return $this->difference; }
    public function setDifference(?string $v): self { $this->difference = $v; return $this; }

    public function getTotalIncome(): string { return $this->totalIncome; }
    public function setTotalIncome(string $v): self { $this->totalIncome = $v; return $this; }

    public function getTotalExpense(): string { return $this->totalExpense; }
    public function setTotalExpense(string $v): self { $this->totalExpense = $v; return $this; }

    public function getNetResult(): ?string { return $this->netResult; }
    public function setNetResult(?string $v): self { $this->netResult = $v; return $this; }

    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): self { $this->notes = $v; return $this; }

    public function getClosedBy(): ?User { return $this->closedBy; }
    public function setClosedBy(?User $u): self { $this->closedBy = $u; return $this; }

    public function getClosedAt(): \DateTimeInterface { return $this->closedAt; }
    public function setClosedAt(\DateTimeInterface $t): self { $this->closedAt = $t; return $this; }
}
