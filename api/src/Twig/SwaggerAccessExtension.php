<?php

declare(strict_types=1);

namespace App\Twig;

use App\Security\PartnerSwaggerUser;
use App\Service\SwaggerAccessService;
use Symfony\Bundle\SecurityBundle\Security;
use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;

/**
 * Poskytuje Twig funkci `partner_alias_key()` použitou v override Swagger UI
 * šablony (`templates/bundles/NelmioApiDocBundle/SwaggerUi/index.html.twig`).
 *
 * Pokud je aktuálně přihlášený user `PartnerSwaggerUser` (přes HTTP Basic Auth
 * na `/api/doc/partner`), funkce vystaví krátkodobý alias API klíč. Jinak
 * vrací prázdný string (admin Swagger neauto-fillne X-API-Key — admin volá
 * `/api/*` přes JWT z localStorage svého admin frontendu).
 */
final class SwaggerAccessExtension extends AbstractExtension
{
    public function __construct(
        private readonly Security $security,
        private readonly SwaggerAccessService $swaggerAccess,
    ) {}

    public function getFunctions(): array
    {
        return [
            new TwigFunction('partner_alias_key', $this->partnerAliasKey(...)),
        ];
    }

    public function partnerAliasKey(): string
    {
        $user = $this->security->getUser();
        if (!$user instanceof PartnerSwaggerUser) {
            return '';
        }
        return $this->swaggerAccess->issueAliasKey($user->getPartner());
    }
}
