# Môi trường 3D, đạn và hiệu ứng

> **Tỉ lệ thế giới mới (người thiết kế): 1 ô = 10 đơn vị thế giới, model tàu và lưới nhân 10** (xem `world-scale.md`). Mọi con số ghi theo "đơn vị" trong file này là **tỉ lệ cũ (1 ô = 1 đơn vị)**; muốn dùng, nhân 10 hoặc dùng bảng thay thế trong `world-scale.md` mục 2 (lưới, camera, biển, mưa, hiệu ứng, vật bắn) và mục 3 (phông nền, đã đặt lại).

Mọi thứ trong cảnh 3D ngoài 5 tàu (tàu: `ship-*.md`). Timeline từng đòn đánh nằm ở `animations.md`; file này cho **thông số cụ thể** để dựng nên các timeline đó. Nếu hai file lệch nhau về thời lượng, `animations.md` thắng.

| File đi kèm | Vai trò |
|---|---|
| `art/fx_storyboard.svg` | Khung hình tham chiếu: đạn trúng, đạn trượt, tàu chìm, tên lửa chùm |
| `art/ui_battle_mock.svg` | Bố cục màn trận (xem `ui-art.md`) |

**Đây là bộ thông số của map `hai_phong` (Hải Phòng hoang tàn).** Map `truong_sa` giữ nguyên bố cục, camera, đạn, hiệu ứng, chỉ **ghi đè** diện mạo theo `maps.md` mục 4 (trời, sương, mưa, sấm chớp, đèn, biển, phông nền, âm nền).

Hướng nghệ thuật chung: `GDD.md` mục 2. Đêm, mưa lớn, cảng nước sâu, thành phố cháy dở, kim loại nặng. Không dùng asset, tên, hay cảnh của phim nào.

---

## 1. Bố cục thế giới

- Mỗi lưới là một vùng biển vuông **100 × 100 đơn vị thế giới** (1 ô = **10** đơn vị; xem `world-scale.md`). Con số `10 × 10` cũ không còn dùng.
- Lưới của mình: tâm `(0, 0, +75)`. Lưới địch: tâm `(0, 0, −75)`. Khoảng nước giữa hai lưới rộng **50**. Tàu mình nhìn về phía −Z, tàu địch nhìn về phía +Z (đối diện nhau qua khoảng nước).
- Hàm duy nhất: `cellToWorld(owner, cell) → (x, 0, z)`, với `x = (cell.x − 4.5) × 10`, `z = zCenter(owner) + (cell.y − 4.5) × 10` (`zCenter` = +75 hoặc −75).
- Hướng tàu: tàu đặt ngang (cùng hàng) quay mũi về **+X** (xoay model +90° quanh Y); đặt dọc quay mũi về **+Z**. Ô chỉ số cao ở phía mũi (khớp `ship-destroyer.md` 1.4). Nhớ model có mũi +Z gốc.
- Lưới 2D (DOM) **không cần** trùng pixel với lưới 3D; 3D chỉ là phông và cinematic.
- Phía sau lưới địch (−Z) là skyline và cảng. Phía +Z là nơi đặt camera. Hai bên trái/phải để biển mở, có vài vật nổi và xác tàu.

## 2. Camera

| Preset | Vị trí | Nhìn vào | FOV | Dùng khi |
|---|---|---|---|---|
| `tactical` | (0, 170, 240) | (0, 0, −10) | 38° | trận đấu, đặt tàu; cố định |
| `menu` | (−6, 1.2, 14) chuyển động chậm sang (+6, 1.6, 14) trong 40 s, lặp | (4, 3, −30) | 50° | menu, chọn chế độ |
| `hangar` | quỹ đạo r = 1.6 × chiều dài tàu, cao 0.35 × r, quanh tàu ở gốc | gốc (0, 3, 0) | 35° | Hangar; kéo xoay, tự xoay 6°/s |
| `result` | dolly chậm từ (0, 30, 180) lùi tới (0, 50, 280) trong 8 s | cảnh đang chìm hoặc thắng | 40° | màn kết quả |
| cinematic | theo từng đòn, `animations.md` mục 4 | — | 30–45° | lúc bắn |

