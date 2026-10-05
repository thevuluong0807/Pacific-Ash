# Tuần dương (cruiser) — thiết kế hình ảnh

> **Trạng thái 3D:** model chi tiết ở mục 2 bên dưới **tạm hoãn**. Dùng bản khối cơ bản `ships-basic3d.md` (file `models/ship_cruiser.glb`). Sprite 2D, luật, điểm neo, cinematic trong file này vẫn hiệu lực.

Số liệu và luật: `ships.json` (id `cruiser`, 3 ô, hồi chiêu 1, đòn `precision`) và `rules.md` mục 4.2. File này chỉ nói hình dạng và cách thể hiện.

Phần **chung cho mọi tàu** nằm ở `ship-destroyer.md`: hệ tọa độ và tỉ lệ (2.2), vật liệu PBR (2.4), ánh sáng và đổ bóng (2.5), cách đặt `hits[]` lên ô, trạng thái hư hại (2.7), cách tạo model và nghiệm thu (2.9, 2.10), quy ước style sprite (1.5). File này chỉ ghi chỗ **khác** hoặc **riêng**.

| File đi kèm | Vai trò |
|---|---|
| `art/cruiser_2d.svg` | Sprite 2D hoàn chỉnh, dùng thẳng được |

Ý đồ hình ảnh: tàu nặng nhất trong ba tàu nổi cỡ trung. Đọc từ xa qua **hai tháp pháo nòng đôi to dồn ở mũi** và **một ống khói to**.

---

## 1. Sprite 2D (cartoon)

- Nguồn: `art/cruiser_2d.svg`. `viewBox="0 0 300 100"` = 3 ô. Mũi hướng phải (+x). Cùng quy ước viền, bảng màu, bóng đổ với khu trục hạm (`ship-destroyer.md` 1.1–1.2, 1.5). Khóa `manifest.ts`: `ui_ship_cruiser`.
- Bố cục từ mũi tới đuôi (x trong viewBox): mũi nhọn (295) → neo (284) → **tháp pháo 1** nòng đôi (252) → **tháp pháo 2** (216, bắn vượt qua tháp 1) → cầu chỉ huy cao có đổ bóng, kính chỉ huy, radar (164–198) → nhà boong giữa với **ống khói to**, hai xuồng cam hai bên (116–154) → **tháp pháo 3** (94) → nhà chứa trực thăng + CIWS (44–70) → sàn bay hình chữ H (15–45).
- Cách dùng trên lưới, trạng thái (sunk, hit): giống `ship-destroyer.md` 1.4. Ô chỉ số 0 ở đuôi, ô 2 ở mũi; xoay 90° theo chiều kim đồng hồ khi đặt dọc.
- Dấu hiệu nhận ra ở cỡ nhỏ: hai vòng tháp pháo to sát nhau ở mũi, khối cầu chỉ huy trắng lớn, hai nòng đôi dài.

---

## 2. Model 3D

### 2.1 Kích thước
- Dài **2.90** (z −1.45…+1.45), rộng tối đa **0.40**, mớn nước **0.05**, mạn khô 0.085 mũi / 0.055 giữa / 0.060 đuôi. Tâm ba ô tại `z = −1, 0, +1` (ô 0 đuôi, ô 2 mũi). Tỉ lệ phóng đại như khu trục hạm.
- Hình dáng thân và vật liệu: như khu trục hạm (thân tàng hình có đường gập), kéo dài ra.

