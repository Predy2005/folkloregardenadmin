<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ExchangeRateRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ExchangeRateRepository::class)]
#[ORM\Table(name: 'exchange_rate')]
#[ORM\UniqueConstraint(name: 'uq_exchange_rate', columns: ['base_currency', 'target_currency', 'effective_date'])]
class ExchangeRate
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(name: 'base_currency', type: Types::STRING, length: 3)]
    private string $baseCurrency = 'CZK';

    #[ORM\Column(name: 'target_currency', type: Types::STRING, length: 3)]
    private string $targetCurrency;

    #[ORM\Column(type: Types::DECIMAL, precision: 15, scale: 6)]
    private string $rate;

    #[ORM\Column(name: 'effective_date', type: Types::DATE_MUTABLE)]
    private \DateTimeInterface $effectiveDate;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $source = 'MANUAL';

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getBaseCurrency(): string { return $this->baseCurrency; }
    public function setBaseCurrency(string $v): self { $this->baseCurrency = $v; return $this; }

    public function getTargetCurrency(): string { return $this->targetCurrency; }
    public function setTargetCurrency(string $v): self { $this->targetCurrency = $v; return $this; }

    public function getRate(): string { return $this->rate; }
    public function setRate(string $v): self { $this->rate = $v; return $this; }

    public function getEffectiveDate(): \DateTimeInterface { return $this->effectiveDate; }
    public function setEffectiveDate(\DateTimeInterface $v): self { $this->effectiveDate = $v; return $this; }

    public function getSource(): ?string { return $this->source; }
    public function setSource(?string $v): self { $this->source = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
}
