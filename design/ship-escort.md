# Tàu hộ vệ (escort) — thiết kế hình ảnh

> **Trạng thái 3D:** model chi tiết ở mục 2 bên dưới **tạm hoãn**. Dùng bản khối cơ bản `ships-basic3d.md` (file `models/ship_escort.glb`). Sprite 2D, luật, điểm neo, cinematic trong file này vẫn hiệu lực.

Số liệu và luật: `ships.json` (id `escort`, **2×2**, không có đòn chủ động, kỹ năng nội tại `guard`) và `rules.md` mục 10.2. File này chỉ nói hình dạng và cách thể hiện.

Phần chung cho mọi tàu: `ship-destroyer.md` (hệ tọa độ 2.2, vật liệu 2.4, ánh sáng 2.5, hư hại 2.7, nghiệm thu 2.10, quy ước sprite 1.5).

| File đi kèm | Vai trò |
|---|---|
| `art/escort_2d.svg` | Sprite 2D 2×2, dùng thẳng được |

Ý đồ hình ảnh: tàu **vuông vức, rộng bản, nhìn như một tấm khiên nổi**: hai thân song song nối nhau bằng boong lớn, **vòm radar to ở giữa** làm điểm nhìn, bốn CIWS bốn góc, giàn phóng mồi nhử hai bên. Tàu duy nhất có hình khối vuông, nên đọc ngay là "phòng thủ".

---

## 1. Sprite 2D
- `viewBox="0 0 200 200"` = đúng 2×2 ô. Mũi hướng phải. Bảng màu bạc chuẩn như tàu thường. Khóa `manifest.ts`: `ui_ship_escort`.
- Bố cục từ mũi tới đuôi: hai mũi nhọn song song (bên phải) → hai CIWS phía mũi → **cầu chỉ huy và vòm radar lớn** ở giữa-phải (100–152, vòm r 22) → hai CIWS phía sau → boong trung tâm có vạch đứt, thanh cam → hai giàn mồi nhử mỗi thân (40–90) → đuôi hai thân.
- **Tàu 2×2 không xoay**: hình vuông nên mũi **luôn hướng phải**, kể cả khi đặt trong lưới (không có đặt dọc). Điều này khác các tàu khác; model 3D cũng luôn quay mũi về +X trong cảnh (`env-and-fx.md` mục 1) và không có góc xoay ngẫu nhiên khi đặt.
- Thứ tự ô (chỉ số `hits[]`): `0=(0,0) trên-trái, 1=(1,0) trên-phải, 2=(0,1) dưới-trái, 3=(1,1) dưới-phải`, so với ô gốc. Mũi ở phía ô 1 và 3.
- Khi chìm: bộ lọc xám tối như các tàu khác.
- Ở lưới địch: lộ khi chìm (cả khối 2×2), hoặc **lộ sự tồn tại** khi cờ `blocked` xuất hiện (chưa lộ vị trí).

## 2. Model 3D

### 2.1 Kích thước
- Footprint **1.90 × 1.90** (z −0.95…+0.95, x −0.95…+0.95), mớn nước **0.05**, mạn khô 0.06. Tâm bốn ô tại `(x,z) = (−0.5,−0.5), (+0.5,−0.5), (−0.5,+0.5), (+0.5,+0.5)` (ô 0, 1, 2, 3). Mũi hướng +X (hai mũi nhọn ở x +0.95).
- Cấu trúc: **hai thân song song** (catamaran), mỗi thân dài 1.85 rộng 0.55, cách nhau 0.55, nối bằng boong trung tâm dài 1.3 rộng 1.0 ở độ cao 0.07.

