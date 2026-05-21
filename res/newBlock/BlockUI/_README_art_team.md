# Art Asset Placeholders — Saga 3 Blockers (L51-L310)

Tổng số file placeholder cần thay: **28**

> Tất cả file `.json` trong thư mục này là **placeholder** với marker `_placeholder: true`.
> Art team cần export từ Cocos Creator và thay nội dung từng file theo `_blocker_name`.

## Danh sách asset cần làm

| Blocker ID | File | Size | Layer | Mô tả |
|---|---|---|---|---|
| 701 | `block_color_box_1.json` | 1x1 | EXCLUSIVE | Color Box - Red (gem màu 1) |
| 702 | `block_color_box_2.json` | 1x1 | EXCLUSIVE | Color Box - Blue (gem màu 2) |
| 703 | `block_color_box_3.json` | 1x1 | EXCLUSIVE | Color Box - Green (gem màu 3) |
| 704 | `block_color_box_4.json` | 1x1 | EXCLUSIVE | Color Box - Yellow (gem màu 4) |
| 705 | `block_color_box_5.json` | 1x1 | EXCLUSIVE | Color Box - Purple (gem màu 5) |
| 706 | `block_color_box_6.json` | 1x1 | EXCLUSIVE | Color Box - Orange (gem màu 6) |
| 5001 | `block_color_egg_1.json` | 1x1 | EXCLUSIVE | Color Egg - màu 1 |
| 5002 | `block_color_egg_2.json` | 1x1 | EXCLUSIVE | Color Egg - màu 2 |
| 5003 | `block_color_egg_3.json` | 1x1 | EXCLUSIVE | Color Egg - màu 3 |
| 5004 | `block_color_egg_4.json` | 1x1 | EXCLUSIVE | Color Egg - màu 4 |
| 5005 | `block_color_egg_5.json` | 1x1 | EXCLUSIVE | Color Egg - màu 5 |
| 5006 | `block_color_egg_6.json` | 1x1 | EXCLUSIVE | Color Egg - màu 6 |
| 11010 | `block_color_crab_1.json` | 2x2 | EXCLUSIVE | Color Crab - màu 1 |
| 11011 | `block_color_crab_2.json` | 2x2 | EXCLUSIVE | Color Crab - màu 2 |
| 11012 | `block_color_crab_3.json` | 2x2 | EXCLUSIVE | Color Crab - màu 3 |
| 11013 | `block_color_crab_4.json` | 2x2 | EXCLUSIVE | Color Crab - màu 4 |
| 11014 | `block_color_crab_5.json` | 2x2 | EXCLUSIVE | Color Crab - màu 5 |
| 11015 | `block_color_crab_6.json` | 2x2 | EXCLUSIVE | Color Crab - màu 6 |
| 11020 | `block_king_crab.json` | 3x3 | EXCLUSIVE | King Crab - 6 color states + walk anim |
| 12000 | `block_slime_normal.json` | 2x2 | EXCLUSIVE | Slime hiền (mỗi HP = 1 cell shrink) |
| 12001 | `block_slime_evil.json` | 2x2 | EXCLUSIVE | Slime ác (shrink + regenerate spread anim) |
| 12002 | `block_slime_lord.json` | 3x3 | EXCLUSIVE | Slime Chúa (shrink + regenerate + color shift anim) |
| 13000 | `block_cat_visible.json` | 2x2 | EXCLUSIVE | Mèo ẩn thân - VISIBLE (đứng trên layer) |
| 13001 | `block_cat_hidden.json` | 2x2 | BACKGROUND | Mèo ẩn thân - HIDDEN (chui xuống dưới gem) |
| 14000 | `block_countdown.json` | 1x1 | EXCLUSIVE | Blocker Đếm Ngược (cần hiển thị số 4→0) |
| 14001 | `block_queue_lock.json` | 1x1 | EXCLUSIVE | Blocker Theo Thứ Tự (hiển thị 3 ô màu sequence) |
| 14010 | `block_hidden_visible.json` | 1x1 | EXCLUSIVE | Blocker Ẩn - VISIBLE |
| 14011 | `block_hidden_invisible.json` | 1x1 | BACKGROUND | Blocker Ẩn - HIDDEN |

## Lưu ý kỹ thuật

- Format: CocosStudio JSON (`type: 2` trong blockData)
- Layer EXCLUSIVE: chiếm trọn slot, vẽ đè lên gem
- Layer BACKGROUND: nằm dưới gem (cho state HIDDEN — Mèo/Blocker Ẩn)
- DynamicBlocker (Slime): cần animation co/giãn cell, render theo cells array runtime
- Multi-state blockers (Mèo, Blocker Ẩn): ReplaceSelfAction swap giữa 2 file riêng biệt — mỗi file là 1 state độc lập
- King Crab (11020) cycle qua 6 màu via ReplaceSelfAction → có thể tận dụng asset của ColorCrab 11010-11015

## Animation names được reference trong blockData

- `color_shift` (Slime Chúa endTurn) — animation đổi màu thân slime
- Có thể bổ sung thêm khi designer/dev finalize behavior
