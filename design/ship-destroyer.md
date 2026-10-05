# Khu trục hạm (destroyer) — thiết kế hình ảnh

> **Trạng thái 3D:** model chi tiết ở mục 2 bên dưới **tạm hoãn**. Dùng bản khối cơ bản `ships-basic3d.md` (file `models/ship_destroyer.glb`). Sprite 2D, luật, điểm neo, cinematic trong file này vẫn hiệu lực.

Một file cho hai sản phẩm: **sprite 2D cartoon** đặt trên lưới, và **model 3D cực chi tiết, màu bạc, kim loại, có đổ bóng** cho Hangar, cinematic và nền.

Luật chơi và số liệu tàu không nằm ở đây: `ships.json` (id `destroyer`, 2 ô, hồi chiêu 0, đòn `rapid`) và `rules.md` mục 4.1. File này chỉ nói hình dạng và cách thể hiện.

| File đi kèm | Vai trò |
|---|---|
| `art/destroyer_2d.svg` | Sprite 2D hoàn chỉnh, dùng thẳng được. Nguồn sự thật cho 2D. |
| `art/destroyer_blueprint.svg` | Bản vẽ trực giao (bên + trên) có nhãn A–J. Nguồn sự thật cho vị trí và tỉ lệ 3D. |

Thứ tự thiết kế: 2D trước (mục 1), 3D sau (mục 2). Các loại tàu còn lại làm theo cùng quy ước (mục 1.5).

---

## 1. Sprite 2D (cartoon)

### 1.1 Thông số
- Góc nhìn: từ trên xuống, ngang, **mũi hướng phải (+x)**.
- `viewBox="0 0 200 100"`: đúng 2 ô lưới (mỗi ô 100x100). Thân tàu chiếm x 14..195, y 26..74; chừa viền để không chạm ô bên cạnh.
- Cách vẽ: nét viền đậm, tô gradient bạc, vài vệt sáng trắng, bóng đổ phẳng lệch xuống phải. Không chi tiết nhỏ hơn 3 đơn vị.
- Đọc được ở cỡ ô nhỏ nhất (`grid.cellMin` = 2rem, sprite rộng 4rem): hình khối chính phải nhận ra được, kể cả khi chữ H trên sàn bay mờ đi.

### 1.2 Bảng màu
| Phần | Màu |
|---|---|
| Viền | `#0B1117` (nét 3 thân, 2.2–2.4 khối lớn, 1.2–1.8 chi tiết) |
| Thân (gradient dọc) | `#7F8C98` → `#E9EFF4` (28%) → `#B4BFC9` (55%) → `#6B7885` |
| Boong | `#AEB9C3` → `#D5DDE4` → `#97A3AE`, viền `#4E5A66` |
| Khối nhà (cầu, nhà chứa) | `#F3F6F9` → `#B9C4CE` |
| Ống khói, kính | `#39434D`, `#142431` |
| Sàn bay | `#8E99A4`, vạch `#F4F7FA` |
| Điểm nhấn (xuồng cứu sinh) | `#E08A2E` |
| Bóng đổ nước | đen, độ mờ 32% |

Màu không lấy từ `tokens.json` vì đây là hình minh họa, nhưng tông phải hợp: lạnh, bạc, tối ở nền. Không đổi viền sang màu khác.

### 1.3 Bố cục từ mũi tới đuôi (x trong viewBox)
Mũi nhọn (195) → neo (183) → tháp pháo trước (166) → ô VLS (141–155) → cầu chỉ huy cao có đổ bóng nhỏ, cột radar tròn (106–133) → nhà boong giữa với hai ống khói và hai xuồng cam hai bên (78–106) → tháp pháo sau (68) → nhà chứa trực thăng có CIWS (40–62) → sàn bay hình chữ H trong vòng tròn (15–41), đuôi phẳng bo góc.

