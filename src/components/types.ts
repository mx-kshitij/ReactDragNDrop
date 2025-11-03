import { ListValue, ListWidgetValue, ListAttributeValue, EditableValue, ObjectItem, DynamicValue } from "mendix";

/**
 * Enumeration for drop position relative to target item
 */
export enum DropPosition {
    Before = "before",
    After = "after",
}

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
    /** Comma-separated list IDs that can accept items from this list. Leave empty to restrict drops to same list only. */
    allowedLists?: string;
    /** Position to drop items relative to the target item (before or after) */
    dropPosition: DropPosition;
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
    /** Name/ID of the list (for CSS class matching) - set on render */
    listName?: string;
}

/**
 * Represents a change record for reordered items
 * Sent to onDrop action to update the database
 * 
 * Supports both same-list reordering and cross-list moves:
 * - Same-list: sourceListId equals targetListId
 * - Cross-list: sourceListId differs from targetListId
 */
export interface ChangeRecord {
    /** UUID of the item that was moved */
    uuid: string;
    /** New index position after reordering */
    newIndex: number;
    /** ID of the list where item came from */
    sourceListId: string;
    /** ID of the list where item is being dropped */
    targetListId: string;
}
