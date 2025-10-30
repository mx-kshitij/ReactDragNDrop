# Quick Start Guide - React Drag and Drop Widget

## What Was Built

A fully functional Mendix drag-and-drop widget with the following features:

✅ **Drag and Drop Reordering** - Users can drag items to reorder them  
✅ **UUID Support** - Tracks items using unique identifiers  
✅ **Sort Order Tracking** - Integer attribute automatically updated with new position  
✅ **Change Logging** - Records all changes as JSON for audit purposes  
✅ **Responsive Design** - Works on desktop, tablet, and mobile  
✅ **Visual Feedback** - Smooth animations and hover states  

## Files Created/Modified

### Created:
- `src/components/DragAndDropList.tsx` - Main drag and drop component
- `src/ui/DragAndDropList.css` - Styling for the drag and drop list
- `COMPONENT_USAGE.md` - User documentation
- `IMPLEMENTATION_GUIDE.md` - Technical documentation

### Modified:
- `src/ReactDragAndDrop.tsx` - Updated main component
- `src/ReactDragAndDrop.xml` - Added widget configuration properties
- `src/ReactDragAndDrop.editorPreview.tsx` - Updated preview for design mode
- `typings/ReactDragAndDropProps.d.ts` - Updated TypeScript definitions

## To Use This Widget

### 1. Create Your Entity
```
Entity: MyItem
├── ItemId (String) - UUID
├── ItemName (String) - What to display
├── SortOrder (Integer) - Sort position
└── ChangeLog (String) - JSON changes
```

### 2. Configure the Widget
Add the widget to your page and configure:
- **Items**: Select your list datasource
- **UUID Attribute**: ItemId
- **Sorting Attribute**: SortOrder
- **Change JSON Attribute**: ChangeLog
- **Display Attribute**: ItemName

### 3. See It In Action
- Items will display in a draggable list
- Drag any item to reorder
- Sort order is updated automatically
- Changes are recorded in ChangeLog as JSON

## Component Structure

```
DragAndDropList
├── State Management
│   ├── items - Current list with drag-and-drop order
│   ├── draggedItem - Item being dragged
│   └── draggedOverItem - Item under cursor
├── Event Handlers
│   ├── handleDragStart - Drag begins
│   ├── handleDragOver - Hover on item
│   └── handleDragEnd - Drop/reorder
└── Rendering
    ├── Empty state message
    └── Draggable list items with visual feedback
```

## Key Features Explained

### UUID Attribute
- **Purpose**: Uniquely identify each item
- **Used for**: Tracking items across reorders, change logging
- **Example**: "550e8400-e29b-41d4-a716-446655440000"

### Sorting Attribute (Integer)
- **Purpose**: Store the display order
- **Used for**: Persistence, default sorting
- **Example**: 0, 1, 2, 3... (updated on each drag)

### Change JSON Attribute (String)
- **Purpose**: Track what changed and how
- **Format**: JSON array of changes
- **Example**:
  ```json
  [{"uuid":"item1","oldIndex":0,"newIndex":2}]
  ```

### Display Attribute
- **Purpose**: What users see in the list
- **Can be**: Product name, task title, etc.
- **Example**: "Buy Groceries", "Fix Bug #123"

## Visual Appearance

```
┌─────────────────────────────────────┐
│ ⋮⋮ Buy Groceries              [1]   │
├─────────────────────────────────────┤
│ ⋮⋮ Complete Project           [2]   │ ← Hover shows lighter bg
├─────────────────────────────────────┤
│ ⋮⋮ Review Code                [3]   │
└─────────────────────────────────────┘
     ↑ Drag handle

When dragging:
- Item becomes semi-transparent
- Background turns light blue
- Other items show drop zones
- After drop: positions are updated
```

## Next Steps

1. **Test locally** - Run `npm start` to test in development
2. **Build the widget** - Run `npm run build` to create MPK file
3. **Deploy** - Upload the MPK to your Mendix project
4. **Configure** - Add the widget to your pages and configure properties
5. **Monitor** - Check the ChangeLog attribute to verify tracking

## Support & Troubleshooting

See `COMPONENT_USAGE.md` and `IMPLEMENTATION_GUIDE.md` for:
- Detailed configuration instructions
- Styling customization
- Error handling
- Browser compatibility
- Common issues and solutions

## Built With

- React 18.2.0
- TypeScript
- Mendix Pluggable Widgets Framework
- HTML5 Drag and Drop API