### 1.4 Cách dùng trên lưới
- Ô đầu (`origin`) là ô trái hoặc trên cùng. **Ô chỉ số 0 ở đuôi, ô chỉ số 1 ở mũi.** Mũi luôn hướng về phía ô có chỉ số cao.
- Ngang: dùng nguyên sprite. Dọc: xoay **90° theo chiều kim đồng hồ** quanh tâm vùng 2 ô (mũi hướng xuống).
- Kích thước hiển thị: rộng = 2 ô, cao = 1 ô, `preserveAspectRatio="xMidYMid meet"`.
- Lưới của mình: luôn thấy sprite. Lưới địch: chỉ thấy khi tàu **chìm** (lộ loại tàu); không có sprite cho ô chưa chìm.
- Trạng thái: sprite không đổi hình. Ô trúng hiện marker theo `screens.md` mục 7.4 phủ lên sprite. **Tàu chìm**: hiện lại sprite với `filter: grayscale(.85) brightness(.55)` **cộng dấu X trên mỗi ô** của tàu (marker `sunk` trong `markers.svg`); không cần bản vẽ riêng. Chi tiết và mẫu cho cả 7 tàu: `sinking.md` mục 1 và `art/sunk_states.svg`.
- Xuất: giữ SVG làm nguồn; nếu cần dự phòng thì xuất PNG 400x200 (@2x) tên `destroyer_2d.png`. Khóa trong `manifest.ts`: `ui_ship_destroyer`.

### 1.5 Quy ước style cho cả 5 tàu (để bộ sprite đồng nhất)
- Cùng `viewBox`: rộng `100 × số ô`, cao 100. Mũi hướng phải. Beam khoảng 44–48 đơn vị.
- Cùng bảng màu bạc/xám ở 1.2, cùng độ dày viền, cùng bóng đổ lệch (+4, +5), cùng vệt sáng trắng dọc mép thân phía trên.
- Phân biệt tàu bằng **hình dáng và vật nặng**, không bằng màu: pháo (khu trục), pháo lớn (tuần dương), thân thấp + tháp chỉ huy (tàu ngầm), dãy ô phóng (tàu tên lửa), boong phẳng + đảo (sân bay).
- Một điểm nhấn cam nhỏ mỗi tàu (xuồng, đèn, biển báo) để nối với tông lửa của game.

---

## 2. Model 3D (cực chi tiết, bạc kim loại)

### 2.1 Ý đồ hình ảnh
Một khu trục hạm hiện đại thế hệ tàng hình: thân và nhà boong có mặt phẳng nghiêng, ít góc vuông. Toàn thân bạc kim loại xước, phản chiếu lửa cam và ánh radar xanh lạnh của cảnh đêm mưa. Nặng, dày, có trọng lượng. Không sao chép một lớp tàu cụ thể nào; số hiệu và huy hiệu là hư cấu.

### 2.2 Hệ tọa độ và tỉ lệ
- Một đơn vị thế giới = một ô lưới. Gốc ở giữa chiều dài thân, trên mặt nước (y = 0). **Mũi +Z**, lên +Y. Nhìn từ đuôi về mũi, mạn phải (starboard) là −X, mạn trái (port) là +X.
- Dài **1.90** (z từ −0.95 đến +0.95), rộng tối đa **0.38**, mớn nước **0.045** (đáy y = −0.045), mạn khô 0.075 ở mũi, 0.05 giữa tàu, 0.055 ở đuôi.
- Ứng với tàu thật khoảng 155 m (1 đơn vị ≈ 80 m). Bề ngang và chiều cao đã **phóng đại khoảng 1.5 lần** để đọc rõ ở góc nhìn chiến thuật. Giữ nguyên tỉ lệ này, không chỉnh lại cho đúng thật.
- Hai ô của tàu có tâm tại `z = −0.5` (ô 0, đuôi) và `z = +0.5` (ô 1, mũi). Tàu chừa 0.05 mỗi đầu so với biên hai ô.

### 2.3 Bộ phận (khớp nhãn A–J trên bản vẽ)
Mọi kích thước tính theo đơn vị thế giới. Chi tiết nhỏ hơn 0.005 làm bằng normal map, không dựng hình học.

