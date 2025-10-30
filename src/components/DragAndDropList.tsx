import { ReactElement, createElement, useState, useEffect } from "react";
import { ListValue, ListWidgetValue, ListAttributeValue, EditableValue, ObjectItem, DynamicValue } from "mendix";
import "../ui/DragAndDropList.css";

export interface DragAndDropListProps {
    dataSource: ListValue;
    uuidAttribute: ListAttributeValue<string>;
    sortingAttribute: ListAttributeValue<any>;
    changeJsonAttribute: EditableValue<string>;
    enableMultiSelect: boolean;
    showDragHandle: boolean;
    hoverHighlightColor?: DynamicValue<string>;
    dropHighlightColor?: DynamicValue<string>;
    content?: ListWidgetValue;
}

export interface DragItem {
    uuid: string;
    object: ObjectItem;
    originalIndex: number;
}

interface ChangeRecord {
    uuid: string;
    newIndex: number;
}

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
    const [items, setItems] = useState<DragItem[]>([]);
    const [draggedItems, setDraggedItems] = useState<DragItem[]>([]);
    const [draggedOverItem, setDraggedOverItem] = useState<DragItem | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    // Initialize items from dataSource
    useEffect(() => {
        if (dataSource && dataSource.items) {
            const newItems: DragItem[] = dataSource.items.map((item, index) => {
                // Get the UUID value for this item
                const uuidValue = uuidAttribute.get(item);
                const uuid = uuidValue?.value ?? `item-${index}`;

                // Read sortingAttribute to get the actual sort position
                const sortValue = sortingAttribute.get(item);
                const sortIndex = sortValue?.value ? Number(sortValue.value) : index;

                return {
                    uuid: String(uuid),
                    object: item,
                    originalIndex: sortIndex, // Use sort value as the original position
                };
            });
            
            // Sort items by their sorting attribute value
            newItems.sort((a, b) => a.originalIndex - b.originalIndex);
            
            setItems(newItems);
        }
    }, [dataSource, uuidAttribute, sortingAttribute]);

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

    const handleDragOver = (item: DragItem) => {
        setDraggedOverItem(item);
    };

    const handleDragEnd = () => {
        if (draggedItems.length === 0 || !draggedOverItem) {
            setDraggedItems([]);
            setDraggedOverItem(null);
            return;
        }

        // Check if dragging over one of the dragged items
        if (draggedItems.some(i => i.uuid === draggedOverItem.uuid)) {
            setDraggedItems([]);
            setDraggedOverItem(null);
            return;
        }

        // Create a new array with reordered items
        const newItems = [...items];
        const draggedOverIndex = newItems.findIndex(i => i.uuid === draggedOverItem.uuid);

        if (draggedOverIndex > -1) {
            // Remove all dragged items
            const draggedIndices: number[] = [];
            draggedItems.forEach(draggedItem => {
                const idx = newItems.findIndex(i => i.uuid === draggedItem.uuid);
                if (idx > -1) {
                    draggedIndices.push(idx);
                }
            });

            // Sort indices in descending order to remove from end first
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

            // Update sorting attributes and track changes
            const changes: ChangeRecord[] = [];

            newItems.forEach((item, newIndex) => {
                // Track changes if position changed
                if (item.originalIndex !== newIndex) {
                    changes.push({
                        uuid: item.uuid,
                        newIndex: newIndex,
                    });
                }
            });

            // Update the change JSON attribute on the context
            // The onDrop action will be automatically triggered by Mendix platform
            // when changeJsonAttribute changes (via onChange binding)
            // The onDrop microflow/nanoflow will handle updating the sorting attributes in the database
            if (changes.length > 0) {
                changeJsonAttribute.setValue(JSON.stringify(changes));
            }

            setItems(newItems);
            setSelectedItems(new Set()); // Clear selection after drop
        }

        setDraggedItems([]);
        setDraggedOverItem(null);
    };

    const isDraggedItem = (item: DragItem): boolean => {
        return draggedItems.some(i => i.uuid === item.uuid);
    };

    return (
        <div 
            className="drag-and-drop-list"
            style={{
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
                            className={`drag-and-drop-item ${
                                isDraggedItem(item) ? "dragging" : ""
                            } ${draggedOverItem?.uuid === item.uuid ? "drag-over" : ""} ${
                                selectedItems.has(item.uuid) ? "selected" : ""
                            } ${!showDragHandle ? "no-handle" : ""}`}
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
                            onDragOver={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDragOver(item);
                            }}
                            onDragLeave={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Clear drag over state only if we're leaving this specific item
                                if (draggedOverItem?.uuid === item.uuid) {
                                    setDraggedOverItem(null);
                                }
                            }}
                            onDrop={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDragEnd();
                            }}
                            onDragEnd={() => {
                                setDraggedItems([]);
                                setDraggedOverItem(null);
                            }}
                        >
                            {showDragHandle && <span className="drag-handle">⋮⋮</span>}
                            {content ? (
                                <div className="drag-item-content">
                                    {content.get(item.object)}
                                </div>
                            ) : (
                                <div className="drag-item-content">{item.uuid}</div>
                            )}
                            <span className="drag-item-index">{index + 1}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