- Chuyển camera: easing `cubic-bezier(0.2, 0.7, 0.2, 1)`, 400 ms. Quay về `tactical` sau mỗi cinematic mất 500 ms.
- **Rung camera** (offset vị trí, nhiễu 2 chiều, tắt dần): xem bảng mục 8.

## 3. Biển

- Mặt nước: lưới 400 × 400, 256 × 256 đỉnh (chất lượng trung), bốn sóng Gerstner chồng:

| Sóng | Biên độ | Bước sóng | Hướng | Tốc độ |
|---|---|---|---|---|
| 1 | 0.35 | 18 | 15° | 1.1 |
| 2 | 0.20 | 9 | −40° | 1.4 |
| 3 | 0.12 | 5 | 70° | 1.9 |
| 4 | 0.06 | 2.4 | −10° | 2.4 |
Biên độ nhân theo `waveScale` trong `settings` (mặc định 1). Sóng đủ lớn để tàu nhấp nhô, nhưng **ô lưới không bị che khuất** (tàu nghiêng tối đa như dưới).
- Màu: sâu `#04090D`, trung `#0C1A24`, bọt `#9FB4C2` (hiện ở đỉnh sóng và quanh thân tàu), vệt phản chiếu lửa cam ở phía skyline.
- Fresnel: phản chiếu bầu trời tối; thêm phản chiếu nhẹ skyline (chất lượng cao dùng reflection probe 512, thấp dùng cube map tĩnh).
- Đường bọt quanh thân tàu: dải bọt trắng đục 0.05 rộng bám theo đường nước, nhấp nhô theo sóng.
- Vết dầu: vài mảng tối bóng loáng (`#06090B`, độ nhám thấp) trôi chậm, nhất là gần xác tàu.
- **Tàu nhấp nhô**: lăn (roll) ±1.5°, chúi (pitch) ±1°, nâng hạ 0.02, chu kỳ 5–8 s, pha ngẫu nhiên theo `shipId`. Tàu bị trúng thêm nghiêng nhẹ lệch 1° về phía hỏng.
- Dưới nước (cho tàu ngầm/ngư lôi): tầm nhìn 6 đơn vị, màu xanh đen `#06141C`, tia sáng yếu, hạt lơ lửng.

## 4. Bầu trời và khí quyển

- Gradient đêm: đỉnh `#05080B` → chân trời `#18222B`, vệt cam `#FF7A1A` mờ (độ mờ 0.35) ở phía skyline cháy.
- Mây đen thủ tục, di chuyển ngược chiều sóng, độ phủ cao.
- **Sương**: hàm mũ, `density 0.011` (trung), màu `#0B1117`. Chất lượng thấp tắt sương, dùng gradient chân trời thay.
- **Sấm chớp** (chỉ map `hai_phong`; `truong_sa` không có): ngẫu nhiên 9–22 s một lần. Mẫu: chớp 1 (đỉnh 100 ms, cường độ 3.0) → nghỉ 60 ms → chớp 2 (60 ms, cường độ 1.6) → tắt dần 300 ms. Làm sáng bầu trời, hắt sáng skyline. Sấm vọng sau 0.4–2.5 s (`audio.md`). Không chớp khi `prefers-reduced-motion` (thay bằng nhấp sáng mờ).
- Tia chớp đánh xuống biển: tùy chọn, tối đa một tia mỗi 3 lần chớp.
- **Pháo sáng xa**: ánh cam nổ nhỏ ở đường chân trời mỗi 3–8 s, chỉ là sáng bầu trời, không phải vật thể.

## 5. Mưa

- 3000 vệt mưa (trung; thấp tắt; cao 4500). Mỗi vệt dài 0.6, rơi 22 đơn vị/giây, nghiêng 10° về +X, màu `#9FB8CC`, độ mờ 0.22. Chiếm hộp 40 × 25 × 40 bám theo camera.
- Gợn mưa trên mặt nước: 120 vòng nhỏ tức thời (bán kính 0.15, sống 0.3 s) rải trong vùng nhìn.
- Mưa chạm vật cứng: bắn tia nhỏ trên boong tàu gần camera (chỉ khi cận cảnh).
- Giọt mưa trên "ống kính": tùy chọn, tối đa 6 giọt trượt chậm ở cinematic cận cảnh, tắt ở chất lượng thấp.

