# Tàu sân bay (carrier) — thiết kế hình ảnh

> **Trạng thái 3D:** model chi tiết ở mục 2 bên dưới **tạm hoãn**. Dùng bản khối cơ bản `ships-basic3d.md` (file `models/ship_carrier.glb`). Sprite 2D, luật, điểm neo, cinematic trong file này vẫn hiệu lực.

Số liệu và luật: `ships.json` (id `carrier`, 5 ô, hồi chiêu 3, đòn `line3`) và `rules.md` mục 4.5. File này chỉ nói hình dạng và cách thể hiện.

Phần chung cho mọi tàu: xem `ship-destroyer.md` (hệ tọa độ 2.2, vật liệu 2.4, ánh sáng 2.5, hư hại 2.7, nghiệm thu 2.10, style sprite 1.5). File này chỉ ghi chỗ khác hoặc riêng.

| File đi kèm | Vai trò |
|---|---|
| `art/carrier_2d.svg` | Sprite 2D hoàn chỉnh, dùng thẳng được |

Ý đồ hình ảnh: **hòn đảo thép nổi**. Boong bay phẳng rộng chiếm gần hết chiều cao ô, một đảo chỉ huy nhỏ mọc lệch ở mạn phải, máy bay đậu rải rác. Tàu lớn nhất, nặng nhất, nhìn từ xa chỉ nhận ra qua hình chữ nhật dài với một khối nhô ra. Đây là tàu duy nhất tràn gần kín chiều cao ô.

---

## 1. Sprite 2D (cartoon)

- Nguồn: `art/carrier_2d.svg`. `viewBox="0 0 500 100"` = 5 ô. Mũi hướng phải. Cùng quy ước viền, bóng đổ, bảng màu bạc, nhưng **mặt boong bay xám tối hơn thân** (`#8794A0` → `#A5B0BA` → `#76828E`) để đọc ra "đường băng". Khóa `manifest.ts`: `ui_ship_carrier`.
- Boong bay chiếm y 13–90 trong ô cao 100. Cho phép, nhưng **không được chạm hay tràn sang ô kề**; chừa tối thiểu 3 đơn vị trên và dưới.
- Bố cục từ mũi tới đuôi: mũi tròn (494) → **hai ống phóng máy bay** (đường kép, vạch cam ở đầu) → thang máy bên mạn trái (352–388) → máy bay đậu → **đảo chỉ huy ở mạn phải** (= cạnh dưới màn hình) có kính, radar tròn, cột (288–344) → thang máy bên mạn phải (210–246) → đường hạ cánh chéo với vạch trắng và vàng → **dây hãm** (vạch ngắn ở đuôi) → đuôi cắt chéo (12–30). Đường tim đứt nét chạy suốt chiều dài. Máy bay đậu: 4 chiếc nhỏ trắng. Bốn CIWS ở bốn góc boong.
- Cách dùng trên lưới, trạng thái: giống `ship-destroyer.md` 1.4. Ô 0 ở đuôi, ô 4 ở mũi.
- Dấu hiệu nhận ra ở cỡ nhỏ: hình chữ nhật dài gần kín ô, vạch tim đứt và đường chéo, khối đảo trắng nhô ở cạnh dưới.

---

## 2. Model 3D

### 2.1 Kích thước
- Thân dài **4.90** (z −2.45…+2.45), rộng thân **0.62**; **boong bay dài 4.80 và rộng 0.80** (nhô ra hai bên 0.09 qua sàn đỡ). Mớn nước **0.08**, boong cao **y = 0.125** trên mặt nước (cao hơn các tàu khác, tàu này "đứng cao").
- Tâm năm ô tại `z = −2, −1, 0, +1, +2` (ô 0 đuôi, ô 4 mũi).
- Đảo chỉ huy ở **mạn phải (−X)**, đường hạ cánh chéo về mạn trái (+X).

### 2.2 Bộ phận
| Bộ phận | Vị trí | Kích thước chính | Chi tiết bắt buộc |
|---|---|---|---|
| **Thân** | z ±2.45 | rộng 0.62 | mũi bầu, sườn loe lên đỡ boong, các lỗ thoát nước, thang mạn |
| **Boong bay** | z −2.40…+2.40 | rộng 0.80, y 0.125 | mặt nhám chống trượt (normal map), mép boong có lan can gập và đèn viền, **decal vạch** (xem 2.4) |
| **Đường hạ cánh chéo** | z −2.35…−0.65, lệch sang +X | rộng 0.14 | vạch trắng và vàng, dây hãm ×4 ngang boong (z −1.55…−1.25) |
| **Ống phóng ×2** | x ±0.12, z +1.30…+2.28 | đường ray 0.98 | rãnh ray lõm, tấm chắn luồng khí (jet blast deflector) dựng lên ở đầu ray, hiện được (`jbd_0/1`) |
| **Đảo chỉ huy** | z +0.38…+0.94, x −0.16…−0.38 | dài 0.56, rộng 0.22, cao tới 0.30 | nhiều tầng, kính chỉ huy quanh, **tấm radar mảng pha** ×4, mặt tàng hình nghiêng, đài kiểm soát bay, cột radar tới y 0.48 |
| Cột radar | trên đảo | đỉnh y 0.48 | radar tìm kiếm quay (`radar_rotor`), ăng-ten, đèn báo đỏ |
| **Thang máy máy bay ×2** | (x +0.16…+0.30, z +1.02…+1.38), (x −0.18…−0.32, z −0.40…−0.04) | 0.14 × 0.36 | khe thang trên mép boong, đèn viền, đánh dấu cảnh báo vàng |
| **Máy bay đậu ×4** | `plane_slot_0..3` | xem 2.3 | model `fx_plane` dùng lại, cánh gập nếu có |
| CIWS ×4 | (+0.28,−1.80), (+0.24,+2.10), (−0.34,−1.74), (−0.30,+1.90) | như khu trục hạm | trên sàn đỡ nhô ra |
| Xe kéo, thiết bị boong | rải trên boong | — | xe cam nhỏ, thùng, đầu dây, cho cảm giác "đang vận hành" |
| Xuồng cứu sinh, neo | mạn trái, mũi | — | vài xuồng cam |

