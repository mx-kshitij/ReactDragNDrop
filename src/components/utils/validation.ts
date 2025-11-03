/**
 * Validation utilities for drag and drop operations
 */

/**
 * Check if a target list is allowed to receive items from a source list
 * 
 * Rules:
 * - Same-list drops (sourceListId === targetListId) are ALWAYS allowed
 * - Cross-list drops are only allowed if targetListId is in the allowedLists configuration
 * - If allowedLists is empty or undefined, only same-list drops are allowed
 * 
 * @param sourceAllowedLists - The allowedLists string from the SOURCE list (comma-separated)
 * @param targetListId - The ID of the list items are being dropped TO
 * @returns true if the drop is allowed, false otherwise
 */
export function isDropAllowed(sourceAllowedLists: string | undefined, targetListId: string): boolean {
    // For cross-list drops, check if target is in allowedLists
    if (!sourceAllowedLists || sourceAllowedLists.trim() === "") {
        // No allowed lists configured, so only same-list drops are permitted
        return false;
    }

    // Simply check if the target list ID is in the comma-separated allowed lists string
    // e.g., if allowedLists = "inprogress,done" and targetListId = "inprogress" → true
    const allowedListsArray = sourceAllowedLists
        .split(",")
        .map(id => id.trim())
        .filter(id => id.length > 0);

    return allowedListsArray.includes(targetListId);
}

/**
 * Check if a hovered item's list name is in the allowed lists of dragged items
 * Used for conditional hover styling
 * 
 * @param itemListName - The list name of the item being hovered over
 * @param draggedAllowedLists - The allowedLists string from the dragged items' source list
 * @returns true if the item can receive the dragged items, false otherwise
 */
export function isItemInAllowedLists(itemListName: string | undefined, draggedAllowedLists: string): boolean {
    if (!itemListName || !draggedAllowedLists) {
        return false;
    }
    
    const allowedListsArray = draggedAllowedLists
        .split(",")
        .map(id => id.trim())
        .filter(id => id.length > 0);

    return allowedListsArray.includes(itemListName);
}

/**
 * Parse comma-separated allowed lists into an array
 * Handles whitespace and empty values
 * 
 * @param allowedListsString - Comma-separated string like "list1,list2,list3"
 * @returns Array of list IDs
 */
export function parseAllowedLists(allowedListsString: string | undefined): string[] {
    if (!allowedListsString) {
        return [];
    }

    return allowedListsString
        .split(",")
        .map(id => id.trim())
        .filter(id => id.length > 0);
}
