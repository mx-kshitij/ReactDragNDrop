import { ReactElement, createElement } from "react";
import { DragAndDropList } from "./components/DragAndDropList";
import { DropPosition } from "./components/types";

import { ReactDragAndDropContainerProps } from "../typings/ReactDragAndDropProps";

import "./ui/ReactDragAndDrop.css";

/**
 * ReactDragAndDrop Widget Container
 * 
 * This is the main widget entry point for Mendix Studio Pro.
 * It acts as a container that passes all props to the actual component.
 * 
 * Generated Properties (from XML):
 * - dataSource: List of items to reorder
 * - uuidAttribute: Unique identifier attribute
 * - sortingAttribute: Integer attribute for sort order
 * - changeJsonAttribute: Context attribute to receive JSON changes
 * - listId: Unique identifier for this list (for cross-list dragging)
 * - allowedLists: Comma-separated list IDs that can accept items from this list
 * - dropPosition: Position to drop items (before or after target item)
 * - enableMultiSelect: Enable multi-item dragging
 * - showDragHandle: Show/hide drag handle icon
 * - hoverHighlightColor: Color for hover/select state
 * - dropHighlightColor: Color for drop target
 * - onDrop: Action to trigger on drop
 * - content: Custom widget content for items
 */
export function ReactDragAndDrop({
    dataSource,
    uuidAttribute,
    sortingAttribute,
    changeJsonAttribute,
    listId,
    allowedLists,
    dropPosition,
    enableMultiSelect,
    showDragHandle,
    hoverHighlightColor,
    dropHighlightColor,
    content,
}: ReactDragAndDropContainerProps): ReactElement {
    return (
        <DragAndDropList
            dataSource={dataSource}
            uuidAttribute={uuidAttribute}
            sortingAttribute={sortingAttribute}
            changeJsonAttribute={changeJsonAttribute}
            listId={listId?.value ?? "default-list"}
            allowedLists={allowedLists?.value}
            dropPosition={dropPosition as DropPosition}
            enableMultiSelect={enableMultiSelect}
            showDragHandle={showDragHandle}
            hoverHighlightColor={hoverHighlightColor}
            dropHighlightColor={dropHighlightColor}
            content={content}
        />
    );
}
