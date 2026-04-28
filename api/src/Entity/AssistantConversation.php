<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'assistant_conversation')]
#[ORM\Index(name: 'ac_user_idx', columns: ['user_id'])]
#[ORM\Index(name: 'ac_updated_idx', columns: ['updated_at'])]
#[ORM\HasLifecycleCallbacks]
class AssistantConversation
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(name: 'user_id', type: Types::INTEGER, nullable: true)]
    private ?int $userId = null;

    #[ORM\Column(type: Types::STRING, length: 200)]
    private string $title = 'Nová konverzace';

    /** @var list<array{role:string,content:string}> */
    #[ORM\Column(type: Types::JSON)]
    private array $messages = [];

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(name: 'updated_at', type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $updatedAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
        $this->updatedAt = new \DateTime();
    }

    #[ORM\PreUpdate]
    public function touch(): void { $this->updatedAt = new \DateTime(); }

    public function getId(): ?int { return $this->id; }
    public function getUserId(): ?int { return $this->userId; }
    public function setUserId(?int $id): self { $this->userId = $id; return $this; }
    public function getTitle(): string { return $this->title; }
    public function setTitle(string $t): self { $this->title = mb_substr($t, 0, 200); return $this; }
    public function getMessages(): array { return $this->messages; }
    public function setMessages(array $m): self { $this->messages = $m; $this->updatedAt = new \DateTime(); return $this; }
    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }
}
