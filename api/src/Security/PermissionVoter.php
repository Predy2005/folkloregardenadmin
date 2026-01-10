<?php

namespace App\Security;

use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * Voter for checking granular permissions.
 *
 * Supports permission keys in format "module.action":
 * - reservations.read
 * - reservations.create
 * - events.update
 * - users.delete
 * etc.
 */
class PermissionVoter extends Voter
{
    private const PERMISSION_PATTERN = '/^[a-z_]+\.(read|create|update|delete|export|send_email|redeem|close)$/';

    protected function supports(string $attribute, mixed $subject): bool
    {
        return preg_match(self::PERMISSION_PATTERN, $attribute) === 1;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        $user = $token->getUser();

        if (!$user instanceof User) {
            return false;
        }

        // Super admin has all permissions
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Check if user has the permission
        return $user->hasPermission($attribute);
    }
}
