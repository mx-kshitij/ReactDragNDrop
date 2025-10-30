# Code Examples & Reference

## Basic Setup Example

### 1. Entity Definition (Domain Model)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<domainModel xmlns="http://www.mendix.com/model/1.0">
  <entity name="TaskItem">
    <attributes>
      <attribute name="ItemId" type="String">
        <length>36</length>
        <isEncrypted>false</isEncrypted>
      </attribute>
      <attribute name="TaskName" type="String">
        <length>200</length>
      </attribute>
      <attribute name="SortOrder" type="Integer"/>
      <attribute name="ChangeLog" type="String">
        <length>1000</length>
      </attribute>
    </attributes>
  </entity>
</domainModel>
```

### 2. Page Configuration

```xml
<page ...>
  <layoutCall widget="Responsive" />
  <widget class="reactdraganddrop.ReactDragAndDrop">
    <property name="dataSource">[TaskItem/All]</property>
    <property name="uuidAttribute">ItemId</property>
    <property name="sortingAttribute">SortOrder</property>
    <property name="changeJsonAttribute">ChangeLog</property>
    <property name="displayAttribute">TaskName</property>
  </widget>
</page>
```

## Advanced Usage Examples

### Microflow Processing Changes

```
Microflow: ProcessTaskChanges

1. Create Change object from ChangeLog JSON
2. For each change:
   - Find TaskItem by ItemId
   - Update SortOrder to newIndex
3. Commit all changes
4. Show success message
```

### Show Changes in Audit Trail

```
When user views "Change History":
1. Retrieve TaskItem.ChangeLog JSON
2. Parse JSON array
3. Display in Change History widget:
   - Item name
   - Old position
   - New position
   - Change timestamp
```

### Implementing Undo/Redo

```javascript
// Store previous state
const previousState = JSON.parse(changeLog);

// To undo: Use previousState to reverse order
// Swap oldIndex and newIndex values
const undoChanges = previousState.map(change => ({
  uuid: change.uuid,
  oldIndex: change.newIndex,
  newIndex: change.oldIndex
}));

// Apply reversal through microflow
```

## Component Code Reference

### Key Function: Get Attribute Value

```typescript
const getAttributeValue = (item: ObjectItem, attributeName: string): string | number => {
    try {
        const attr = item[attributeName as keyof ObjectItem];
        if (attr && typeof attr === "object" && "value" in attr) {
            return (attr as { value: string | number }).value;
        }
        return attr as string | number;
    } catch {
        return "";
    }
};
```

**Usage:**
```typescript
const itemName = getAttributeValue(item, "ItemName");
const sortOrder = getAttributeValue(item, "SortOrder");
```

### Key Function: Set Attribute Value

```typescript
const setAttributeValue = (item: ObjectItem, attributeName: string, value: string | number): void => {
    try {
        const attr = item[attributeName as keyof ObjectItem];
        if (attr && typeof attr === "object" && "setValue" in attr) {
            (attr as { setValue: (value: string | number) => void }).setValue(value);
        }
    } catch {
        // Silently fail if unable to set value
    }
};
```

**Usage:**
```typescript
setAttributeValue(item, "SortOrder", 5);
setAttributeValue(item, "ChangeLog", JSON.stringify(changes));
```

### Drag End Handler

```typescript
const handleDragEnd = () => {
    if (!draggedItem || !draggedOverItem || draggedItem.uuid === draggedOverItem.uuid) {
        setDraggedItem(null);
        setDraggedOverItem(null);
        return;
    }

    const newItems = [...items];
    const draggedIndex = newItems.findIndex(i => i.uuid === draggedItem.uuid);
    const draggedOverIndex = newItems.findIndex(i => i.uuid === draggedOverItem.uuid);

    if (draggedIndex > -1 && draggedOverIndex > -1) {
        const [removed] = newItems.splice(draggedIndex, 1);
        newItems.splice(draggedOverIndex, 0, removed);

        const changes: ChangeRecord[] = [];

        newItems.forEach((item, newIndex) => {
            setAttributeValue(item.object, sortingAttribute, newIndex);

            if (item.originalIndex !== newIndex) {
                changes.push({
                    uuid: item.uuid,
                    oldIndex: item.originalIndex,
                    newIndex: newIndex,
                });
            }
        });

        if (changes.length > 0 && items.length > 0) {
            setAttributeValue(items[0].object, changeJsonAttribute, JSON.stringify(changes));
        }

        setItems(newItems);
    }

    setDraggedItem(null);
    setDraggedOverItem(null);
};
```

## CSS Customization Examples

### Custom Styling

```css
/* Override colors */
.drag-and-drop-item {
    background-color: #f0f7ff;
    border-color: #87ceeb;
}