## 6. Skyline và cảng

Tất cả đặt phía −Z. Đây là cảnh của map **Hải Phòng hoang tàn** (`maps.md`): thành phố cảng đổ nát lấy cảm hứng từ bối cảnh Hải Phòng (cầu cảng, cần cẩu, kho bãi, nhà cao tầng thấp xen kẽ). Vẫn là dựng hư cấu, **không** tái hiện công trình hay địa danh cụ thể.

| Thành phần | Số lượng / vị trí | Ghi chú |
|---|---|---|
| Skyline 3 lớp | z −70 (cao 18–60), −110 (30–90), −160 (40–130); trải x ±160 | ~50 tòa mỗi lớp, hộp có cửa sổ phát sáng; lớp xa mờ hơn, tối hơn |
| Cửa sổ | 12% phát cam `#FF8A1F`, nhấp nháy ngẫu nhiên; 6% xanh lạnh `#4FC3E8` | atlas cửa sổ chung |
| Tòa nhà cháy | 6 điểm cháy trên đỉnh | sprite lửa lặp + cột khói đen bốc nghiêng theo gió 12°, đèn cam nhấp nháy |
| Tòa nhà đổ | 3 tòa | đỉnh vỡ, nghiêng 8–15°, bụi khói |
| Bảng hiệu | 5 bảng xanh lạnh, 1 bảng đỏ mờ | nhấp nháy chập chờn, không có chữ đọc được |
| Cần cẩu cảng | 4, tại x −40/−18/+22/+45, z −45…−60, cao 28 | một cần đổ gãy, xếp container thành đống |
| Xác tàu hàng | 2, tại x ±26, z −30, dài 24 | nghiêng 18°, chìm một nửa, rỉ sét, dùng làm vật chắn nền hai bên |
| Dầu cháy trên nước | 2 mảng ở rìa vùng biển | lửa thấp, khói mỏng |
| Mảnh vỡ nổi | ~40 | trôi chậm, nhấp nhô; không vào ô lưới |
| Phao | 6, ngoài hai bên lưới | đèn đỏ/xanh nhấp nháy |
| Đèn pha quét | 3, từ skyline và tàu xa | cột sáng mờ (độ mờ 0.08), chu kỳ 12 s |

- Texture cửa sổ và vật liệu tòa nhà dùng chung một atlas để giảm draw call.
- Skyline là phông: không bao giờ bị tàu hay hiệu ứng che hoàn toàn.

## 7. Đạn và vật bay
> **Hiển thị trong cinematic:** vật bắn hạng nặng phải thấy rõ. Cảnh cận dùng kích thước thật ×1.2, cảnh rộng vẽ **phóng đại ×2.5** (tên lửa dài 0.12 thành 0.30, đạn pháo 0.08 thành 0.20) kèm quầng sáng; xem `cinematics.md` mục 1 "Quy tắc hiển thị vật bắn".

| Vật | Kích thước | Vận tốc | Vệt / hiệu ứng | Ghi chú |
|---|---|---|---|---|
| **Đạn pháo** | vệt sáng dài 0.3, đầu sáng trắng–vàng | 18 ô/giây | vệt 12 khung, cam `#FFD27A` + viền `#FF8A1F` độ mờ 0.25, phát sáng nhẹ | không có model, dùng sprite vệt |
| **Tên lửa** (`fx_missile`) | dài 0.12, đường kính 0.018 | bay thẳng lên 6 ô/giây, bay vòng 9, lao xuống 14 | ngọn lửa đuôi cam, vệt khói trắng sống 1.2 s | thân trắng xám, đầu tối; xoay theo hướng bay |
| **Tên lửa-ngư lôi** (`fx_torpedo`) | dài 0.15, đường kính 0.02 | 7 ô/giây | lửa đuôi cam, vệt khói trắng và vệt nước; phóng ra từ ống ở mũi, **vọt lên khỏi mặt nước và bay sát mặt biển (cao 0.12–0.2)** dọc đường đã chọn rồi lao xuống đích | thân tối có sọc cam, đèn nhỏ ở đầu; thay cho ngư lôi dưới nước cũ (xem `cinematics.md` mục 5) |
| **Máy bay** (`fx_plane`) | sải cánh 0.16, dài 0.2 | cất cánh 8 → 12 ô/giây, bay qua mục tiêu 14 | đèn hành trình đỏ/xanh nhấp nháy, vệt khói mỏng cuối cánh | dùng lại model đang đậu trên tàu sân bay |
| **Bom** (`fx_bomb`) | dài 0.04 | rơi 10 ô/giây có gia tốc | cánh đuôi nhỏ, không vệt | rơi từ máy bay, nổ khi chạm ô |

