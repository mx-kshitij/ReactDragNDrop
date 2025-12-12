import { ReactElement, createElement, useState, useEffect } from "react";
import "../ui/DragAndDropList.css";
import { DragItem, ChangeRecord, DragAndDropListProps } from "./types";
import {
    isDropAllowed,
    getDragContextFromDOM,
    setDragContextOnDOM,
    clearDragContextFromDOM,
    initializeItems,
    isDraggedItem as checkIsDraggedItem,
} from "./utils";

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
    changeJsonMode,
    listId,
    allowedLists,
    allowDropOn,
    dropOption,
    enableMultiSelect,
    showDragHandle,
    hoverHighlightColor,
    dropBeforeColor,
    dropOnColor,
    dropAfterColor,
    content,
    emptyListContent,
}: DragAndDropListProps): ReactElement {
    // State management
    const [items, setItems] = useState<DragItem[]>([]);
    const [draggedItems, setDraggedItems] = useState<DragItem[]>([]);
    const [draggedOverItem, setDraggedOverItem] = useState<DragItem | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [dropIndicatorPosition, setDropIndicatorPosition] = useState<'before' | 'after' | 'on' | null>(null);
    const [currentDropType, setCurrentDropType] = useState<'before' | 'after' | 'on' | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);

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
        const newItems = initializeItems(dataSource, uuidAttribute, sortingAttribute, listId);
        setItems(newItems);
        
        // Reset drag state when datasource updates (after drop operations)
        // This ensures styling is cleaned up and the UI reflects the updated datasource
        setDraggedItems([]);
        setDraggedOverItem(null);
    }, [dataSource, uuidAttribute, sortingAttribute, listId]);

    /**
     * Filter changes based on changeJsonMode
     * - fullChange: Include all items (dragged + re-indexed)
     * - targetOnly: Include only items that were actually dragged (have dropType or targetItemUuid)
     */
    const filterChanges = (changes: ChangeRecord[]): ChangeRecord[] => {
        if (changeJsonMode === "targetOnly") {
            return changes.filter(c => c.dropType || c.targetItemUuid);
        }
        return changes;
    };

    /**
     * Handle item click for multi-select functionality
     * 
     * Only active when enableMultiSelect is true
     * Toggles selection state for the clicked item
     * Uses mousedown/mouseup to distinguish clicks from drags
     */
    const handleItemClick = (item: DragItem, event: React.MouseEvent) => {
        if (!enableMultiSelect) {
            return;
        }

        // Don't prevent default - let drag work normally
        
        // Set a flag to detect if drag starts
        // If drag starts within a short time, we won't toggle selection
        const clickTimer = setTimeout(() => {
            if (!isDragging) {
                // Toggle selection on click (no shift required)
                const newSelected = new Set(selectedItems);
                if (newSelected.has(item.uuid)) {
                    newSelected.delete(item.uuid);
                } else {
                    newSelected.add(item.uuid);
                }
                setSelectedItems(newSelected);
            }
        }, 150); // Small delay to detect drag start
        
        // Store timer to clean up if needed
        (event.currentTarget as any).__clickTimer = clickTimer;
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
        // Stop propagation to prevent parent list's handleDragStart from being called
        // This is critical for nested lists - only the innermost list should handle the drag
        event.stopPropagation();
        
        // Set dragging flag to prevent click handler from firing
        setIsDragging(true);
        
        // Store drag context in DOM attributes on the list container for cross-instance access
        // This is important for nested lists - we set it on the closest list container
        const listContainer = event.currentTarget.closest('.drag-and-drop-list') as HTMLElement;
        if (listContainer) {
            setDragContextOnDOM(listContainer, listId, allowedLists || "");
        }
        
        // If multi-select is enabled and item is selected, drag all selected items
        if (enableMultiSelect && selectedItems.has(item.uuid)) {
            const itemsToDrag = items.filter(i => selectedItems.has(i.uuid));
            setDraggedItems(itemsToDrag);
            
            // Set dataTransfer data for cross-list dragging
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.dropEffect = "move";
            const dragData = {
                sourceListId: listId,
                sourceListAllowedLists: allowedLists,
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
                sourceListAllowedLists: allowedLists,
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
     * Handle drag over event to update visual feedback
     * 
     * Only shows drop highlight if the item being hovered over is in the allowed lists
     * of the currently dragged items.
     * 
     * Uses dataTransfer to read allowed lists across widget instances.
     * This is necessary because each widget instance has its own React state,
     * and dragging across multiple instances requires cross-instance communication via DOM.
     * 
     * Checks:
     * 1. Extract sourceListAllowedLists from dataTransfer
     * 2. If empty or undefined, this is same-list drag - always allow highlight
     * 3. If cross-list drag, check if target item's listName is in allowed lists
     * 4. Only update draggedOverItem if allowed
     * 
     * Optimization: Only update state if the draggedOverItem actually changed
     * This prevents unnecessary re-renders and reduces flickering
     */
    const handleDragOver = (item: DragItem, _event: React.DragEvent<HTMLLIElement>) => {
        try {
            // Read drag context from DOM since dataTransfer.getData() doesn't work during dragover
            const { sourceListId, allowedLists: sourceAllowedLists } = getDragContextFromDOM();

            // Check if this drop is allowed based on source's allowedLists
            const isAllowed = isDropAllowed(sourceAllowedLists, sourceListId, listId);
            
            if (isAllowed && draggedOverItem?.uuid !== item.uuid) {
                setDraggedOverItem(item);
            } else if (!isAllowed && draggedOverItem?.uuid === item.uuid) {
                // If this item was previously highlighted but is now not allowed, clear it
                setDraggedOverItem(null);
            }
        } catch (err) {
            // If anything goes wrong, don't show highlight to be safe
            if (draggedOverItem?.uuid === item.uuid) {
                setDraggedOverItem(null);
            }
        }
    };

    /**
     * Determine the drop zone based on cursor position within item
     * 
     * Behavior depends on dropOption configuration:
     * - 'auto': Dynamic positioning based on cursor and allowDropOn setting
     *   - When allowDropOn is true: divides item into 3 zones (before/on/after)
     *   - When allowDropOn is false: divides item into 2 zones (before/after)
     * - 'before': Always returns 'before'
     * - 'on': Always returns 'on'
     * - 'after': Always returns 'after'
     */
    const getDropZone = (element: HTMLElement, clientY: number): 'before' | 'after' | 'on' => {
        // If dropOption is not 'auto', return the forced position
        if (dropOption !== 'auto') {
            return dropOption;
        }
        
        // Auto mode: calculate based on cursor position
        const rect = element.getBoundingClientRect();
        const height = rect.height;
        const offsetY = clientY - rect.top;
        
        if (!allowDropOn) {
            // 2-zone mode: before/after
            return offsetY < height / 2 ? 'before' : 'after';
        }
        
        // 3-zone mode: before/on/after
        const thirdHeight = height / 3;
        if (offsetY < thirdHeight) {
            return 'before';
        } else if (offsetY < thirdHeight * 2) {
            return 'on';
        } else {
            return 'after';
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
        
        // VALIDATION: Check if this drop is allowed based on allowedLists configuration
        if (isCrossListDrop) {
            const sourceAllowedLists = (crossListData as any)?.sourceListAllowedLists;
            const sourceListId = crossListData?.sourceListId || "";
            if (!isDropAllowed(sourceAllowedLists, sourceListId, listId)) {
                setDraggedItems([]);
                setDraggedOverItem(null);
                return;
            }
        }
        
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
                        dropType: "after", // Default drop type for empty list drops
                        // No targetItemUuid for empty list
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
                    
                    // Re-index remaining items (just new indices, no position/target)
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
                    const finalChanges = filterChanges(allChanges);
                    changeJsonAttribute.setValue(JSON.stringify(finalChanges));
                }

                // Note: Items will appear in the list after datasource updates from the onDrop action
                // Don't add temporary items here to avoid ObjectItem validation errors
                // setItems will be updated when datasource changes
            } else {
                // Non-empty list case - insert at draggedOverItem position
                let draggedOverIndex = newItems.findIndex(i => i.uuid === draggedOverItem?.uuid);

                if (draggedOverIndex > -1) {
                    // For "on" drops: no rearrangement in target list
                    if (currentDropType === 'on') {
                        // Create change records for items dropped ON without rearranging target list
                        const allChanges: ChangeRecord[] = [];
                        
                        // Add changes for dragged items (dropped ON target)
                        itemsBeingDragged.forEach(uuid => {
                            allChanges.push({
                                uuid: uuid,
                                newIndex: null, // No index for "on" drops
                                sourceListId: sourceListId,
                                targetListId: listId,
                                dropType: "on",
                                targetItemUuid: draggedOverItem?.uuid, // UUID of the item dropped ON
                            });
                        });

                        // For cross-list "on" drops, we still need to re-index the source list
                        // Extract and process source list for re-indexing remaining items
                        if (crossListData?.sourceListAllItems) {
                            const sourceAllItems = crossListData.sourceListAllItems;
                            const movedUuids = new Set(itemsBeingDragged);
                            
                            // Get remaining items (not being moved) sorted by original index
                            const remainingItems = sourceAllItems
                                .filter((item: { uuid: string; originalIndex: number }) => !movedUuids.has(item.uuid))
                                .sort((a: { uuid: string; originalIndex: number }, b: { uuid: string; originalIndex: number }) => a.originalIndex - b.originalIndex);
                            
                            // Re-index remaining items in source list (just new indices, no position/target)
                            remainingItems.forEach((item: { uuid: string; originalIndex: number }, newIndex: number) => {
                                allChanges.push({
                                    uuid: item.uuid,
                                    newIndex: newIndex,
                                    sourceListId: sourceListId,
                                    targetListId: sourceListId,
                                });
                            });
                        }

                        if (allChanges.length > 0) {
                            const finalChanges = filterChanges(allChanges);
                            changeJsonAttribute.setValue(JSON.stringify(finalChanges));
                        }
                    } else {
                        // For "before"/"after" drops: normal rearrangement
                        // Determine insertion point based on drop type (cursor position)
                        // currentDropType comes from the cursor position during drag-over
                        let insertPointIndex = draggedOverIndex;
                        
                        if (currentDropType === 'after') {
                            insertPointIndex = draggedOverIndex + 1;
                        }
                        // else currentDropType === 'before', insertPointIndex stays at draggedOverIndex
                        
                        // For cross-list drops, we need to send newIndex for ALL items:
                        // 1. Target list items (both new and shifted existing)
                        // 2. Source list items (remaining items with re-calculated indices)
                        
                        // Create a virtual array showing where items will be after insertion
                        const virtualItems: { uuid: string; isNew: boolean; dropType?: string }[] = [];
                        
                        // Add existing items up to insert point
                        for (let i = 0; i < insertPointIndex; i++) {
                            virtualItems.push({ uuid: newItems[i].uuid, isNew: false });
                        }
                        
                        // Add the dragged items (in order they were dragged)
                        itemsBeingDragged.forEach(uuid => {
                            virtualItems.push({ uuid: uuid, isNew: true, dropType: currentDropType || 'after' });
                        });
                        
                        // Add remaining items
                        for (let i = insertPointIndex; i < newItems.length; i++) {
                            virtualItems.push({ uuid: newItems[i].uuid, isNew: false });
                        }

                        // Generate changes for ALL items that need re-indexing
                        const allChanges: ChangeRecord[] = [];
                        
                        // Target list changes: all items in virtual array
                        virtualItems.forEach((item, newIndex) => {
                            if (item.isNew) {
                                // New dragged items from source list
                                const changeRecord: ChangeRecord = {
                                    uuid: item.uuid,
                                    newIndex: newIndex,
                                    sourceListId: sourceListId,
                                    targetListId: listId,
                                    dropType: (currentDropType || 'after') as "before" | "after" | "on",
                                    targetItemUuid: draggedOverItem?.uuid,
                                };
                                allChanges.push(changeRecord);
                            } else {
                                // Existing items in target list that may have shifted (just new indices, no position/target)
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
                            
                            // Re-index remaining items (just new indices, no position/target)
                            remainingItems.forEach((item: { uuid: string; originalIndex: number }, newIndex: number) => {
                                allChanges.push({
                                    uuid: item.uuid,
                                    newIndex: newIndex,
                                    sourceListId: sourceListId,
                                    targetListId: sourceListId, // Same list, just re-indexed
                                });
                            });
                        }

                        if (allChanges.length > 0) {
                            const finalChanges = filterChanges(allChanges);
                            changeJsonAttribute.setValue(JSON.stringify(finalChanges));
                        }
                    }
                }
            }
        } else {
            // SAME-LIST REORDERING
            // Check if same-list drop is allowed (listId must be in allowedLists)
            const allowedListsStr = allowedLists || "";
            if (!isDropAllowed(allowedListsStr, listId, listId)) {
                setDraggedItems([]);
                setDraggedOverItem(null);
                return;
            }
            
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
            let draggedOverIndex = newItems.findIndex(i => i.uuid === draggedOverItemSafe.uuid);

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

                // For "on" drops: don't rearrange, just put items back in original positions
                // For "before"/"after" drops: rearrange items
                if (currentDropType !== 'on') {
                    // Determine insertion point based on drop type (cursor position)
                    // currentDropType comes from the cursor position during drag-over
                    let insertIndex = newItems.findIndex(i => i.uuid === draggedOverItemSafe.uuid);
                    if (insertIndex > -1) {
                        let finalInsertIndex = insertIndex;
                        
                        if (currentDropType === 'after') {
                            finalInsertIndex = insertIndex + 1;
                        }
                        // else currentDropType === 'before', finalInsertIndex stays at insertIndex
                        
                        newItems.splice(finalInsertIndex, 0, ...removed);
                    }
                } else {
                    // For "on" drops: put all removed items back at the end (restore original state)
                    // This ensures no rearrangement happens
                    newItems.push(...removed);
                }

                // Calculate changes and generate JSON for onDrop action
                const changes: ChangeRecord[] = [];

                if (currentDropType === 'on') {
                    // For "on" drops: No rearrangement, just track that items were dropped ON target
                    draggedItems.forEach(draggedItem => {
                        changes.push({
                            uuid: draggedItem.uuid,
                            newIndex: null, // No index change for "on" drops
                            sourceListId: listId,
                            targetListId: listId,
                            dropType: "on",
                            targetItemUuid: draggedOverItemSafe.uuid, // UUID of the item dropped ON
                        });
                    });
                } else {
                    // For "before"/"after" drops: Track position changes
                    const draggedUuids = new Set(draggedItems.map(i => i.uuid));
                    newItems.forEach((item, newIndex) => {
                        // Track changes if position changed from original
                        if (item.originalIndex !== newIndex) {
                            const changeRecord: ChangeRecord = {
                                uuid: item.uuid,
                                newIndex: newIndex,
                                sourceListId: listId,
                                targetListId: listId,
                            };
                            // Only include dropType and targetItemUuid for items that were actually dragged
                            if (draggedUuids.has(item.uuid)) {
                                changeRecord.dropType = (currentDropType || 'after') as "before" | "after" | "on";
                                changeRecord.targetItemUuid = draggedOverItemSafe.uuid;
                            }
                            changes.push(changeRecord);
                        }
                    });
                }

                /**
                 * Set the JSON changes to context attribute
                 * 
                 * For same-list drops:
                 * - Always trigger onDrop if dropType === 'on' (dropping ON another item)
                 * - Only trigger onDrop if sortingAttribute is provided (for before/after drops)
                 * 
                 * For cross-list drops: Always trigger (handled separately above)
                 * 
                 * Mendix automatically triggers the onChange="onDrop" action
                 * when changeJsonAttribute is updated
                 * 
                 * JSON format: [{ uuid: string, newIndex?: number, sourceListId: string, targetListId: string, dropType?: string }, ...]
                 */
                const shouldTriggerAction = changes.length > 0 && (currentDropType === 'on' || sortingAttribute);
                if (shouldTriggerAction) {
                    const finalChanges = filterChanges(changes);
                    changeJsonAttribute.setValue(JSON.stringify(finalChanges));
                }

                // Update UI to reflect new order
                setItems(newItems);
                setSelectedItems(new Set()); // Clear selection after drop
            }
        }

        // Clean up drag state
        setDraggedItems([]);
        setDraggedOverItem(null);
        setIsDragging(false);
        
        // Clean up all overlay masks to prevent flickering
        document.querySelectorAll('.drop-overlay-mask').forEach(overlay => overlay.remove());
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
                
                // Check if this is an allowed drop target
                try {
                    const data = e.dataTransfer?.getData("application/x-dragdroplist");
                    if (data) {
                        const dragData = JSON.parse(data);
                        const isCrossListDrag = dragData.sourceListId !== listId;
                        
                        // For cross-list drags, only allow drop if target is in source's allowedLists
                        if (isCrossListDrag) {
                            const sourceAllowedLists = (dragData as any)?.sourceListAllowedLists;
                            const sourceListId = dragData.sourceListId || "";
                            if (!isDropAllowed(sourceAllowedLists, sourceListId, listId)) {
                                e.dataTransfer.dropEffect = "none";
                                return;
                            }
                        }
                    }
                } catch (err) {
                    // Ignore errors in drag data parsing
                }
                
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
                        
                        // Additional check: verify that this cross-list drop is allowed
                        // Note: sourceListAllowedLists comes from the source list's configuration
                        const sourceAllowedLists = (crossListData as any)?.sourceListAllowedLists;
                        const sourceListId = crossListData.sourceListId || "";
                        if (hasValidDropData && !isDropAllowed(sourceAllowedLists, sourceListId, listId)) {
                            return;
                        }
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
                <div className="drag-and-drop-empty">{emptyListContent || "No items to display"}</div>
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
                             * - list-{listName}: Applied based on item's list membership (for allowed list validation)
                             */
                            className={`drag-and-drop-item ${
                                checkIsDraggedItem(item, draggedItems) ? "dragging" : ""
                            } ${draggedOverItem?.uuid === item.uuid ? "drag-over" : ""} ${
                                draggedOverItem?.uuid === item.uuid && dropIndicatorPosition ? `drop-${dropIndicatorPosition}` : ""
                            } ${
                                selectedItems.has(item.uuid) ? "selected" : ""
                            } ${!showDragHandle ? "no-handle" : ""} ${
                                item.listName ? `list-${item.listName}` : ""
                            }`}
                            /**
                             * Inline styles for drop target highlighting
                             * 
                             * Only set backgroundColor when item is being dragged over
                             * Otherwise use undefined to let CSS handle the default styling
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
                                    : undefined, // All drop feedback now handled by overlay mask
                                '--drop-overlay-color': draggedOverItem?.uuid === item.uuid && dropIndicatorPosition === 'on'
                                    ? (dropOnColor?.value || '#c8e6c9')
                                    : 'transparent',
                                padding: '10px 12px',
                                borderRadius: '4px',
                                transition: 'background-color 0.3s ease',
                            } as React.CSSProperties}
                            draggable
                            onMouseDown={(e) => handleItemClick(item, e as any)}
                            onDragStart={(e) => handleDragStart(item, e)}
                            /**
                             * onDragOver: Validate drop target and show/hide highlight
                             * Also sets dropEffect to signal whether drop is allowed
                             */
                            onDragOver={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                // Call handleDragOver which will validate based on allowedLists
                                handleDragOver(item, e);
                                
                                // Determine drop zone based on cursor location (2-zone or 3-zone based on allowDropOn)
                                const calculatedDropZone = getDropZone(e.currentTarget, e.clientY);
                                setDropIndicatorPosition(calculatedDropZone);
                                setCurrentDropType(calculatedDropZone);
                                
                                const target = e.currentTarget as HTMLElement;
                                
                                // Remove overlays from other items (not this one)
                                document.querySelectorAll('.drop-overlay-mask').forEach(overlay => {
                                    if (!target.contains(overlay)) {
                                        overlay.remove();
                                    }
                                });
                                
                                // Only show overlay if drop is allowed (draggedOverItem is set by handleDragOver)
                                if (calculatedDropZone && draggedOverItem?.uuid === item.uuid) {
                                    let overlay = target.querySelector('.drop-overlay-mask') as HTMLElement;
                                    
                                    // Determine color based on drop zone
                                    const overlayColor = calculatedDropZone === 'before'
                                        ? (dropBeforeColor?.value || '#e3f2fd')
                                        : calculatedDropZone === 'on'
                                        ? (dropOnColor?.value || '#c8e6c9')
                                        : (dropAfterColor?.value || '#fff9c4');
                                    
                                    // Calculate position based on drop zone and mode
                                    let overlayPosition = '';
                                    if (dropOption === 'auto') {
                                        // Auto mode: show overlay only on the specific zone
                                        const rect = target.getBoundingClientRect();
                                        const height = rect.height;
                                        
                                        if (allowDropOn) {
                                            // 3-zone mode
                                            const thirdHeight = height / 3;
                                            if (calculatedDropZone === 'before') {
                                                overlayPosition = `top: 0; left: 0; right: 0; height: ${thirdHeight}px;`;
                                            } else if (calculatedDropZone === 'on') {
                                                overlayPosition = `top: ${thirdHeight}px; left: 0; right: 0; height: ${thirdHeight}px;`;
                                            } else { // after
                                                overlayPosition = `top: ${thirdHeight * 2}px; left: 0; right: 0; height: ${thirdHeight}px;`;
                                            }
                                        } else {
                                            // 2-zone mode
                                            const halfHeight = height / 2;
                                            if (calculatedDropZone === 'before') {
                                                overlayPosition = `top: 0; left: 0; right: 0; height: ${halfHeight}px;`;
                                            } else { // after
                                                overlayPosition = `top: ${halfHeight}px; left: 0; right: 0; height: ${halfHeight}px;`;
                                            }
                                        }
                                    } else {
                                        // Forced mode: show overlay on entire item
                                        overlayPosition = 'top: 0; left: 0; right: 0; bottom: 0;';
                                    }
                                    
                                    if (!overlay) {
                                        overlay = document.createElement('div');
                                        overlay.className = 'drop-overlay-mask';
                                        target.style.position = 'relative';
                                        target.appendChild(overlay);
                                    }
                                    
                                    overlay.style.cssText = `
                                        position: absolute;
                                        ${overlayPosition}
                                        background-color: ${overlayColor};
                                        opacity: 0.7;
                                        pointer-events: none;
                                        z-index: 9999;
                                        border-radius: 4px;
                                    `;
                                } else {
                                    // Remove overlay from current item if drop not allowed or no drop zone
                                    const overlay = target.querySelector('.drop-overlay-mask');
                                    if (overlay) {
                                        overlay.remove();
                                    }
                                }
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
                                    setDropIndicatorPosition(null);
                                    setCurrentDropType(null);
                                    
                                    // Remove overlay mask
                                    const target = e.currentTarget as HTMLElement;
                                    const overlay = target.querySelector('.drop-overlay-mask');
                                    if (overlay) {
                                        overlay.remove();
                                    }
                                }
                            }}
                            /**
                             * onDrop: Handle the actual drop operation
                             * Triggers the reordering logic
                             */
                            onDrop={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                // Remove overlay mask before handling drop
                                const target = e.currentTarget as HTMLElement;
                                const overlay = target.querySelector('.drop-overlay-mask');
                                if (overlay) {
                                    overlay.remove();
                                }
                                
                                handleDragEnd(e);
                            }}
                            /**
                             * onDragEnd: Cleanup drag state after drop completes
                             * Separate from onDrop to avoid duplicate processing
                             */
                            onDragEnd={() => {
                                setDraggedItems([]);
                                setDraggedOverItem(null);
                                setDropIndicatorPosition(null);
                                setCurrentDropType(null);
                                setIsDragging(false);
                                setSelectedItems(new Set()); // Clear selection after drag
                                
                                // Clean up all overlay masks to prevent flickering
                                document.querySelectorAll('.drop-overlay-mask').forEach(overlay => overlay.remove());
                                
                                // Clear drag context attributes from the list container
                                const listContainer = document.querySelector('.drag-and-drop-list[data-drag-source-list]') as HTMLElement;
                                if (listContainer) {
                                    clearDragContextFromDOM(listContainer);
                                }
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