| Nhãn | Bộ phận | Vị trí (z) | Kích thước chính | Chi tiết bắt buộc |
|---|---|---|---|---|
| — | **Thân** | −0.95…+0.95 | rộng 0.38 tại z −0.55…+0.30; mũi nhọn có độ loe | mũi nghiêng ra trước, bầu mũi dưới nước, đường gập (knuckle) dọc thân, đuôi phẳng (transom), 2 chân vịt + 2 bánh lái dưới nước, vạch mớn nước, đường viền vạch nước sơn tối, số hiệu và chữ hư cấu |
| A | **Tháp pháo trước** | +0.66 | đế r 0.04, cao 0.035; nòng dài 0.065, đường kính 0.006 | vỏ tháp tàng hình có mặt phẳng, vòng đế, cửa đạn, nòng có miệng giảm giật, khe hở xoay |
| B | **Ô phóng VLS trước** | +0.40…+0.52 | 0.12 × 0.08, nhô 0.006 | 32 nắp (8 dọc × 4 ngang), bản lề và ống xả khói, vành viền |
| C | **Cột tích hợp** | +0.12 | từ y 0.135 đến 0.33 | cột hình khối đa giác, radar tìm kiếm quay (`radar_rotor`) ở y ≈ 0.30, thiết bị quang điện trên đỉnh, 6 cột ăng-ten roi, đèn báo trên đỉnh |
| D | **Cầu chỉ huy** | +0.30…+0.02 tầng 1, +0.26…+0.10 tầng cầu | rộng ±0.10 tầng 1, ±0.085 tầng cầu; cao 0.10 và 0.135 | mặt nghiêng vào trong ~10°, dải kính chỉ huy nghiêng về phía trước (8 ô), cánh cầu nhỏ, 4 tấm radar mảng pha (mỗi tấm 0.045 × 0.045, nghiêng ~20°) hai bên, cửa kín nước, thang ngoài |
| E | **Ống khói ×2** | −0.04 và −0.20 | cao tới 0.15, miệng 0.04 | nghiêng về phía sau, lưới ống xả, vệt đen cháy, điểm phát hơi nóng (`exhaust_1/2`) |
| — | **Nhà boong giữa** | +0.02…−0.28 | rộng ±0.08, cao 0.095 | 2 khoang xuồng cứu sinh (mỗi bên 1, có xuồng cam và cần cẩu nhỏ), 6 hộp bè cứu sinh, cửa kín nước, đường ống, ống phóng ngư lôi ba nòng ×2 ở z ≈ −0.33 hai bên |
| F | **Tháp pháo sau** | −0.40 | giống A | dùng chung asset với A |
| G | **CIWS ×2** | −0.30 (nóc nhà boong, y 0.095) và −0.52 (nóc nhà chứa, y 0.105) | vòm radar r 0.009, thân súng 6 nòng | vòm trắng xám, đế xoay, nòng quay (`ciws_*`) |
| H | **Nhà chứa trực thăng ×2** | −0.46…−0.70 | rộng ±0.12, cao 0.105 | hai nhà chứa cạnh nhau, vạch phân đôi giữa, cửa cuốn có gân, đèn, ống thông gió |
| I | **Sàn bay** | −0.70…−0.95 | rộng ±0.13, ngang boong (y 0.055) | vòng tròn r 0.065 và chữ H, lưới vạch đáp, đèn viền sàn, lưới chắn mép, móc kéo, bích |
| J | **Neo và tời** | +0.74…+0.82 | — | lỗ neo ở mũi, tời neo, xích, bích buộc dây, bệ cờ |
| — | **Lan can, đồ phụ** | quanh mép boong | cao 0.014 | lan can dây (hình học mảnh hoặc alpha), thang, nắp hầm, đường dây, bích buộc, ống thông gió, thùng, vạch kẻ boong |

Cảm giác phải có: khối nhà boong nằm lệch về phía mũi, mặt boong dài ở phía đuôi; hai tháp pháo, hai ống khói, hai CIWS tạo nhịp đối xứng quanh trục giữa.

### 2.4 Vật liệu (PBR)
Kim loại bạc **bắt buộc có môi trường để phản chiếu** (xem 2.5). Không có envMap bề mặt sẽ ra màu đen.

