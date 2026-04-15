<?php

namespace App\Service;

use App\Entity\Event;
use App\Entity\EventTable;
use App\Entity\FloorPlanElement;
use App\Entity\TableExpense;

class EventSerializer
{
    public function serializeTable(EventTable $t): array
    {
        return [
            'id' => $t->getId(),
            'eventId' => $t->getEvent()?->getId(),
            'tableName' => $t->getTableName(),
            'room' => $t->getRoom(),
            'roomId' => $t->getRoomEntity()?->getId(),
            'capacity' => $t->getCapacity(),
            'positionX' => $t->getPositionX(),
            'positionY' => $t->getPositionY(),
            'shape' => $t->getShape(),
            'widthPx' => $t->getWidthPx(),
            'heightPx' => $t->getHeightPx(),
            'rotation' => $t->getRotation(),
            'tableNumber' => $t->getTableNumber(),
            'color' => $t->getColor(),
            'isLocked' => $t->isLocked(),
            'sortOrder' => $t->getSortOrder(),
            'createdAt' => $t->getCreatedAt()->format('c'),
            'updatedAt' => $t->getUpdatedAt()->format('c'),
        ];
    }

    public function serializeFloorPlanElement(FloorPlanElement $el): array
    {
        return [
            'id' => $el->getId(),
            'eventId' => $el->getEvent()?->getId(),
            'roomId' => $el->getRoom()?->getId(),
            'elementType' => $el->getElementType(),
            'label' => $el->getLabel(),
            'positionX' => $el->getPositionX(),
            'positionY' => $el->getPositionY(),
            'widthPx' => $el->getWidthPx(),
            'heightPx' => $el->getHeightPx(),
            'rotation' => $el->getRotation(),
            'shape' => $el->getShape(),
            'shapeData' => $el->getShapeData(),
            'color' => $el->getColor(),
            'isLocked' => $el->isLocked(),
            'sortOrder' => $el->getSortOrder(),
            'createdAt' => $el->getCreatedAt()->format('c'),
        ];
    }

    public function serializeExpense(TableExpense $e): array
    {
        return [
            'id' => $e->getId(),
            'eventTableId' => $e->getEventTable()?->getId(),
            'eventId' => $e->getEvent()?->getId(),
            'description' => $e->getDescription(),
            'category' => $e->getCategory(),
            'quantity' => $e->getQuantity(),
            'unitPrice' => (float)$e->getUnitPrice(),
            'totalPrice' => (float)$e->getTotalPrice(),
            'currency' => $e->getCurrency(),
            'isPaid' => $e->isPaid(),
            'paidAt' => $e->getPaidAt()?->format('c'),
            'createdBy' => $e->getCreatedBy()?->getId(),
            'createdAt' => $e->getCreatedAt()->format('c'),
            'updatedAt' => $e->getUpdatedAt()->format('c'),
        ];
    }

    /**
     * Get event space names
     */
    public function getEventSpaceNames(Event $event): array
    {
        $spaces = $event->getSpaces();
        $spaceNames = [];

        foreach ($spaces as $space) {
            $spaceNames[] = strtolower($space->getSpaceName());
        }

        if (empty($spaceNames)) {
            $spaceNames[] = strtolower($event->getVenue() ?? 'roubenka');
        }

        return $spaceNames;
    }
}
