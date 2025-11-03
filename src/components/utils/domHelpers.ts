/**
 * DOM utilities for drag and drop operations
 */

/**
 * Get drag context attributes from a dragged element
 * Reads data-drag-source-list and data-drag-allowed-lists attributes
 * 
 * For nested lists, this finds the DEEPEST (most specific) list with drag context
 * by getting all elements and using the last one (which is the deepest/innermost).
 * 
 * @returns Object with sourceListId and allowedLists
 */
export function getDragContextFromDOM(): { sourceListId: string; allowedLists: string } {
    let sourceListId = "";
    let allowedLists = "";

    // Find ALL elements with drag context attributes
    const draggedElements = document.querySelectorAll("[data-drag-source-list]");
    if (draggedElements.length > 0) {
        // Use the LAST one - which is the deepest/innermost nested list
        // This is important for nested lists where parent and child both have the attribute
        const draggedElement = draggedElements[draggedElements.length - 1];
        sourceListId = draggedElement.getAttribute("data-drag-source-list") || "";
        allowedLists = draggedElement.getAttribute("data-drag-allowed-lists") || "";
        console.info('[getDragContextFromDOM] Found drag context (deepest of', draggedElements.length, ')', {
            element: draggedElement.className,
            sourceListId,
            allowedLists,
        });
    } else {
        console.info('[getDragContextFromDOM] No drag context found in DOM');
    }

    return { sourceListId, allowedLists };
}

/**
 * Set drag context attributes on a dragged element
 * 
 * For nested lists, first clears context from parent lists to ensure
 * only the actual source list (innermost) has the context set.
 * 
 * @param element - The element being dragged (the list container)
 * @param sourceListId - The source list ID
 * @param allowedLists - Comma-separated allowed lists
 */
export function setDragContextOnDOM(element: HTMLElement, sourceListId: string, allowedLists: string): void {
    // First, clear any existing drag context from parent list containers
    // This is important for nested lists - we want only the innermost list to have the context
    const allDragElements = document.querySelectorAll("[data-drag-source-list]");
    allDragElements.forEach(el => {
        const htmlEl = el as HTMLElement;
        // Only clear if it's a parent of the current element (not the element itself)
        if (htmlEl !== element && htmlEl.contains(element)) {
            console.info('[setDragContextOnDOM] Clearing parent context from', htmlEl.className);
            htmlEl.removeAttribute("data-drag-source-list");
            htmlEl.removeAttribute("data-drag-allowed-lists");
        }
    });
    
    console.info('[setDragContextOnDOM] Setting attributes', {
        elementClass: element.className,
        sourceListId,
        allowedLists,
        elementTagName: element.tagName,
    });
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
