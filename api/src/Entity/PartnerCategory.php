<?php
declare(strict_types=1);

namespace App\Entity;

use App\Repository\PartnerCategoryRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Číselník kategorií partnerů (Cestovní kancelář, Průvodce, Hotel, Ostatní…).
 *
 * Záměrně bez FK constraint na `Partner` — kategorie se dají libovolně
 * přidávat/mazat/přejmenovávat a partneři si svou hodnotu (`partner_type`)
 * zachovají v string podobě (slug). Když se kategorie smaže, partneři pořád
 * mají svůj slug, jen už se nezobrazí v dropdownu.
 */
#[ORM\Entity(repositoryClass: PartnerCategoryRepository::class)]
#[ORM\Table(name: 'partner_category')]
class PartnerCategory
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    /** Lidsky čitelný název ("Cestovní kancelář"). */
    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $name;

    /** Stable identifier ukládaný do `partner.partner_type` ("TRAVEL_AGENCY"). */
    #[ORM\Column(type: Types::STRING, length: 50, unique: true)]
    private string $slug;

    /** Pořadí v dropdownu (nižší = výše). */
    #[ORM\Column(type: Types::INTEGER, options: ['default' => 0])]
    private int $displayOrder = 0;

    #[ORM\Column(type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }
    public function getName(): string { return $this->name; }
    public function setName(string $name): self { $this->name = $name; return $this; }
    public function getSlug(): string { return $this->slug; }
    public function setSlug(string $slug): self { $this->slug = $slug; return $this; }
    public function getDisplayOrder(): int { return $this->displayOrder; }
    public function setDisplayOrder(int $v): self { $this->displayOrder = $v; return $this; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): self { $this->isActive = $v; return $this; }
    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
}
