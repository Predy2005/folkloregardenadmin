<?php

declare(strict_types=1);

namespace App\Service;

/**
 * Vyhazována MobileAuthService při selhání autentizace.
 * Controller ji převádí na HTTP 401 s uživatelskou hláškou.
 */
class AuthException extends \RuntimeException
{
}
