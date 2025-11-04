/**
 * Item initialization and transformation utilities
 */

import { ListValue, ListAttributeValue } from "mendix";
import { DragItem } from "../types";

/**
 * Initialize items from datasource
 * Maps Mendix datasource items to DragItem with UUID and sort index
 * 
 * Process:
 * 1. Map datasource items to DragItem with UUID and sort index
 * 2. Sort by sorting attribute values to maintain correct order
 * 3. Return initialized items array
 * 
 * @param dataSource - Mendix ListValue datasource
 * @param uuidAttribute - Attribute containing unique identifiers
 * @param sortingAttribute - Attribute containing sort order values
 * @param listId - The ID of the current list
 * @returns Array of DragItem objects sorted by their sort order
 */
export function initializeItems(
    dataSource: ListValue | undefined,
    uuidAttribute: ListAttributeValue<string>,
    sortingAttribute: ListAttributeValue<any> | undefined,
    listId: string
): DragItem[] {
    if (!dataSource || !dataSource.items) {
        return [];
    }

    const newItems: DragItem[] = dataSource.items.map((item, index) => {
        // Get the UUID value for this item
        const uuidValue = uuidAttribute.get(item);
        const uuid = uuidValue?.value ?? `item-${index}`;

        // Read sortingAttribute to get the actual sort position
        // This is critical: we use the sorting attribute value, not array index
        // This ensures correct order is maintained after database updates
        // If sortingAttribute is not provided, use the array index as fallback
        let sortIndex = index;
        if (sortingAttribute) {
            const sortValue = sortingAttribute.get(item);
            sortIndex = sortValue?.value ? Number(sortValue.value) : index;
        }

        return {
            uuid: String(uuid),
            object: item,
            originalIndex: sortIndex, // Use sort value as the original position
            listId: listId, // Add list identifier for cross-list dragging
            listName: listId, // Store list name for CSS class matching
        };
    });

    // Sort items by their sorting attribute value (or array index if sortingAttribute not provided)
    newItems.sort((a, b) => a.originalIndex - b.originalIndex);

    return newItems;
}

/**
 * Check if an item is currently being dragged
 * 
 * @param item - The item to check
 * @param draggedItems - Array of items currently being dragged
 * @returns true if the item is being dragged
 */
export function isDraggedItem(item: DragItem, draggedItems: DragItem[]): boolean {
    return draggedItems.some(i => i.uuid === item.uuid);
}