Mọi vật bay phải xoay đầu theo vận tốc (không trượt ngang). Mọi vật bay biến mất đúng lúc chạm ô (kèm hiệu ứng ở mục 8).

## 8. Danh mục hiệu ứng

**Độ sáng của đèn và chớp trong bảng là gốc: nhân với hệ số chói `glare` (mặc định 0.55), chớp mõm sống ≤ 80 ms và bán kính ≤ 60% (xem `cinematics.md` mục 1).** Số hạt là mức **cao**; nhân với `particleScale` (tokens.json → `quality`). Đèn động là `PointLight` thật, chỉ tối đa 3 cái cùng lúc, còn lại dùng emissive hoặc sprite phát sáng.

| Mã | Khi nào | Thành phần | Thời lượng | Hạt (cao) | Đèn | Rung camera |
|---|---|---|---|---|---|---|
| `fx_muzzle_s` | khu trục hạm bắn | lửa mõm ngắn + khói mõm nhỏ | 180 ms | 40 | cam, 180 ms | 0.02 / 225 ms |
| `fx_muzzle_l` | tuần dương bắn | lửa mõm lớn + sóng giật trên mặt nước | 300 ms | 90 | cam, 300 ms | 0.05 / 375 ms |
| `fx_launch` | tên lửa phóng | cột khói trắng + lửa đáy + vệt cháy boong | 1050 ms | 240 | cam, 900 ms | 0.07 / 900 ms (ù dài) |
| `fx_torpedo_launch` | tàu ngầm bắn | bọt khí + sủi dưới nước | 600 ms | 80 | không | 0.02 / 300 ms |
| `fx_takeoff` | máy bay cất cánh | luồng khí nóng, khói mỏng, đèn đỏ | 900 ms | 60 | không | 0.03 / 450 ms |
| `fx_splash_s` | đạn pháo trượt | cột nước nhỏ 0.6 cao + vòng sóng + giọt | 750 ms | 120 | không | 0.01 / 150 ms |
| `fx_splash_l` | tên lửa/bom/ngư lôi trượt | cột nước 1.1 cao + vòng sóng rộng + bọt | 900 ms | 220 | không | 0.03 / 300 ms |
| `fx_hit` | trúng ô tàu | chớp trắng lõi 120 ms → cầu lửa 600 ms → mảnh kim loại → khói đen | 1650 ms | 260 | cam mạnh, 600 ms | 0.06 / 450 ms |
| `fx_hit_torpedo` | ngư lôi trúng | nổ dưới thân + cột nước 1.4 cao + mảnh | 1800 ms | 300 | cam, 675 ms | 0.08 / 600 ms |
| `fx_fire` | ô đã trúng, tồn tại đến hết ván | ngọn lửa lặp 0.25–0.4 cao + khói đen mỏng + ánh sáng nhấp nháy 8 Hz | lặp | 24 | emissive, tối đa 3 đèn thật | không |
| `fx_sink` | tàu chìm | nổ dọc thân → chìm theo kiểu riêng từng tàu (`sinking.md` mục 2) → bọt khí, dầu loang | 10800 ms (+ đuôi chìm nốt tối đa 6000 ms) | 520 | cam lớn, 450 ms | 0.12 / 1050 ms |
| `fx_oil` | sau khi tàu chìm | vết dầu đen + lửa nhỏ trên nước, tồn tại đến hết ván | lặp | 30 | emissive | không |
| `fx_airburst` | hộ vệ chặn đạn/tên lửa/bom trên không | nổ nhỏ sáng cam giữa trời, khói xám trắng, mảnh vụn rơi | 600 ms | 90 | cam, 375 ms | 0.02 / 225 ms |
| `fx_counter_splash` | hộ vệ chặn ngư lôi | cột nước nhỏ dưới nước + bọt, không lửa | 600 ms | 70 | không | 0.02 / 225 ms |
| `fx_chaff` | giàn mồi nhử bung | mảnh nhiễu bạc lấp lánh bay tản, khói trắng nhạt | 1050 ms | 120 | không | không |
| `fx_sneak_shot` | tàu cắn lén bắn | chớp mõm nhỏ, vệt đạn mảnh rất nhanh | 375 ms | 20 | không | 0.01 / 120 ms |
| `fx_radar_sweep` | hộ vệ phát hiện | nón sáng mờ quét 360° từ vòm radar, viền cam | 1315 ms | 1 nón | không | không |
| `fx_lock_reticle` | hộ vệ khóa đạn | khung ngắm cam 4 góc quanh vật bắn, đường nét đứt về vòm radar, nhấp nháy khi khóa | 940 ms mỗi khung | 1 khung | không | không |
| `fx_ciws_stream` | CIWS xả đạn | tia sáng vệt đạn dày đặc: 75 hạt/giây mỗi nòng, 45 ô/giây, sống 0.35 s, cam–trắng, kéo thành tia | 940–1405 ms mỗi loạt | 75/s mỗi khẩu | cam nhẹ dao động | 0.01 liên tục |
| `fx_ciws_muzzle_strobe` | CIWS xả đạn | chớp mõm nhấp nháy 24 Hz + khói mõm mỏng | theo loạt | 20 | cam nhẹ | không |
| `fx_casings` | CIWS xả đạn | vỏ đạn vàng văng ra rơi xuống nước | theo loạt | 40/s mỗi khẩu | không | không |
| `fx_wreck_toss` | ô trúng một phần: hất mảnh xác tàu bay theo cung rồi rơi xuống và nổi (`wreckage.md`) | mảnh xác + vệt lửa khói + cột nước | 1350 ms bay và nổi | 120 | cam, 300 ms | 0.06 / 300 ms |
| `fx_smoke_column` | mảnh xác nổi | cột khói đen mảnh cao 40, nghiêng gió 12° | lặp | 30 | không | không |
| `fx_glow_ring` | mảnh xác nổi | vòng sáng cam lan trên mặt nước, 6 → 12 đơn vị mỗi 1.6 s | lặp | 1 vòng | không | không |
| `fx_spark_burst` | mảnh xác nổi | chùm 20 tia lửa mỗi 2–4 s | 600 ms mỗi chùm | 20 | không | không |
| `fx_shock` | trúng/chìm | vòng sóng xung kích trên mặt nước | 750 ms | 1 vòng | không | — |
| `fx_flash_screen` | tàu mình chìm | viền đỏ lưới 600 ms (DOM) | 600 ms | — | — | — |