.drag-and-drop-item.drag-over {
    background-color: #e6f3ff;
    border-color: #4a90e2;
}

/* Custom drag handle */
.drag-handle {
    font-size: 20px;
    color: #4a90e2;
}

/* Style index badge */
.drag-item-index {
    background-color: #4a90e2;
    color: white;
    font-weight: bold;
}
```

### Animation Customization

```css
/* Smooth transitions */
.drag-and-drop-item {
    transition: all 0.15s ease-in-out;
}

/* Scale effect on hover */
.drag-and-drop-item:hover {
    transform: scale(1.02);
}

/* Rotation on drag */
.drag-and-drop-item.dragging {
    transform: rotate(-1deg);
    opacity: 0.7;
}
```

## JSON Change Format Examples

### Single Item Moved

```json
[
  {
    "uuid": "task-001",
    "oldIndex": 0,
    "newIndex": 2
  }
]
```

### Multiple Items Affected

```json
[
  {
    "uuid": "task-001",
    "oldIndex": 0,
    "newIndex": 2
  },
  {
    "uuid": "task-002",
    "oldIndex": 1,
    "newIndex": 0
  },
  {
    "uuid": "task-003",
    "oldIndex": 2,
    "newIndex": 1
  }
]
```

### Parsing Changes in Microflow

```typescript
// Convert JSON string to array
const changes = JSON.parse(changeLogString) as ChangeRecord[];

// Process each change
changes.forEach(change => {
  // Find and update the item
  const item = allItems.find(i => i.id === change.uuid);
  if (item) {
    item.sortOrder = change.newIndex;
  }
});
```

## Event Handling Examples

### Extending Component with Edit Functionality

```typescript
export function DragAndDropListWithEdit({
    dataSource,
    uuidAttribute,
    sortingAttribute,
    changeJsonAttribute,
    displayAttribute,
    onEdit,  // New callback
}: DragAndDropListProps & { onEdit?: (item: DragItem) => void }): ReactElement {
    // ... existing code ...

    return (
        <ul className="drag-and-drop-items">
            {items.map((item, index) => (
                <li key={item.uuid} /* ... */>
                    <span className="drag-handle">⋮⋮</span>
                    <span className="drag-item-text">{item.displayText}</span>
                    <button 
                        className="edit-button"
                        onClick={() => onEdit?.(item)}
                    >
                        Edit
                    </button>
                    <span className="drag-item-index">{index + 1}</span>
                </li>
            ))}
        </ul>
    );
}
```

## TypeScript Type Definitions

```typescript
// Component Props
export interface DragAndDropListProps {
    dataSource: ListValue;
    uuidAttribute: string;
    sortingAttribute: string;
    changeJsonAttribute: string;
    displayAttribute: string;
}

// Internal Item Representation
export interface DragItem {
    uuid: string;
    displayText: string;
    object: ObjectItem;
    originalIndex: number;
}

// Change Record
interface ChangeRecord {
    uuid: string;
    oldIndex: number;
    newIndex: number;
}
```

## Testing Examples

### Unit Test Template

```typescript
describe('DragAndDropList', () => {
    it('should initialize items from dataSource', () => {
        // Arrange
        const mockItems = [
            { ItemId: '1', ItemName: 'Task 1' },
            { ItemId: '2', ItemName: 'Task 2' }
        ];

        // Act
        render(
            <DragAndDropList
                dataSource={mockDataSource}
                uuidAttribute="ItemId"
                sortingAttribute="SortOrder"
                changeJsonAttribute="ChangeLog"
                displayAttribute="ItemName"
            />
        );

        // Assert
        expect(screen.getByText('Task 1')).toBeInTheDocument();
        expect(screen.getByText('Task 2')).toBeInTheDocument();
    });

    it('should reorder items on drag and drop', () => {
        // Test drag and drop logic
    });

    it('should update sort order attribute', () => {
        // Test attribute updates
    });

    it('should generate correct change JSON', () => {
        // Test change tracking
    });
});
```

## Troubleshooting Code

### Debug Change JSON

```typescript
// Add to component to log changes
useEffect(() => {
    if (items.length > 0) {
        console.log('Current items:', items);
        console.log('Items order:', items.map((i, idx) => `${i.uuid}:${idx}`));
    }
}, [items]);
```

### Check Attribute Access

```typescript
// Verify attribute mapping
dataSource.items.forEach(item => {
    console.log('Item:', {
        uuid: getAttributeValue(item, uuidAttribute),
        displayText: getAttributeValue(item, displayAttribute),
        sortOrder: getAttributeValue(item, sortingAttribute),
    });
});
```

---

**Note**: All examples are based on the React Drag and Drop Widget v1.0.0
