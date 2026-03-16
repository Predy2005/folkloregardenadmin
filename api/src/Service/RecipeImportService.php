<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Recipe;
use App\Entity\RecipeIngredient;
use App\Entity\StockItem;
use Doctrine\ORM\EntityManagerInterface;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class RecipeImportService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
    ) {
    }

    /**
     * Import recipes from an XLSX file.
     *
     * @param string   $filePath   Absolute path to the XLSX file
     * @param string[] $skipSheets Sheet names to skip
     * @return array{recipes: int, stockItems: int, ingredients: int, skipped: string[], errors: string[]}
     */
    public function importFromFile(string $filePath, array $skipSheets = ['VZOR TABULKY']): array
    {
        $spreadsheet = IOFactory::load($filePath);
        $sheetNames = $spreadsheet->getSheetNames();

        $stockItemRepo = $this->em->getRepository(StockItem::class);
        $recipeRepo = $this->em->getRepository(Recipe::class);
        $riRepo = $this->em->getRepository(RecipeIngredient::class);

        // Cache stock items by name for deduplication
        $stockItemCache = [];
        foreach ($stockItemRepo->findAll() as $si) {
            $stockItemCache[mb_strtolower($si->getName())] = $si;
        }

        $totalRecipes = 0;
        $totalIngredients = 0;
        $totalStockItems = 0;
        $skipped = [];
        $errors = [];

        foreach ($sheetNames as $sheetName) {
            if (in_array($sheetName, $skipSheets, true)) {
                $skipped[] = $sheetName;
                continue;
            }

            $sheet = $spreadsheet->getSheetByName($sheetName);
            if (!$sheet) {
                continue;
            }

            $parsed = $this->parseRecipeSheet($sheet);
            if (!$parsed) {
                $errors[] = "Nepodařilo se zpracovat list: {$sheetName}";
                continue;
            }

            // Create/find Recipe
            $recipe = $recipeRepo->findOneBy(['name' => $parsed['name']]);
            $isNewRecipe = false;
            if (!$recipe) {
                $recipe = new Recipe();
                $recipe->setName($parsed['name']);
                $isNewRecipe = true;
            }
            $recipe->setPortions($parsed['portions']);
            $recipe->setDescription($parsed['procedure']);
            if ($parsed['portionWeight'] > 0) {
                $recipe->setPortionWeight((string) $parsed['portionWeight']);
            }

            if ($isNewRecipe) {
                $this->em->persist($recipe);
            }

            $totalRecipes++;

            // Process ingredients
            foreach ($parsed['ingredients'] as $ing) {
                $ingName = $ing['name'];
                $ingKey = mb_strtolower($ingName);
                $qty = $ing['quantity'];
                $pricePerKg = $ing['pricePerKg'];
                $supplier = $ing['supplier'];

                $unit = $this->guessUnit($ingName);

                // Find or create StockItem
                $stockItem = $stockItemCache[$ingKey] ?? null;
                if (!$stockItem) {
                    $stockItem = new StockItem();
                    $stockItem->setName($ingName);
                    $stockItem->setUnit($unit);
                    $stockItem->setQuantityAvailable('0.00');
                    if ($supplier) {
                        $stockItem->setSupplier($supplier);
                    }
                    if ($pricePerKg !== null) {
                        $stockItem->setPricePerUnit((string) round($pricePerKg, 2));
                    }
                    $this->em->persist($stockItem);
                    $stockItemCache[$ingKey] = $stockItem;
                    $totalStockItems++;
                } else {
                    if ($pricePerKg !== null && $stockItem->getPricePerUnit() === null) {
                        $stockItem->setPricePerUnit((string) round($pricePerKg, 2));
                    }
                    if ($supplier && !$stockItem->getSupplier()) {
                        $stockItem->setSupplier($supplier);
                    }
                }

                // Create RecipeIngredient (skip if exists)
                $existing = $riRepo->findOneBy([
                    'recipe' => $recipe,
                    'stockItem' => $stockItem,
                ]);

                if (!$existing) {
                    $ri = new RecipeIngredient();
                    $ri->setRecipe($recipe);
                    $ri->setStockItem($stockItem);
                    $ri->setQuantityRequired((string) $qty);
                    $this->em->persist($ri);
                    $totalIngredients++;
                } else {
                    if ((float) $existing->getQuantityRequired() !== (float) $qty) {
                        $existing->setQuantityRequired((string) $qty);
                    }
                }
            }
        }

        $this->em->flush();

        return [
            'recipes' => $totalRecipes,
            'stockItems' => $totalStockItems,
            'ingredients' => $totalIngredients,
            'skipped' => $skipped,
            'errors' => $errors,
        ];
    }

    /**
     * Parse a single sheet into recipe data.
     */
    private function parseRecipeSheet(Worksheet $sheet): ?array
    {
        $recipeName = $sheet->getCell('D3')->getValue();
        if (!$recipeName) {
            return null;
        }

        $portions = (int) ($sheet->getCell('D2')->getValue() ?: 1);
        $portionWeight = (float) ($sheet->getCell('C4')->getValue() ?: 0);

        $ingredients = [];
        $procedure = null;

        $maxRow = $sheet->getHighestRow();

        for ($row = 7; $row <= $maxRow; $row++) {
            $colA = trim((string) ($sheet->getCell("A{$row}")->getValue() ?? ''));

            if (str_starts_with($colA, 'Hmotnost potravin celkem')) {
                break;
            }

            if ($colA === '') {
                continue;
            }

            $qty = $sheet->getCell("E{$row}")->getValue();
            if ($qty === null || (float) $qty <= 0) {
                continue;
            }

            $supplierRaw = $sheet->getCell("D{$row}")->getValue();
            $supplier = is_string($supplierRaw) ? $supplierRaw : null;
            $pricePerKg = $sheet->getCell("H{$row}")->getValue();

            $ingredients[] = [
                'name' => $colA,
                'quantity' => (float) $qty,
                'supplier' => $supplier,
                'pricePerKg' => $pricePerKg !== null ? (float) $pricePerKg : null,
            ];
        }

        // Find procedure text
        for ($row = 7; $row <= $maxRow; $row++) {
            $colA = trim((string) ($sheet->getCell("A{$row}")->getValue() ?? ''));
            if ($colA === 'Recept:') {
                $procedure = trim((string) ($sheet->getCell("C{$row}")->getValue() ?? ''));
                break;
            }
        }

        if (empty($ingredients)) {
            return null;
        }

        return [
            'name' => trim($recipeName),
            'portions' => $portions,
            'portionWeight' => $portionWeight,
            'ingredients' => $ingredients,
            'procedure' => $procedure ?: null,
        ];
    }

    private function guessUnit(string $name): string
    {
        $lower = mb_strtolower($name);
        $liquidKeywords = ['olej', 'olivový', 'ocet', 'šlehačka', 'mléko', 'víno', 'voda'];

        foreach ($liquidKeywords as $keyword) {
            if (str_contains($lower, $keyword)) {
                return 'l';
            }
        }

        return 'kg';
    }
}
