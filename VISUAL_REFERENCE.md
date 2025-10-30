# React Drag and Drop Widget - Visual Reference Guide

## 🎨 UI/UX Preview

### Normal State
```
┌──────────────────────────────────────┐
│ ⋮⋮ First Task                     [1] │
├──────────────────────────────────────┤
│ ⋮⋮ Second Task                    [2] │
├──────────────────────────────────────┤
│ ⋮⋮ Third Task                     [3] │
└──────────────────────────────────────┘
```

### Hover State
```
┌──────────────────────────────────────┐
│ ⋮⋮ First Task                     [1] │ ← lighter background
├──────────────────────────────────────┤
│ ⋮⋮ Second Task                    [2] │ ← shadow appears
├──────────────────────────────────────┤
│ ⋮⋮ Third Task                     [3] │
└──────────────────────────────────────┘
```

### Dragging State
```
┌──────────────────────────────────────┐
│ ⋮⋮ First Task                     [1] │ ← semi-transparent
├──────────────────────────────────────┤ (opacity: 0.5)
│ ⋮⋮ Second Task                    [2] │
├──────────────────────────────────────┤
│ ⋮⋮ Third Task                     [3] │ ← dropping here
│   (light blue, dashed border)         │
└──────────────────────────────────────┘
```

### After Drop
```
┌──────────────────────────────────────┐
│ ⋮⋮ Second Task                    [1] │
├──────────────────────────────────────┤ ← reordered!
│ ⋮⋮ Third Task                     [2] │
├──────────────────────────────────────┤
│ ⋮⋮ First Task                     [3] │
└──────────────────────────────────────┘
```

---

## 🔄 Drag and Drop Animation Sequence

### Frame 1: Initial
```
Cursor on item → Shows pointer
Item background normal
```

### Frame 2: Drag Start
```
Mouse button down → dragging cursor
Item becomes semi-transparent
Item background changes color
```

### Frame 3: Drag Over
```
Cursor over target → drop cursor
Target item highlights
Border changes to dashed
Visual indication of drop zone
```

### Frame 4: Release
```
Mouse button up → animation plays
Items swap positions
Backgrounds return to normal
Sort indices updated
```

---

## 📱 Responsive Breakpoints

### Desktop (> 768px)
```
Full size with generous spacing

Item height: 48px
Padding: 12px 16px
Font size: 14px
Index badge: 32px
```

### Tablet (480px - 768px)
```
Moderate spacing

Item height: 44px
Padding: 10px 12px
Font size: 13px
Index badge: 28px
```

### Mobile (< 480px)
```
Compact layout

Item height: 40px
Padding: 8px 10px
Font size: 12px
Index badge: 24px
```

---

## 🎨 Color Scheme

### Default Light Theme
```
Background:         #f5f5f5 (light gray)
Border:             #e0e0e0 (lighter gray)
Text:               #333333 (dark gray)
Handle:             #999999 (medium gray)

Hover:
  Background:       #fafafa (lighter)
  Border:           #d0d0d0
  Shadow:           rgba(0,0,0,0.05)

Drag/Drop:
  Background:       #e3f2fd (light blue)
  Border:           #2196f3 (blue)
  Handle:           #2196f3 (blue)

Index Badge:
  Background:       #e0e0e0
  Text:             #666666
```

---

## 🏗️ Element Structure

### DOM Hierarchy
```
<div class="drag-and-drop-list">
  <ul class="drag-and-drop-items">
    <li class="drag-and-drop-item">
      <span class="drag-handle">⋮⋮</span>
      <span class="drag-item-text">Display Text</span>
      <span class="drag-item-index">1</span>
    </li>
    <!-- More items -->
  </ul>
</div>
```

### Component Dimensions

```
List Container
├─ Width: 100% (responsive)
├─ Padding: 16px
└─ Items
   ├─ Width: 100%
   ├─ Height: 48px (adjusts on mobile)
   ├─ Margin: 8px 0
   ├─ Display: flex
   ├─ Align: center
   └─ Elements
      ├─ Drag Handle
      │  ├─ Width: 24px
      │  ├─ Height: 24px
      │  └─ Margin: 0 12px
      ├─ Text
      │  ├─ Flex: 1 (takes remaining space)
      │  └─ Overflow: ellipsis
      └─ Index Badge
         ├─ Width: 32px
         ├─ Height: 24px
         ├─ Border-radius: 12px
         └─ Margin: 0 12px
```

---

## 🎯 Interaction States

### Keyboard States
```
Tab    → Focus on item
Enter  → Can be extended for actions
Space  → Can be extended for actions
Escape → Clear selections
```

### Mouse States
```
↓ (pointer)          → Hovering normally
↕ (grab)             → Hovering on drag handle
↕ (grabbing)         → During drag
↓ (drop)             → Over drop target
→ (pointer-events)   → Normal text selection
```

### Touch States
```
tap          → Select item (optional)
long-press   → Could trigger drag (not used)
swipe        → Could scroll list
drag         → Move item (HTML5 drag)
```

---

## 📊 Data Visualization

### Initial State
```
Array: [A, B, C, D, E]
Index: 0, 1, 2, 3, 4
DB:    A(0), B(1), C(2), D(3), E(4)
```

### After Dragging A to Position 3
```
Array: [B, C, D, A, E]
Index: 0, 1, 2, 3, 4
DB:    A(3), B(0), C(1), D(2), E(4)
```

