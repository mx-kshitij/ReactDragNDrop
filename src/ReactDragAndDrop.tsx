import { ReactElement, createElement } from "react";
import { DragAndDropList } from "./components/DragAndDropList";

import { ReactDragAndDropContainerProps } from "../typings/ReactDragAndDropProps";

import "./ui/ReactDragAndDrop.css";

export function ReactDragAndDrop({
    dataSource,
    uuidAttribute,
    sortingAttribute,
    changeJsonAttribute,
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
            enableMultiSelect={enableMultiSelect}
            showDragHandle={showDragHandle}
            hoverHighlightColor={hoverHighlightColor}
            dropHighlightColor={dropHighlightColor}
            content={content}
        />
    );
}
