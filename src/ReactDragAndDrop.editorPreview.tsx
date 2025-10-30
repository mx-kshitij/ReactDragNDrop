import { ReactElement, createElement } from "react";
import { ReactDragAndDropPreviewProps } from "../typings/ReactDragAndDropProps";

export function preview({ dataSource }: ReactDragAndDropPreviewProps): ReactElement {
    // In preview mode, dataSource can be null or a structure object (not ListValue)
    const hasDataSource = dataSource != null && typeof dataSource === "object" && ("caption" in dataSource || "type" in dataSource);
    
    return (
        <div style={{ padding: "16px", backgroundColor: "#f5f5f5" }}>
            <div style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>
                <strong>React Drag And Drop</strong>
            </div>
            <div style={{ fontSize: "11px", color: "#999" }}>
                {hasDataSource
                    ? "Datasource connected - Drag to reorder items"
                    : "No datasource connected"}
            </div>
        </div>
    );
}

export function getPreviewCss(): string {
    return require("./ui/ReactDragAndDrop.css");
}
