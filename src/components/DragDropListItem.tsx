import { createElement } from "react";
import { DragItem } from "./types";
import { 
    handleItemDragOver, 
    removeAllOverlays, 
    clearDragContextFromDOM,
    isDraggedItem as checkIsDraggedItem,
} from "./utils";

interface DragDropListItemProps {
    item: DragItem;
    index: number;
    draggedItems: DragItem[];
    draggedOverItem: DragItem | null;
    dropIndicatorPosition: 'before' | 'after' | 'on' | null;
    selectedItems: Set<string>;
    showDragHandle: boolean;
    dropOnColor: any;
    content: any;
    dropOption: string;
    allowDropOn: boolean;
    dropBeforeColor: any;
    dropAfterColor: any;
    handleItemClick: (item: DragItem, e: React.MouseEvent) => void;
    handleDragStart: (item: DragItem, e: React.DragEvent) => void;
    handleDragOver: (item: DragItem, e: React.DragEvent) => void;
    handleDragEnd: (e?: React.DragEvent) => void;
    setDraggedOverItem: (item: DragItem | null) => void;
    setDropIndicatorPosition: (position: 'before' | 'after' | 'on' | null) => void;
    setCurrentDropType: (type: 'before' | 'after' | 'on' | null) => void;
    setDraggedItems: (items: DragItem[]) => void;
    setIsDragging: (dragging: boolean) => void;
    setSelectedItems: (items: Set<string>) => void;
    getDropZone: (element: HTMLElement, clientY: number) => 'before' | 'after' | 'on';
}

/**
 * Individual drag-and-drop list item component
 * Handles all drag events and visual feedback for a single item
 */
export function DragDropListItem({
    item,
    index,
    draggedItems,
    draggedOverItem,
    dropIndicatorPosition,
    selectedItems,
    showDragHandle,
    dropOnColor,
    content,
    dropOption,
    allowDropOn,
    dropBeforeColor,
    dropAfterColor,
    handleItemClick,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    setDraggedOverItem,
    setDropIndicatorPosition,
    setCurrentDropType,
    setDraggedItems,
    setIsDragging,
    setSelectedItems,
    getDropZone,
}: DragDropListItemProps) {
    /**
     * Build CSS class names based on item state
     */
    const getItemClassName = () => {
        const classes = ['drag-and-drop-item'];
        
        if (checkIsDraggedItem(item, draggedItems)) {
            classes.push('dragging');
        }
        
        if (draggedOverItem?.uuid === item.uuid) {
            classes.push('drag-over');
            if (dropIndicatorPosition) {
                classes.push(`drop-${dropIndicatorPosition}`);
            }
        }
        
        if (selectedItems.has(item.uuid)) {
            classes.push('selected');
        }
        
        if (!showDragHandle) {
            classes.push('no-handle');
        }
        
        if (item.listName) {
            classes.push(`list-${item.listName}`);
        }
        
        return classes.join(' ');
    };

    /**
     * Build inline styles for the item
     */
    const getItemStyle = (): React.CSSProperties => {
        return {
            backgroundColor: selectedItems.has(item.uuid) ? undefined : undefined, // All drop feedback now handled by overlay mask
            '--drop-overlay-color': draggedOverItem?.uuid === item.uuid && dropIndicatorPosition === 'on'
                ? (dropOnColor?.value || '#c8e6c9')
                : 'transparent',
            padding: '10px 12px',
            borderRadius: '4px',
            transition: 'background-color 0.3s ease',
        } as React.CSSProperties;
    };

    /**
     * Handle drag over event with overlay management
     */
    const onDragOver = (e: React.DragEvent<HTMLLIElement>) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Call handleDragOver which will validate based on allowedLists
        handleDragOver(item, e);
        
        // Determine drop zone based on cursor location (2-zone or 3-zone based on allowDropOn)
        const calculatedDropZone = getDropZone(e.currentTarget, e.clientY);
        setDropIndicatorPosition(calculatedDropZone);
        setCurrentDropType(calculatedDropZone);
        
        const target = e.currentTarget as HTMLElement;
        
        // Handle overlay management
        handleItemDragOver(
            target,
            calculatedDropZone,
            draggedOverItem?.uuid === item.uuid,
            dropOption,
            allowDropOn,
            dropBeforeColor,
            dropOnColor,
            dropAfterColor
        );
    };

    /**
     * Handle drag leave event
     */
    const onDragLeave = (e: React.DragEvent<HTMLLIElement>) => {
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
    };

    /**
     * Handle drop event
     */
    const onDrop = (e: React.DragEvent<HTMLLIElement>) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Remove overlay mask before handling drop
        const target = e.currentTarget as HTMLElement;
        const overlay = target.querySelector('.drop-overlay-mask');
        if (overlay) {
            overlay.remove();
        }
        
        handleDragEnd(e);
    };

    /**
     * Handle drag end event - cleanup
     */
    const onDragEnd = () => {
        setDraggedItems([]);
        setDraggedOverItem(null);
        setDropIndicatorPosition(null);
        setCurrentDropType(null);
        setIsDragging(false);
        setSelectedItems(new Set()); // Clear selection after drag
        
        // Clean up all overlay masks to prevent flickering
        removeAllOverlays();
        
        // Clear drag context attributes from the list container
        const listContainer = document.querySelector('.drag-and-drop-list[data-drag-source-list]') as HTMLElement;
        if (listContainer) {
            clearDragContextFromDOM(listContainer);
        }
    };

    return (
        <li
            key={item.uuid}
            className={getItemClassName()}
            style={getItemStyle()}
            draggable
            onMouseDown={(e) => handleItemClick(item, e as any)}
            onDragStart={(e) => handleDragStart(item, e)}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
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
    );
}
