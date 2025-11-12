import { ReactElement, createElement } from "react";
import { DragAndDropList } from "./components/DragAndDropList";

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
 * - allowDropOn: Allow items to be dropped ON target items
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
    emptyListText,
}: ReactDragAndDropContainerProps): ReactElement {
    return (
        <DragAndDropList
            dataSource={dataSource}
            uuidAttribute={uuidAttribute}
            sortingAttribute={sortingAttribute}
            changeJsonAttribute={changeJsonAttribute}
            changeJsonMode={changeJsonMode}
            listId={listId?.value ?? "default-list"}
            allowedLists={allowedLists?.value}
            allowDropOn={allowDropOn}
            dropOption={dropOption}
            enableMultiSelect={enableMultiSelect}
            showDragHandle={showDragHandle}
            hoverHighlightColor={hoverHighlightColor}
            dropBeforeColor={dropBeforeColor}
            dropOnColor={dropOnColor}
            dropAfterColor={dropAfterColor}
            content={content}
            emptyListText={emptyListText}
        />
    );
}
