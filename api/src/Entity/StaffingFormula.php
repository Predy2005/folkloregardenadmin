<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\StaffingFormulaRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: StaffingFormulaRepository::class)]
#[ORM\Table(name: 'staffing_formulas')]
#[ORM\HasLifecycleCallbacks]
class StaffingFormula
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $category;

    #[ORM\Column(type: Types::INTEGER)]
    private int $ratio; // > 0, how many guests per 1 staff (used jen když `tiers` je null/prázdné — fallback)

    /**
     * Stupňovité pásmové výpočty. Když je vyplněno (neprázdné), má přednost
     * před `ratio`. Každý prvek: `{minGuests, maxGuests, staffCount}`.
     * `maxGuests = null` znamená "a více" (otevřený horní okraj).
     *
     * @var list<array{minGuests: int, maxGuests: int|null, staffCount: int}>|null
     */
    #[ORM\Column(name: 'tiers', type: Types::JSON, nullable: true)]
    private ?array $tiers = null;

    #[ORM\Column(type: Types::BOOLEAN, options: ['default' => true])]
    private bool $enabled = true;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

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

    public function getId(): ?int { return $this->id; }

    public function getCategory(): string { return $this->category; }
    public function setCategory(string $category): self { $this->category = $category; return $this; }

    public function getRatio(): int { return $this->ratio; }
    public function setRatio(int $ratio): self { $this->ratio = max(1, $ratio); return $this; }

    /**
     * @return list<array{minGuests: int, maxGuests: int|null, staffCount: int}>|null
     */
    public function getTiers(): ?array { return $this->tiers; }

    /**
     * @param list<array{minGuests: int, maxGuests: int|null, staffCount: int}>|null $tiers
     */
    public function setTiers(?array $tiers): self { $this->tiers = $tiers; return $this; }

    /**
     * Spočítá potřebný počet personálu pro daný počet hostů.
     * Mirror FE `client/src/modules/staff/utils/staffingFormula.ts:calculateRequiredStaff`.
     *
     * Pravidla:
     *   1. Když `tiers` neprázdné — range lookup `minGuests <= guests <= maxGuests`
     *      vrací odpovídající `staffCount`. `maxGuests = null` = otevřený horní okraj.
     *   2. Pokud host přesahuje i poslední pásmo, vrátí staffCount z posledního.
     *   3. Když `tiers` chybí, fallback na `ceil(guests / ratio)`.
     */
    public function calculateRequired(int $guests): int
    {
        if ($guests <= 0) {
            return 0;
        }

        if (is_array($this->tiers) && count($this->tiers) > 0) {
            $fallback = 0;
            foreach ($this->tiers as $tier) {
                $min = max(0, (int)($tier['minGuests'] ?? 0));
                $rawMax = $tier['maxGuests'] ?? null;
                $max = $rawMax === null ? null : max(0, (int)$rawMax);
                $count = max(0, (int)($tier['staffCount'] ?? 0));
                if ($guests >= $min && ($max === null || $guests <= $max)) {
                    return $count;
                }
                $fallback = $count;
            }
            return $fallback;
        }

        $ratio = max(1, $this->ratio);
        return (int) ceil($guests / $ratio);
    }

    public function isEnabled(): bool { return $this->enabled; }
    public function setEnabled(bool $enabled): self { $this->enabled = $enabled; return $this; }

    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $description): self { $this->description = $description; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }
}