| Vật liệu | Màu | metalness | roughness | Ghi chú |
|---|---|---|---|---|
| `mat_hull_silver` | `#C4CDD6` | 0.92 | 0.28 | xước theo chiều dài thân (anisotropy 0.5, hướng dọc Z), clearcoat 0.25, clearcoat roughness 0.35 |
| `mat_hull_under` | `#2C353D` | 0.75 | 0.55 | phần dưới mớn nước |
| `mat_boottop` | `#262E35` | 0.6 | 0.5 | vạch nước, sơn tối |
| `mat_deck` | `#8A949C` | 0.55 | 0.75 | normal map chống trượt, ít phản chiếu |
| `mat_structure` | `#B9C4CE` | 0.85 | 0.34 | nhà boong, nhà chứa; xước nhẹ, vệt nước mưa |
| `mat_dark_steel` | `#3A444E` | 0.8 | 0.5 | ống khói, bệ, nòng pháo, bản lề |
| `mat_glass` | `#0C1E2A` | 0.1 | 0.05 | kính cầu; ban đêm phát sáng hổ phách yếu (emissive `#FFB347`, cường độ 0.25) |
| `mat_rubber_orange` | `#E08A2E` | 0.0 | 0.6 | xuồng cứu sinh, phao |
| `mat_radome` | `#E9EEF2` | 0.0 | 0.35 | vòm CIWS |
| `mat_light_*` | đỏ `#FF3030`, xanh lục `#30FF70`, trắng `#FFFFFF` | — | — | đèn hành trình, tự phát sáng |

Texture: 2 bộ 2048² (thân + boong; nhà boong + chi tiết), mỗi bộ gồm `basecolor`, `normal`, `ORM` (occlusion–roughness–metalness), `emissive` nếu cần. Một bộ decal nhỏ (số hiệu, vạch, cảnh báo). Occlusion bake sẵn trong ORM. Chi tiết mòn: viền sáng ở cạnh, vệt muối, vệt mưa chảy dọc mặt đứng; không rỉ sét nặng (tàu còn mới, màu bạc giữ được).

### 2.5 Ánh sáng và đổ bóng
- Môi trường: một HDRI/cube map đêm cảng 1K–2K (`tex_env_night_harbor`): trời tối, vệt cam của đám cháy phía xa, vài điểm sáng xanh lạnh. Dùng làm `scene.environment` (PMREM). Cường độ phản chiếu tàu ~1.2–1.5.
- Đèn chính: một `DirectionalLight` lạnh (xanh xám `#9FB8CC`, cường độ vừa) chếch từ phía sau-trên làm vệt sáng viền. Một điểm sáng cam yếu phía skyline làm ánh phản chiếu ấm trên cạnh kim loại (có thể dùng vùng sáng trong HDRI thay vì đèn thật).
- Đổ bóng: tàu **vừa đổ vừa nhận bóng** để thấy bóng tháp pháo trên boong, bóng cầu lên nhà boong. Shadow map 2048, `PCFSoft`, `bias ≈ -0.0004`, `normalBias ≈ 0.02`. Khung bóng chỉ bao quanh vùng tàu.
- **Bóng tiếp xúc dưới thân** trên mặt nước: một decal mờ tối hơi dài hơn thân (khoảng 2.0 × 0.5, độ mờ 40%) chỉ để "đặt" tàu xuống nước. Biển thật không nhận bóng.
- Cinematic cận cảnh (Hangar, lúc bắn): bật shadow map chất lượng cao cho một tàu. Chế độ chất lượng thấp: tắt shadow map, giữ decal bóng tiếp xúc.
- Đèn trên tàu: hành trình mạn phải xanh lục (−X, z +0.20), mạn trái đỏ (+X, z +0.20), trắng trên đỉnh cột, trắng ở đuôi, đèn cảnh báo đỏ nhấp nháy 1 Hz trên đỉnh cột; vài ô kính cầu và khoang hổ phách yếu. Các đèn này chỉ tự phát sáng (emissive + sprite phát sáng), không phải đèn thật, để tiết kiệm.

