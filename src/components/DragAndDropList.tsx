import { ReactElement, createElement, useState, useEffect } from "react";
import "../ui/DragAndDropList.css";
import { DragItem, ChangeRecord, DragAndDropListProps } from "./types";
import { DragDropListItem } from "./DragDropListItem";
import {
    isDropAllowed,
    getDragContextFromDOM,
    setDragContextOnDOM,
    initializeItems,
    removeAllOverlays,
    handleDropToEmptyList,
    handleOnDrop,
    handleCrossListBeforeAfterDrop,
    handleSameListReorder,
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
        // Parse cross-list data from dataTransfer
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

        const isCrossListDrop = crossListData && crossListData.sourceListId !== listId;
        
        // Validate drop is allowed
        if (isCrossListDrop) {
            const sourceAllowedLists = (crossListData as any)?.sourceListAllowedLists;
            const sourceListId = crossListData?.sourceListId || "";
            if (!isDropAllowed(sourceAllowedLists, sourceListId, listId)) {
                setDraggedItems([]);
                setDraggedOverItem(null);
                return;
            }
        }
        
        // Validate required data exists
        if (isCrossListDrop) {
            if (!crossListData) {
                setDraggedItems([]);
                setDraggedOverItem(null);
                return;
            }
        } else {
            if (draggedItems.length === 0 || !draggedOverItem) {
                setDraggedItems([]);
                setDraggedOverItem(null);
                return;
            }
        }

        const itemsBeingDragged = crossListData?.itemUuids || draggedItems.map(i => i.uuid);
        const sourceListId = crossListData?.sourceListId || (draggedItems[0]?.listId ?? listId);
        
        if (isCrossListDrop) {
            handleCrossListDrop(itemsBeingDragged, sourceListId, crossListData?.sourceListAllItems);
        } else {
            handleSameListDrop();
        }

        // Clean up drag state
        setDraggedItems([]);
        setDraggedOverItem(null);
        setIsDragging(false);
        
        // Clean up all overlay masks to prevent flickering
        removeAllOverlays();
    };

    /**
     * Handle cross-list drop operations
     */
    const handleCrossListDrop = (
        itemsBeingDragged: string[],
        sourceListId: string,
        sourceListAllItems?: Array<{ uuid: string; originalIndex: number }>
    ) => {
        let allChanges: ChangeRecord[] = [];

        if (items.length === 0) {
            // Drop to empty list
            allChanges = handleDropToEmptyList(itemsBeingDragged, sourceListId, listId, sourceListAllItems);
        } else if (!draggedOverItem) {
            return; // No target item
        } else if (currentDropType === 'on') {
            // Drop ON another item
            allChanges = handleOnDrop(itemsBeingDragged, sourceListId, listId, draggedOverItem.uuid, sourceListAllItems);
        } else {
            // Drop before/after another item
            const draggedOverIndex = items.findIndex(i => i.uuid === draggedOverItem.uuid);
            if (draggedOverIndex > -1) {
                const insertIndex = currentDropType === 'after' ? draggedOverIndex + 1 : draggedOverIndex;
                allChanges = handleCrossListBeforeAfterDrop(
                    itemsBeingDragged,
                    items,
                    insertIndex,
                    (currentDropType || 'after') as 'before' | 'after',
                    sourceListId,
                    listId,
                    draggedOverItem.uuid,
                    sourceListAllItems
                );
            }
        }

        if (allChanges.length > 0) {
            const finalChanges = filterChanges(allChanges);
            changeJsonAttribute.setValue(JSON.stringify(finalChanges));
        }
    };

    /**
     * Handle same-list reordering
     */
    const handleSameListDrop = () => {
        // Check if same-list drop is allowed
        const allowedListsStr = allowedLists || "";
        if (!isDropAllowed(allowedListsStr, listId, listId)) {
            return;
        }
        
        const draggedOverItemSafe = draggedOverItem!;
        
        // Prevent dragging item onto itself
        if (draggedItems.some(i => i.uuid === draggedOverItemSafe.uuid)) {
            return;
        }

        const { newItems, changes } = handleSameListReorder(
            draggedItems,
            items,
            draggedOverItemSafe,
            currentDropType,
            listId
        );

        const shouldTriggerAction = changes.length > 0 && (currentDropType === 'on' || sortingAttribute);
        if (shouldTriggerAction) {
            const finalChanges = filterChanges(changes);
            changeJsonAttribute.setValue(JSON.stringify(finalChanges));
        }

        setItems(newItems);
        setSelectedItems(new Set());
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
                        <DragDropListItem
                            key={item.uuid}
                            item={item}
                            index={index}
                            draggedItems={draggedItems}
                            draggedOverItem={draggedOverItem}
                            dropIndicatorPosition={dropIndicatorPosition}
                            selectedItems={selectedItems}
                            showDragHandle={showDragHandle}
                            dropOnColor={dropOnColor}
                            content={content}
                            dropOption={dropOption}
                            allowDropOn={allowDropOn}
                            dropBeforeColor={dropBeforeColor}
                            dropAfterColor={dropAfterColor}
                            handleItemClick={handleItemClick}
                            handleDragStart={handleDragStart}
                            handleDragOver={handleDragOver}
                            handleDragEnd={handleDragEnd}
                            setDraggedOverItem={setDraggedOverItem}
                            setDropIndicatorPosition={setDropIndicatorPosition}
                            setCurrentDropType={setCurrentDropType}
                            setDraggedItems={setDraggedItems}
                            setIsDragging={setIsDragging}
                            setSelectedItems={setSelectedItems}
                            getDropZone={getDropZone}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}