### 2.2 Bộ phận
| Bộ phận | Vị trí | Kích thước | Chi tiết bắt buộc |
|---|---|---|---|
| **Hai thân** | z ±0.55, x −0.92…+0.95 | mỗi thân 1.85 × 0.55 | mũi nhọn, sườn loe, vết nước giữa hai thân |
| **Boong trung tâm** | x −0.30…+0.70, z ±0.50 | 1.0 × 1.0, y 0.07 | nối hai thân, nhám chống trượt, vạch kẻ đứt |
| **Cầu chỉ huy** | x +0.10…+0.55, z −0.30…+0.30 | cao 0.16 | hai tầng, kính nghiêng, 4 tấm radar mảng pha |
| **Vòm radar lớn** | x +0.18, z 0 | đường kính 0.34, cao 0.18 | vòm bóng trắng xám, đường chia múi, đèn đỏ đỉnh, phát sáng nhẹ khi kích hoạt (xem 3) |
| **CIWS ×4** | (−0.10, ±0.32) và (+0.62, ±0.30) | như khu trục hạm | quay tự do, nòng ngắn sáu ống |
| **Giàn mồi nhử ×4** | trên hai thân, x −0.55 và −0.20 | mỗi giàn 0.22 × 0.12 | hộp phóng nhiều ống, đầu cam, nắp mở được (`decoy_N`) |
| Cột ăng-ten | trên cầu | cao 0.28 | 4 cột roi, đèn đỏ nhấp nháy |
| Lan can, bích, thang | quanh mép | cao 0.014 | như các tàu khác |

### 2.3 Cây node và điểm neo
```
escort
  hull_port  hull_stbd  deck  bridge  radome  lights
  ciws_1..4 (yaw/pitch, mỗi cái có muzzle)
  decoy_1..4 (nắp mở được, mỗi giàn có launch)
  dmg_cell0..3
  anchors: muzzle(=ciws_1.muzzle)  launch(=decoy_1.launch)  bow(+0.95,0.06,0)  stern(-0.92,0.06,0)  deck(0,0.07,0)
           cell_0 (-0.5,0.06,-0.5)  cell_1 (+0.5,0.06,-0.5)  cell_2 (-0.5,0.06,+0.5)  cell_3 (+0.5,0.06,+0.5)
           fire_0..3 (tại ô, y 0.07)
           intercept_cam (0,0.9,-1.4)  (điểm nhìn cinematic chặn đòn)
```
- Mô hình luôn đặt mũi hướng +X; khi đặt trên lưới không xoay.
- `dmg_cell0..3` ứng với bốn ô: mỗi ô trúng cháy phần tương ứng (thân trên/dưới, boong, cầu).
- Kỹ năng `guard`: CIWS xoay và bắn về hướng đạn tới, giàn mồi nhử bung nắp và phóng chaff; vòm radar sáng viền. Chi tiết: `cinematics.md` mục 9.2.

### 2.4 Vật liệu: khác gì khu trục hạm
Cùng bộ vật liệu bạc (`ship-destroyer.md` 2.4). Thêm `mat_radome` bóng hơn (roughness 0.2) cho vòm lớn; vạch hazard vàng–cam ở viền giàn mồi nhử; `mat_emissive_guard` (`#FFB347`, cường độ 0 → 1 trong 200 ms khi kích hoạt) cho vòm radar.

### 2.5 Mức chi tiết
| Mức | Dùng khi | Tam giác tối đa |
|---|---|---|
| LOD0 | Hangar, cinematic cận cảnh | 220 000 |
| LOD1 | Trận đấu | 32 000 |
| LOD2 | Xa | 7 000 |
Texture: 2 bộ 2048² + decal. Dung lượng glb nén ≤ 10 MB.

### 2.6 Nghiệm thu
Như `ship-destroyer.md` 2.10, thêm: footprint đúng 1.9 × 1.9, hai thân song song nối boong, vòm radar lớn, bốn CIWS và bốn giàn mồi nhử, bốn `cell_*` và bốn `fire_*`; nhận ra ngay là "tàu phòng thủ" ở góc chiến thuật; không có góc xoay.

## 3. Thể hiện kỹ năng "Hộ tống"
Chi tiết cảnh quay: `cinematics.md` mục 9.2. Tóm tắt: khi đòn địch tới, **CIWS bắn chặn đạn giữa không trung, giàn mồi nhử bung mảnh nhiễu, các ô bị triệt tiêu có tia sáng nổ giữa trời hoặc cột nước nhỏ** thay vì cú trúng thật. Ô bị chặn hiện marker `blocked` (`ui-art.md` mục 2.2). UI: hàng tàu trong danh sách có nhãn **NỘI TẠI**, biểu tượng khiên, và cho biết đòn tới có bị giảm không ("sẵn sàng chặn" / "nghỉ 1 đòn").
