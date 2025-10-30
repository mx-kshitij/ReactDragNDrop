# React Drag and Drop Component

A Mendix pluggable widget that provides drag-and-drop functionality for reordering items in a list.

## Features

- **Drag and Drop Reordering**: Users can drag items to reorder them
- **Automatic Sort Tracking**: Updates an integer attribute with the new sort order
- **Change Tracking**: Records changes as JSON for audit/logging purposes
- **UUID Support**: Works with unique identifier attributes for each item
- **Responsive Design**: Touch-friendly interface for mobile and desktop
- **Visual Feedback**: Smooth animations and visual indicators during dragging

## Requirements

### Data Model

Your entity must have the following attributes:

1. **UUID Attribute** (String)
   - Unique identifier for each item
   - Used to track items during reordering

2. **Sorting Attribute** (Integer)
   - Stores the current sort order
   - Automatically updated when items are reordered
   - Use this for persistence (set as default sort order on your list)

3. **Change JSON Attribute** (String)
   - Stores a JSON array of changes made
   - Format: `[{ "uuid": "item-id", "oldIndex": 0, "newIndex": 1 }, ...]`
   - Useful for audit trails and synchronization

4. **Display Attribute** (String or any text-like attribute)
   - The attribute to show for each item in the list
   - This is what users see and interact with

## Configuration

### Required Properties

1. **Items** (List)
   - The datasource containing the items to display

2. **UUID Attribute**
   - Select the string attribute containing unique identifiers

3. **Sorting Attribute**
   - Select the integer attribute to store sort order

4. **Change JSON Attribute**
   - Select the string attribute to store changes as JSON

5. **Display Attribute**
   - Select the string attribute to display for each item

## Usage Example

1. Create an entity with the required attributes:
   ```
   MyItem
   - ItemId: String (UUID)
   - SortOrder: Integer
   - Title: String (Display Attribute)
   - ChangeLog: String (Change JSON)
   ```

2. Add the widget to your page with a data source:
   ```
   Widget: React Drag And Drop
   - Items: MyItem/MyList (datasource)
   - UUID Attribute: ItemId
   - Sorting Attribute: SortOrder
   - Change JSON Attribute: ChangeLog
   - Display Attribute: Title
   ```

3. The widget will:
   - Display all items in the list
   - Allow dragging to reorder
   - Update the SortOrder attribute for each item
   - Store change information in ChangeLog as JSON

## Change JSON Format

When items are reordered, the Change JSON Attribute is updated with an array like:

```json
[
  {
    "uuid": "item-123",
    "oldIndex": 2,
    "newIndex": 0
  },
  {
    "uuid": "item-456",
    "oldIndex": 0,
    "newIndex": 1
  }
]
```

This allows you to:
- Track what changed and when
- Create audit logs
- Implement undo/redo functionality
- Sync changes with external systems

## Styling

The component includes the following CSS classes for customization:

- `.drag-and-drop-list` - Container
- `.drag-and-drop-items` - Items list
- `.drag-and-drop-item` - Individual item
- `.drag-and-drop-item.dragging` - Item being dragged
- `.drag-and-drop-item.drag-over` - Drop target
- `.drag-handle` - Drag handle icon
- `.drag-item-text` - Display text
- `.drag-item-index` - Position indicator

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers with drag-and-drop support

## Notes

- The component uses the HTML5 Drag and Drop API
- Changes are stored immediately upon reordering
- The sorting attribute is updated with the new index (0-based)
- All items must have a unique UUID for proper tracking
