# Siêu chiến hạm (dreadnought) — thiết kế hình ảnh

Số liệu và luật: `ships.json` (id `dreadnought`, **1×4**, hồi chiêu 3, đòn `barrage`) và `rules.md` mục 4.6. Cinematic: `cinematics.md` mục 11. Chìm và xác: `sinking.md` (2.2, 2.3, 2.8), `wreckage.md` mục 3. File này chỉ nói hình dạng và cách thể hiện. Phần chung cho mọi tàu: `ship-destroyer.md` (tọa độ, ánh sáng, hư hại, nghiệm thu) và `ships-basic3d.md`.

| File đi kèm | Vai trò |
|---|---|
| `art/dreadnought_2d.svg` | Sprite 2D, `viewBox 0 0 400 100` = 4 ô, mũi hướng phải; khóa `manifest.ts`: `ui_ship_dreadnought` |
| `models/ship_dreadnought.glb` | Model 3D khối, đã nhân 10 (dài 39 ĐV), 15 357 tam giác |
| `models/wrecks/wreck_dreadnought.glb` | Xác tàu bị hạ, gãy đôi, 10 119 tam giác |

Ý đồ hình ảnh: **tàu nặng và đông pháo nhất**. Nhận ra từ xa nhờ **năm tháp pháo ba nòng** xếp kiểu thiết giáp hạm (ba ở mũi, hai ở lái), một **tháp chỉ huy nhiều tầng** (kiểu chùa) với cột radar cao, và **hai ống khói to** có vạch cam. Thân rộng hơn tàu tên lửa, có dải giáp tối chạy dọc hai mạn và sàn trực thăng nhỏ ở đuôi.

## 1. Sprite 2D
- Bố cục từ mũi tới đuôi (x trong viewBox): mũi nhọn (395) → **tháp 1** (350), **tháp 2** (318), **tháp 3** (286), mỗi tháp ba nòng song song → hai bệ pháo phụ nòng đôi hai mạn (272) → **tháp chỉ huy** nhiều tầng (214–270) với kính, cầu, radar → hai ống khói (180–208, 148–176) → nhà boong sau có CIWS và hai xuồng cam (116–144) → **tháp 4** (94), **tháp 5** (62) → sàn trực thăng chữ H (14–48).
- Chiều cao thân nằm trong ô (y 25–75), không tràn sang ô kề. Cách dùng trên lưới, trạng thái: như `ship-destroyer.md` 1.4. Ô 0 ở đuôi, ô 3 ở mũi.
- Dấu hiệu nhận ra ở cỡ nhỏ: năm vòng tháp pháo ba nòng, hai khối ống khói tối có vạch cam, khối tháp chỉ huy trắng lớn.

## 2. Model 3D
### 2.1 Kích thước
Dài **3.94** (z −1.97…+1.97) rộng tối đa **0.54**, mớn nước 0.062, mạn khô 0.10 mũi, 0.07 giữa. Sau khi nhân 10: **dài 39.4 × rộng 5.4 ĐV** (cùng cỡ tàu tên lửa, nhưng đồ sộ hơn). Tâm bốn ô tại `z = −1.5, −0.5, +0.5, +1.5` (ô 0 đuôi, ô 3 mũi). Mũi hướng +Z.

### 2.2 Bộ phận
| Bộ phận | Vị trí (z) | Chi tiết |
|---|---|---|
| **Tháp 1** | +1.58, boong | ba nòng (L, C, R), nòng dài 0.15, phanh miệng nòng, tấm chắn nhiều mặt phẳng |
| **Tháp 2** | +1.20, trên bệ cao 0.045 | bắn vượt qua tháp 1 |
| **Tháp 3** | +0.84, boong | |
| **Tháp 4** | −1.05, trên bệ cao 0.05 | |
| **Tháp 5** | −1.50, boong | |
| **Tháp chỉ huy** | +0.02…+0.52 | đế rộng, bốn tầng bậc thang, cầu chỉ huy có dải kính, tầng nhìn, nóc tối; 4 tấm radar mảng pha hai bên; cột radar tới y 0.63, `radar_rotor`, radar chỉ điểm hỏa lực |
| **Hai ống khói** | −0.10…−0.32, −0.40…−0.62 | khối tối bo mép, vạch cam, lưới ống xả, `exhaust_1/2` |
| Nhà boong sau | −0.66…−0.90 | kính, cần cẩu nhỏ, hai xuồng cam, bè cứu sinh |
| **Pháo phụ ×8** | hai mạn (`turret_s1..s8`) | nòng đôi nhỏ, chỉ xoay theo cho đẹp, không bắn ra đạn |
| CIWS ×4 | `ciws_1..4` | như khu trục hạm (`ciws_N`, `_pitch`, `_spin`) |
| Dải giáp | hai mạn | vạch tối chạy dọc thân |
| Sàn trực thăng | −1.78 | vòng tròn và H |

### 2.3 Cây node và điểm neo
```
dreadnought
  hull  deck_plate  armor_belt_stbd/port  tower_*  radar_rotor  funnel_1/2  ciws_1..4_*  lights
  turret_1..5 (yaw) -> barrel_NL, barrel_NC, barrel_NR (pitch + recoil) -> muzzle_NL, muzzle_NC, muzzle_NR
  turret_s1..s8 (pháo phụ)
  dmg_cell0..3
  anchors: muzzle(=launch, trên tháp 1) bow(0,0.07,+1.97) stern(0,0.07,-1.97) deck(0,0.07,0)
           cell_0 (0,0.07,-1.5) cell_1 (0,0.07,-0.5) cell_2 (0,0.07,+0.5) cell_3 (0,0.07,+1.5)
           fire_0..3 (0,0.08,z của ô)   cam_gun (0,0.26,+1.2)
```
- Mỗi tháp có **ba nòng**, mỗi lần khai hỏa nhả **ba viên** (cách nhau 40 ms, từ `muzzle_NL`, `muzzle_NC`, `muzzle_NR`), cùng bay về **một ô** của tháp đó (rơi lệch nhau tối đa 0.4 ĐV) nên mỗi ô chỉ phát một kết quả.
- Nòng thụt lùi 0.025 ô (0.25 ĐV) trong 300 ms, mạnh hơn tuần dương. Tháp xoay tối đa 180°/giây, nòng ngẩng tới 40°.
- `dmg_cell0` = đuôi (sàn trực thăng, tháp 5), `dmg_cell1` = giữa sau (ống khói, tháp 4), `dmg_cell2` = giữa trước (tháp chỉ huy, tháp 3), `dmg_cell3` = mũi (tháp 1, 2).

### 2.4 Vật liệu
Dùng chung bộ vật liệu `ships-basic3d.md`; không thêm vật liệu mới. Nòng pháo và đáy tháp dùng `dark`, thượng tầng `struct`, vạch ống khói `orange`.

### 2.5 Nghiệm thu
Như `ship-destroyer.md` 2.10, thêm: năm tháp pháo đúng vị trí, mỗi tháp ba nòng và ba `muzzle_N*`; tháp 2 và 4 cao hơn; hai ống khói riêng biệt; bốn `cell_*`, bốn `fire_*`, bốn `dmg_cell*`; nhận ra là siêu chiến hạm (không nhầm tuần dương, tàu tên lửa) trong 1 giây ở góc chiến thuật.
