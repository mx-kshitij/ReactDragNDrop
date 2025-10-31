import { ReactElement, createElement, useState, useEffect } from "react";
import { ListValue, ListWidgetValue, ListAttributeValue, EditableValue, ObjectItem, DynamicValue } from "mendix";
import "../ui/DragAndDropList.css";

/**
 * Props interface for the DragAndDropList component
 * Defines all properties that can be passed to the component
 */
export interface DragAndDropListProps {
    /** List of items to display and reorder */
    dataSource: ListValue;
    /** Attribute containing unique identifier for each item */
    uuidAttribute: ListAttributeValue<string>;
    /** Integer attribute that stores the sort order (read-only in widget) */
    sortingAttribute: ListAttributeValue<any>;
    /** Context attribute to store changes as JSON string */
    changeJsonAttribute: EditableValue<string>;
    /** Unique identifier for this list instance (required for cross-list dragging) */
    listId: string;
    /** Enable/disable multi-select functionality with Shift+click */
    enableMultiSelect: boolean;
    /** Show/hide the drag handle icon (visual only, doesn't affect drag functionality) */
    showDragHandle: boolean;
    /** Optional: Color for hover and multi-select highlighting */
    hoverHighlightColor?: DynamicValue<string>;
    /** Optional: Color for drop target highlighting */
    dropHighlightColor?: DynamicValue<string>;
    /** Optional: Custom widget content to render for each item */
    content?: ListWidgetValue;
}

/**
 * Internal representation of a draggable item
 * Extends the Mendix ObjectItem with additional metadata
 */
export interface DragItem {
    /** Unique identifier for the item */
    uuid: string;
    /** Reference to the Mendix object */
    object: ObjectItem;
    /** Original index based on sorting attribute value */
    originalIndex: number;
    /** ID of the list this item belongs to */
    listId: string;
}

/**
 * Represents a change record for reordered items
 * Sent to onDrop action to update the database
 * 
 * Supports both same-list reordering and cross-list moves:
 * - Same-list: sourceListId equals targetListId
 * - Cross-list: sourceListId differs from targetListId
 */
interface ChangeRecord {
    /** UUID of the item that was moved */
    uuid: string;
    /** New index position after reordering */
    newIndex: number;
    /** ID of the list where item came from */
    sourceListId: string;
    /** ID of the list where item is being dropped */
    targetListId: string;
}

/**
 * Main drag-and-drop list component
 * 
 * Features:
 * - Single and multi-item dragging
 * - Shift+click multi-select (when enabled)
 * - Customizable hover and drop highlight colors
 * - Optional drag handle icon
 * - JSON change tracking for database updates
 * 
 * Architecture:
 * - Widget handles only UI/UX logic
 * - onDrop action/microflow handles database persistence
 * - Sort order maintained by sortingAttribute values
 */