### 2.6 Cây node và điểm neo (xuất glb)
```
destroyer                      (gốc, y=0 mặt nước)
  hull                         (thân, mọi vật liệu cố định)
  superstructure               (cầu, nhà boong, nhà chứa, ống khói)
  turret_fwd (yaw)  -> barrel_fwd (pitch, recoil trục +Z cục bộ) -> muzzle_1
  turret_aft (yaw)  -> barrel_aft (pitch, recoil)                 -> muzzle_2
  radar_rotor                  (quay quanh Y)
  ciws_1_yaw -> ciws_1_pitch   ciws_2_yaw -> ciws_2_pitch
  exhaust_1  exhaust_2         (điểm phát hơi nóng)
  lights                       (nav, mast, stern, warning)
  dmg_cell0  dmg_cell1         (nhóm hư hại, ẩn mặc định, mục 2.7)
  anchors:
    muzzle    (= muzzle_1)     bow  (0, 0.06, +0.95)
    launch    (tâm ô VLS trước)  stern (0, 0.06, −0.95)   deck (0, 0.05, 0)
    cell_0 (0,0.05,−0.5)  cell_1 (0,0.05,+0.5)
    fire_0 (0,0.06,−0.5)  fire_1 (0,0.06,+0.5)   (điểm lửa/khói khi bị trúng)
    muzzle_1 (tại đầu nòng pháo trước)  muzzle_2 (tại đầu nòng pháo sau)
```
- `muzzle`, `launch`, `bow`, `stern`, `deck` là các neo chuẩn trong `assets.md`; `muzzle_1/2`, `cell_*`, `fire_*` là phần mở rộng của riêng khu trục hạm.
- Đòn `rapid` bắn 2 phát: gợi ý phát 1 từ `muzzle_1`, phát 2 từ `muzzle_2` (tháp trước rồi tháp sau). **Chốt**: `cinematics.md` mục 2 dùng đúng hai tháp: tháp trước nhắm ô 1, tháp sau nhắm ô 2 (hai hướng khác nhau), phát 1 từ `muzzle_1`, phát 2 từ `muzzle_2`.
- Nòng pháo thụt lùi 0.012 khi bắn (`barrel_*` dịch −Z cục bộ rồi về trong ~250 ms).
- Mọi bộ phận quay (`turret_*`, `radar_rotor`, `ciws_*`) phải có trục xoay đúng tâm, không lệch.

### 2.7 Hư hại
- Hai nhóm node `dmg_cell0` (đuôi) và `dmg_cell1` (mũi) chứa: vết cháy xém lên vật liệu, tấm thép rách, lỗ thủng nhỏ, ống đứt. Hiện khi ô tương ứng (`hits[0]`, `hits[1]`) bị trúng.
- Lửa và khói bật tại `fire_0/1` theo `animations.md` mục 5; model chỉ cung cấp điểm neo và mảng hư hại.
- Chìm: dùng nguyên model, mã xử lý nghiêng và hạ xuống (`animations.md` mục 6), không cần model riêng.

### 2.8 Mức chi tiết và ngân sách
Cập nhật so với `assets.md` (đã sửa lại bảng): khu trục hạm có ba mức.

| Mức | Dùng khi | Tam giác tối đa | Texture |
|---|---|---|---|
| LOD0 (hero) | Hangar, cinematic cận cảnh | 150 000 | 2 bộ 2048² (+ decal) |
| LOD1 | Trận đấu, góc chiến thuật | 25 000 | cùng bộ, bỏ lan can hình học |
| LOD2 | Xa, thu nhỏ | 6 000 | 1 bộ 1024² |

- Lan can, dây, ăng-ten roi ở LOD0 làm bằng hình học mảnh; LOD1 chuyển sang alpha-cutout; LOD2 bỏ.
- Chuyển LOD theo kích thước trên màn hình, không theo khoảng cách cứng.
- Tổng dung lượng một tàu (glb nén) mục tiêu ≤ 8 MB.

### 2.9 Cách tạo model
Model chi tiết này **không viết bằng code**. Nguồn thật (tự dựng bằng phần mềm 3D, thuê, hay mua) vẫn chưa quyết (Q7). Trong lúc chờ:
- Agent code dùng placeholder hộp ở `assets.md`, chưa phải model chi tiết.
- Bản vẽ `destroyer_blueprint.svg` và bảng 2.3 là hợp đồng cho người dựng model.
- Khi có file glb, đặt vào `src/assets/models/ship_destroyer_lod0.glb` (và `_lod1`, `_lod2`), cập nhật `manifest.ts`.

### 2.10 Nghiệm thu model
- Mọi bộ phận A–J có mặt, đúng vị trí so với bản vẽ (sai lệch ≤ 0.01).
- Nhìn từ camera chiến thuật: nhận ra khu trục hạm, bạc, nặng, không bị chói trắng hay đen kịt.
- Cận cảnh: thấy xước kim loại theo chiều dài, viền sáng ở cạnh, bóng của tháp pháo trên boong.
- Mọi neo ở 2.6 có mặt đúng tên và đúng vị trí.
- Tháp pháo quay và nòng giật không xuyên vào thân, không lệch trục.
- Có bản render xoay 360° (turntable) hoặc ảnh bốn góc đính kèm khi giao.
