<?php
declare(strict_types=1);

namespace App\Service\Import;

/**
 * Stateless parsing helpers for the Roubenka/Altán Excel format
 * (Priprava akce DD_M_YYYY[ ...].xlsx).
 *
 * Each method takes a raw cell value and returns a structured representation.
 * Methods never throw — when input cannot be parsed they return null/defaults
 * and add a warning to the optional `$warnings` ref array.
 */
class ExcelReservationParser
{
    /** Maps free-text drinks → ReservationPerson::drinkOption enum value. */
    private const DRINK_MAP = [
        'neomezeně' => 'allin',
        'neomezene' => 'allin',
        'neomezně'  => 'allin',
        'neomezne'  => 'allin',
        'neomezen'  => 'allin',
        'all in'    => 'allin',
        'allin'     => 'allin',
        '1 drink'   => 'welcome',
        'welcome'   => 'welcome',
        'bez pití'  => 'none',
        'bez piti'  => 'none',
        'no drink'  => 'none',
    ];

    /**
     * Maps free-text menu names → reservation_foods.external_id (string).
     * Order matters: longer/more specific keys are checked first.
     */
    private const MENU_MAP = [
        'semikošer'     => '8',  // Speciální semikošer (Czech spelling)
        'semikoser'     => '8',
        'kosher'        => '8',
        'semikosher'    => '8',
        'halal'         => '11', // Speciální kuřecí halal
        'pstruh'        => '13', // Speciální pstruh
        'kachna'        => '10', // Speciální kachna
        'losos'         => '12', // Speciální losos
        'koleno'        => '9',  // Vepřové koleno
        'vepřové'       => '9',
        'vegetar'       => '7',  // Vegetariánské
        'veg'           => '7',
        'kuřecí'        => '6',  // Standardní kuřecí
        'kuře'          => '6',
        'tradice'       => '5',  // Standardní tradiční
        'tradiční'      => '5',
        'tradicni'      => '5',
    ];

    /**
     * Parse "Platební podmínky" cell into structured payment info.
     *
     * @return array{price: ?float, currency: ?string, paymentMethod: ?string, raw: string}
     */
    public function parsePayment(string $text): array
    {
        $text = trim($text);
        $lower = mb_strtolower($text);

        // Price + currency: "26 eur/os", "850 Kč/os", "975 Kč/os.", "1 000/os"
        // Allow thousand-separator space inside the number ("1 000", "1 250").
        $price = null;
        $currency = null;
        $numberRegex = '(\d{1,3}(?:[\s\xC2\xA0]\d{3})*(?:[.,]\d+)?|\d+(?:[.,]\d+)?)';
        if (preg_match('/' . $numberRegex . '\s*(eur|€|kč|kc|czk)?\s*\.?\s*\/?\s*os/iu', $text, $m)) {
            $price = (float) str_replace([' ', "\xC2\xA0", ','], ['', '', '.'], $m[1]);
            $cur = isset($m[2]) ? mb_strtolower($m[2]) : '';
            $currency = ($cur === 'eur' || $cur === '€') ? 'EUR' : ($cur ? 'CZK' : null);
        } elseif (preg_match('/' . $numberRegex . '\s*(eur|€|kč|kc|czk)/iu', $text, $m)) {
            // total amount without /os, use cautiously
            $price = (float) str_replace([' ', "\xC2\xA0", ','], ['', '', '.'], $m[1]);
            $cur = mb_strtolower($m[2]);
            $currency = ($cur === 'eur' || $cur === '€') ? 'EUR' : 'CZK';
        }

        // Payment method
        $method = null;
        if (preg_match('/\b(proforma|záloha|zaloha)\b/iu', $lower)) {
            $method = 'DEPOSIT';
        } elseif (preg_match('/\b(cc|card|karta)\b/iu', $lower)) {
            $method = 'CARD';
        } elseif (preg_match('/\b(cash|hotov|u nás)\b/iu', $lower)) {
            $method = 'CASH';
        } elseif (preg_match('/\b(fa|faktura)\b/iu', $lower)) {
            $method = 'INVOICE';
        }

        return [
            'price' => $price,
            'currency' => $currency,
            'paymentMethod' => $method,
            'raw' => $text,
        ];
    }

    /**
     * Parse "Menu" cell into one or more menu items with counts.
     *
     * Examples:
     *   "tradiční"        → [['foodId'=>'5','count'=>1,'label'=>'tradiční']]
     *   "2x tradice"      → [['foodId'=>'5','count'=>2,'label'=>'tradice']]
     *   "losos + kuře"    → [['foodId'=>'12','count'=>1], ['foodId'=>'6','count'=>1]]
     *   "5x kuře"         → [['foodId'=>'6','count'=>5]]
     *   "upřesnit"        → []
     *
     * @return array<int,array{foodId:?string,count:int,label:string}>
     */
    public function parseMenu(string $text): array
    {
        $text = trim($text);
        $lower = mb_strtolower($text);

        if ($lower === '' || $lower === 'upřesnit' || $lower === 'upresnit') {
            return [];
        }

        // Split by separators (+, ;, /, ',', "a")
        $segments = preg_split('/[+;,]|\s\/\s|\sa\s/u', $text) ?: [];
        $result = [];

        foreach ($segments as $seg) {
            $seg = trim($seg);
            if ($seg === '') continue;

            // Extract optional count prefix: "2x tradice", "3 chody", "4xveg"
            $count = 1;
            if (preg_match('/^(\d+)\s*x\s*(.+)$/iu', $seg, $m)) {
                $count = (int) $m[1];
                $seg = trim($m[2]);
            } elseif (preg_match('/^(\d+)\s+(.+)$/u', $seg, $m)) {
                $count = (int) $m[1];
                $seg = trim($m[2]);
            }

            $foodId = $this->matchMenuKeyword($seg);
            $result[] = [
                'foodId' => $foodId,
                'count' => $count,
                'label' => $seg,
            ];
        }

        return $result;
    }

