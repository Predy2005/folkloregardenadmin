<?php

namespace App\Enum;

enum FoodMenu: string
{
    case NONE = '';
    case STANDARD_TRADITIONAL = '5';
    case STANDARD_CHICKEN = '6';
    case STANDARD_VEGETARIAN = '7';
    case SPECIAL_SEMIKOSHER = '8';
    case SPECIAL_PORK_KNEE = '9';
    case SPECIAL_DUCK = '10';
    case SPECIAL_CHICKEN_HALAL = '11';
    case SPECIAL_SALMON = '12';
    case SPECIAL_TROUT = '13';

    public function getLabel(): string
    {
        return match ($this) {
            self::NONE => 'Bez jídla',
            self::STANDARD_TRADITIONAL => 'Standardní menu – Tradiční',
            self::STANDARD_CHICKEN => 'Standardní menu – Kuřecí',
            self::STANDARD_VEGETARIAN => 'Standardní menu – Vegetariánské',
            self::SPECIAL_SEMIKOSHER => 'Speciální menu – Semikošer',
            self::SPECIAL_PORK_KNEE => 'Speciální menu – Vepřové koleno',
            self::SPECIAL_DUCK => 'Speciální menu – Kachna',
            self::SPECIAL_CHICKEN_HALAL => 'Speciální menu – Kuřecí halal',
            self::SPECIAL_SALMON => 'Speciální menu – Losos',
            self::SPECIAL_TROUT => 'Speciální menu – Pstruh',
        };
    }

    public function getPrice(): int
    {
        return match ($this) {
            self::NONE,
            self::STANDARD_TRADITIONAL,
            self::STANDARD_CHICKEN,
            self::STANDARD_VEGETARIAN => 0,
            default => 75,
        };
    }
}