<?php

declare(strict_types=1);

namespace App\Security;

use App\Entity\Partner;
use App\Repository\PartnerRepository;
use Symfony\Component\Security\Core\Exception\UserNotFoundException;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Core\User\UserProviderInterface;

/**
 * UserProvider pro `http_basic` autentizaci do `/api/doc/partner` Swagger UI.
 *
 * Dohledá Partner podle `swagger_username` (partial unique index). Pouze
 * aktivní partneři (`is_active = true`) se mohou přihlásit — deaktivovaný
 * partner ztrácí přístup okamžitě bez nutnosti rotovat credentials.
 *
 * @implements UserProviderInterface<PartnerSwaggerUser>
 */
final class PartnerSwaggerUserProvider implements UserProviderInterface
{
    public function __construct(private readonly PartnerRepository $partners) {}

    public function loadUserByIdentifier(string $identifier): UserInterface
    {
        $partner = $this->partners->findOneBy(['swaggerUsername' => $identifier]);
        if (!$partner instanceof Partner || !$partner->isActive() || $partner->getSwaggerPasswordHash() === null) {
            throw new UserNotFoundException(sprintf('Partner se Swagger username "%s" nenalezen.', $identifier));
        }
        return new PartnerSwaggerUser($partner);
    }

    public function refreshUser(UserInterface $user): UserInterface
    {
        if (!$user instanceof PartnerSwaggerUser) {
            throw new \InvalidArgumentException(sprintf('Unsupported user class "%s".', $user::class));
        }
        return $this->loadUserByIdentifier($user->getUserIdentifier());
    }

    public function supportsClass(string $class): bool
    {
        return $class === PartnerSwaggerUser::class || is_subclass_of($class, PartnerSwaggerUser::class);
    }
}