    private function matchMenuKeyword(string $text): ?string
    {
        $lower = mb_strtolower($text);
        foreach (self::MENU_MAP as $needle => $foodId) {
            if (str_contains($lower, $needle)) {
                return $foodId;
            }
        }
        return null;
    }

    /**
     * Parse "Drinks" cell into ReservationPerson::drinkOption enum value.
     */
    public function parseDrinks(string $text): ?string
    {
        $lower = mb_strtolower(trim($text));
        if ($lower === '' || $lower === 'upřesnit' || $lower === 'upresnit') {
            return null;
        }
        foreach (self::DRINK_MAP as $needle => $value) {
            if (str_contains($lower, $needle)) {
                return $value;
            }
        }
        return null;
    }

    /**
     * Parse status from "Poznámky" free-text cell.
     */
    public function parseStatus(string $poznamky): string
    {
        $lower = mb_strtolower($poznamky);
        if (str_contains($lower, 'storno') || str_contains($lower, 'zrušeno') || str_contains($lower, 'cancel')) {
            return 'CANCELLED';
        }
        if (str_contains($lower, 'potvrz')) {
            return 'CONFIRMED';
        }
        if (str_contains($lower, 'rezervace')) {
            return 'CONFIRMED';
        }
        return 'RECEIVED';
    }

    /**
     * Parse pickup cell. Excel stores times as fraction-of-day (0.7916666 = 19:00).
     */
    public function parsePickup(mixed $cell): ?string
    {
        if ($cell === null || $cell === '' || $cell === 'X' || $cell === 'x') {
            return null;
        }
        // Numeric → Excel time fraction
        if (is_numeric($cell)) {
            $f = (float) $cell;
            if ($f >= 0 && $f < 2) {
                $totalMinutes = (int) round($f * 24 * 60);
                $h = intdiv($totalMinutes, 60);
                $m = $totalMinutes % 60;
                return sprintf('%02d:%02d', $h % 24, $m);
            }
        }
        return is_string($cell) ? trim($cell) : (string) $cell;
    }

    /**
     * Parse "Kontakt" free-text into name + phone (best-effort).
     *
     * @return array{name: ?string, phone: ?string}
     */
    public function parseContact(string $text): array
    {
        $text = trim($text);
        if ($text === '' || mb_strtolower($text) === 'upřesnit') {
            return ['name' => null, 'phone' => null];
        }

        // Extract phone-like substring (with optional + and at least 6 digits)
        $phone = null;
        if (preg_match('/(\+?\d[\d\s\-]{6,}\d)/u', $text, $m)) {
            $phone = trim($m[1]);
            $name = trim(str_replace($m[1], '', $text));
            $name = $name !== '' ? $name : null;
        } else {
            $name = $text;
        }

        return ['name' => $name, 'phone' => $phone];
    }

    /**
     * Parse `Priprava akce DD_M_YYYY[ ...].xlsx` filename → date.
     */
    public function parseFilenameDate(string $filename): ?\DateTimeImmutable
    {
        $base = basename($filename);
        if (preg_match('/(\d{1,2})_(\d{1,2})_(\d{4})/', $base, $m)) {
            try {
                return new \DateTimeImmutable(sprintf('%04d-%02d-%02d', (int) $m[3], (int) $m[2], (int) $m[1]));
            } catch (\Exception) {
                return null;
            }
        }
        return null;
    }

    /**
     * Detect if a "Company" string is in fact a layout/total/section row that
     * should be ignored.
     */
    public function isHeaderOrTotalRow(string $company): bool
    {
        $company = trim($company);
        if ($company === '') return true;
        $upper = mb_strtoupper($company);
        $skipPrefixes = ['VÝDAJE', 'PŘÍJMY', 'VÝSLEDEK', 'TOTAL', 'CESTOVKY', 'PRŮVODCI', 'WEB', 'HOTELY', 'INSPEKCE'];
        foreach ($skipPrefixes as $p) {
            if (str_starts_with($upper, $p)) return true;
        }
        $skipExact = ['Číšníci', 'Manažer', 'Kuchař', 'Pomocné síly', 'Moderátorka', 'Muzikanti', 'Tanečníci', 'Fotografky', 'Šperky', 'Účtenky', 'Medovina', 'Nápoje'];
        foreach ($skipExact as $s) {
            if (mb_strtolower($company) === mb_strtolower($s)) return true;
        }
        return false;
    }
}
