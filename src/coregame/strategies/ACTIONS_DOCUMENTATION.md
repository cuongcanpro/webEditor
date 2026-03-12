# Action Strategies Documentation

Tài liệu này mô tả tất cả các Action Strategy có sẵn trong hệ thống Match-3 Core Game.

## Tổng Quan

Action Strategies là các class định nghĩa hành vi của elements khi các sự kiện xảy ra. Tất cả strategies đều kế thừa từ `NormalAction` và được tổ chức trong namespace `CoreGame.Strategies`.

### Cấu Trúc Cơ Bản

Mỗi action strategy có 2 methods chính:
- **`checkCondition(element, context)`**: Kiểm tra xem action có thể thực thi không
- **`execute(element, context)`**: Thực thi logic của action

---

## Base Strategy

### NormalAction

**File:** `NormalAction.js`

Base class cho tất cả action strategies.

#### Properties:
- `configData`: Object chứa configuration data

#### Methods:
- `setConfigData(config)`: Set configuration data
- `updateVisual(element)`: Update visual representation
- `checkCondition(element, context)`: Luôn trả về `true` (override trong subclasses)
- `execute(element, context)`: Empty implementation (override trong subclasses)

---

## Match & Damage Actions

### 1. MatchAction

**File:** `MatchAction.js`  
**Extends:** `NormalAction`

Xử lý khi element được match.

#### Execute Behavior:
- Set element state thành `MATCHING` 
- **Normal match**: Play explode animation
- **PowerUp match**: Play converge animation đến targetPos
- Emit event `elementMatched`

#### Context Parameters:
- `type`: `'normal'` hoặc `'powerup'`
- `targetPos`: Vị trí target (cho powerup match)

---

### 2. TakeDamageAction

**File:** `TakeDamageAction.js`  
**Extends:** `NormalAction`

Element nhận damage khi có match gần đó.

#### Condition:
- `element.canTakeDamage(context.matchColor)` returns `true`

#### Execute Behavior:
- Gọi `element.takeDamage(1, matchColor, row, col)`

#### Context Parameters:
- `matchColor`: Màu của match
- `row`, `col`: Vị trí của match

---

### 3. QueueTakeDamageAction

**File:** `TakeDamageAction.js`  
**Extends:** `TakeDamageAction`

Element nhận damage theo thứ tự queue (yêu cầu match các màu theo thứ tự specific).

#### Config Data:
```javascript
{
    _queueTypeIds: [typeId1, typeId2, typeId3, ...]  // Queue of required colors
}
```

#### Condition:
- Queue không rỗng
- `context.matchColor === queueTypeIds[0]` (match màu đầu queue)

#### Execute Behavior:
- Remove màu đầu tiên khỏi queue (`shift()`)
- Nếu queue rỗng → Remove element
- Nếu còn → Update visual showing remaining queue

#### Methods:
- `getQueueTypeIds()`: Get queue hiện tại
- `updateVisual(element)`: Show queue as JSON string

---

### 4. CollectTakeDamageAction

**File:** `TakeDamageAction.js`  
**Extends:** `TakeDamageAction`

Element yêu cầu collect đủ các màu specific (không theo thứ tự).

#### Config Data:
```javascript
{
    _requiredTypeIds: [typeId1, typeId2, typeId3, ...]  // Required colors to collect
}
```

#### Internal State:
- `_collectedTypeIds`: Array các màu đã collect

#### Condition:
- `matchColor` nằm trong `_requiredTypeIds`
- `matchColor` chưa được collect

#### Execute Behavior:
- Add `matchColor` vào `_collectedTypeIds`
- Call `element.ui.collectType(matchColor)` để update visual
- Nếu đã collect đủ → `element.doExplode()` và remove

#### Methods:
- `updateVisual(element)`: Show required và collected colors

---

## Spawn Actions

### 5. SpawnElementAction

**File:** `SpawnElementAction.js`  
**Extends:** `NormalAction`

Spawn element mới tại vị trí specific.

#### Constructor:
```javascript
new SpawnElementAction(type, row, col)
```

#### Parameters:
- `type`: Element type ID to spawn
- `row`: Target row
- `col`: Target column

#### Execute Behavior:
- Gọi `boardMgr.addNewElement(row, col, type)`
- Play spawn animation nếu có UI

---

### 6. AroundSpawnElementAction

**File:** `SpawnElementAction.js`  
**Extends:** `NormalAction`

Spawn elements xung quanh và dưới parent element (support multi-cell blockers).

#### Config Data:
```javascript
{
    type: elementTypeId  // Type of elements to spawn
}
```

#### Condition:
- `element.cooldownSpawn <= 0`

#### Execute Behavior:

