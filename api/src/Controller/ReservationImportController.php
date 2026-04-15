<?php
declare(strict_types=1);

namespace App\Controller;

use App\Service\Import\ExcelReservationReader;
use App\Service\Import\ReservationImportService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * HTTP endpoints driving the bulk-import UI for "Priprava akce DD_M_YYYY.xlsx".
 */
#[Route('/api/reservations/import')]
class ReservationImportController extends AbstractController
{
    public function __construct(
        private readonly ExcelReservationReader $reader,
        private readonly ReservationImportService $importService,
    ) {
        // PhpSpreadsheet needs a lot of memory; bump runtime limit when this
        // controller is hit. Default 128M is exhausted around ~10 xlsx files.
        @ini_set('memory_limit', '512M');
    }

    /**
     * Multipart upload of one or more xlsx files. Returns parsed drafts and
     * statistics — does NOT touch the database.
     *
     * Request: multipart/form-data with files[] (one or more)
     * Response: { files: [...], stats: {...} }
     */
    #[Route('/preview', methods: ['POST'])]
    #[IsGranted('reservations.create')]
    public function preview(Request $request): JsonResponse
    {
        /** @var UploadedFile[] $files */
        $files = $request->files->all('files');
        if (empty($files)) {
            return $this->json(['error' => 'Nahrejte alespoň jeden xlsx soubor.'], Response::HTTP_BAD_REQUEST);
        }

        return $this->json($this->processFiles($files));
    }

    /**
     * Same shape as /preview but commits the parsed drafts to the database.
     * Skips/updates duplicates based on the natural key (date|venue|row).
     */
    #[Route('/commit', methods: ['POST'])]
    #[IsGranted('reservations.create')]
    public function commit(Request $request): JsonResponse
    {
        /** @var UploadedFile[] $files */
        $files = $request->files->all('files');
        if (empty($files)) {
            return $this->json(['error' => 'Nahrejte alespoň jeden xlsx soubor.'], Response::HTTP_BAD_REQUEST);
        }

        $payload = $this->processFiles($files);
        $importStats = ['created' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => 0];
        $errors = [];

        foreach ($payload['files'] as &$fileResult) {
            foreach ($fileResult['drafts'] as &$draft) {
                try {
                    // Reconstruct DateTimeImmutable from JSON-friendly shape
                    $internal = $this->reader->draftFromArray($draft);
                    $result = $this->importService->importDraft($internal);
                    $importStats[$result['action']] = ($importStats[$result['action']] ?? 0) + 1;
                    $draft['result'] = $result;
                } catch (\Throwable $e) {
                    $importStats['errors']++;
                    $errors[] = $e->getMessage();
                    $draft['result'] = ['action' => 'error', 'message' => $e->getMessage()];
                }
            }
        }

        $payload['importStats'] = $importStats;
        $payload['errors'] = $errors;
        return $this->json($payload);
    }

    /**
     * Shared file-processing path used by both preview and commit.
     *
     * @param UploadedFile[] $files
     * @return array{files: list<array<string,mixed>>, stats: array<string,mixed>}
     */
    private function processFiles(array $files): array
    {
        $allDrafts = [];
        $statsBySection = [];
        $statsByVenue = [];
        $totalReservations = 0;
        $totalCancelled = 0;

        $fileResults = [];
        foreach ($files as $file) {
            if (!$file instanceof UploadedFile) continue;
            $original = $file->getClientOriginalName();
            $tmpPath = $file->getPathname();
            $result = $this->reader->readFile($tmpPath, $original);

            $jsonDrafts = array_map(
                fn(array $d) => $this->reader->draftToArray($d),
                $result['drafts']
            );

            $fileResults[] = [
                'filename' => $original,
                'eventDate' => $result['eventDate']?->format('Y-m-d'),
                'error' => $result['error'],
                'drafts' => $jsonDrafts,
                'count' => count($jsonDrafts),
            ];

            foreach ($result['drafts'] as $d) {
                $totalReservations++;
                if ($d['status'] === 'CANCELLED') $totalCancelled++;
                $statsBySection[$d['section'] ?? 'NONE'] = ($statsBySection[$d['section'] ?? 'NONE'] ?? 0) + 1;
                $statsByVenue[$d['venue']] = ($statsByVenue[$d['venue']] ?? 0) + 1;
                $allDrafts[] = $d;
            }
        }

        return [
            'files' => $fileResults,
            'stats' => [
                'totalFiles' => count($fileResults),
                'totalReservations' => $totalReservations,
                'cancelled' => $totalCancelled,
                'bySection' => $statsBySection,
                'byVenue' => $statsByVenue,
            ],
        ];
    }
}
