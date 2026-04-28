<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'assistant_action_log')]
#[ORM\Index(name: 'aal_action_id_idx', columns: ['action_id'])]
#[ORM\Index(name: 'aal_user_idx', columns: ['user_id'])]
#[ORM\Index(name: 'aal_created_idx', columns: ['created_at'])]
class AssistantActionLog
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(name: 'action_id', type: Types::STRING, length: 64, unique: true)]
    private string $actionId;

    #[ORM\Column(name: 'user_id', type: Types::INTEGER, nullable: true)]
    private ?int $userId = null;

    #[ORM\Column(name: 'tool_name', type: Types::STRING, length: 80)]
    private string $toolName;

    /** pending | confirmed | rejected | executed | failed */
    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $status = 'pending';

    #[ORM\Column(type: Types::JSON)]
    private array $params = [];

    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $result = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $preview = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(name: 'executed_at', type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $executedAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
        $this->actionId = bin2hex(random_bytes(16));
    }

    public function getId(): ?int { return $this->id; }
    public function getActionId(): string { return $this->actionId; }

    public function getUserId(): ?int { return $this->userId; }
    public function setUserId(?int $id): self { $this->userId = $id; return $this; }

    public function getToolName(): string { return $this->toolName; }
    public function setToolName(string $n): self { $this->toolName = $n; return $this; }

    public function getStatus(): string { return $this->status; }
    public function setStatus(string $s): self { $this->status = $s; return $this; }

    public function getParams(): array { return $this->params; }
    public function setParams(array $p): self { $this->params = $p; return $this; }

    public function getResult(): ?array { return $this->result; }
    public function setResult(?array $r): self { $this->result = $r; return $this; }

    public function getPreview(): ?string { return $this->preview; }
    public function setPreview(?string $p): self { $this->preview = $p; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }

    public function getExecutedAt(): ?\DateTimeInterface { return $this->executedAt; }
    public function markExecuted(): self { $this->executedAt = new \DateTime(); return $this; }
}