### Change Log JSON
```json
[
  {
    "uuid": "item-a",
    "oldIndex": 0,
    "newIndex": 3
  }
]
```

---

## 🔄 State Management Diagram

### React State
```
items: DragItem[]
├─ Item 1
│  ├─ uuid: string
│  ├─ displayText: string
│  ├─ object: ObjectItem
│  └─ originalIndex: number
├─ Item 2
└─ Item 3

draggedItem: DragItem | null
├─ null (not dragging)
└─ DragItem (current drag)

draggedOverItem: DragItem | null
├─ null (not over item)
└─ DragItem (over this item)
```

---

## ⚙️ Configuration Mapping

### Widget XML Properties
```xml
<property name="dataSource">     → ListValue
<property name="uuidAttribute">  → String attribute name
<property name="displayAttribute">→ String attribute name
<property name="sortingAttribute">→ Integer attribute name
<property name="changeJsonAttribute">→ String attribute name
```

### Component Props
```typescript
dataSource: ListValue
uuidAttribute: "ItemId"
displayAttribute: "ItemName"
sortingAttribute: "SortOrder"
changeJsonAttribute: "ChangeLog"
```

### Entity Attributes
```
Entity: MyItem
├─ ItemId (String)       ← uuidAttribute
├─ ItemName (String)     ← displayAttribute
├─ SortOrder (Integer)   ← sortingAttribute
└─ ChangeLog (String)    ← changeJsonAttribute
```

---

## 🔀 Flow Diagram: Complete Drag Sequence

```
START
  ↓
User Presses on Item A
  ↓
handleDragStart(Item A)
├─ draggedItem = Item A
├─ visual: item becomes semi-transparent
└─ visual: background turns blue
  ↓
User Moves Mouse Over Item C
  ↓
handleDragOver(Item C)
├─ draggedOverItem = Item C
├─ visual: Item C gets dashed border
└─ visual: Item C background highlights
  ↓
User Releases Mouse
  ↓
handleDragEnd()
├─ Find Item A index (old: 0)
├─ Find Item C index (new: 2)
├─ Remove Item A from array
├─ Insert Item A at Item C position
├─ Result: [B, C, A, D, E]
├─ Update sortingAttribute for all items
├─ Update changeJsonAttribute with:
│  [{uuid: "A", oldIndex: 0, newIndex: 2}]
├─ visual: Return to normal
└─ setItems([B, C, A, D, E])
  ↓
COMPLETE
```

---

## 📝 CSS Animation Timeline

```
Transition Duration: 0.2s ease-in-out

Normal State (0ms)
├─ Background: #f5f5f5
├─ Border: #e0e0e0
├─ Transform: scale(1)
└─ Opacity: 1

Hover State (100ms)
├─ Background: #fafafa
├─ Border: #d0d0d0
├─ Transform: scale(1)
└─ Shadow: 0 2px 4px

Dragging State (200ms)
├─ Background: #e3f2fd
├─ Border: #2196f3
├─ Transform: scale(1.05)
└─ Opacity: 0.5
```

---

## 🎯 Event Handler Sequence

```
Timeline of Events During Drag

T0: dragstart
    └─ setDraggedItem(item)

T+X: dragover (multiple times)
    ├─ Prevent default
    └─ setDraggedOverItem(item)

T+Y: dragleave
    └─ setDraggedOverItem(null)

T+Z: drop
    └─ handleDragEnd()
    
T+Z: dragend
    └─ Cleanup

Total Time: 300-500ms typical
```

---

## 🔍 Visual Feedback System

### Visual Cues Provided

| State | Visual | Feedback |
|-------|--------|----------|
| Normal | Gray background | Item ready to interact |
| Hover | Light background, shadow | Item is interactive |
| Dragging | Blue background, semi-transparent | Currently moving |
| Drop Zone | Blue dashed border | Valid drop location |
| Position | Index badge [1], [2], [3] | Current position |

### Cursor States

| Action | Cursor | Meaning |
|--------|--------|---------|
| Normal | Default | Not interactive |
| On item | grab | Can drag this item |
| Dragging | grabbing | Currently dragging |
| Over target | drop | Can drop here |

---

## 📐 Spacing & Sizing

### Vertical Spacing
```
Widget padding:     16px
Item margin:        8px vertical
Item padding:       12px vertical
List item height:   48px (48 + 8 + 8 = 64px with margin)
```

### Horizontal Spacing
```
Widget padding:     16px
Handle margin:      12px right
Text flex-grow:     1
Index badge margin: 12px left
```

### Font Sizing
```
Text:       14px (desktop), 13px (tablet), 12px (mobile)
Index:      12px
Handle:     16px
```

---

## ♿ Accessibility

### Keyboard Navigation
```
Tab     → Navigate to items (if tabindex added)
Shift+Tab → Navigate backward
Enter   → Could trigger actions
Esc     → Clear drag state
```

### Screen Reader
```
Item List
├─ List: 5 items
└─ Item: "Task Name, position 1 of 5"
```

### Focus Indicators
```
When focused, item shows:
├─ Border color change
├─ Box shadow
└─ Outline (browser default)
```

---

This visual reference guide complements the technical documentation. Use it to understand the visual behavior and layout of the drag and drop component!