Hiệu ứng trúng và chìm:
- **Chớp lõi**: cầu sáng trắng `#FFF3C4`, bán kính 0.35, tắt trong 80 ms.
- **Cầu lửa**: sprite lửa đa lớp `#FF9A2A` → `#E8451C` → `#8B1A14`, phình ra rồi tan trong 400 ms.
- **Mảnh vỡ**: 14–30 mảnh hình khối kim loại xám `#8793A0`, bắn lên theo cung, rơi xuống nước thì tạo bọt nhỏ. Tối đa 60 mảnh một lúc cho cả cảnh.
- **Khói**: sprite mềm xám đen, bốc lên chậm, nghiêng theo gió 12°, sống 3–4 s.
- **Lửa kéo dài** chỉ bật ở ô trúng. Giới hạn **16** ngọn lửa đồng thời; ngọn cũ nhất thu nhỏ thành than hồng khi vượt giới hạn.

### Tàu chìm theo từng loại (10800 ms, kiểu riêng)
Bảng khóa chi tiết (chúi, nghiêng, độ sâu theo mili-giây) và chuyển động phụ: `sinking.md` mục 2. Bảng dưới là tóm tắt.
| Tàu | Cách chìm |
|---|---|
| Khu trục hạm, tuần dương, tàu tên lửa | nghiêng 15° → 30°, mũi hoặc đuôi chìm trước (chọn phía bị trúng) |
| Tàu ngầm | hạ thẳng cả thân xuống nước, nghiêng tối đa 10°, nhiều bọt khí, ít khói |
| Tàu sân bay | nghiêng sang một mạn tới 40°, máy bay đậu trượt và cháy, khói đặc hơn, chậm hơn một chút ở giai đoạn cuối (vẫn kết thúc trong 1800 ms) |
Sau khi chìm: model biến mất ở 1500 ms, để lại `fx_oil`.

