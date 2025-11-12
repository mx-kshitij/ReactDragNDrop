import { ListValue, ListWidgetValue, ListAttributeValue, EditableValue, ObjectItem, DynamicValue } from "mendix";

/**
 * Enumeration for drop type (where items are dropped)
 */
export enum DropType {
    Before = "before",
    After = "after",
    On = "on",
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
    /** Optional: Integer attribute that stores the sort order (read-only in widget). If provided, same-list reordering will trigger onDrop. Leave empty if only cross-list moves should trigger onDrop. */
    sortingAttribute?: ListAttributeValue<any>;
    /** Context attribute to store changes as JSON string */
    changeJsonAttribute: EditableValue<string>;
    /** Mode for change JSON: 'fullChange' includes all affected items, 'targetOnly' includes only dragged items */
    changeJsonMode: "fullChange" | "targetOnly";
    /** Unique identifier for this list instance (required for cross-list dragging) */
    listId: string;
    /** Comma-separated list IDs that can accept items from this list. Leave empty to restrict drops to same list only. */
    allowedLists?: string;
    /** Allow items to be dropped ON target items (in addition to before/after) */
    allowDropOn: boolean;
    /** Drop behavior: 'auto' for dynamic positioning, or force 'before', 'on', or 'after' */
    dropOption: "auto" | "before" | "on" | "after";
    /** Enable/disable multi-select functionality with Shift+click */
    enableMultiSelect: boolean;
    /** Show/hide the drag handle icon (visual only, doesn't affect drag functionality) */
    showDragHandle: boolean;
    /** Optional: Color for hover and multi-select highlighting */
    hoverHighlightColor?: DynamicValue<string>;
    /** Optional: Color for drop target when dropping BEFORE an item */
    dropBeforeColor?: DynamicValue<string>;
    /** Optional: Color for drop target when dropping ON an item */
    dropOnColor?: DynamicValue<string>;
    /** Optional: Color for drop target when dropping AFTER an item */
    dropAfterColor?: DynamicValue<string>;
    /** Optional: Custom widget content to render for each item */
    content?: ListWidgetValue;
    /** Optional: Text to display when list is empty */
    emptyListText?: DynamicValue<string>;
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
 * Represents a change record for reordered items or drop-on relationships
 * Sent to onDrop action to update the database
 * 
 * Supports both same-list reordering and cross-list moves:
 * - Same-list: sourceListId equals targetListId
 * - Cross-list: sourceListId differs from targetListId
 * 
 * For drops ON items:
 * - newIndex is null/undefined (no rearrangement)
 * - dropType is "on" indicating the drop was ON the item
 * - targetItemUuid contains the UUID of the item that was dropped ON
 * - Backend can use targetItemUuid to establish parent-child relationships
 * 
 * For drops BEFORE/AFTER items:
 * - newIndex contains the new position
 * - dropType is "before" or "after"
 * - Items are rearranged in the target list
 * - targetItemUuid is optional (not provided for positional moves)
 */
export interface ChangeRecord {
    /** UUID of the item that was moved */
    uuid: string;
    /** New index position after reordering (null/undefined for "on" drops, no rearrangement) */
    newIndex?: number | null;
    /** ID of the list where item came from */
    sourceListId: string;
    /** ID of the list where item is being dropped */
    targetListId: string;
    /** Drop type relative to target: "before", "after", or "on". Only present for items that were actually dragged. */
    dropType?: "before" | "after" | "on";
    /** UUID of the target item (the item this was dropped near/on). Only present for items that were actually dragged. */
    targetItemUuid?: string;
}
