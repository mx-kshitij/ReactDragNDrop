# Implementation Guide for React Drag and Drop Widget

## Architecture Overview

The widget consists of three main parts:

### 1. Main Widget Component (`ReactDragAndDrop.tsx`)
- Entry point for the Mendix widget
- Receives configuration props from Mendix
- Passes props to the DragAndDropList component

### 2. Drag and Drop Logic (`components/DragAndDropList.tsx`)
- Manages the drag and drop state
- Handles item reordering
- Updates attributes with new sort order
- Tracks changes in JSON format

### 3. Styling (`ui/DragAndDropList.css`)
- Provides visual feedback during dragging
- Responsive design for all screen sizes
- Customizable through CSS classes

## Key Functions

### `getAttributeValue(item, attributeName)`
Safely retrieves attribute values from Mendix ObjectItem instances.

### `setAttributeValue(item, attributeName, value)`
Safely sets attribute values on Mendix ObjectItem instances.

### `handleDragStart(item)`
Called when user starts dragging an item.

### `handleDragOver(item)`
Called when dragging over another item (for visual feedback).

### `handleDragEnd()`
Called when drop occurs - handles reordering logic.

## Data Flow

```
1. DataSource (Mendix List) 
   ↓
2. Initialize items state with attributes
   ↓
3. User drags item
   ↓
4. Update sort order attribute for each item
   ↓
5. Track changes in JSON format
   ↓
6. Update change JSON attribute
   ↓
7. Mendix backend is notified of changes
```

## Important Considerations

### Attribute Access
- Mendix ObjectItem attributes are accessed dynamically
- Always use try-catch when accessing attributes
- Fall back to default values if attribute doesn't exist

### Change Tracking
- Changes are stored as JSON in the specified attribute
- Only items that changed position are recorded
- Changes include: uuid, oldIndex, newIndex

### Performance
- Component uses React hooks for state management
- useEffect only re-initializes when dataSource changes
- Rendering is optimized with keys (uuid)

### Error Handling
- Component gracefully handles missing attributes
- Falls back to sensible defaults (empty strings, index-based IDs)
- Silently fails when unable to set values

## Customization

### Adding Item Actions
You can modify `DragAndDropList.tsx` to add:
- Edit/Delete buttons
- Item details modal
- Custom styling per item
- Context menu on right-click

Example:
```tsx
<li 
    key={item.uuid}
    // ... existing props
>
    <span className="drag-handle">⋮⋮</span>
    <span className="drag-item-text">{item.displayText}</span>
    <button onClick={() => editItem(item)}>Edit</button>
    <button onClick={() => deleteItem(item)}>Delete</button>
    <span className="drag-item-index">{index + 1}</span>
</li>
```

### Custom Styling
Override CSS classes in your page styling:
```css
.drag-and-drop-item {
    background-color: #your-color;
    border-color: #your-border;
}

.drag-and-drop-item.dragging {
    background-color: #your-drag-color;
}
```

## Testing

To test the component:

1. **Setup test data**: Create test items with:
   - Unique UUIDs
   - Initial sort order
   - Display text

2. **Drag and reorder**: Verify:
   - Visual feedback during drag
   - Items reorder correctly
   - Sort order attributes update
   - Change JSON is created

3. **Verify persistence**: 
   - Close and reopen the widget
   - Verify sort order is maintained
   - Check change log in database

## Troubleshooting

### Items not appearing
- Check that dataSource is properly configured
- Verify display attribute name is correct
- Check browser console for errors

### Changes not persisting
- Verify sorting attribute is configured
- Check that changeJsonAttribute is valid
- Ensure items have valid UUIDs

### Visual issues
- Check CSS is loading (inspect .drag-and-drop-list in browser dev tools)
- Clear browser cache
- Check for CSS conflicts with page styling

### Drag not working
- Verify HTML5 Drag and Drop is supported (all modern browsers)
- Check that `draggable` prop is set on items
- Review browser console for JavaScript errors