### 2.3 Cây node và điểm neo
```
carrier
  hull  flight_deck  island  radar_rotor  ciws_1..4_*  lights
  jbd_0  jbd_1                          (tấm chắn luồng khí, hạ/dựng)
  plane_0..3                            (máy bay đậu, ẩn hiện được)
  dmg_cell0..4
  anchors: muzzle(=cat_start_0) launch(=cat_start_0) bow(0,0.125,+2.45) stern(0,0.125,-2.45) deck(0,0.125,0)
           cell_0 (0,0.125,-2) cell_1 (0,0.125,-1) cell_2 (0,0.125,0) cell_3 (0,0.125,+1) cell_4 (0,0.125,+2)
           fire_0..4 (0,0.13,z của ô)
           plane_slot_0 (+0.16,0.125,-1.10)  plane_slot_1 (+0.20,0.125,-0.82)
           plane_slot_2 (+0.20,0.125,+0.50)  plane_slot_3 (-0.10,0.125,+0.80)
           cat_start_0 (+0.12,0.125,+1.30)  cat_start_1 (-0.12,0.125,+1.30)
           cat_end_0   (+0.12,0.125,+2.28)  cat_end_1   (-0.12,0.125,+2.28)
           takeoff_end (0,0.125,+2.45)
```
- `muzzle` và `launch` đều là bí danh của `cat_start_0` (tàu sân bay không có pháo).
- Đòn `line3`: máy bay cất cánh rồi bay qua dải mục tiêu (`animations.md` 4.5). Gợi ý: hai máy bay đầu từ `plane_0`, `plane_1` được đưa tới `cat_start_0/1`, chạy hết ray tới `cat_end_*` rồi bay lên; máy bay thứ ba và thứ tư (`plane_2`, `plane_3`) cất cánh trên boong, cách nhau 450 ms (không qua ray); mỗi chiếc rải một quả lên một ô của dải 4 ô. Khi máy bay bay đi: ẩn `plane_N` đã bay. Máy bay không quay lại trong cinematic.
- `dmg_cell0` = đuôi (đường hạ cánh, thang máy sau) … `dmg_cell4` = mũi (ống phóng). Khi bị trúng: lửa trên boong, máy bay đậu cháy, tấm boong thủng.
- Tàu sân bay chìm chậm, nghiêng sang một mạn nhiều hơn các tàu khác (thời lượng 1800 ms vẫn giữ, chỉ nghiêng mạnh hơn).

### 2.4 Vật liệu và decal: khác gì khu trục hạm
| Vật liệu | Màu | metalness | roughness | Ghi chú |
|---|---|---|---|---|
| `mat_flightdeck` | `#6F7A84` | 0.35 | 0.85 | boong bay, nhám chống trượt, ít phản chiếu, vết dầu và vết lốp |
| `mat_hull_silver` | như khu trục hạm | | | sườn thân và đảo |
| `mat_hazard` | vàng–cam | 0 | 0.6 | viền thang máy và đầu ray |
Decal boong (một tấm 2048 × 512, xếp theo chiều dài boong): vạch tim đứt trắng, đường hạ cánh chéo trắng và vàng, vạch mép vàng, ống phóng, dây hãm, số hiệu hư cấu, vạch đỗ máy bay. Không dùng chữ hay huy hiệu của hải quân thật.

### 2.5 Mức chi tiết
| Mức | Dùng khi | Tam giác tối đa |
|---|---|---|
| LOD0 | Hangar, cinematic cận cảnh | 350 000 |
| LOD1 | Trận đấu | 50 000 |
| LOD2 | Xa | 10 000 |
Texture: 2 bộ 2048² + decal boong. Dung lượng glb nén ≤ 16 MB.

### 2.6 Nghiệm thu
Như `ship-destroyer.md` 2.10, thêm: boong dài gần đúng 4.8 và rộng 0.8; đảo ở mạn phải (−X); hai thang máy, hai ống phóng, đường hạ cánh đúng vị trí; bốn `plane_*` hiện và ẩn được; mười neo cat/plane/takeoff có mặt; năm `cell_*` và năm `fire_*`; nhận ra ngay là tàu sân bay ở góc chiến thuật.
