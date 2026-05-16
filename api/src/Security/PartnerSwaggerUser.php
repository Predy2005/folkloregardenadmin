<?php

declare(strict_types=1);

namespace App\Security;

use App\Entity\Partner;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * Security user pro HTTP Basic Auth do `/api/doc/partner` Swagger UI.
 *
 * Symfony `http_basic` authenticator požaduje user object s `getPassword()` —
 * proto vlastní wrapper kolem Partner entity. Heslo (bcrypt hash) je uloženo
 * v `partner.swagger_password_hash`.
 *
 * Identifier = `swagger_username` (unikátní napříč partnery). Role
 * `ROLE_PARTNER_SWAGGER` dává jen přístup do Swagger UI, **ne** do
 * `/api/partner-api/*` endpointů (tam musí použít X-API-Key, byť skrze
 * krátkodobý alias z `SwaggerAccessService`).
 */
final class PartnerSwaggerUser implements UserInterface, PasswordAuthenticatedUserInterface
{
    public function __construct(private readonly Partner $partner) {}

    public function getPartner(): Partner
    {
        return $this->partner;
    }

    public function getRoles(): array
    {
        return ['ROLE_PARTNER_SWAGGER'];
    }

    public function getPassword(): ?string
    {
        return $this->partner->getSwaggerPasswordHash();
    }

    public function getUserIdentifier(): string
    {
        return $this->partner->getSwaggerUsername() ?? '';
    }

    public function eraseCredentials(): void
    {
    }
}