### 2.2 Bộ phận (từ mũi tới đuôi)
| Bộ phận | Vị trí (z) | Kích thước chính | Chi tiết bắt buộc |
|---|---|---|---|
| Neo, tời | +1.18…+1.28 | — | lỗ neo, tời, xích, bích |
| **Tháp pháo 1** | +1.00 | đế r 0.048, nòng đôi dài 0.14, đường kính 0.009 | vỏ tháp lớn nhiều mặt phẳng, hai nòng có miệng giảm giật, nắp che nòng, khe xoay |
| **Tháp pháo 2** (bắn vượt) | +0.74 | giống 1, đế nâng lên 0.03 | trên bệ cao, chồng hình lên tháp 1 khi nhìn từ phía sau |
| **Cầu chỉ huy** | +0.40…+0.12 | rộng ±0.11, cao tới 0.17 | 2 tầng + buồng lái nghiêng, dải kính, 4 tấm radar mảng pha, cánh cầu, cửa kín nước |
| **Cột radar** | +0.28 | đỉnh y 0.42 | radar tìm kiếm quay (`radar_rotor`), thiết bị quang điện, ăng-ten roi ×8, đèn đỉnh |
| CIWS ×2 | +0.20 (nóc nhà boong), −0.65 (nóc nhà chứa) | như khu trục hạm | vòm radar, đế xoay |
| **Nhà boong giữa** | +0.12…−0.20 | rộng ±0.09, cao 0.10 | khoang xuồng cứu sinh ×2 (xuồng cam), hộp bè cứu sinh ×8, ống phóng ngư lôi ×2 |
| **Ống khói to** | −0.04 | miệng 0.07 × 0.12, cao tới 0.17 | một ống rộng, nghiêng nhẹ về sau, lưới ống xả, vệt cháy đen, `exhaust_1` |
| **Tháp pháo 3** | −0.42 | giống 1 | nòng đôi |
| Nhà chứa trực thăng | −0.62…−0.92 | rộng ±0.12, cao 0.105 | cửa cuốn, vạch phân đôi |
| **Sàn bay** | −0.92…−1.42 | rộng ±0.13 | vòng tròn và H, lưới đáp, đèn viền, lưới chắn mép |
| Lan can, đồ phụ | quanh mép boong | cao 0.014 | như khu trục hạm |

### 2.3 Cây node và điểm neo
```
cruiser
  hull  superstructure  radar_rotor  ciws_1_*  ciws_2_*  exhaust_1  lights
  turret_1 (yaw) -> barrel_1L, barrel_1R (pitch + recoil) -> muzzle_1L, muzzle_1R
  turret_2 ... muzzle_2L, muzzle_2R      turret_3 ... muzzle_3L, muzzle_3R
  dmg_cell0  dmg_cell1  dmg_cell2
  anchors: muzzle(=muzzle_1R) launch(=tâm sàn bay) bow(0,0.06,+1.45) stern(0,0.06,-1.45) deck(0,0.05,0)
           cell_0 (0,0.05,-1)  cell_1 (0,0.05,0)  cell_2 (0,0.05,+1)
           fire_0..2 (0,0.06,z của ô)   cam_gun (điểm đặt camera sau tháp pháo 1, y 0.10, z +0.70)
```
- Đòn `precision` bắn **một** phát: đạn xuất phát từ `muzzle` (nòng phải tháp 1). Hai tháp còn lại chỉ xoay theo cho đẹp, không bắn. Nòng thụt lùi 0.02 trong ~300 ms (`animations.md` 4.2 yêu cầu lực giật mạnh hơn khu trục hạm).
- Tháp pháo ngẩng nòng lên tới 35° khi bắn đạn cung cao.
- `dmg_cell0` = đuôi (nhà chứa, sàn bay), `dmg_cell1` = giữa tàu (ống khói, nhà boong), `dmg_cell2` = mũi (tháp pháo, cầu một phần).

### 2.4 Vật liệu: khác gì khu trục hạm
Dùng cùng bộ vật liệu (`ship-destroyer.md` 2.4). Khác: nòng pháo dùng `mat_dark_steel` dày hơn, miệng nòng có vệt cháy đen; ống khói to có vệt muội rõ hơn. Không thêm vật liệu mới.

### 2.5 Mức chi tiết
| Mức | Dùng khi | Tam giác tối đa |
|---|---|---|
| LOD0 | Hangar, cinematic cận cảnh | 200 000 |
| LOD1 | Trận đấu | 30 000 |
| LOD2 | Xa | 7 000 |
Texture: 2 bộ 2048² như khu trục hạm. Dung lượng glb nén ≤ 10 MB.

### 2.6 Nghiệm thu
Như `ship-destroyer.md` 2.10, thêm: ba tháp pháo đúng vị trí, nòng đôi, tháp 2 cao hơn tháp 1; ống khói to là một ống duy nhất; có ba điểm `cell_*` và ba `fire_*`.
