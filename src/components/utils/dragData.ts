/**
 * Drag data serialization and parsing utilities
 */

/**
 * Cross-list drag data structure
 * Stored in dataTransfer during drag operations
 */
export interface DragDataTransfer {
    /** ID of the source list */
    sourceListId: string;
    /** Comma-separated allowed target lists for this source */
    sourceListAllowedLists?: string;
    /** UUIDs of items being dragged */
    itemUuids: string[];
    /** All items in source list for re-indexing calculations */
    sourceListAllItems?: Array<{ uuid: string; originalIndex: number }>;
}

/**
 * Parse drag data from dataTransfer
 * 
 * @param dataTransferData - String data from dataTransfer
 * @returns Parsed DragDataTransfer object, or null if parsing fails
 */
export function parseDragData(dataTransferData: string | undefined): DragDataTransfer | null {
    if (!dataTransferData) {
        return null;
    }

    try {
        return JSON.parse(dataTransferData) as DragDataTransfer;
    } catch (e) {
        console.error("Failed to parse drag data:", e);
        return null;
    }
}

/**
 * Serialize drag data to JSON string for dataTransfer
 * 
 * @param data - DragDataTransfer object to serialize
 * @returns JSON string representation
 */
export function serializeDragData(data: DragDataTransfer): string {
    return JSON.stringify(data);
}
