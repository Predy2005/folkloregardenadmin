<?php

declare(strict_types=1);

namespace App\Service;

/**
 * Vyhozena když admin nastaví PIN, který už používá jiný uživatel.
 * Mobilní login pracuje pouze s PINem (bez identifieru), takže napříč všemi
 * uživateli musí být PIN globálně unikátní. Controller ji převádí na 409.
 */
class PinAlreadyTakenException extends \DomainException
{
}
