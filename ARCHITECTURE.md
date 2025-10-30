# Architecture & Data Flow Diagrams

## Component Architecture

```
┌────────────────────────────────────────────────────────┐
│         ReactDragAndDrop.tsx (Main Widget)             │
│  - Receives props from Mendix                          │
│  - Delegates to DragAndDropList                        │
└────────────────┬─────────────────────────────────────┘
                 │ Props
                 ▼
┌────────────────────────────────────────────────────────┐
│     DragAndDropList.tsx (Core Component)               │
│  ├─ State Management                                   │
│  │  ├─ items: DragItem[]                               │
│  │  ├─ draggedItem: DragItem | null                    │
│  │  └─ draggedOverItem: DragItem | null                │
│  │                                                     │
│  ├─ Effects                                            │
│  │  └─ Initialize items from dataSource                │
│  │                                                     │
│  ├─ Handlers                                           │
│  │  ├─ handleDragStart(item)                           │
│  │  ├─ handleDragOver(item)                            │
│  │  └─ handleDragEnd()                                 │
│  │                                                     │
│  └─ Render List Items                                  │
│     └─ Uses DragAndDropList.css for styling            │
└────────────────────────────────────────────────────────┘
```

## Data Flow During Drag & Drop

```
User Action: Drag Item from Position 0 to Position 2

┌─────────────────────────────┐
│ Initial State               │
│ [Item A (idx:0), Item B     │
│  (idx:1), Item C (idx:2)]   │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ handleDragStart             │
│ draggedItem = Item A        │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ handleDragOver              │
│ draggedOverItem = Item C    │
│ (Visual feedback: highlight)│
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ handleDragEnd               │
│ 1. Remove Item A from array │
│ 2. Insert at new position   │
│ Result: [Item B (0), Item C │
│ (1), Item A (2)]            │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ Update Mendix Attributes    │
│ For each item:              │
│ - Set sortingAttribute      │
│   to new index              │
│ - Track in changes array    │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ Update Change JSON          │
│ [{                          │
│   uuid: "item-a",           │
│   oldIndex: 0,              │
│   newIndex: 2               │
│ }]                          │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ Final State                 │
│ items = [Item B, Item C,    │
│ Item A]                     │
│ draggedItem = null          │
│ draggedOverItem = null      │
└─────────────────────────────┘
```

## Attribute Mapping

```
┌──────────────────────────────────────────────────────────────┐
│              Your Mendix Entity (MyItem)                      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ItemId (String)                                              │
│  ├─ Mapped to: uuidAttribute                                 │
│  └─ Used for: Unique identification, change tracking         │
│                                                               │
│  ItemName (String)                                            │
│  ├─ Mapped to: displayAttribute                              │
│  └─ Used for: What users see in the list                     │
│                                                               │
│  SortOrder (Integer)                                          │
│  ├─ Mapped to: sortingAttribute                              │
│  └─ Used for: Store position (0, 1, 2...), persistence      │
│                                                               │
│  ChangeLog (String - JSON)                                    │
│  ├─ Mapped to: changeJsonAttribute                           │
│  └─ Used for: Track changes as JSON array                    │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Change JSON Structure

```
Original State:
[
  { uuid: "item-1", position: 0, name: "Task A" },
  { uuid: "item-2", position: 1, name: "Task B" },
  { uuid: "item-3", position: 2, name: "Task C" }
]

After dragging "Task A" (uuid: item-1) to position 2:

ChangeLog will contain:
[
  {
    uuid: "item-1",
    oldIndex: 0,
    newIndex: 2
  }
]

Updated State:
[
  { uuid: "item-2", position: 0, name: "Task B" },
  { uuid: "item-3", position: 1, name: "Task C" },
  { uuid: "item-1", position: 2, name: "Task A" }
]
```

## CSS Class Hierarchy

```
.drag-and-drop-list (Container)
├─ .drag-and-drop-empty (Empty state)
└─ .drag-and-drop-items (List)
   └─ .drag-and-drop-item (Individual item)
      ├─ .dragging (Active drag state)
      ├─ .drag-over (Hover/drop zone state)
      ├─ .drag-handle (⋮⋮ Icon)
      ├─ .drag-item-text (Display text)
      └─ .drag-item-index (Position badge)
```

## Event Flow

```
User Interaction          Handler                    Mendix Action
─────────────────        ────────                    ─────────────

Mouse down on item  ──▶  onDragStart()               Set draggedItem
                          Set visual state

Mouse move over     ──▶  onDragOver()                Set draggedOverItem
another item             Prevent default            Add highlight

Mouse up / drop     ──▶  onDragEnd()                 Reorder items
                          Reorder array              Update attributes
                          Update attrs              Update ChangeLog

Mouse leave         ──▶  onDragLeave()              Clear draggedOver
                          Clear highlight
```

## Component Lifecycle

```
1. Component Mount
   └─ No initial effects (just setup)

2. dataSource Changes
   └─ useEffect triggered
      ├─ Extract items from dataSource
      ├─ Get attributes for each item
      │  ├─ UUID
      │  └─ Display text
      └─ Initialize items state

3. User Drags
   ├─ handleDragStart
   ├─ Multiple handleDragOver events
   └─ handleDragEnd
      ├─ Update items array
      ├─ Update sortingAttribute
      ├─ Update changeJsonAttribute
      └─ Re-render with new state

4. Component Unmount
   └─ Cleanup (state cleared automatically)
```

## State Transitions

```
Initial
  ↓
draggedItem = null
draggedOverItem = null
  ├─ User presses on item
  ▼
draggedItem = Item A
draggedOverItem = null
  ├─ User hovers over Item B
  ▼
draggedItem = Item A
draggedOverItem = Item B
  ├─ User releases mouse
  ▼
draggedItem = null
draggedOverItem = null
Items reordered ✓
```
