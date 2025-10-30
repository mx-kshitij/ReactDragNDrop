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
}

/**
 * Represents a change record for reordered items
 * Sent to onDrop action to update the database
 */
interface ChangeRecord {
    /** UUID of the item that was moved */
    uuid: string;
    /** New index position after reordering */
    newIndex: number;
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
                };
            });
            
            // Sort items by their sorting attribute value to display in correct order
            newItems.sort((a, b) => a.originalIndex - b.originalIndex);
            
            setItems(newItems);
        }
    }, [dataSource, uuidAttribute, sortingAttribute]);

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
     */
    const handleDragStart = (item: DragItem) => {
        // If multi-select is enabled and item is selected, drag all selected items
        if (enableMultiSelect && selectedItems.has(item.uuid)) {
            const itemsToDrag = items.filter(i => selectedItems.has(i.uuid));
            setDraggedItems(itemsToDrag);
        } else {
            // Otherwise drag just this item
            setDraggedItems([item]);
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
     */
    const handleDragOver = (item: DragItem) => {
        setDraggedOverItem(item);
    };

    /**
     * Handle drop event and reorder items
     * 
     * Process:
     * 1. Validate that we have items to drag and a target
     * 2. Check if dragging over one of the dragged items (invalid)
     * 3. Remove dragged items from their current positions
     * 4. Insert them at the target position
     * 5. Track changes and set JSON for onDrop action
     * 6. Update UI state
     * 
     * The onDrop action (microflow) will:
     * - Parse the JSON changes
     * - Update sorting attributes in the database
     * - Persist the new order
     */
    const handleDragEnd = () => {
        // Validate state
        if (draggedItems.length === 0 || !draggedOverItem) {
            setDraggedItems([]);
            setDraggedOverItem(null);
            return;
        }

        // Prevent dragging item onto itself
        if (draggedItems.some(i => i.uuid === draggedOverItem.uuid)) {
            setDraggedItems([]);
            setDraggedOverItem(null);
            return;
        }

        // Create a new array with reordered items
        const newItems = [...items];
        const draggedOverIndex = newItems.findIndex(i => i.uuid === draggedOverItem.uuid);

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
            const insertIndex = newItems.findIndex(i => i.uuid === draggedOverItem.uuid);
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
                    });
                }
            });

            /**
             * Set the JSON changes to context attribute
             * 
             * Mendix automatically triggers the onChange="onDrop" action
             * when changeJsonAttribute is updated
             * 
             * JSON format: [{ uuid: string, newIndex: number }, ...]
             */
            if (changes.length > 0) {
                changeJsonAttribute.setValue(JSON.stringify(changes));
            }

            // Update UI to reflect new order
            setItems(newItems);
            setSelectedItems(new Set()); // Clear selection after drop
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
                             * Only applied when this item is the drop target
                             * Provides visual feedback to user showing where items will be dropped
                             */
                            style={
                                draggedOverItem?.uuid === item.uuid
                                    ? {
                                        backgroundColor: (dropHighlightColor?.value || '#e3f2fd'),
                                        padding: '10px 12px',
                                        borderRadius: '4px',
                                    } as React.CSSProperties
                                    : undefined
                            }
                            draggable
                            onMouseDown={(e) => handleItemClick(item, e as any)}
                            onDragStart={() => handleDragStart(item)}
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
                                handleDragEnd();
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
                            {content ? (
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
