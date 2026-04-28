<?php

declare(strict_types=1);

namespace App\Service\Assistant\Tool;

use App\Entity\Contact;
use Doctrine\ORM\EntityManagerInterface;

final class CreateContactTool implements ToolInterface
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    public function getName(): string { return 'create_contact'; }
    public function getDescription(): string { return 'Vytvoří nový kontakt v adresáři. VŽDY vyžaduje potvrzení uživatelem.'; }

    public function getParametersSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'name' => ['type' => 'string', 'description' => 'Celé jméno nebo název firmy.'],
                'email' => ['type' => 'string'],
                'phone' => ['type' => 'string'],
                'company' => ['type' => 'string'],
                'note' => ['type' => 'string'],
            ],
            'required' => ['name'],
        ];
    }

    public function isReadOnly(): bool { return false; }
    public function getRequiredPermission(): ?string { return 'contacts.create'; }

    public function execute(array $params): array
    {
        $name = trim((string)($params['name'] ?? ''));
        if ($name === '') {
            throw new \InvalidArgumentException('Jméno je povinné.');
        }
        $c = new Contact();
        $c->setName($name);
        if (!empty($params['email'])) $c->setEmail((string)$params['email']);
        if (!empty($params['phone'])) $c->setPhone((string)$params['phone']);
        if (!empty($params['company'])) $c->setCompany((string)$params['company']);
        if (method_exists($c, 'setNote') && !empty($params['note'])) {
            $c->setNote((string)$params['note']);
        }

        $this->em->persist($c);
        $this->em->flush();

        return [
            'id' => $c->getId(),
            'name' => $c->getName(),
            'link' => '/contacts/'.$c->getId().'/edit',
            'message' => 'Kontakt vytvořen.',
        ];
    }

    public function buildPreview(array $params): ?string
    {
        $name = trim((string)($params['name'] ?? ''));
        $email = (string)($params['email'] ?? '');
        $phone = (string)($params['phone'] ?? '');
        $company = (string)($params['company'] ?? '');
        $parts = [$name];
        if ($email) $parts[] = $email;
        if ($phone) $parts[] = $phone;
        if ($company) $parts[] = $company;
        return 'Vytvořit kontakt: '.implode(' | ', $parts);
    }
}
