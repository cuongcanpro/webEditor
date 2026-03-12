# EditMapScene Tool - Usage Guide

## Overview
EditMapScene là công cụ thiết kế map cho game Match-3, cho phép tạo và chỉnh sửa các level với giao diện trực quan.

## UI Components Required

User cần tạo file `res/tool/EditMapUI.json` trong Cocos Studio với các components sau:

### Required UI Elements:

**1. GridContainer** (Panel)
- Container để chứa 8x8 grid cells
- Sẽ được populate tự động bởi code

**2. Element Lists**
- `GemList` (ListView) - Danh sách gem types
- `BlockerList` (ListView) - Danh sách blocker types

**3. Map Controls**
- `ClearSelectionBtn` - Button xóa selection (về chế độ toggle slot)
- `FillAllBtn` - Button Fill All slots
- `ClearAllBtn` - Button Clear All slots
- `SaveBtn` - Button Save map
- `LoadBtn` - Button Load map
- `TestBtn` - Button Test map in game
- `BackBtn` - Button quay lại tools menu
- `MapNameInput` (TextField) - Input tên map

## Features

### Workflow đơn giản hóa

**Không selection (selectedType = null):**
- Click vào grid cell → Toggle slot enable/disable

**Có selection (đã chọn gem/blocker):**
- Chọn element từ GemList hoặc BlockerList
- Click vào grid cell → Place element
- Click lại same cell → Remove element

**Xóa selection:**
- Click button "Clear Selection" → Quay về chế độ toggle slot

### 1. Slot Management
- **Toggle Slot**: Click từng ô để enable/disable (khi không có selection)
- **Fill All**: Enable tất cả slots
- **Clear All**: Disable tất cả slots

### 2. Element Placement
**Direct Selection Mode:**
- Chọn element từ danh sách → `selectedType` được set
- Click vào enabled slot → Element được thêm vào
- Click vào slot có element → Element bị xóa
- Click "Clear Selection" → Quay về slot toggle mode

### 3. Save/Load Maps
**Save:**
- Nhập tên map vào MapNameInput
- Click Save button
- Map được lưu vào `res/maps/{mapName}.json`

**Load:**
- Nhập tên map vào MapNameInput
- Click Load button

**Map Format:**
```json
{
    "slotMap": [
        [1, 1, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 0, 0, 0, 0],
        ...
    ],
    "elements": [
        {"row": 0, "col": 0, "type": 1, "hp": 1},
        {"row": 0, "col": 1, "type": 1002, "hp": 2}
    ]
}
```

### 4. Test Map
- Click Test button
- Game sẽ launch BoardUI với map hiện tại
- Test gameplay với layout vừa thiết kế

## Launch EditMapScene

Thêm vào tool launcher hoặc main menu:

```javascript
// Trong BlockCreatorUI hoặc tool menu
var mapEditorBtn = new ccui.Button();
mapEditorBtn.setTitleText("Map Editor");
mapEditorBtn.addTouchEventListener(function (sender, type) {
    if (type === ccui.Widget.TOUCH_ENDED) {
        var scene = new cc.Scene();
        scene.addChild(new EditMapScene());
        cc.director.runScene(scene);
    }
});
```

## Technical Details

### Grid Representation
- 8x8 grid (rows 0-7, cols 0-7)
- Each cell có state:
  - `slotMap[r][c] = 1`: Enabled (green)
  - `slotMap[r][c] = 0`: Disabled (gray)

### Element Types
- **Gems**: type 1 đến NUM_COLORS (default 1-4)
- **Blockers**: type IDs từ mapID.json

### Visual Indicators
- **White cells**: Empty enabled slots
- **Gray cells**: Disabled slots
- **Blue cells**: Slots có element
- **Cell text**: 
  - Gem: "G1", "G2", etc.
  - Blocker: First 3 chars of blocker name
  - Disabled: "X"

## Integration với Game

BoardMgr và BoardUI đã được update để support mapConfig:

```javascript
// Launch game với map từ editor
var mapConfig = {
    slotMap: [[1,1,0,...], ...],
    elements: [{row: 0, col: 0, type: 1, hp: 1}, ...]
};

var scene = new cc.Scene();
var board = new CoreGame.BoardUI(null, mapConfig);
scene.addChild(board);
cc.director.runScene(scene);
```

## Troubleshooting

**UI JSON không tồn tại:**
- EditMapScene sẽ hiển thị fallback UI với error message
- Tạo file `res/tool/EditMapUI.json` trong Cocos Studio theo structure trên

**Map không save:**
- Check console log xem có SAVE_MAP_DATA message không
- Copy JSON từ log nếu jsb.fileUtils không available
- Ensure `res/maps/` directory tồn tại
