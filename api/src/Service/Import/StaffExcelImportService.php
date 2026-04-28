<?php
declare(strict_types=1);

namespace App\Service\Import;

use App\Entity\StaffMember;
use App\Repository\StaffMemberRepository;
use Doctrine\ORM\EntityManagerInterface;
use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * Parsuje "PersonálFG.xlsx" do draftů `StaffMember`.
 *
 * Excel struktura:
 *   - Sekce: jeden řádek s názvem pozice ve sloupci A (ostatní sloupce prázdné),
 *     např. "ČÍŠNÍK", "KUCHAŘ", "POMOCNÉ SÍLY", "KAPELA"
 *   - Druhý řádek "Jméno | Příjmení | Kontakt"
 *   - Datové řádky: A=jméno, B=příjmení, C=telefon
 *   - Mezi sekcemi prázdné řádky
 */
final class StaffExcelImportService
{
    /** Mapování názvu sekce v Excelu → kanonický kód `position` v DB. */
    private const SECTION_TO_POSITION = [
        'ČÍŠNÍK'        => 'WAITER',
        'CISNIK'        => 'WAITER',
        'KUCHAŘ'        => 'CHEF',
        'KUCHAR'        => 'CHEF',
        'POMOCNÉ SÍLY'  => 'CLEANER',
        'POMOCNE SILY'  => 'CLEANER',
        'KAPELA'        => 'MUSICIAN',
        'BARMAN'        => 'BARTENDER',
        'HOSTESKA'      => 'HOSTESS',
        'OCHRANKA'      => 'SECURITY',
        'ŘIDIČ'         => 'DRIVER',
        'RIDIC'         => 'DRIVER',
    ];

    public function __construct(
        private readonly StaffMemberRepository $staffRepo,
        private readonly EntityManagerInterface $em,
    ) {}

    /**
     * Načte xlsx a vrátí drafts pro UI preview.
     *
     * @return array{drafts: list<array<string,mixed>>, stats: array<string,int>}
     */
    public function readFile(string $path): array
    {
        $reader = IOFactory::createReader('Xlsx');
        $reader->setReadDataOnly(true);
        $spreadsheet = $reader->load($path);
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray(null, true, true, true);

        $drafts = [];
        $currentPosition = null;
        $currentSection = null;

        foreach ($rows as $row) {
            $a = $this->cleanCell($row['A'] ?? null);
            $b = $this->cleanCell($row['B'] ?? null);
            $c = $this->cleanCell($row['C'] ?? null);

            // Prázdný řádek
            if ($a === '' && $b === '' && $c === '') {
                continue;
            }

            // Sekce: jen sloupec A vyplněný a obsahuje známou pozici
            if ($a !== '' && $b === '' && $c === '') {
                $position = $this->resolvePosition($a);
                if ($position !== null) {
                    $currentPosition = $position;
                    $currentSection = $a;
                }
                continue;
            }

            // Hlavička "Jméno | Příjmení | Kontakt" → přeskočit
            if (str_contains(mb_strtolower($a), 'jméno')
                || str_contains(mb_strtolower($a), 'jmeno')) {
                continue;
            }

            // Datový řádek
            if ($a === '' && $b === '') {
                continue;
            }

            $phone = $this->normalizePhone($c);
            $existing = $this->findExistingMember($a, $b, $phone);

            $drafts[] = [
                'firstName' => $a,
                'lastName' => $b,
                'phone' => $phone !== '' ? $phone : null,
                'phoneRaw' => $c !== '' ? $c : null,
                'position' => $currentPosition,
                'sourceSection' => $currentSection,
                'existingId' => $existing?->getId(),
                'status' => $existing !== null ? 'EXISTS' : 'NEW',
            ];
        }

        $stats = [
            'total' => count($drafts),
            'new' => 0,
            'exists' => 0,
        ];
        foreach ($drafts as $d) {
            if ($d['status'] === 'NEW') $stats['new']++;
            else $stats['exists']++;
        }

        return ['drafts' => $drafts, 'stats' => $stats];
    }

    /**
     * Vytvoří `StaffMember` entity z draftů.
     *
     * @param array<int, array<string,mixed>> $drafts
     * @return array{created:int, skipped:int, errors:array<int,string>}
     */
    public function importDrafts(array $drafts): array
    {
        $created = 0;
        $skipped = 0;
        $errors = [];

        foreach ($drafts as $idx => $d) {
            $firstName = trim((string)($d['firstName'] ?? ''));
            $lastName = trim((string)($d['lastName'] ?? ''));
            $phone = isset($d['phone']) && $d['phone'] !== null ? $this->normalizePhone((string)$d['phone']) : null;
            $position = isset($d['position']) ? (string)$d['position'] : null;

            if ($firstName === '' || $lastName === '') {
                $errors[$idx] = 'Chybí jméno nebo příjmení';
                continue;
            }

            // Re-check existence (ochrana proti race condition i proti situaci,
            // kdy uživatel mezi preview a commit někoho přidal ručně).
            $existing = $this->findExistingMember($firstName, $lastName, $phone);
            if ($existing !== null) {
                $skipped++;
                continue;
            }

            $member = new StaffMember();
            $member->setFirstName($firstName);
            $member->setLastName($lastName);
            $member->setPhone($phone !== '' ? $phone : null);
            if ($position !== null && $position !== '') {
                $member->setPosition($position);
            }
            $member->setIsActive(true);

            $this->em->persist($member);
            $created++;
        }

        $this->em->flush();

        return ['created' => $created, 'skipped' => $skipped, 'errors' => $errors];
    }

    private function cleanCell(mixed $v): string
    {
        if ($v === null) return '';
        $s = is_string($v) ? $v : (string)$v;
        return trim($s);
    }

    private function resolvePosition(string $sectionName): ?string
    {
        $key = mb_strtoupper(trim($sectionName));
        return self::SECTION_TO_POSITION[$key] ?? null;
    }

    /**
     * Telefon: necháme jen číslice a vedoucí "+". 9-místné CZ číslo prefixujeme +420.
     */
    private function normalizePhone(string $raw): string
    {
        if ($raw === '') return '';
        $hasPlus = str_starts_with(trim($raw), '+');
        $digits = preg_replace('/\D+/', '', $raw) ?? '';
        if ($digits === '') return '';
        if ($hasPlus) {
            return '+' . $digits;
        }
        if (strlen($digits) === 9) {
            return '+420' . $digits;
        }
        return $digits;
    }

    private function findExistingMember(string $firstName, string $lastName, ?string $phone): ?StaffMember
    {
        // 1) Match podle telefonu (po normalizaci) - nejjistější
        if ($phone !== null && $phone !== '') {
            $byPhone = $this->staffRepo->findOneBy(['phone' => $phone]);
            if ($byPhone !== null) return $byPhone;
        }

        // 2) Match podle (firstName, lastName) - case-insensitive porovnání
        $candidates = $this->staffRepo->findBy(['lastName' => $lastName]);
        foreach ($candidates as $c) {
            if (mb_strtolower(trim($c->getFirstName())) === mb_strtolower(trim($firstName))) {
                return $c;
            }
        }
        return null;
    }
}
