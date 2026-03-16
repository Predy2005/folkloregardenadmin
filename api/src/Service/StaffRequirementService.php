<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Event;
use App\Entity\EventStaffRequirement;
use App\Repository\EventStaffRequirementRepository;
use App\Repository\StaffingFormulaRepository;
use App\Repository\StaffRoleRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Service for calculating and managing staff requirements per event.
 */
class StaffRequirementService
{
    // Category translations
    private const CATEGORY_LABELS = [
        'waiter' => 'Číšníci',
        'chef' => 'Kuchaři',
        'coordinator' => 'Koordinátoři',
        'bartender' => 'Barmani',
        'hostess' => 'Hostesky',
        'security' => 'Ochranka',
        'musician' => 'Hudebníci',
        'dancer' => 'Tanečníci',
        'photographer' => 'Fotografové',
        'sound_tech' => 'Zvukaři',
        'cleaner' => 'Úklid',
        'driver' => 'Řidiči',
        'manager' => 'Manažeři',
        'helper' => 'Pomocné síly',
        'host' => 'Moderátoři',
    ];

    public function __construct(
        private EntityManagerInterface $em,
        private EventStaffRequirementRepository $requirementRepo,
        private StaffingFormulaRepository $formulaRepo,
        private StaffRoleRepository $roleRepo,
    ) {
    }

    /**
     * Recalculate staff requirements for an event based on formulas.
     * This will replace auto-calculated values but preserve manual overrides.
     *
     * @param bool $forceOverwrite If true, also overwrites manual overrides
     * @return EventStaffRequirement[] The calculated requirements
     */
    public function recalculateRequirements(Event $event, bool $forceOverwrite = false): array
    {
        $totalGuests = $event->getGuestsTotal();
        $eventType = $event->getEventType();

        // Debug: Log input values
        error_log("StaffRequirementService::recalculateRequirements - Event: {$event->getId()}, Type: {$eventType}, Guests: {$totalGuests}");

        // Get existing requirements
        $existingRequirements = $this->requirementRepo->findByEvent($event);
        $existingByCategory = [];
        foreach ($existingRequirements as $req) {
            $existingByCategory[$req->getCategory()] = $req;
        }

        // Get applicable formulas
        $formulas = $this->getApplicableFormulas($eventType);

        // Debug: Log formula count
        error_log("StaffRequirementService::recalculateRequirements - Found " . count($formulas) . " applicable formulas for type: {$eventType}");

        $results = [];
        $processedCategories = [];

        foreach ($formulas as $formula) {
            $category = $this->normalizeCategory($formula->getCategory());
            $ratio = $formula->getRatio();
            $requiredCount = $ratio > 0 ? (int) ceil($totalGuests / $ratio) : 0;
            $roleId = $this->getRoleIdForCategory($category);

            $processedCategories[] = $category;

            // Check if we have an existing requirement
            if (isset($existingByCategory[$category])) {
                $requirement = $existingByCategory[$category];

                // Only update if not manual or force overwrite
                if (!$requirement->isManualOverride() || $forceOverwrite) {
                    $requirement->setRequiredCount($requiredCount);
                    $requirement->setManualOverride(false);
                    $requirement->setStaffRoleId($roleId);
                }
            } else {
                // Create new requirement
                $requirement = new EventStaffRequirement();
                $requirement->setEvent($event);
                $requirement->setCategory($category);
                $requirement->setRequiredCount($requiredCount);
                $requirement->setManualOverride(false);
                $requirement->setStaffRoleId($roleId);
                $this->em->persist($requirement);
            }

            $results[] = $requirement;
        }

        // Keep manual overrides for categories not in formulas
        foreach ($existingByCategory as $category => $requirement) {
            if (!in_array($category, $processedCategories) && $requirement->isManualOverride()) {
                $results[] = $requirement;
            }
        }

        $this->em->flush();

        // Debug: Log results
        error_log("StaffRequirementService::recalculateRequirements - Created/Updated " . count($results) . " requirements");
        foreach ($results as $r) {
            error_log("  - {$r->getCategory()}: {$r->getRequiredCount()} (manual: " . ($r->isManualOverride() ? 'yes' : 'no') . ")");
        }

        return $results;
    }

    /**
     * Update a specific category requirement manually.
     */
    public function updateRequirement(Event $event, string $category, int $count): EventStaffRequirement
    {
        $category = $this->normalizeCategory($category);
        $requirement = $this->requirementRepo->findByEventAndCategory($event, $category);

        if (!$requirement) {
            $requirement = new EventStaffRequirement();
            $requirement->setEvent($event);
            $requirement->setCategory($category);
            $requirement->setStaffRoleId($this->getRoleIdForCategory($category));
            $this->em->persist($requirement);
        }

        $requirement->setRequiredCount($count);
        $requirement->setManualOverride(true);
        $this->em->flush();

        return $requirement;
    }

