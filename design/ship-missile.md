# Tàu tên lửa (missile ship) — thiết kế hình ảnh

> **Trạng thái 3D:** model chi tiết ở mục 2 bên dưới **tạm hoãn**. Dùng bản khối cơ bản `ships-basic3d.md` (file `models/ship_missile.glb`). Sprite 2D, luật, điểm neo, cinematic trong file này vẫn hiệu lực.

Số liệu và luật: `ships.json` (id `missile`, 4 ô, hồi chiêu 2, đòn `cross`) và `rules.md` mục 4.4. File này chỉ nói hình dạng và cách thể hiện.

Phần chung cho mọi tàu: xem `ship-destroyer.md` (hệ tọa độ 2.2, vật liệu 2.4, ánh sáng 2.5, hư hại 2.7, nghiệm thu 2.10, style sprite 1.5). File này chỉ ghi chỗ khác hoặc riêng.

| File đi kèm | Vai trò |
|---|---|
| `art/missile_2d.svg` | Sprite 2D hoàn chỉnh, dùng thẳng được |

Ý đồ hình ảnh: một **ổ sát thương nổi**. Hai **dãy ô phóng thẳng đứng thật to** chiếm gần nửa chiều dài, đầu và đuôi nhà boong. Cầu chỉ huy dựng giữa, bọc radar mảng pha. Nhìn từ xa nhận ra qua hai ô lưới đen lớn.

---

## 1. Sprite 2D (cartoon)

- Nguồn: `art/missile_2d.svg`. `viewBox="0 0 400 100"` = 4 ô. Mũi hướng phải. Cùng quy ước viền, bảng màu, bóng đổ với khu trục hạm. Khóa `manifest.ts`: `ui_ship_missile`.
- Bố cục từ mũi tới đuôi: mũi nhọn dài (395) → neo (378) → pháo nhỏ (352) → **dãy ô phóng trước** 8 × 4 ô (252–330), góc có tam giác cam cảnh báo → cầu chỉ huy cao, tấm radar vuông đen hai bên, cột (198–238) → CIWS (190) → nhà boong giữa với hai ống khói và hai xuồng cam (146–188) → **dãy ô phóng sau** 8 × 4 ô (54–132), góc cam → sàn bay chữ H (15–43).
- Cách dùng trên lưới, trạng thái: giống `ship-destroyer.md` 1.4. Ô 0 ở đuôi, ô 3 ở mũi.
- Dấu hiệu nhận ra ở cỡ nhỏ: hai ô lưới đen lớn đối xứng quanh khối nhà boong.

---

## 2. Model 3D

### 2.1 Kích thước
- Dài **3.90** (z −1.95…+1.95), rộng tối đa **0.42**, mớn nước **0.05**, mạn khô 0.08 mũi / 0.05 giữa / 0.055 đuôi.
- Tâm bốn ô tại `z = −1.5, −0.5, +0.5, +1.5` (ô 0 đuôi, ô 3 mũi).
- Thân tàng hình như khu trục hạm nhưng dài hơn, mũi dài hơn.

### 2.2 Bộ phận (từ mũi tới đuôi)
| Bộ phận | Vị trí (z) | Kích thước chính | Chi tiết bắt buộc |
|---|---|---|---|
| Neo, tời | +1.70…+1.80 | — | như các tàu khác |
| Pháo nhỏ (một nòng) | +1.52 | đế r 0.034, nòng 0.065 | vỏ tàng hình, nòng giảm giật |
| **Dãy ô phóng trước** | +0.52…+1.30 | 0.70 × 0.24, nhô 0.008 | **32 nắp** (8 dọc × 4 ngang) bản lề mở được, viền hazard vàng–cam ở góc, vết cháy loang trên mặt boong quanh dãy |
| **Cầu chỉ huy** | −0.02…+0.38 | rộng ±0.12, cao 0.15 | 2 tầng, kính nghiêng, **4 tấm radar mảng pha lớn** (mỗi tấm 0.07 × 0.07) bao quanh, cửa kín nước |
| Cột tích hợp | +0.18 | đỉnh y 0.34 | radar tìm kiếm quay, ăng-ten roi ×6 |
| CIWS ×2 | −0.30 (nóc nhà boong), −1.30 (cạnh dãy sau) | như khu trục hạm | vòm trắng |
| **Nhà boong giữa** | −0.54…−0.12 | rộng ±0.09, cao 0.10 | khoang xuồng cứu sinh ×2, hộp bè cứu sinh, hai ống khói nghiêng |
| Ống khói ×2 | −0.42 và −0.30 | cao tới 0.15 | như khu trục hạm |
| **Dãy ô phóng sau** | −1.46…−0.68 | 0.70 × 0.24 | giống dãy trước (32 nắp) |
| Sàn bay | −1.57…−1.95 | rộng ±0.13 | vòng tròn và H, lưới đáp, đèn viền |
| Lan can, đồ phụ | quanh mép boong | cao 0.014 | như khu trục hạm |

