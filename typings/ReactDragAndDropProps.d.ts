/**
 * This file was generated from ReactDragAndDrop.xml
 * WARNING: All changes made to this file will be overwritten
 * @author Mendix Widgets Framework Team
 */
import { ComponentType, CSSProperties, ReactNode } from "react";
import { DynamicValue, EditableValue, ListValue, ListAttributeValue, ListWidgetValue } from "mendix";
import { Big } from "big.js";

export interface ReactDragAndDropContainerProps {
    name: string;
    class: string;
    style?: CSSProperties;
    tabIndex?: number;
    dataSource: ListValue;
    uuidAttribute: ListAttributeValue<string>;
    sortingAttribute: ListAttributeValue<Big>;
    changeJsonAttribute: EditableValue<string>;
    jsonTemplate: string;
    enableMultiSelect: boolean;
    showDragHandle: boolean;
    hoverHighlightColor?: DynamicValue<string>;
    dropHighlightColor?: DynamicValue<string>;
    content?: ListWidgetValue;
}

export interface ReactDragAndDropPreviewProps {
    /**
     * @deprecated Deprecated since version 9.18.0. Please use class property instead.
     */
    className: string;
    class: string;
    style: string;
    styleObject?: CSSProperties;
    readOnly: boolean;
    renderMode?: "design" | "xray" | "structure";
    dataSource: {} | { caption: string } | { type: string } | null;
    uuidAttribute: string;
    sortingAttribute: string;
    changeJsonAttribute: string;
    jsonTemplate: string;
    enableMultiSelect: boolean;
    showDragHandle: boolean;
    hoverHighlightColor: string;
    dropHighlightColor: string;
    onDrop: {} | null;
    content: { widgetCount: number; renderer: ComponentType<{ children: ReactNode; caption?: string }> };
}
