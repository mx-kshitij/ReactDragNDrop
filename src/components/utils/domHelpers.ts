/**
 * DOM utilities for drag and drop operations
 */

/**
 * Get drag context attributes from a dragged element
 * Reads data-drag-source-list and data-drag-allowed-lists attributes
 * 
 * @returns Object with sourceListId and allowedLists
 */
export function getDragContextFromDOM(): { sourceListId: string; allowedLists: string } {
    let sourceListId = "";
    let allowedLists = "";

    const draggedElement = document.querySelector("[data-drag-source-list]");
    if (draggedElement) {
        sourceListId = draggedElement.getAttribute("data-drag-source-list") || "";
        allowedLists = draggedElement.getAttribute("data-drag-allowed-lists") || "";
    }

    return { sourceListId, allowedLists };
}

/**
 * Set drag context attributes on a dragged element
 * 
 * @param element - The element being dragged
 * @param sourceListId - The source list ID
 * @param allowedLists - Comma-separated allowed lists
 */
export function setDragContextOnDOM(element: HTMLElement, sourceListId: string, allowedLists: string): void {
    element.setAttribute("data-drag-source-list", sourceListId);
    element.setAttribute("data-drag-allowed-lists", allowedLists || "");
}

/**
 * Clear drag context attributes from an element
 * 
 * @param element - The element to clear attributes from
 */
export function clearDragContextFromDOM(element: HTMLElement): void {
    element.removeAttribute("data-drag-source-list");
    element.removeAttribute("data-drag-allowed-lists");
}
