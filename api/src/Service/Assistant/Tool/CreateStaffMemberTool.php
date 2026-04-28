<?php

declare(strict_types=1);

namespace App\Service\Assistant\Tool;

use App\Entity\StaffMember;
use Doctrine\ORM\EntityManagerInterface;

final class CreateStaffMemberTool implements ToolInterface
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    public function getName(): string { return 'create_staff_member'; }
    public function getDescription(): string { return 'Přidá nového zaměstnance do personálu. Vyžaduje potvrzení.'; }

    public function getParametersSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'firstName' => ['type' => 'string'],
                'lastName' => ['type' => 'string'],
                'position' => ['type' => 'string', 'description' => 'Např. Číšník, Kuchař, Muzikant, Kapela.'],
                'email' => ['type' => 'string'],
                'phone' => ['type' => 'string'],
                'isGroup' => ['type' => 'boolean', 'description' => 'True pokud jde o skupinu/kapelu.'],
            ],
            'required' => ['firstName'],
        ];
    }

    public function isReadOnly(): bool { return false; }
    public function getRequiredPermission(): ?string { return 'staff.create'; }

    public function execute(array $params): array
    {
        $firstName = trim((string)($params['firstName'] ?? ''));
        if ($firstName === '') {
            throw new \InvalidArgumentException('Jméno je povinné.');
        }
        $s = new StaffMember();
        $s->setFirstName($firstName);
        $s->setLastName((string)($params['lastName'] ?? ''));
        if (!empty($params['position'])) $s->setPosition((string)$params['position']);
        if (!empty($params['email'])) $s->setEmail((string)$params['email']);
        if (!empty($params['phone'])) $s->setPhone((string)$params['phone']);
        if (!empty($params['isGroup'])) $s->setIsGroup((bool)$params['isGroup']);
        if (method_exists($s, 'setIsActive')) {
            $s->setIsActive(true);
        }

        $this->em->persist($s);
        $this->em->flush();

        return [
            'id' => $s->getId(),
            'link' => '/staff/'.$s->getId().'/edit',
            'message' => 'Zaměstnanec vytvořen. Doplň sazby a roli v editoru.',
        ];
    }

    public function buildPreview(array $params): ?string
    {
        $n = trim(($params['firstName'] ?? '').' '.($params['lastName'] ?? ''));
        $pos = (string)($params['position'] ?? '');
        return 'Přidat do personálu: '.$n.($pos ? ' ('.$pos.')' : '');
    }
}