## 9. Bảng rung camera
| Sự kiện | Biên độ | Thời lượng | Ghi chú |
|---|---|---|---|
| Lửa mõm nhỏ | 0.02 | 150 ms | |
| Lửa mõm lớn | 0.05 | 250 ms | |
| Tên lửa phóng | 0.07 | 600 ms | rung ù liên tục, tắt dần |
| Máy bay cất cánh | 0.03 | 300 ms | |
| Trúng | 0.06 | 300 ms | |
| Ngư lôi trúng | 0.08 | 400 ms | |
| Tàu chìm | 0.12 | 700 ms | mạnh nhất |
Biên độ tính theo đơn vị thế giới ở khoảng cách camera cinematic; scale theo khoảng cách. Tắt hoàn toàn khi tùy chọn "rung màn hình" tắt hoặc `prefers-reduced-motion`.

## 10. Hậu kỳ (post-processing)
- Bloom nhẹ: **ngưỡng 1.1, cường độ 0.18** (bản cũ 0.9/0.35 quá chói, che mất vật bắn), chỉ cho lửa, đèn, tia chớp, **không bloom lên vật bắn**. Mọi độ sáng hiệu ứng còn nhân với hệ số chói `glare` (mặc định 0.55): xem `cinematics.md` mục 1 "Quy tắc giảm chói".
- Vignette: 0.25.
- Nhiễu hạt phim: 3%.
- Không dùng quang sai màu, không làm mờ chuyển động.
- Chất lượng thấp: tắt bloom và hạt nhiễu.

## 11. Atlas hạt (một ảnh `tex_fx_atlas`, 1024², 4 × 4 ô)
1 khói mềm A · 2 khói mềm B · 3 ngọn lửa A · 4 ngọn lửa B · 5 tia lửa · 6 vòng sóng · 7 giọt nước · 8 bọt nước · 9 bọt khí · 10 mảnh vỡ kim loại · 11 tro bay · 12 phát sáng mềm · 13 vệt mưa · 14 vệt khói tên lửa · 15 cột nước (dạng dải đứng) · 16 nhiễu (cho cầu lửa).
Mỗi ô 256 × 256, nền trong suốt, hợp tuyến tính (premultiplied alpha).

## 12. Ánh sáng nền (tóm tắt)
- Hemisphere: trời `#1B2630`, đất `#04090D`, cường độ 0.35.
- Đèn chính lạnh `#9FB8CC` chếch từ sau-trên (chi tiết ở `ship-destroyer.md` 2.5).
- Ánh cam skyline: vùng sáng trong HDRI `tex_env_night_harbor`, không dùng đèn thật.
- Chớp: tăng cường độ hemisphere và đèn chính theo mẫu mục 4.

## 13. Hiệu năng
- Tối đa khoảng 2000 hạt đồng thời (cao), 800 (trung), 300 (thấp).
- Tối đa 3 `PointLight` động; còn lại emissive.
- Mục tiêu 60 fps ở trung trên máy thường; chất lượng thấp bỏ mưa, sương, phản chiếu, bloom, bóng.
- Skyline và cần cẩu dùng chung vật liệu/atlas, instancing nếu có thể.
