# Model 3D chế độ "Hải chiến" (arena)

Chế độ 2 (`src/arena/`, `arenaShips.ts`) đang dùng khối placeholder. Bộ model này thay thế: **3 thân tàu, 8 khí tài, 5 loại đạn**. Số liệu lấy từ `src/arena/data.ts` (không sửa); nếu `data.ts` đổi (kích thước thân, vị trí khe, chiều dài nòng) thì sửa các hằng đầu `design/models/_src/make_arena.mjs` rồi chạy lại.

Nguồn: `design/models/_src/make_arena.mjs` (chạy `node make_arena.mjs`, ra `design/models/arena/`). Xem trước: `_src/preview_arena.html` (tham số `?only=small|medium|large|weap`, `az`, `el`), ảnh `models/arena/preview_hulls.png`, `preview_weapons.png`.

## 1. Quy ước chung
- **Đơn vị = đơn vị thế giới của arena (1 ≈ 1 m). Không nhân WORLD_SCALE** (khác 8 tàu của chế độ lưới). Mũi +Z, mặt nước y = 0, gốc giữa thân. Mã chỉ cần đặt `root` tại vị trí tàu, không scale.
- Mỗi file glb có nút gốc cùng tên file. Tên node là hợp đồng với mã.
- **Màu đội**: chỉ vật liệu `team` (sọc mạn, dải ống khói, cờ, mâm khe trống, vạch trên tháp pháo/ống phóng). Mã đổi `color` và `emissive` của vật liệu này cho từng đội (clone vật liệu mỗi tàu). Vật liệu khác dùng chung.
- Phong cách: lăng trụ có mũi nhọn như `hullGeometry` cũ nhưng thân loft mượt, đủ cầu, cột radar, ống khói. Không chi tiết nhỏ hơn 0.3 đơn vị (camera ngôi thứ ba cách 150–380).

## 2. Thân tàu: `arena_hull_small|medium|large.glb`
| Thân | Dài × rộng | Mạn khô / mớn | Tháp cầu | Tam giác | Ống khói |
|---|---|---|---|---|---|
| small | 90 × 20 | 7 / 3 | 8 | ~3.4k | 1, giữa tim |
| medium | 160 × 30 | 11 / 5 | 14 | ~3.9k | 2, đặt cạnh mạn (x ±6) |
| large | 260 × 42 | 16 / 8 | 24 | ~4.2k | 2, đặt cạnh mạn (x ±8.4) |

Ống khói luôn nằm lệch mạn (trừ small) để chừa tim tàu cho các khe nòng có cung bắn 360°.

Node và neo:
```
arena_hull_<id>
  hull_under hull deck team_stripe rails bridge bridge_top bridge_win bridge_wing
  funnel_N funnel_band_N funnel_grill_N     mast mast_cross
  radar_rotor (xoay quanh Y, mã quay đều)   flag (cờ, vật liệu team)
  windlass anchor_l anchor_r hatches prop_* rudder
  barbette_N (bệ nâng cho khe cao hơn boong: large "Mũi 2")
  slot_ring_N  slot_pad_N (mâm khe trống, ẩn khi có khí tài)
  slot_N        tâm đế khí tài = (slot.x, slot.y − 1.5, slot.z), trùng yaw.position của mã
  bow stern deck  bow_wave (sóng mũi) wake_l wake_r (vệt đuôi)  smoke_0..1 (khói ống khói)
  dmg_0 (mũi) dmg_1 (cầu) dmg_2 (đuôi)      điểm khói/cháy khi hỏng
  cam_top (camera sau khi bị hạ)
```
Khe "Đỉnh" nằm trên mái cầu (phẳng, `bridge_top`); cột radar đặt **sau** mái, không che khe.

## 3. Khí tài: `arena_weapon_<id>.glb`
Gốc = **đế khí tài trên bệ** (đặt tại `slot_N`). Cây node:
```
arena_weapon_<id>
  base (vòng đế, đứng yên)
  yaw   (xoay ngang quanh Y; chứa thân tháp)
    pitch (đặt tại (0,1.5,0): trục ngẩng, quay quanh X; giá trị ngẩng lên = xoay −X)
      barrel_N / barrel_L,R (nòng, giật lùi bằng dịch −Z ~0.02·chiều dài trong 300 ms)
      muzzle   = (0,0,barrel) trong hệ pitch, khớp `WEAPONS[id].barrel` của sim
      muzzle_L/R (hai nòng) | muzzle_0/1 (2 ống, 2 ray) | muzzle_0..5 (rocket)
```
Nâng khoảng 1.5 so với bệ để `muzzle` của sim (slot.y + sin(el)·barrel) khớp mô hình. Chớp nòng/khói đặt tại `muzzle`.

| id | Cỡ | Hình dạng | Điểm nhận dạng |
|---|---|---|---|
| heavy | 3 | tháp lớn nhiều mặt phẳng, **2 nòng dài 22**, miệng giảm giật | to nhất, vạch team trên tháp |
| cannon | 2 | như heavy nhỏ hơn, nòng 16 | |
| howitzer | 2 | tháp thấp, **1 nòng ngắn mập 8** có ống giật | nòng dày |
| torpedo | 2 | 2 ống phóng song song trên giá, đầu ngư lôi cam lộ ra | không có `pitch` thật (chỉ xoay ngang) |
| missile | 2 | giá ray, 2 hộp phóng, đầu tên lửa trắng lộ | đầu trắng, vạch cam |
| rocket | 1 | hộp 2×3 ống tròn, mõm 6 lỗ | `muzzle_0..5` cho loạt 6 quả |
| autocannon | 1 | tháp nhỏ có khiên, 1 nòng mảnh, trống đạn đồng | |
| mg | 1 | bệ xoay, súng, khiên nhỏ, hộp đạn vàng | nhỏ nhất |

Tam giác 240–570 mỗi cái.

## 4. Đạn: `arena_proj_<kind>.glb`
`shell` (pháo, đồng + vạch team), `bullet` (vạch sáng 3.4, dùng cho autocannon/mg), `torpedo` (cam, vạch team, chân vịt), `missile` (thân trắng, cánh), `rocket` (xám nhỏ, cánh đuôi). Hướng bay +Z. Node `tail` = chỗ phát vệt khói/lửa. Vật liệu `glow` (emissive) cho đầu đạn và ngọn lửa, nhân hệ số `glare`. Kích thước đã tính cho khoảng cách xem 150–400 (đạn to hơn thật).

## 5. Nghiệm thu
- Mỗi thân có đủ `slot_0..N−1` đúng số khe trong `HULLS` và đúng tọa độ.
- Gắn từng khí tài vào từng `slot_N` bằng ảnh xem trước: không đè lên cầu, ống khói, cột.
- Nòng ở `elevation 0` hướng +Z, `muzzle` đúng đầu nòng, ngẩng quanh `pitch` không xuyên thân.
- Dòng đổi màu đội chỉ ảnh hưởng vật liệu `team`.

## 6. Chưa làm
- Xác tàu (chế độ này chìm bằng mã, chưa có model `wreck_arena_*`).
- Hiệu ứng nước (sóng mũi, vệt) là hạt do mã; model chỉ có neo.
- Texture/normal map; vật liệu đang màu phẳng + metalness.
