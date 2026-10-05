# Tàu cắn lén (raider) — thiết kế hình ảnh

> **Trạng thái 3D:** model chi tiết ở mục 2 bên dưới **tạm hoãn**. Dùng bản khối cơ bản `ships-basic3d.md` (file `models/ship_raider.glb`). Sprite 2D, luật, điểm neo, cinematic trong file này vẫn hiệu lực.

Số liệu và luật: `ships.json` (id `raider`, 1×1, **không có đòn chủ động**, kỹ năng nội tại `sneak`) và `rules.md` mục 10.1. File này chỉ nói hình dạng và cách thể hiện.

Phần chung cho mọi tàu: `ship-destroyer.md` (hệ tọa độ 2.2, vật liệu 2.4, ánh sáng 2.5, hư hại 2.7, nghiệm thu 2.10, quy ước sprite 1.5).

| File đi kèm | Vai trò |
|---|---|
| `art/raider_2d.svg` | Sprite 2D 1×1, dùng thẳng được |

Ý đồ hình ảnh: **nhỏ, thấp, tối, nhanh**, thân góc cạnh tàng hình như xuồng đột kích. Nhìn từ xa là một vệt đen nhọn sát mặt nước, khác hẳn các tàu bạc to. Điểm đọc được: mũi nhọn như mũi dao, thượng tầng hình thoi vát, một khẩu pháo nhỏ lộ ra, vệt nước trắng sau đuôi.

---

## 1. Sprite 2D
- `viewBox="0 0 100 100"` = đúng 1 ô. Mũi hướng phải. Thân màu **xám xanh tối hơn** các tàu thường (gradient `#2B353F` → `#A7B4C0` → `#586673` → `#222B34`), nét viền và bóng đổ như quy ước chung. Vệt nước sau đuôi nét trắng cong. Khóa `manifest.ts`: `ui_ship_raider`.
- Bố cục từ mũi tới đuôi: pháo nhỏ nòng dài (68–85) → thượng tầng vát hình thoi có kính (33–56) → mảng boong vát có đường ghép → điểm nhấn cam nhỏ ở đuôi (17–26) → vệt nước.
- Chỉ chiếm một ô nên **không có xoay riêng**: đặt ngang thì dùng nguyên sprite, đặt dọc thì xoay 90° theo chiều kim đồng hồ như các tàu khác (tàu 1×1 vẫn có hướng mũi để animation đúng). Ô duy nhất có chỉ số 0.
- Dấu hiệu nhận ra ở ô nhỏ: hình mũi tên nhọn tối, một chấm tròn pháo ở mũi.
- Khi chìm: bộ lọc xám tối như các tàu khác (`ship-destroyer.md` 1.4).

## 2. Model 3D

### 2.1 Kích thước
- Dài **0.90** (z −0.45…+0.45), rộng tối đa **0.34** (phóng đại), mớn nước **0.035**, mạn khô 0.05. Tâm ô tại `z = 0`. Tỉ lệ ứng với xuồng đột kích dài khoảng 36 m (1 đơn vị ≈ 40 m, nhỏ hơn thang 80 m của các tàu to; chấp nhận vì vẫn đọc là "tàu nhỏ").
- Thân tàng hình **góc cạnh nhiều mặt phẳng**, mũi nhọn thấp, đuôi vát chéo, đường gập sắc. Tàu chạy nhanh: ở trạng thái đứng yên vẫn tạo bọt nhẹ sau đuôi.

### 2.2 Bộ phận
| Bộ phận | Vị trí (z) | Kích thước | Chi tiết bắt buộc |
|---|---|---|---|
| **Thân** | −0.45…+0.45 | rộng 0.34 | nhiều mặt phẳng, đường gập, vật liệu tàng hình mờ, đuôi vát |
| **Thượng tầng vát** | −0.10…+0.12 | rộng ±0.07, cao 0.11 | hình thoi nhìn từ trên, kính nghiêng, ăng-ten roi ×2, đèn hành trình |
| **Pháo nhỏ** | +0.22 | đế r 0.025, nòng 0.07 | vỏ tàng hình, nòng giảm giật, có nắp che khi nghỉ (hạ xuống khi bắn) |
| Cột radar nhỏ | −0.02 | cao 0.18 | đĩa radar nhỏ, quay (`radar_rotor`) |
| Ống phóng mồi nhử | hai bên đuôi | 0.03 | hai hộp nhỏ cam |
| Chân vịt ống bọc / vòi nước | đuôi | — | phun bọt trắng (hạt, không phải model) |
| Lan can, bích | quanh mép | — | tối giản, tàu thấp |

### 2.3 Cây node và điểm neo
```
raider
  hull  superstructure  radar_rotor  lights
  turret (yaw) -> barrel (pitch + recoil, nắp che) -> muzzle
  dmg_cell0
  anchors: muzzle  launch(=muzzle)  bow(0,0.05,+0.45)  stern(0,0.05,-0.45)  deck(0,0.05,0)
           cell_0 (0,0.05,0)  fire_0 (0,0.06,0)
           cam_close (0.35,0.12,0.25)  (camera cận cho cảnh bắn nhanh)
```
- Đây là tàu 1×1 nên chỉ có **một ô** (`cell_0`) và một nhóm hư hại `dmg_cell0`. Một ô trúng là chìm, nên hư hại và chìm gần như một.
- Kỹ năng `sneak` cần: pháo nhỏ quay nhanh tới hướng ô ngẫu nhiên, bắn, nòng thụt 0.008; tất cả trong ~250 ms. Tàu rung nhẹ khi bắn.

### 2.4 Vật liệu: khác gì khu trục hạm
Tối hơn: `mat_raider_hull` `#3C4A56`, metalness 0.55, roughness 0.5 (mờ, ít phản chiếu). Cạnh vát có viền sáng mảnh. Điểm nhấn cam `mat_rubber_orange`. Cùng kính, thép tối khác. Không dùng vân bạc xước như tàu to.

### 2.5 Mức chi tiết
| Mức | Dùng khi | Tam giác tối đa |
|---|---|---|
| LOD0 | Hangar, cinematic cận cảnh | 60 000 |
| LOD1 | Trận đấu | 10 000 |
| LOD2 | Xa | 3 000 |
Texture: 1 bộ 2048². Dung lượng glb nén ≤ 4 MB.

### 2.6 Nghiệm thu
Như `ship-destroyer.md` 2.10, thêm: tàu ngắn và nhọn, nhìn ngay khác các tàu bạc; pháo nhỏ quay và bắn được; có `cam_close`; mọi chi tiết đọc được ở góc chiến thuật dù tàu chỉ chiếm 1 ô.

## 3. Thể hiện kỹ năng "Cắn lén"
Chi tiết cảnh quay: `cinematics.md` mục 9.1. Tóm tắt: cú bắn rất ngắn (900 ms), camera cận tàu rồi cắt sang ô trúng; **đạn bay nhanh, vệt mảnh, ít tiếng**. UI: hàng tàu trong danh sách có nhãn **NỘI TẠI** (không bấm chọn được) và biểu tượng chu kỳ cho biết "lần bắn kế tiếp: lượt N".