Tạo 2 layers:
1. **Level 2 (Under)**: Spawn elements dưới toàn bộ area của parent
   - Coverage: `(r, c)` đến `(r + height - 1, c + width - 1)`

2. **Level 1 (Ring)**: Spawn elements xung quanh parent (ring ngoài)
   - Top/Bottom rows
   - Left/Right columns

#### Spawn Rules:
- Nếu element đã tồn tại với same type:
  - Nếu `hitPoints >= level`: Skip
  - Nếu `hitPoints < level`: Upgrade to higher level
- Nếu chưa tồn tại: Create new element

#### Visual:
```
1 1 1 1 1
1 2 2 2 1  (Parent is 3x3)
1 2 2 2 1
1 2 2 2 1
1 1 1 1 1
```

---

### 7. RandomSpawnElementAction

**File:** `SpawnElementAction.js`  
**Extends:** `NormalAction`

Spawn elements ngẫu nhiên trên board.

#### Config Data:
```javascript
{
    type: elementTypeId,  // Type to spawn
    numRandom: 3          // Number of elements to spawn
}
```

#### Condition:
- `element.cooldownSpawn <= 0`

#### Execute Behavior:
1. Collect tất cả valid slots (slots chứa GEM hoặc PowerUP)
2. Shuffle array of valid slots
3. Pick random `numRandom` slots
4. Spawn element type tại mỗi slot
5. Play spawn animation

#### Static Property:
- `RandomSpawnElementAction.executedOnTurnEnd`: Flag to track turn-end execution

---

## Spread & Utility Actions

### 8. SpreadAction

**File:** `SpreadAction.js`  
**Extends:** `NormalAction`

Spread element sang neighboring slots (ví dụ: Soap, Cloud).

#### Condition:
- `element.cooldownSpawn <= 0`

#### Execute Behavior:

1. **Find Potential Targets**:
   - Get all cells occupied by element (support DynamicBlocker)
   - Check 4-directional neighbors: `[-1,0]`, `[1,0]`, `[0,-1]`, `[0,1]`
   - Valid targets:
     - Empty slots
     - Slots with basic gems (type <= 6)

2. **Pick Random Target**:
   - Random select from potential slots

3. **Spread**:
   - **DynamicBlocker**: Add cell to expand blocker
   - **Regular Blocker**: Create new blocker instance

4. **Effects**:
   - Play sound effect (`cloud_appear`)
   - Clear target slot elements
   - Add/create new element

---

### 9. MoveAction

**File:** `MoveAction.js`  
**Extends:** `NormalAction`

Di chuyển element hiện tại sang một neighboring slot, đồng thời xóa bỏ các "swapable" elements cản đường.

#### Config Data:
```javascript
{
    directionType: 0 // (0: random, 1:UP, 2:DOWN, 3:LEFT, 4:RIGHT)
}
```

#### Execute Behavior:

1. **Determine Directions to Test**:
   - Nếu `directionType` là `0`: Tạo danh sách 4 hướng (`UP`, `DOWN`, `LEFT`, `RIGHT`) và xáo trộn ngẫu nhiên.
   - Nếu `directionType` > `0`: Chỉ kiểm tra hướng chỉ định.

2. **Find and Perform Move**:
   - Duyệt qua danh sách các hướng đã xác định.
   - Với mỗi hướng, tính toán vùng target dựa trên toàn bộ occupied cells của element (support multi-cell elements).
   - Kiểm tra xem hướng đó có hợp lệ không (nằm trong board và chỉ chứa các "swapable" elements hoặc ô trống).
   - Nếu hướng hợp lệ:
     - Xóa bỏ (remove/explode) các "swapable" elements tại vùng target.
     - Di chuyển element hiện tại sang vị trí mới (update logic anchor).
     - Update grid slots.
     - **Fill hole**: Tự động lấp đầy các ô trống vừa để lại bằng các element mới. Các element này được chọn màu sao cho không tạo thành match-3 tức thì tại vị trí đó (check cả 4 hướng).
     - Play move animation (`visualMoveTo`).
     - Sau khi animation hoàn tất, set `matchingRequired = true` để boardMgr check match mới.
   - Dừng lại ngay sau khi thực hiện thành công một lần di chuyển.

---

### 10. SetDataAction

**File:** `SetDataAction.js`  
**Extends:** `NormalAction`

Set properties trực tiếp lên element từ config data.

#### Config Data:
```javascript
{
    propertyName1: value1,
    propertyName2: value2,
    ...
}
```

#### Condition:
- Always `true`

#### Execute Behavior:
- Iterate qua tất cả keys trong `configData`
- Set `element[key] = value` cho mỗi property
- Log values được set

#### Use Cases:
- Set `cooldownSpawn` property
- Set custom element properties
- Initialize element state

---

### 11. PlayAnimationAction

**File:** `PlayAnimationAction.js`  
**Extends:** `NormalAction`

