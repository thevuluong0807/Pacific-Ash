# Tàu ngầm (submarine) — thiết kế hình ảnh

> **Trạng thái 3D:** model chi tiết ở mục 2 bên dưới **tạm hoãn**. Dùng bản khối cơ bản `ships-basic3d.md` (file `models/ship_submarine.glb`). Sprite 2D, luật, điểm neo, cinematic trong file này vẫn hiệu lực.

Số liệu và luật: `ships.json` (id `submarine`, 3 ô, hồi chiêu 2, đòn `torpedo`) và `rules.md` mục 4.3. File này chỉ nói hình dạng và cách thể hiện.

Phần chung cho mọi tàu: xem `ship-destroyer.md` (hệ tọa độ 2.2, ánh sáng và đổ bóng 2.5, hư hại 2.7, nghiệm thu 2.10, style sprite 1.5). File này chỉ ghi chỗ khác hoặc riêng.

| File đi kèm | Vai trò |
|---|---|
| `art/submarine_2d.svg` | Sprite 2D hoàn chỉnh, dùng thẳng được |

Ý đồ hình ảnh: tàu thấp nhất, thon nhất, **tối hơn các tàu nổi**. Nổi nửa thân, bị sóng bao quanh, chỉ lộ tháp chỉ huy và boong hẹp. Mối đe dọa im lặng. Nhìn từ xa phải khác hẳn bốn tàu còn lại.

---

## 1. Sprite 2D (cartoon)

- Nguồn: `art/submarine_2d.svg`. `viewBox="0 0 300 100"` = 3 ô. Mũi hướng phải (+x). Cùng quy ước viền và bóng đổ, nhưng **thân màu xám xanh tối** (gradient `#2F3B46` → `#9AA8B5` → `#5E6D7B` → `#26313B`), tháp chỉ huy sáng hơn (`#C9D3DC` → `#6F7D8A`). Khóa `manifest.ts`: `ui_ship_submarine`.
- Bố cục từ mũi tới đuôi: mũi tròn với nắp ống phóng ngư lôi (hai chấm và vòng cung) → nắp hầm trước (236–250) → **tháp chỉ huy** hình viên nang có kính, kèm ống kính tiềm vọng và cột ăng-ten, hai **cánh lái nước** vươn ra hai bên (163–207) → ba nắp hầm boong (60–120) → **cánh đuôi chữ thập** và bánh lái (8–38).
- **Bọt nước trắng đứt nét chạy dọc hai bên thân** để đọc ra "đang lướt trên mặt nước, thấp". Đây là nét riêng của tàu ngầm, không tàu nào khác có.
- Cách dùng trên lưới, trạng thái: giống `ship-destroyer.md` 1.4. Ô 0 ở đuôi, ô 2 ở mũi. Tàu chìm: cùng bộ lọc xám tối.

---

## 2. Model 3D

### 2.1 Kích thước
- Dài **2.90** (z −1.45…+1.45). Thân hình trụ tròn, bán kính tối đa **0.11**, tâm thân ở **y = −0.045**, nên đỉnh thân cao **+0.065** trên mặt nước (nửa thân nổi). Phần boong nổi chỉ rộng khoảng 0.14.
- Tháp chỉ huy: dài 0.44, rộng 0.12, đỉnh cao **+0.17**; tiềm vọng thò thêm tới +0.26.
- Tâm ba ô tại `z = −1, 0, +1` (ô 0 đuôi, ô 2 mũi).

### 2.2 Bộ phận
| Bộ phận | Vị trí (z) | Kích thước chính | Chi tiết bắt buộc |
|---|---|---|---|
| **Thân trụ** | −1.45…+1.45 | bán kính 0.11 | mũi tròn đầy, đuôi thon; **gạch cách âm** (anechoic) lát đều, khe nối mảnh, nhìn như cao su đen; sống boong phẳng hẹp |
| **Ống phóng ngư lôi ×4** | +1.38 (dưới nước, y −0.045) | 4 nắp tròn r 0.018 | nắp mở bằng bản lề (`torpedo_flap_0..3`), khoang tối sâu bên trong |
| **Tháp chỉ huy** | +0.13…+0.57 | 0.44 × 0.12 × 0.17 | hình viên nang, viền gờ, cửa sập, kính chỉ huy nhỏ, thân sáng hơn thân chính |
| Cánh lái nước | trên tháp, z +0.35 | sải 0.20 | hai cánh vươn ngang, có thể xoay nhẹ khi lặn |
| **Tiềm vọng ×2** | trên tháp, z +0.40 và +0.26 | cao thêm 0.09 | một tiềm vọng quang điện (đỉnh kính), một cột radar/ăng-ten; thò lên hạ xuống được (`periscope`) |
| Nắp hầm boong | z +1.10, +0.90, −0.10, −0.45, −0.80 | r 0.018–0.025 | nắp tròn có vòng gờ, bánh xe khóa |
| Bích, móc kéo | rải trên boong | — | lõm xuống, có thể thu |
| Cánh đuôi chữ thập | −1.35…−1.45 | sải 0.22 | 4 cánh lái hình thang, bánh lái đứng |
| **Chân vịt ống bọc** | −1.45 | r 0.08 | vành bọc kín, cánh quạt bên trong (`propulsor_spin`) |
| Cáp kéo, ăng-ten roi | trên tháp | — | vài sợi mảnh |

