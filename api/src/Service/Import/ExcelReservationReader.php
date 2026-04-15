<?php
declare(strict_types=1);

namespace App\Service\Import;

use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * Reads xlsx files in the "Priprava akce DD_M_YYYY[ ...].xlsx" format and
 * returns parsed reservation drafts.
 *
 * Stateless and reusable from both the CLI command and HTTP controllers.
 */
class ExcelReservationReader
{
    public function __construct(private readonly ExcelReservationParser $parser)
    {
    }

    /** Excel column → field name in $raw array */
    private const COLUMNS = [
        'A' => 'company',
        'B' => 'hotel',
        'C' => 'kontakt',
        'D' => 'pax',
        'E' => 'free',
        'F' => 'voucher',
        'G' => 'cc',
        'H' => 'czk',
        'I' => 'eur',
        'J' => 'menu',
        'K' => 'drinks',
        'L' => 'narodnost',
        'M' => 'platba',
        'N' => 'pickup',
        'O' => 'zalohovka',
        'P' => 'poznamky',
    ];

    private const SECTION_HEADERS = ['CESTOVKY', 'PRŮVODCI', 'WEB', 'HOTELY', 'INSPEKCE'];

    /**
     * Read a single xlsx file and return all extracted reservation drafts.
     *
     * @return array{drafts: list<array<string,mixed>>, eventDate: ?\DateTimeImmutable, error: ?string}
     */
    public function readFile(string $filePath, ?string $originalFilename = null): array
    {
        $nameForDate = $originalFilename ?? basename($filePath);
        $eventDate = $this->parser->parseFilenameDate($nameForDate);
        if (!$eventDate) {
            return ['drafts' => [], 'eventDate' => null, 'error' => "Nelze parsovat datum z názvu: $nameForDate"];
        }

        try {
            $ss = IOFactory::load($filePath);
        } catch (\Throwable $e) {
            return ['drafts' => [], 'eventDate' => $eventDate, 'error' => 'Nelze otevřít soubor: ' . $e->getMessage()];
        }

        $drafts = [];
        foreach ($ss->getAllSheets() as $sheet) {
            $venue = $sheet->getTitle();
            if ($venue === 'Transfery') continue;

            $currentSection = null;
            for ($r = 7; $r <= 35; $r++) {
                $g = trim((string) $sheet->getCell('G' . $r)->getCalculatedValue());
                if (in_array($g, self::SECTION_HEADERS, true)) {
                    $currentSection = $g;
                    continue;
                }

                $raw = [];
                foreach (self::COLUMNS as $col => $field) {
                    $val = $sheet->getCell($col . $r)->getCalculatedValue();
                    if ($val !== null && $val !== '' && $val !== 0 && $val !== '0') {
                        $raw[$field] = is_string($val) ? trim($val) : $val;
                    }
                }

                $company = (string) ($raw['company'] ?? '');
                if ($this->parser->isHeaderOrTotalRow($company)) continue;
                if (!isset($raw['company']) && !isset($raw['kontakt']) && !isset($raw['pax'])) continue;

                $drafts[] = $this->buildDraft($raw, $eventDate, $venue, $currentSection, $r);
            }
        }

        return ['drafts' => $drafts, 'eventDate' => $eventDate, 'error' => null];
    }

    /**
     * @param array<string,mixed> $raw
     * @return array<string,mixed>
     */
    public function buildDraft(array $raw, \DateTimeImmutable $date, string $venue, ?string $section, int $rowNumber): array
    {
        $warnings = [];

        $payment = isset($raw['platba'])
            ? $this->parser->parsePayment((string) $raw['platba'])
            : ['price' => null, 'currency' => null, 'paymentMethod' => null, 'raw' => ''];

        $menu = isset($raw['menu']) ? $this->parser->parseMenu((string) $raw['menu']) : [];
        $drinks = isset($raw['drinks']) ? $this->parser->parseDrinks((string) $raw['drinks']) : null;
        $status = isset($raw['poznamky']) ? $this->parser->parseStatus((string) $raw['poznamky']) : 'RECEIVED';
        $pickup = isset($raw['pickup']) ? $this->parser->parsePickup($raw['pickup']) : null;
        $contact = isset($raw['kontakt']) ? $this->parser->parseContact((string) $raw['kontakt']) : ['name' => null, 'phone' => null];

        $pax = isset($raw['pax']) && is_numeric($raw['pax']) ? (int) $raw['pax'] : 0;
        $free = isset($raw['free']) && is_numeric($raw['free']) ? (int) $raw['free'] : 0;

        if ($pax === 0 && empty($raw['company'])) $warnings[] = 'Žádný počet osob ani jméno firmy';
        if (empty($menu) && !empty($raw['menu']) && stripos((string) $raw['menu'], 'upřesn') === false) {
            $warnings[] = 'Menu nerozpoznáno: ' . $raw['menu'];
        }
        if ($payment['price'] === null && !empty($raw['platba']) && !preg_match('/\bfa\b/i', (string) $raw['platba'])) {
            $warnings[] = 'Cena nerozpoznána: ' . $raw['platba'];
        }
        foreach ($menu as $m) {
            if ($m['foodId'] === null) $warnings[] = 'Položka menu bez mappingu: ' . $m['label'];
        }

        return [
            'date' => $date,
            'venue' => $venue,
            'section' => $section,
            'rowNumber' => $rowNumber,
            'pax' => $pax,
            'free' => $free,
            'menu' => $menu,
            'drinks' => $drinks,
            'pickup' => $pickup,
            'status' => $status,
            'parsedPayment' => $payment,
            'parsedContact' => $contact,
            'raw' => $raw,
            'warnings' => $warnings,
        ];
    }

    /**
     * Convert a draft into a JSON-serializable shape (DateTimeImmutable → string).
     *
     * @param array<string,mixed> $draft
     * @return array<string,mixed>
     */
    public function draftToArray(array $draft): array
    {
        $out = $draft;
        $out['date'] = $draft['date']->format('Y-m-d');
        return $out;
    }

    /**
     * Reverse of draftToArray — used by HTTP controllers when receiving an
     * edited preview back from the frontend before commit.
     *
     * @param array<string,mixed> $arr
     * @return array<string,mixed>
     */
    public function draftFromArray(array $arr): array
    {
        $out = $arr;
        if (isset($arr['date']) && is_string($arr['date'])) {
            $out['date'] = new \DateTimeImmutable($arr['date']);
        }
        return $out;
    }
}