export function DragAndDropList({
    dataSource,
    uuidAttribute,
    sortingAttribute,
    changeJsonAttribute,
    listId,
    enableMultiSelect,
    showDragHandle,
    hoverHighlightColor,
    dropHighlightColor,
    content,
}: DragAndDropListProps): ReactElement {
    // State management
    const [items, setItems] = useState<DragItem[]>([]);
    const [draggedItems, setDraggedItems] = useState<DragItem[]>([]);
    const [draggedOverItem, setDraggedOverItem] = useState<DragItem | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    /**
     * Initialize items from datasource
     * 
     * Runs when:
     * - Component mounts
     * - Datasource changes
     * - UUID or sorting attributes change
     * 
     * Process:
     * 1. Map datasource items to DragItem with UUID and sort index
     * 2. Sort by sorting attribute values to maintain correct order
     * 3. Update local state
     * 4. Reset drag state to ensure styling is reset after drops
     */
    useEffect(() => {
        if (dataSource && dataSource.items) {
            const newItems: DragItem[] = dataSource.items.map((item, index) => {
                // Get the UUID value for this item
                const uuidValue = uuidAttribute.get(item);
                const uuid = uuidValue?.value ?? `item-${index}`;

                // Read sortingAttribute to get the actual sort position
                // This is critical: we use the sorting attribute value, not array index
                // This ensures correct order is maintained after database updates
                const sortValue = sortingAttribute.get(item);
                const sortIndex = sortValue?.value ? Number(sortValue.value) : index;

                return {
                    uuid: String(uuid),
                    object: item,
                    originalIndex: sortIndex, // Use sort value as the original position
                    listId: listId, // Add list identifier for cross-list dragging
                };
            });
            
            // Sort items by their sorting attribute value to display in correct order
            newItems.sort((a, b) => a.originalIndex - b.originalIndex);
            
            setItems(newItems);
            
            // Reset drag state when datasource updates (after drop operations)
            // This ensures styling is cleaned up and the UI reflects the updated datasource
            setDraggedItems([]);
            setDraggedOverItem(null);
        }
    }, [dataSource, uuidAttribute, sortingAttribute, listId]);

    /**
     * Handle item click for multi-select functionality
     * 
     * Only active when enableMultiSelect is true and Shift key is pressed
     * Toggles selection state for the clicked item
     */
    const handleItemClick = (item: DragItem, event: React.MouseEvent) => {
        if (!enableMultiSelect) {
            return;
        }

        if (event.shiftKey) {
            // Only prevent default when we're doing selection
            event.preventDefault();
            
            // Toggle selection on shift+click
            const newSelected = new Set(selectedItems);
            if (newSelected.has(item.uuid)) {
                newSelected.delete(item.uuid);
            } else {
                newSelected.add(item.uuid);
            }
            setSelectedItems(newSelected);
        }
    };

    /**
     * Handle drag start event
     * 
     * Logic:
     * - If multi-select enabled AND item is already selected: drag all selected items
     * - Otherwise: drag just this item and clear selection
     * 
     * This allows users to select multiple items and drag them all together
     * 
     * For cross-list dragging:
     * - Sets dataTransfer.setData with list context (listId and item UUIDs)
     * - Allows receiving lists to identify source and validate drops
     * - Includes ALL source list items so target can calculate re-indexing for remaining items
     */
    const handleDragStart = (item: DragItem, event: React.DragEvent<HTMLLIElement>) => {
        // If multi-select is enabled and item is selected, drag all selected items
        if (enableMultiSelect && selectedItems.has(item.uuid)) {
            const itemsToDrag = items.filter(i => selectedItems.has(i.uuid));
            setDraggedItems(itemsToDrag);
            
            // Set dataTransfer data for cross-list dragging
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.dropEffect = "move";
            const dragData = {
                sourceListId: listId,
                itemUuids: itemsToDrag.map(i => i.uuid),
                // Include all source list items for backend re-indexing calculation
                sourceListAllItems: items.map(i => ({ uuid: i.uuid, originalIndex: i.originalIndex })),
            };
            event.dataTransfer.setData("application/x-dragdroplist", JSON.stringify(dragData));
        } else {
            // Otherwise drag just this item
            setDraggedItems([item]);
            
            // Set dataTransfer data for cross-list dragging
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.dropEffect = "move";
            const dragData = {
                sourceListId: listId,
                itemUuids: [item.uuid],
                // Include all source list items for backend re-indexing calculation
                sourceListAllItems: items.map(i => ({ uuid: i.uuid, originalIndex: i.originalIndex })),
            };
            event.dataTransfer.setData("application/x-dragdroplist", JSON.stringify(dragData));
            
            // Clear selection when dragging single item
            if (enableMultiSelect) {
                setSelectedItems(new Set());
            }
        }
    };

    /**
     * Handle drag over event
     * 
     * Simply track which item the user is currently dragging over
     * This is used for visual feedback (highlighting)
     * 
     * Optimization: Only update state if the draggedOverItem actually changed
     * This prevents unnecessary re-renders and reduces flickering
     */
    const handleDragOver = (item: DragItem) => {
        // Only update if this is a different item
        if (draggedOverItem?.uuid !== item.uuid) {
            setDraggedOverItem(item);
        }
    };

    /**
     * Handle drop event and reorder items (same-list or cross-list)
     * 
     * Process:
     * 1. Validate that we have items to drag and a target
     * 2. Check dataTransfer data to detect cross-list drops
     * 3. Distinguish between same-list reordering and cross-list moves
     * 4. For same-list: Remove items from current positions and insert at target
     * 5. For cross-list: Add new items to this list at target position
     * 6. Track changes with sourceListId and targetListId
     * 7. Set JSON for onDrop action
     * 
     * The onDrop action (microflow) will:
     * - Parse the JSON changes
     * - Update sorting attributes in the database
     * - For cross-list moves, may need to handle parent datasource updates
     * - Persist the new order
     * 
     * JSON formats:
     * Same-list: [{ uuid, newIndex, sourceListId: "list1", targetListId: "list1" }, ...]
     * Cross-list: [{ uuid, newIndex, sourceListId: "list1", targetListId: "list2" }, ...]
     */
    const handleDragEnd = (event?: React.DragEvent<HTMLElement>) => {
        // Try to read cross-list data from dataTransfer
        let crossListData: { sourceListId: string; itemUuids: string[]; sourceListAllItems?: Array<{ uuid: string; originalIndex: number }> } | null = null;
        if (event) {
            try {
                const data = event.dataTransfer?.getData("application/x-dragdroplist");
                if (data) {
                    crossListData = JSON.parse(data);
                }
            } catch (e) {
                console.error("Failed to parse cross-list data:", e);
            }
        }

        // Determine if this is a cross-list drop
        const isCrossListDrop = crossListData && crossListData.sourceListId !== listId;
        
        // For same-list: require both draggedItems and draggedOverItem
        // For cross-list: only require draggedOverItem IF list is not empty
        if (isCrossListDrop) {
            // Cross-list drop - use data from dataTransfer
            if (!crossListData) {
                setDraggedItems([]);
                setDraggedOverItem(null);
                return;
            }
            // For cross-list, draggedOverItem is optional (can drop to empty list)
        } else {
            // Same-list drop - use local draggedItems state
            if (draggedItems.length === 0 || !draggedOverItem) {
                setDraggedItems([]);
                setDraggedOverItem(null);
                return;
            }
        }

        const itemsBeingDragged = crossListData?.itemUuids || draggedItems.map(i => i.uuid);
        const sourceListId = crossListData?.sourceListId || (draggedItems[0]?.listId ?? listId);
        
        if (isCrossListDrop) {
            // CROSS-LIST MOVE
            // Items are from a different list and being dropped into this list
            // 
            // IMPORTANT: For cross-list moves, we need to send changes for:
            // 1. Target list: All items with updated indices (new + shifted existing)
            // 2. Source list: Remaining items with re-calculated indices after removal
            // 
            // We include ALL changes (source + target) in a single array
            
            const newItems = [...items];
            
            // Handle empty list case - add items at the beginning
            if (items.length === 0) {
                
                // For cross-list drops to empty list:
                // 1. Target changes: items being added
                // 2. Source changes: remaining items in source list get re-indexed
                const allChanges: ChangeRecord[] = [];

                // Create target change records for each item being dragged
                itemsBeingDragged.forEach((uuid, idx) => {
                    allChanges.push({
                        uuid: uuid,
                        newIndex: idx, // Will be 0 for first item, 1 for second, etc.
                        sourceListId: sourceListId,
                        targetListId: listId,
                    });
                });

                // Extract and process source list for re-indexing remaining items
                if (crossListData?.sourceListAllItems) {
                    const sourceAllItems = crossListData.sourceListAllItems;
                    const movedUuids = new Set(itemsBeingDragged);
                    
                    // Get remaining items (not being moved) sorted by original index
                    const remainingItems = sourceAllItems
                        .filter((item: { uuid: string; originalIndex: number }) => !movedUuids.has(item.uuid))
                        .sort((a: { uuid: string; originalIndex: number }, b: { uuid: string; originalIndex: number }) => a.originalIndex - b.originalIndex);
                    
                    // Re-index remaining items
                    remainingItems.forEach((item: { uuid: string; originalIndex: number }, newIndex: number) => {
                        allChanges.push({
                            uuid: item.uuid,
                            newIndex: newIndex,
                            sourceListId: sourceListId,
                            targetListId: sourceListId, // Same list, just re-indexed
                        });
                    });
                    
                    // after removal
                }

                if (allChanges.length > 0) {
                    changeJsonAttribute.setValue(JSON.stringify(allChanges));
                }

                // Note: Items will appear in the list after datasource updates from the onDrop action
                // Don't add temporary items here to avoid ObjectItem validation errors
                // setItems will be updated when datasource changes
            } else {
                // Non-empty list case - insert at draggedOverItem position
                const draggedOverIndex = newItems.findIndex(i => i.uuid === draggedOverItem?.uuid);

                if (draggedOverIndex > -1) {
                    // For cross-list drops, we need to send newIndex for ALL items:
                    // 1. Target list items (both new and shifted existing)
                    // 2. Source list items (remaining items with re-calculated indices)
                    
                    // Create a virtual array showing where items will be after insertion
                    const virtualItems: { uuid: string; isNew: boolean }[] = [];
                    
                    // Add existing items up to insert point
                    for (let i = 0; i < draggedOverIndex; i++) {
                        virtualItems.push({ uuid: newItems[i].uuid, isNew: false });
                    }
                    
                    // Add the dragged items (in order they were dragged)
                    itemsBeingDragged.forEach(uuid => {
                        virtualItems.push({ uuid: uuid, isNew: true });
                    });
                    
                    // Add remaining items
                    for (let i = draggedOverIndex; i < newItems.length; i++) {
                        virtualItems.push({ uuid: newItems[i].uuid, isNew: false });
                    }

                    // Generate changes for ALL items that need re-indexing
                    const allChanges: ChangeRecord[] = [];
                    
                    // Target list changes: all items in virtual array
                    virtualItems.forEach((item, newIndex) => {
                        if (item.isNew) {
                            // New dragged items from source list
                            allChanges.push({
                                uuid: item.uuid,
                                newIndex: newIndex,
                                sourceListId: sourceListId,
                                targetListId: listId,
                            });
                        } else {
                            // Existing items in target list that may have shifted
                            const existingItem = newItems.find(i => i.uuid === item.uuid);
                            if (existingItem && existingItem.originalIndex !== newIndex) {
                                allChanges.push({
                                    uuid: item.uuid,
                                    newIndex: newIndex,
                                    sourceListId: listId,
                                    targetListId: listId,
                                });
                            }
                        }
                    });

                    // Source list changes: remaining items need to be re-indexed
                    // Extract and process source list for re-indexing remaining items
                    if (crossListData?.sourceListAllItems) {
                        const sourceAllItems = crossListData.sourceListAllItems;
                        const movedUuids = new Set(itemsBeingDragged);
                        
                        // Get remaining items (not being moved) sorted by original index
                        const remainingItems = sourceAllItems
                            .filter((item: { uuid: string; originalIndex: number }) => !movedUuids.has(item.uuid))
                            .sort((a: { uuid: string; originalIndex: number }, b: { uuid: string; originalIndex: number }) => a.originalIndex - b.originalIndex);
                        
                        // Re-index remaining items
                        remainingItems.forEach((item: { uuid: string; originalIndex: number }, newIndex: number) => {
                            allChanges.push({
                                uuid: item.uuid,
                                newIndex: newIndex,
                                sourceListId: sourceListId,
                                targetListId: sourceListId, // Same list, just re-indexed
                            });
                        });
                        
                        if (!remainingItems || remainingItems.length === 0) {
                            console.error("Failed to calculate remaining items for source list re-indexing");
                        }
                    }

                    if (allChanges.length > 0) {
                        changeJsonAttribute.setValue(JSON.stringify(allChanges));
                    }

                    // Note: Items will appear in the list after datasource updates from the onDrop action
                    // Don't add temporary items here to avoid ObjectItem validation errors
                    // setItems will be updated when datasource changes
                }
            }
        } else {
            // SAME-LIST REORDERING
            // draggedOverItem is guaranteed to exist at this point (checked in validation)
            const draggedOverItemSafe = draggedOverItem!; // Non-null assertion safe here
            
            // Prevent dragging item onto itself
            if (draggedItems.some(i => i.uuid === draggedOverItemSafe.uuid)) {
                setDraggedItems([]);
                setDraggedOverItem(null);
                return;
            }

            // Create a new array with reordered items
            const newItems = [...items];
            const draggedOverIndex = newItems.findIndex(i => i.uuid === draggedOverItemSafe.uuid);

            if (draggedOverIndex > -1) {
                // Remove all dragged items from their current positions
                const draggedIndices: number[] = [];
                draggedItems.forEach(draggedItem => {
                    const idx = newItems.findIndex(i => i.uuid === draggedItem.uuid);
                    if (idx > -1) {
                        draggedIndices.push(idx);
                    }
                });

                // Sort indices in descending order to remove from end first
                // This prevents index shifting issues
                draggedIndices.sort((a, b) => b - a);
                const removed: DragItem[] = [];
                draggedIndices.forEach(idx => {
                    removed.unshift(...newItems.splice(idx, 1));
                });

                // Insert all items at the target position
                const insertIndex = newItems.findIndex(i => i.uuid === draggedOverItemSafe.uuid);
                if (insertIndex > -1) {
                    newItems.splice(insertIndex, 0, ...removed);
                }

                // Calculate changes and generate JSON for onDrop action
                const changes: ChangeRecord[] = [];

                newItems.forEach((item, newIndex) => {
                    // Track changes if position changed from original
                    if (item.originalIndex !== newIndex) {
                        changes.push({
                            uuid: item.uuid,
                            newIndex: newIndex,
                            sourceListId: listId,
                            targetListId: listId,
                        });
                    }
                });

                /**
                 * Set the JSON changes to context attribute
                 * 
                 * Mendix automatically triggers the onChange="onDrop" action
                 * when changeJsonAttribute is updated
                 * 
                 * JSON format: [{ uuid: string, newIndex: number, sourceListId: string, targetListId: string }, ...]
                 */
                if (changes.length > 0) {
                    changeJsonAttribute.setValue(JSON.stringify(changes));
                }

                // Update UI to reflect new order
                setItems(newItems);
                setSelectedItems(new Set()); // Clear selection after drop
            }
        }

        // Clean up drag state
        setDraggedItems([]);
        setDraggedOverItem(null);
    };

    /**
     * Helper function to check if an item is currently being dragged
     */
    const isDraggedItem = (item: DragItem): boolean => {
        return draggedItems.some(i => i.uuid === item.uuid);
    };

    return (
        <div 
            className="drag-and-drop-list"
            style={{
                // CSS variable for hover highlight color
                // Uses provided color or defaults to #f5f5f5
                '--hover-highlight-color': hoverHighlightColor?.value ?? '#f5f5f5',
            } as React.CSSProperties}
            /**
             * Container-level dragOver handler
             * 
             * This is critical for cross-list dragging to work!
             * When dragging between lists, the items on the receiving list don't exist
             * in the source list's draggedItems state, so we need a container-level handler
             * to allow the drop action to be triggered.
             * 
             * Sets dropEffect to "move" and prevents default to signal to browser
             * that this element can accept drops.
             */
            onDragOver={e => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = "move";
            }}
            onDragEnter={e => {
                e.preventDefault();
                e.stopPropagation();
            }}
            onDragLeave={e => {
                e.preventDefault();
                e.stopPropagation();
            }}
            /**
             * Container-level drop handler for cross-list drops
             * When items are dropped on empty areas or between items in the list
             */
            onDrop={e => {
                e.preventDefault();
                e.stopPropagation();
                
                // For cross-list drops, we need to check the dataTransfer data to determine drop validity
                let hasValidDropData = false;
                let crossListData: any = null;
                try {
                    const data = e.dataTransfer?.getData("application/x-dragdroplist");
                    if (data) {
                        crossListData = JSON.parse(data);
                        hasValidDropData = crossListData && crossListData.sourceListId !== listId;
                    }
                } catch (err) {
                    console.error("Failed to parse drop data:", err);
                }
                
                // Handle drop differently based on whether it's cross-list and if list is empty
                if (draggedOverItem === null) {
                    if (hasValidDropData) {
                        // Cross-list drop - even to empty list, we can proceed
                        // Call handleDragEnd directly and let it handle empty list case
                        handleDragEnd(e);
                        return;
                    } else if (items.length > 0) {
                        // Same-list drop on empty area - add to end
                        setDraggedOverItem(items[items.length - 1]);
                    } else {
                        // Empty list and not a cross-list drop - can't drop
                        return;
                    }
                }
                
                handleDragEnd(e);
            }}
        >
            {items.length === 0 ? (
                <div className="drag-and-drop-empty">No items to display</div>
            ) : (
                <ul className="drag-and-drop-items">
                    {items.map((item, index) => (
                        <li
                            key={item.uuid}
                            /**
                             * Dynamic CSS classes applied based on item state:
                             * - dragging: Applied when item is being dragged (opacity 0.5)
                             * - drag-over: Applied when user drags over this item (drop target)
                             * - selected: Applied when item is multi-selected (green highlight)
                             * - no-handle: Applied when drag handle icon should be hidden
                             */
                            className={`drag-and-drop-item ${
                                isDraggedItem(item) ? "dragging" : ""
                            } ${draggedOverItem?.uuid === item.uuid ? "drag-over" : ""} ${
                                selectedItems.has(item.uuid) ? "selected" : ""
                            } ${!showDragHandle ? "no-handle" : ""}`}
                            /**
                             * Inline styles for drop target highlighting
                             * 
                             * Always apply backgroundColor for smooth transitions
                             * When draggedOverItem matches, use the configured color
                             * Otherwise, use transparent to smoothly transition back
                             * 
                             * Respects selected items: if item is selected, don't override with inline style
                             * Let CSS class handle selected styling instead
                             * 
                             * This approach allows CSS transitions to work smoothly
                             * instead of adding/removing properties abruptly
                             */
                            style={{
                                backgroundColor: selectedItems.has(item.uuid)
                                    ? undefined
                                    : draggedOverItem?.uuid === item.uuid
                                        ? (dropHighlightColor?.value || '#e3f2fd')
                                        : 'transparent',
                                padding: '10px 12px',
                                borderRadius: '4px',
                                transition: 'background-color 0.3s ease',
                            } as React.CSSProperties}
                            draggable
                            onMouseDown={(e) => handleItemClick(item, e as any)}
                            onDragStart={(e) => handleDragStart(item, e)}
                            /**
                             * onDragOver: Allow drop by preventing default
                             * stopPropagation prevents event bubbling to parent elements
                             */
                            onDragOver={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDragOver(item);
                            }}
                            /**
                             * onDragLeave: Clear drop target when user drags away
                             * Only clear if leaving THIS specific item (prevents flickering)
                             */
                            onDragLeave={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (draggedOverItem?.uuid === item.uuid) {
                                    setDraggedOverItem(null);
                                }
                            }}
                            /**
                             * onDrop: Handle the actual drop operation
                             * Triggers the reordering logic
                             */
                            onDrop={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDragEnd(e);
                            }}
                            /**
                             * onDragEnd: Cleanup drag state after drop completes
                             * Separate from onDrop to avoid duplicate processing
                             */
                            onDragEnd={() => {
                                setDraggedItems([]);
                                setDraggedOverItem(null);
                            }}
                        >
                            {/* Drag handle icon (optional, controlled by showDragHandle prop) */}
                            {showDragHandle && <span className="drag-handle">⋮⋮</span>}
                            
                            {/* Item content - either custom widgets or UUID fallback */}
                            {content && item.object ? (
                                <div className="drag-item-content">
                                    {content.get(item.object)}
                                </div>
                            ) : (
                                <div className="drag-item-content">{item.uuid}</div>
                            )}
                            
                            {/* Item index number display */}
                            <span className="drag-item-index">{index + 1}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