### 2.3 Cây node và điểm neo
```
submarine
  hull  sail  planes_sail  planes_stern  rudder  lights
  periscope (translate Y 0..0.09)  radar_mast  propulsor_spin
  torpedo_flap_0..3 (xoay bản lề, mở 80°)
  dmg_cell0  dmg_cell1  dmg_cell2
  anchors: launch (0,-0.045,+1.40, hướng +Z)  muzzle (= launch)
           bow(0,0.0,+1.45) stern(0,0.0,-1.45) deck(0,0.065,0)
           cell_0 (0,0.065,-1)  cell_1 (0,0.065,0)  cell_2 (0,0.065,+1)
           fire_0..2 (0,0.07,z của ô)
           cam_under (-0.35,-0.16,+1.00, nhìn về +Z)   (camera dưới nước cho cinematic)
```
- Tàu ngầm **không có pháo**, nên `muzzle` chỉ là bí danh của `launch` để đủ bộ neo chuẩn. Ngư lôi xuất phát từ `launch`.
- **Trước khi phóng, tàu nổi cao hơn bình thường (nâng `ship_submarine` lên Δy +0.05)** để các nắp ống phóng nằm trên mặt nước và nhìn thấy được; sau khi phóng tàu hạ về mớn nước thường trong 800 ms.
- Đạn của tàu ngầm hiển thị là **tên lửa-ngư lôi** (`env-and-fx.md` mục 7): phóng từ `launch`, vọt khỏi mặt nước, bay sát mặt biển dọc đường. Camera và nhịp cảnh: `cinematics.md` mục 5.
- Đòn `torpedo`: ngư lôi bắn từ **mép lưới** vào, không phải từ tàu. Animation 4.3 trong `animations.md` thể hiện hai thứ: (1) tàu mình mở nắp ống, ngư lôi xuất hiện từ `launch`; (2) cảnh ngư lôi chạy dọc đường đã chọn do mã dựng, không cần model riêng. Không bắt buộc ngư lôi phải chạy từ vị trí tàu tới mép lưới.
- Tàu ngầm chìm: dùng nguyên model, mã hạ cả thân xuống dưới mặt nước kèm bọt khí và dầu (khác tàu nổi: không nghiêng nhiều).

### 2.4 Vật liệu: khác gì khu trục hạm
Tàu ngầm **ít bạc hơn**, nhưng vẫn giữ viền kim loại sáng ở tháp để cả bộ tàu hợp nhau.

| Vật liệu | Màu | metalness | roughness | Ghi chú |
|---|---|---|---|---|
| `mat_sub_hull` | `#4A5866` | 0.55 | 0.45 | gạch cách âm, normal map hình lưới ô, ướt (rain), roughness thấp hơn khi ướt |
| `mat_sub_sail` | `#9AA8B5` | 0.85 | 0.32 | tháp chỉ huy, gờ viền sáng, xước nhẹ |
| `mat_dark_steel` | `#3A444E` | 0.8 | 0.5 | cánh lái, vành chân vịt, cột |
| `mat_glass` | `#0C1E2A` | 0.1 | 0.05 | kính tiềm vọng, kính tháp |
Thêm: hiệu ứng nước chảy trên thân (alpha, scrolling) để đọc ra "vừa nổi lên". Bọt nước ở mũi và quanh tháp là hạt do mã, không nằm trong model.

### 2.5 Mức chi tiết
| Mức | Dùng khi | Tam giác tối đa |
|---|---|---|
| LOD0 | Hangar, cinematic cận cảnh | 120 000 |
| LOD1 | Trận đấu | 20 000 |
| LOD2 | Xa | 5 000 |
Texture: 2 bộ 2048². Dung lượng glb nén ≤ 6 MB.

### 2.6 Nghiệm thu
Như `ship-destroyer.md` 2.10, thêm: nhận ra là tàu ngầm trong 1 giây ở góc chiến thuật; nửa thân dưới biển không lộ; có nắp ống mở được (4 bản lề); tiềm vọng thò lên và hạ xuống được; neo `cam_under` đúng chỗ.