Play một animation cụ thể trên element. Tên animation được định nghĩa trong configData.

#### Config Data:
```javascript
{
    animation: "animation_name",    // Tên animation cần play
    animationName: "animation_name" // (Optional) Legacy key
}
```

#### Execute Behavior:
- Kiểm tra nếu element có UI.
- Ưu tiên `configData.animation`, sau đó đến `configData.animationName`.
- Gọi `element.ui.playAnimation(animName, visualState)`.
- `visualState` được lấy từ `element.customData.visualState` (mặc định là chuỗi rỗng).

---

### 12. SetAttributeAction

**File:** `SetAttributeAction.js`  
**Extends:** `NormalAction`

Gán giá trị cho một field cụ thể của element.

#### Config Data:
```javascript
{
    fieldName: "propertyName", // Tên thuộc tính cần gán
    value: value               // Giá trị cần gán
}
```

#### Execute Behavior:
- Thực hiện gán `element.customData[fieldName] = value`.
- Chú ý: Value này không được tự động gán lúc init (trừ khi được gọi qua một trigger như `sideMatch` hoặc `turnEnd`).

---

### 13. ChangeAttributeAction

**File:** `ChangeAttributeAction.js`  
**Extends:** `NormalAction`

Tăng hoặc giảm giá trị của một field.

#### Config Data:
```javascript
{
    fieldName: "propertyName", // Tên thuộc tính cần thay đổi
    delta: 1,                  // Giá trị tăng/giảm (số âm để giảm)
    defaultValue: 0            // Giá trị mặc định nếu field chưa tồn tại
}
```

#### Execute Behavior:
- Nếu field chưa tồn tại trong `element.customData`, khởi tạo bằng `defaultValue`.
- Thực hiện `element.customData[fieldName] += delta`.

---

### 14. CheckAttributeAction

**File:** `CheckAttributeAction.js`  
**Extends:** `NormalAction`

Kiểm tra một thuộc tính của element, nếu đạt đến giá trị chỉ định thì kích hoạt một action khác.

#### Config Data:
```javascript
{
    fieldName: "propertyName", // Tên thuộc tính cần kiểm tra
    targetValue: 10,           // Giá trị cần đạt đến (>=)
    actionKey: "remove"        // Key của action cần kích hoạt (vd: sideMatch, remove, match)
}
```

#### Execute Behavior:
- Kiểm tra nếu `element.customData[fieldName] == targetValue`.
- Nếu thỏa mãn, gọi `element.doActionsType(actionKey)`.

---

### 15. ReplaceUIAction

**File:** `ReplaceUIAction.js`  
**Extends:** `NormalAction`

Thay thế giao diện (UI) hiện tại của element bằng một `CustomElementUI` mới, load từ file Cocos Studio JSON.

#### Config Data:
```javascript
{
    path: "res/newBlock/BlockUI/special_effect.json" // Đường dẫn tới file JSON/CSB
}
```

#### Execute Behavior:
- Tìm parent hiện tại của UI cũ.
- Xóa UI cũ khỏi memory và parent.
- Tạo instance mới của `CoreGame.CustomElementUI(element, path)`.
- Thêm UI mới vào cùng parent với z-order cũ.
- Cập nhật lại vị trí visual để khớp với grid.

---

## Tổng Kết

### Hierarchy

```
NormalAction (base)
├── MatchAction
├── SetDataAction
├── MoveAction
├── TakeDamageAction
│   ├── QueueTakeDamageAction
│   └── CollectTakeDamageAction
├── SpreadAction
├── PlayAnimationAction
├── SetAttributeAction
├── ChangeAttributeAction
├── CheckAttributeAction
├── ReplaceUIAction
└── SpawnElementAction
    ├── AroundSpawnElementAction
    └── RandomSpawnElementAction
```

### Action Types Usage

Actions được sử dụng trong ElementObject thông qua action keys:
- **`match`**: MatchAction
- **`sideMatch`**: TakeDamageAction variants
- **`remove`**: Custom removal actions
- **`turnEnd`**: Spawn, Spread và Swap actions
- **`action_0` - `action_3`**: Các action key tùy chỉnh có thể được kích hoạt thông qua `CoreGame.EventMgr.trigger("customaction_0")` hoặc thông qua `CheckAttributeAction`.

### Config Example

Trong blocker JSON config:
```json
{
  "type": "Box",
  "customAction": {
    "sideMatch": [
      {
        "name": "QueueTakeDamageAction",
        "config": {
          "_queueTypeIds": [1, 2, 3]
        }
      }
    ],
    "turnEnd": [
      {
        "name": "RandomSpawnElementAction",
        "config": {
          "type": 1004,
          "numRandom": 3
        }
      }
    ]
  }
}
```