Tổng 64 ô phóng (2 × 32). Hình học mỗi nắp đủ chi tiết ở LOD0; ở LOD1 gộp thành một khối có texture lưới.

### 2.3 Cây node và điểm neo
```
missile
  hull  superstructure  radar_rotor  ciws_1_*  ciws_2_*  exhaust_1  exhaust_2  lights
  turret_1 (yaw) -> barrel_1 -> muzzle_1
  vls_fwd_array  vls_aft_array         (mỗi dãy 32 nắp tĩnh)
  launcher_0..4  (5 bệ phóng trồi lên từ khoang; nắp khoang mở, bệ ngẩng nòng tới 75° quanh trục ngang `launcher_N_pitch`)
  dmg_cell0..3
  anchors: muzzle(=muzzle_1) launch(=vls_slot_2) bow(0,0.06,+1.95) stern(0,0.06,-1.95) deck(0,0.05,0)
           cell_0 (0,0.05,-1.5)  cell_1 (0,0.05,-0.5)  cell_2 (0,0.05,+0.5)  cell_3 (0,0.05,+1.5)
           fire_0..3 (0,0.06,z của ô)
           vls_slot_0 (0,0.058,+0.71)  vls_slot_1 (0,0.058,+0.91)  vls_slot_2 (0,0.058,+1.11)   (dãy trước)
           vls_slot_3 (0,0.058,-1.17)  vls_slot_4 (0,0.058,-0.97)                                (dãy sau)
```
- Đòn `cross` phóng **5 quả** (tâm, lên, phải, xuống, trái theo `rules.md` 4.4). Quả nào đi từ `vls_slot_N` nào do `animations.md` 4.4 / mã quyết định; thiết kế gợi ý: quả tâm từ `vls_slot_1`, bốn quả còn lại từ các slot khác.
- **Cinematic yêu cầu "các tháp tên lửa ngẩng lên"** (`cinematics.md` mục 4): trước khi phóng, nắp khoang của dãy mở trong 300 ms, `launcher_0..4` trồi lên và **ngẩng nòng** tới 75° trong 800 ms, lệch nhau 80 ms mỗi bệ. Mỗi bệ là một cụm 4 ống tên lửa dạng hộp (khối 0.10 × 0.06 × 0.06), nòng mở về phía trước-lên. Khi phóng, tên lửa rời ống từ `vls_slot_N` (điểm này nằm ở đầu ống của `launcher_N`).
- Phần ô phóng đứng 8 × 4 của hai dãy giữ nguyên ở trạng thái đóng; năm bệ `launcher_N` nằm gọn bên trong khoang giữa các nắp và chỉ hiện khi mở. Lửa và khói thoát ra từ `vls_slot_N` (khói trắng cột, lửa dưới đáy, vệt cháy loang trên boong).
- `dmg_cell0` = đuôi (dãy sau, sàn bay) … `dmg_cell3` = mũi (dãy trước, pháo). Khi dãy phóng bị trúng: hiện vết cháy và nắp bị bật tung một phần.

### 2.4 Vật liệu: khác gì khu trục hạm
Cùng bộ vật liệu. Thêm: `mat_hazard` (sơn cảnh báo vàng–cam sọc chéo ở viền dãy phóng), `mat_scorch` (decal vết cháy trên boong quanh các nắp, đã phủ sẵn nhẹ, tăng khi phóng). Radar mảng pha dùng `mat_glass` đen nhám, ánh xanh lạnh rất yếu về đêm.

### 2.5 Mức chi tiết
| Mức | Dùng khi | Tam giác tối đa |
|---|---|---|
| LOD0 | Hangar, cinematic cận cảnh | 250 000 |
| LOD1 | Trận đấu | 35 000 |
| LOD2 | Xa | 8 000 |
Texture: 2 bộ 2048² + decal. Dung lượng glb nén ≤ 12 MB.

### 2.6 Nghiệm thu
Như `ship-destroyer.md` 2.10, thêm: hai dãy ô phóng, mỗi dãy 8 × 4; năm `vls_slot_*` và năm bệ `launcher_*` có mặt, trồi lên và ngẩng nòng được; bốn `cell_*`, bốn `fire_*`; từ góc chiến thuật nhận ra ngay khác tuần dương và khu trục hạm.
