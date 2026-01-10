<?php

namespace App\Config;

use DateTimeInterface;

class SpecialDateRules
{
    /**
     * Returns canonical Y-m-d string for a given date
     */
    private static function canonical(DateTimeInterface $date): string
    {
        return $date->format('Y-m-d');
    }

    /**
     * Get overrides for a given date if any.
     *
     * @return array{basePrices: array<string,int>, transferPricePerPerson?: int, allowedMenus?: string[]}|null
     */
    public static function getForDate(DateTimeInterface $date): ?array
    {
        $key = self::canonical($date);

        // Define rules here. Extend as needed.
        $rules = [
            '2025-12-31' => [
                'basePrices' => [
                    'adult' => 3090,
                    'child' => 3090,
                    'infant' => 0,
                ],
                'transferPricePerPerson' => 700,
                'allowedMenus' => ['5', '6', '7'],
            ],
        ];

        return $rules[$key] ?? null;
    }

    public static function getBasePrice(string $personType, DateTimeInterface $date): int
    {
        $rule = self::getForDate($date);
        if ($rule && isset($rule['basePrices'][$personType])) {
            return (int)$rule['basePrices'][$personType];
        }
        // Defaults
        return match ($personType) {
            'adult' => 1250,
            'child' => 800,
            default => 0,
        };
    }

    public static function getTransferPricePerPerson(DateTimeInterface $date): int
    {
        $rule = self::getForDate($date);
        return $rule['transferPricePerPerson'] ?? 300;
    }

    /**
     * @return string[]|null
     */
    public static function getAllowedMenus(DateTimeInterface $date): ?array
    {
        $rule = self::getForDate($date);
        return $rule['allowedMenus'] ?? null;
    }
}