    /**
     * Get all requirements for an event (from database or calculate if none exist).
     * @return array Array of requirement data with category, label, required, roleId, isManual
     */
    public function getRequirements(Event $event): array
    {
        $stored = $this->requirementRepo->findByEvent($event);

        // If no stored requirements, calculate and store them
        if (empty($stored)) {
            $stored = $this->recalculateRequirements($event);
        }

        $results = [];
        foreach ($stored as $req) {
            $results[] = [
                'id' => $req->getId(),
                'category' => $req->getCategory(),
                'label' => $this->translateCategoryLabel($req->getCategory()),
                'required' => $req->getRequiredCount(),
                'roleId' => $req->getStaffRoleId(),
                'isManualOverride' => $req->isManualOverride(),
            ];
        }

        return $results;
    }

    /**
     * Reset a specific category to auto-calculated value.
     */
    public function resetToAutoCalculated(Event $event, string $category): ?EventStaffRequirement
    {
        $category = $this->normalizeCategory($category);
        $requirement = $this->requirementRepo->findByEventAndCategory($event, $category);

        if (!$requirement) {
            return null;
        }

        // Recalculate from formula
        $formulas = $this->getApplicableFormulas($event->getEventType());
        $totalGuests = $event->getGuestsTotal();

        foreach ($formulas as $formula) {
            $formulaCategory = $this->normalizeCategory($formula->getCategory());
            if ($formulaCategory === $category) {
                $ratio = $formula->getRatio();
                $requiredCount = $ratio > 0 ? (int) ceil($totalGuests / $ratio) : 0;
                $requirement->setRequiredCount($requiredCount);
                $requirement->setManualOverride(false);
                $this->em->flush();
                return $requirement;
            }
        }

        return $requirement;
    }

    /**
     * Get applicable formulas for an event type.
     */
    private function getApplicableFormulas(?string $eventType): array
    {
        $allFormulas = $this->formulaRepo->findEnabled();

        if (!$eventType) {
            // Return generic formulas
            return array_filter($allFormulas, function($f) {
                return !preg_match('/_[A-Z]+/', $f->getCategory());
            });
        }

        // Normalize event type to match formula naming convention
        $normalizedEventType = $this->normalizeEventType($eventType);

        // Try event-type-specific formulas
        $eventTypeFormulas = array_filter($allFormulas, function($f) use ($normalizedEventType) {
            return str_ends_with(strtoupper($f->getCategory()), '_' . $normalizedEventType);
        });

        if (!empty($eventTypeFormulas)) {
            return $eventTypeFormulas;
        }

        // Fallback to generic formulas
        return array_filter($allFormulas, function($f) {
            return !preg_match('/_[A-Z]+/', $f->getCategory());
        });
    }

    /**
     * Normalize event type to match formula naming convention.
     * Maps Czech/legacy names to standard English format.
     */
    private function normalizeEventType(string $eventType): string
    {
        $eventTypeUpper = strtoupper($eventType);

        // Map Czech/legacy event types to standard English format
        $typeMap = [
            'FOLKLORNI_SHOW' => 'FOLKLORE_SHOW',
            'FOLKLORNÍ_SHOW' => 'FOLKLORE_SHOW',
            'SVATBA' => 'WEDDING',
            'FIREMNI_AKCE' => 'CORPORATE',
            'FIREMNÍ_AKCE' => 'CORPORATE',
            'SOUKROMA_AKCE' => 'PRIVATE_EVENT',
            'SOUKROMÁ_AKCE' => 'PRIVATE_EVENT',
        ];

        return $typeMap[$eventTypeUpper] ?? $eventTypeUpper;
    }

    /**
     * Normalize category name (remove event type suffix if present).
     */
    private function normalizeCategory(string $category): string
    {
        // Remove event type suffix (e.g., "waiter_FOLKLORE_SHOW" -> "waiter")
        if (preg_match('/^([a-z_]+)_[A-Z]+/', $category, $matches)) {
            return $matches[1];
        }
        return strtolower($category);
    }

    /**
     * Get role ID for a category.
     */
    private function getRoleIdForCategory(string $category): ?int
    {
        $roles = $this->roleRepo->findAll();

        foreach ($roles as $role) {
            $roleName = strtolower($role->getName());
            $categoryLower = strtolower($category);

            if ($roleName === $categoryLower || str_contains($roleName, $categoryLower)) {
                return $role->getId();
            }
        }

        return null;
    }

    /**
     * Translate category to Czech label.
     */
    private function translateCategoryLabel(string $category): string
    {
        $category = $this->normalizeCategory($category);
        return self::CATEGORY_LABELS[$category] ?? ucfirst($category);
    }
}
