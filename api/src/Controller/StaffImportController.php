<?php
declare(strict_types=1);

namespace App\Controller;

use App\Service\Import\StaffExcelImportService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Hromadný import personálu z xlsx (PersonálFG.xlsx).
 *
 * `/preview` jen parsuje a vrací drafty (žádný DB write).
 * `/commit` přijímá uživatelem upravené drafty a zapisuje je do DB.
 */
#[Route('/api/staff/import')]
class StaffImportController extends AbstractController
{
    public function __construct(
        private readonly StaffExcelImportService $importer,
    ) {
        @ini_set('memory_limit', '512M');
    }

    #[Route('/preview', methods: ['POST'])]
    #[IsGranted('staff.create')]
    public function preview(Request $request): JsonResponse
    {
        /** @var UploadedFile|null $file */
        $file = $request->files->get('file');
        if (!$file instanceof UploadedFile) {
            return $this->json(['error' => 'Nahrejte xlsx soubor (pole "file").'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $result = $this->importer->readFile($file->getPathname());
        } catch (\Throwable $e) {
            return $this->json(['error' => 'Nepodařilo se přečíst soubor: ' . $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json($result);
    }

    #[Route('/commit', methods: ['POST'])]
    #[IsGranted('staff.create')]
    public function commit(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !isset($data['drafts']) || !is_array($data['drafts'])) {
            return $this->json(['error' => 'Očekáváno JSON tělo s polem "drafts".'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $result = $this->importer->importDrafts($data['drafts']);
        } catch (\Throwable $e) {
            return $this->json(['error' => 'Import selhal: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return $this->json($result, Response::HTTP_CREATED);
    }
}
