/**
 * Drop Handlers
 * 
 * Functions for handling drop operations in drag-and-drop lists.
 * Separates cross-list and same-list drop logic for better maintainability.
 */

import { DragItem, ChangeRecord } from "../types";

/**
 * Generate source list re-indexing changes after items are removed
 */
export function generateSourceListReindexing(
    sourceListAllItems: Array<{ uuid: string; originalIndex: number }>,
    movedUuids: string[],
    sourceListId: string
): ChangeRecord[] {
    const movedSet = new Set(movedUuids);
    const remainingItems = sourceListAllItems
        .filter(item => !movedSet.has(item.uuid))
        .sort((a, b) => a.originalIndex - b.originalIndex);
    
    return remainingItems.map((item, newIndex) => ({
        uuid: item.uuid,
        newIndex: newIndex,
        sourceListId: sourceListId,
        targetListId: sourceListId,
    }));
}

/**
 * Handle drop to empty list
 */
export function handleDropToEmptyList(
    itemsBeingDragged: string[],
    sourceListId: string,
    targetListId: string,
    sourceListAllItems?: Array<{ uuid: string; originalIndex: number }>
): ChangeRecord[] {
    const allChanges: ChangeRecord[] = [];

    // Create target change records for each item being dragged
    itemsBeingDragged.forEach((uuid, idx) => {
        allChanges.push({
            uuid: uuid,
            newIndex: idx,
            sourceListId: sourceListId,
            targetListId: targetListId,
            dropType: "after",
        });
    });

    // Re-index remaining items in source list
    if (sourceListAllItems) {
        const sourceChanges = generateSourceListReindexing(
            sourceListAllItems,
            itemsBeingDragged,
            sourceListId
        );
        allChanges.push(...sourceChanges);
    }

    return allChanges;
}

/**
 * Handle "on" drop (dropping items ON another item)
 */
export function handleOnDrop(
    itemsBeingDragged: string[],
    sourceListId: string,
    targetListId: string,
    targetItemUuid: string,
    sourceListAllItems?: Array<{ uuid: string; originalIndex: number }>
): ChangeRecord[] {
    const allChanges: ChangeRecord[] = [];

    // Add changes for dragged items (dropped ON target)
    itemsBeingDragged.forEach(uuid => {
        allChanges.push({
            uuid: uuid,
            newIndex: null,
            sourceListId: sourceListId,
            targetListId: targetListId,
            dropType: "on",
            targetItemUuid: targetItemUuid,
        });
    });

    // For cross-list "on" drops, re-index the source list
    if (sourceListId !== targetListId && sourceListAllItems) {
        const sourceChanges = generateSourceListReindexing(
            sourceListAllItems,
            itemsBeingDragged,
            sourceListId
        );
        allChanges.push(...sourceChanges);
    }

    return allChanges;
}

/**
 * Handle before/after drop in cross-list scenario
 */
export function handleCrossListBeforeAfterDrop(
    itemsBeingDragged: string[],
    existingItems: DragItem[],
    insertIndex: number,
    dropType: 'before' | 'after',
    sourceListId: string,
    targetListId: string,
    targetItemUuid: string,
    sourceListAllItems?: Array<{ uuid: string; originalIndex: number }>
): ChangeRecord[] {
    const allChanges: ChangeRecord[] = [];

    // Create virtual array showing final order
    const virtualItems: { uuid: string; isNew: boolean; dropType?: string }[] = [];

    // Add existing items up to insert point
    for (let i = 0; i < insertIndex; i++) {
        virtualItems.push({ uuid: existingItems[i].uuid, isNew: false });
    }

    // Add dragged items
    itemsBeingDragged.forEach(uuid => {
        virtualItems.push({ uuid: uuid, isNew: true, dropType: dropType });
    });

    // Add remaining items
    for (let i = insertIndex; i < existingItems.length; i++) {
        virtualItems.push({ uuid: existingItems[i].uuid, isNew: false });
    }

    // Generate changes for target list
    virtualItems.forEach((item, newIndex) => {
        if (item.isNew) {
            allChanges.push({
                uuid: item.uuid,
                newIndex: newIndex,
                sourceListId: sourceListId,
                targetListId: targetListId,
                dropType: dropType,
                targetItemUuid: targetItemUuid,
            });
        } else {
            const existingItem = existingItems.find(i => i.uuid === item.uuid);
            if (existingItem && existingItem.originalIndex !== newIndex) {
                allChanges.push({
                    uuid: item.uuid,
                    newIndex: newIndex,
                    sourceListId: targetListId,
                    targetListId: targetListId,
                });
            }
        }
    });

    // Re-index source list
    if (sourceListAllItems) {
        const sourceChanges = generateSourceListReindexing(
            sourceListAllItems,
            itemsBeingDragged,
            sourceListId
        );
        allChanges.push(...sourceChanges);
    }

    return allChanges;
}

/**
 * Handle same-list reordering
 */
export function handleSameListReorder(
    draggedItems: DragItem[],
    allItems: DragItem[],
    draggedOverItem: DragItem,
    dropType: 'before' | 'after' | 'on' | null,
    listId: string
): { newItems: DragItem[]; changes: ChangeRecord[] } {
    const newItems = [...allItems];
    let draggedOverIndex = newItems.findIndex(i => i.uuid === draggedOverItem.uuid);

    if (draggedOverIndex === -1) {
        return { newItems: allItems, changes: [] };
    }

    // Remove dragged items
    const draggedIndices: number[] = [];
    draggedItems.forEach(draggedItem => {
        const idx = newItems.findIndex(i => i.uuid === draggedItem.uuid);
        if (idx > -1) {
            draggedIndices.push(idx);
        }
    });

    draggedIndices.sort((a, b) => b - a);
    const removed: DragItem[] = [];
    draggedIndices.forEach(idx => {
        removed.unshift(...newItems.splice(idx, 1));
    });

    const changes: ChangeRecord[] = [];

    if (dropType === 'on') {
        // For "on" drops: restore original positions
        newItems.push(...removed);
        
        draggedItems.forEach(draggedItem => {
            changes.push({
                uuid: draggedItem.uuid,
                newIndex: null,
                sourceListId: listId,
                targetListId: listId,
                dropType: "on",
                targetItemUuid: draggedOverItem.uuid,
            });
        });
    } else {
        // For before/after drops: rearrange
        let insertIndex = newItems.findIndex(i => i.uuid === draggedOverItem.uuid);
        if (insertIndex > -1) {
            let finalInsertIndex = insertIndex;
            if (dropType === 'after') {
                finalInsertIndex = insertIndex + 1;
            }
            newItems.splice(finalInsertIndex, 0, ...removed);
        }

        const draggedUuids = new Set(draggedItems.map(i => i.uuid));
        newItems.forEach((item, newIndex) => {
            if (item.originalIndex !== newIndex) {
                const changeRecord: ChangeRecord = {
                    uuid: item.uuid,
                    newIndex: newIndex,
                    sourceListId: listId,
                    targetListId: listId,
                };
                if (draggedUuids.has(item.uuid)) {
                    changeRecord.dropType = (dropType || 'after') as "before" | "after" | "on";
                    changeRecord.targetItemUuid = draggedOverItem.uuid;
                }
                changes.push(changeRecord);
            }
        });
    }

    return { newItems, changes };
}
