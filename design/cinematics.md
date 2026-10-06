# Cinematic năm đòn đánh

Shot list chi tiết từng đòn: camera, chuyển động, sự kiện trên từng mốc thời gian. **File này thắng `animations.md` mục 4** về thời lượng và góc máy; các mục khác của `animations.md` (kết quả ô, chìm, đồng bộ UI) vẫn dùng.

| File đi kèm | Vai trò |
|---|---|
| `art/cinematic_plan.svg` | Sơ đồ camera nhìn từ trên xuống cho cả 5 đòn, kèm thanh thời gian |
| `art/fx_storyboard.svg` | Khung hình tham chiếu hiệu ứng trúng, trượt, chìm, tên lửa chùm |

Thông số hiệu ứng, đạn, rung: `env-and-fx.md`. Điểm neo của từng tàu: `ship-*.md`.

---

## 1. Quy ước dùng chung

### Hệ tọa độ camera theo tàu
> **Tỉ lệ ×10 (`world-scale.md`): mọi số `f, r, u` và khoảng cách trong file này ghi theo ô; 1 ô = 10 đơn vị thế giới.** Camera cinematic phải đặt ở vị trí nhân 10 so với số ghi.
Vị trí camera ghi theo **khung của tàu bắn** `(f, r, u)`: `f` = dọc thân, dương về phía mũi; `r` = ngang, dương về mạn phải (starboard); `u` = lên (y so với mặt nước). Gốc ở giữa thân tàu, trên mặt nước. Đơn vị = ô lưới. Chuyển sang thế giới bằng hướng tàu (`env-and-fx.md` mục 1; mạn phải của model là −X).
Vị trí camera trong khung mục tiêu ghi `T(f, r, u)` quanh ô trúng (hoặc tâm vùng đánh); `f` hướng từ tàu bắn tới mục tiêu.

### Quy tắc
- Mọi cinematic dài tối đa **9 s** (x1; nới từ 5 s lên 6 s vì có cảnh mạn tàu rộng và cận vật bắn, rồi lên 9 s khi mọi thời lượng tăng thêm 50%). Nhịp: **cảnh tàu bắn (tạo uy lực) → cảnh đạn bay → cảnh trúng đích.**
- Vào cảnh: chuyển từ camera `tactical` sang shot 1 bằng blend 450 ms. Ra cảnh: về `tactical` 750 ms. Giữa các shot trong một đòn: **cắt cứng** (cut), trừ khi ghi "chuyển mượt".
- Camera không xuyên vào thân tàu (khoảng cách tối thiểu 0.15 tới mọi mặt), near plane 0.05.
- Camera không bao giờ nhìn thấy trực tiếp lưới 2D; lưới 2D mờ về độ mờ 0.25 trong lúc cinematic.
- Chậm lại (slow-motion) chỉ dùng ở cú bắn lớn (0.6× tốc độ trong 600 ms). Tắt khi `prefers-reduced-motion`.
- Khi **địch** bắn: dùng đúng shot list này với tàu bắn là tàu địch; camera đặt theo khung của tàu đó, nên cảnh bị lật hướng tự nhiên.
- **Bỏ qua** (`finishNow`): nhảy tới cuối trong 150 ms (`animations.md` mục 8). **Tốc độ x2**: mọi mốc chia đôi. **Cinematic ngắn** (tùy chọn trong Cài đặt, mục 9): chỉ phát shot cuối (cảnh trúng đích) khoảng 1.8 s.
- Phương án **tắt cinematic**: chỉ pop marker (`animations.md` mục 1).
- Rung, ánh sáng, hạt: số trong `env-and-fx.md` mục 8 và 9, không lặp lại ở đây.

### Quy tắc hiển thị vật bắn và máy quay mạn tàu (bắt buộc)
**Vật bắn phải thấy rõ, nhất là khí tài hạng nặng** (tên lửa, đạn pháo nòng lớn, tên lửa không đối đất, tên lửa-ngư lôi):
- **Cảnh cận (insert, camera sát nòng/bệ phóng)**: thấy **đủ cả thân vật bắn** rời nòng/ống/giá treo, có **lửa phụt đuôi và vệt khói** rõ ràng. Thân vật bắn phải chiếm tối thiểu **3% chiều cao màn hình** (khoảng 32 px ở 1080p) ở khung hình đầu tiên sau khi rời nòng. Giữ cảnh cận ít nhất **525 ms**.
- **Cảnh rộng và xa (toàn tàu, vùng đích)**: được **giản lược chi tiết**, nhưng vật bắn vẫn là một **đầu sáng có vệt khói dài tối thiểu 8 px**, không bao giờ biến mất khỏi khung hình trước khi tới đích.
- **Hệ số phóng đại hiển thị** (chỉ cho cảnh rộng): vật bắn vẽ lớn gấp **2.5 lần** kích thước thật (tên lửa dài 0.12 thành 0.30; đạn pháo 0.08 thành 0.20), kèm quầng sáng. Cảnh cận dùng kích thước thật nhân 1.2.
- Thứ tự cảnh khi bắn: **cảnh rộng (thấy tàu và cú bắn) → insert cận (thấy vật bắn rời bệ) → trở lại cảnh rộng hoặc theo vật bắn**. Insert cận ngắn (525–900 ms), cắt cứng ra và vào.

**Camera "mạn tàu"** (nhìn ngang thân tàu): luôn **lùi đủ xa để thấy cả cú bắn và ít nhất 2/3 chiều dài thân tàu; ưu tiên cả thân**. Quy ước tính: với FOV dọc `F` và khung 16:9, bề rộng nhìn thấy ở khoảng cách `d` bằng `2·d·tan(F_ngang/2)`, với `F_ngang = 2·atan(1.78·tan(F/2))`. Cần bề rộng nhìn thấy ≥ 1.2 × (phần thân cần thấy). Khoảng cách camera trong các bảng dưới đã tính theo công thức này (kết quả: khu trục hạm 90%, tuần dương 100%, tàu tên lửa 100%, tàu ngầm 100%, tàu sân bay 100% thân).
- **Camera dưới nước** (tàu ngầm): cũng nhìn ngang thân, thấy ít nhất 2/3 tàu và nơi phóng.

### Quy tắc giảm chói (để luôn nhìn thấy vật bắn)
Phản hồi người chơi: chớp sáng và bloom quá mạnh nhiều lúc **che mất vật bắn lúc rời nòng**. Quy tắc sau **thắng** mọi giá trị độ sáng ghi ở các bảng khác (đèn nổ, chớp mõm, lửa, bloom, lens flare).
- **Hệ số chói toàn cục `glare`**, mặc định **0.55** (1.0 là bản cũ, quá chói). Nhân vào: cường độ `PointLight` của chớp mõm và vụ nổ, cường độ bloom, độ mờ lens flare, độ sáng phát (emissive) của lửa, cầu lửa và chớp lõi. Người chơi chỉnh trong Cài đặt: thấp 0.35, **vừa 0.55 (mặc định)**, cao 1.0.
- **Chớp mõm**: bán kính tối đa **60%** bản cũ, sống tối đa **80 ms**, màu **cam `#FFB15A`**, không để cháy trắng. **Chớp lõi trúng đích**: vẫn `#FFF3C4` nhưng sống ≤ 60 ms và bán kính 0.25 (cũ 0.35).
- **Vật bắn luôn rõ hình**: đầu sáng chỉ là điểm nhỏ; **thân vật bắn không dùng phát sáng toàn thân**, giữ được hình và hướng; lửa đuôi **cam có lõi vàng nhạt**, không để trắng; **vệt khói xám trắng đục, không phát sáng**, kéo dài sau vật bắn để tạo tương phản; **đầu vật bắn có viền tối mỏng** để tách khỏi nền sáng.
- **Nền phía sau vật bắn tối hơn**: ở cảnh cận, vignette 0.35 và một mảng **khói xám sẫm** phía sau điểm xuất phát; không đặt nguồn sáng mạnh phía sau đường bay của vật bắn.
- **Lens flare**: độ mờ tối đa **0.25**, chỉ khi nguồn sáng ở ngoài tâm khung hình, **tắt trong 150 ms đầu sau khi vật bắn rời nòng**.
- **Bloom**: ngưỡng **1.1**, cường độ **0.18** (cũ 0.9 và 0.35); **không bloom lên vật bắn**.
- **Phơi sáng tự động**: trong khoảnh khắc chớp (≤ 150 ms) hạ phơi sáng **−0.35 EV** rồi hồi lại trong 300 ms để nền quanh vật bắn không bị cháy.
- **Nghiệm thu**: ở mọi cảnh cận, vật bắn nhìn rõ hình và hướng trong ít nhất 350 ms (từ lúc rời nòng); không khung hình nào có quá 20% diện tích màn hình bị cháy trắng.

### Theo map
Cinematic giữ nguyên camera và mốc thời gian ở mọi map; chỉ diện mạo đổi theo `maps.md` mục 4 (ánh sáng, tông biển, màu dưới nước, độ sáng lửa và khói). Ví dụ cinematic tàu ngầm ở `truong_sa` có nước xanh ngọc ấm và tia hoàng hôn xuyên nước. Sự kiện nền của map (pháo kích, chớp nổ, sấm) **tạm hoãn** khi cinematic chạy (`maps.md` mục 4.4).

### Mốc chung
Mọi đạn bay tính thời gian từ lúc bắn tới lúc chạm theo vận tốc ở `env-and-fx.md` mục 7. Mốc chạm ô là `tImpact` và là mốc để hiện marker 2D (`onCellResolved`). Nếu thời gian bay thực tế dài hơn bảng dưới, **kéo giãn đoạn bay** (không đổi các mốc khác ngoài mốc chạm).

---

## 2. Khu trục hạm — `rapid` (tổng 4800 ms)
Ý đồ: hai tháp pháo quay về **hai hướng khác nhau**; sau đó cảnh **mạn tàu rộng** (thấy gần cả thân) cho thấy hai phát bắn liên tiếp, kèm hai cú **cận nòng** thấy rõ đạn rời nòng.

| Shot | Thời gian | Camera | Sự kiện |
|---|---|---|---|
| 1. Nghiêng từ trên xuống | 0–1500 | pos `(f −2.2, r +1.2, u +3.0)`, nhìn `(f +0.2, r 0, u 0.1)`, FOV 40°, trôi chậm tới `(f −1.8, r +1.0, u +3.0)` | `turret_fwd` quay về hướng ô 1; `turret_aft` quay về hướng ô 2 (hai hướng khác nhau, 0–1200 ms); hai đường ngắm cam từ nòng tới hướng ô, tắt khi bắn |
| 2. **Mạn tàu rộng** | 1500–3150 | pos `(f +0.1, r +1.35, u +0.30)`, nhìn `(f +0.1, r 0, u +0.08)`, FOV 40°, trôi chậm sang `(f +0.2, r +1.3, u +0.28)` (thấy ~90% thân) | **1725**: phát 1 từ `muzzle_1` (`fx_muzzle_s`, rung 0.02/150), **đạn pháo (hero ×2.5)** vẽ vệt sáng bay ra rõ ràng; **2400**: phát 2 từ `muzzle_2` (cách 675 ms = "pháo nhanh"), đạn thứ hai bay ra |
| 2a. Insert cận nòng trước | 1680–2250 | pos `(f +1.0, r +0.28, u +0.14)`, nhìn `muzzle_1`, FOV 30° | thấy **đạn rời nòng**: thân đạn sáng dài, vệt sáng, nòng thụt lùi, vỏ đạn văng; giữ ≥ 525 ms |
| 2b. Insert cận nòng sau | 2355–2925 | pos `(f −0.2, r +0.30, u +0.14)`, nhìn `muzzle_2`, FOV 30° | tương tự cho phát 2 |
| 3. Cảnh trúng đích | 3150–4800 | `T(f −3.0, r +0.5, u +3.2)`, nhìn tâm hai ô, FOV 36°, kéo vào chậm 0.4 | `tImpact` ô 1 ≈ 3000, ô 2 ≈ 3675 (hiệu ứng theo kết quả); aftermath |
Biến thể: nếu chỉ còn 1 ô khả dụng thì bỏ phát 2 và insert 2b; shot 2 kéo dài tới 2700.

## 3. Tuần dương — `precision` (tổng 5250 ms)
Ý đồ: đỉnh nhìn thẳng khi quay nòng; sau đó **mạn tàu cả thân** thể hiện uy lực (nổ, ánh sáng, tàu chao); xen **cận nòng** thấy rõ **đạn pháo nòng lớn** bay ra.

| Shot | Thời gian | Camera | Sự kiện |
|---|---|---|---|
| 1. Đỉnh, chéo từ sau | 0–1650 | pos `(f −1.3, r +0.5, u +5.6)`, nhìn `(f +0.4, r 0, u 0)`, FOV 36°, kéo vào 0.5 | ba tháp quay về hướng ô, nòng ngẩng 35°; đường ngắm cam |
| 2. **Mạn tàu, thấy cả thân** | 1650–3450 | pos `(f +0.3, r +2.1, u +0.25)`, nhìn `(f +0.3, r 0, u +0.05)`, FOV 42° (thấy 100% thân, đủ khoảng trống trước mũi để thấy đạn bay) | **1950**: khai hỏa `muzzle_1R`: chớp lớn, ánh sáng chiếu thân và nước, sóng xung kích, **tàu chao** (lăn +3° trong 375 ms, tắt dần 1350 ms, chúi 1.2°), khói, rung 0.05/250; **slow-motion 0.6× từ 1875 đến 2475**; **đạn pháo (hero ×2.5, quầng sáng cam)** bay ra theo cung cao rõ ràng |
| 2a. Insert cận nòng | 1920–2550 | pos `(f +1.2, r +0.55, u +0.14)`, nhìn `muzzle_1R`, FOV 30° | thấy **đạn pháo to rời nòng**, lửa mõm, nòng thụt 0.02; giữ ≥ 630 ms; sau đó cắt về shot 2 |
| 3. Cảnh trúng đích | 3450–5250 | `T(f −4.0, r 0, u +3.0)`, nhìn ô mục tiêu, FOV 34°, kéo vào chậm | đạn bay cung cao (theo camera ở 2850–2300); `tImpact` ≈ 3675; trúng thì hiện nhãn loại tàu 900 ms |
Hai tháp còn lại giật nhẹ 40% (không có đạn từ chúng).

## 4. Tàu tên lửa — `cross` (tổng 6600 ms)
Ý đồ: **mạn tàu cả thân** khi các tháp phóng ngẩng; khi phóng có **hai cảnh cận** (dãy trước, dãy sau) thấy rõ **từng quả tên lửa rời ống**; sau đó chùm bay vòng parabol lao xuống. Mô hình bệ phóng: `ship-missile.md` 2.3.

| Shot | Thời gian | Camera | Sự kiện |
|---|---|---|---|
| 1. **Mạn tàu cả thân, tháp phóng ngẩng** | 0–2250 | pos `(f −0.1, r +3.0, u +0.8)`, nhìn `(f −0.1, r 0, u +0.1)`, FOV 40° (thấy 100% thân, cả hai dãy phóng), trượt 0.5 về mũi | nắp khoang mở (450 ms); `launcher_0..4` trồi lên, ngẩng tới 75° (1200 ms, lệch nhau 120 ms); đèn hazard nhấp nháy, còi báo |
| 2. Khai hỏa, vẫn mạn tàu | 2250–3450 | giữ `(f −0.1, r +3.2, u +0.5)`, FOV 42° | **5 tên lửa** nổ máy lệch nhau 90 ms (`fx_launch`), **tên lửa (hero ×2.5, thân trắng, lửa đuôi cam, vệt khói trắng dài)** vút lên khỏi các ống; ánh lửa chiếu thân tàu; rung 0.07/600 |
| 2a. Insert cận dãy trước | 2370–3000 | pos `(f +0.95, r +0.95, u +0.40)`, nhìn `(f +0.91, r 0, u +0.10)`, FOV 36° | thấy rõ **3 tên lửa rời ống** `launcher_0..2` (thân tên lửa đủ chiều dài, lửa phụt, khói cột) |
| 2b. Insert cận dãy sau | 3000–3450 | pos `(f −1.15, r +0.9, u +0.40)`, nhìn `(f −1.07, r 0, u +0.10)`, FOV 36° | thấy 2 tên lửa còn lại rời ống `launcher_3..4` |
| 3. Chùm bay vòng parabol | 3450–5700 | `T(f −8.0, r 0, u +9.0)` (cao, xa, nhìn về phía tàu bắn), nhìn tâm vùng đánh, FOV 40°, hạ xuống `u +7.4` | 5 vệt khói **parabol** (đỉnh `6 + 0.4 × khoảng cách`), **mỗi quả vẽ hero ×2.5 có đầu sáng và lửa đuôi**, lao xuống góc 60–70°; cách nhau 180 ms theo thứ tự tâm, lên, phải, xuống, trái |
| 4. Chạm đích | 5100–6600 | cắt xuống `T(f −3.5, r 0, u +2.4)`, nhìn tâm, FOV 34° | `tImpact` ≈ 5175, 5355, 5535, 5715, 5895; mỗi ô theo kết quả; aftermath |
Shot 3 và 4 chồng nhau ở 5100–3800: **cắt cứng** sang shot 4 tại 5100 ms.

## 5. Tàu ngầm — `torpedo` (tổng 6300 ms)
Ý đồ: **một đường camera liên tục, không cắt**, đi từ **dưới nước** lên **trên mặt nước** rồi lên **cao phía trên** để thấy cả tàu và nơi bắn. Phần dưới nước chỉ là khoảnh khắc đầu (không kéo dài); camera bắt đầu nâng ngay.

Vật thể: ngư lôi hiển thị là **tên lửa-ngư lôi** (`fx_torpedo`): thân dài 0.15, lửa đuôi cam, vệt khói trắng và vệt nước; phóng ra từ ống ở mũi, **vọt lên khỏi mặt nước và bay sát mặt biển (cao 0.12–0.2)** dọc đường đã chọn rồi lao xuống đích. Trước khi phóng, tàu **nổi cao hơn** (nâng `ship_submarine` lên Δy +0.05) để các nắp ống phóng nằm trên mặt nước, nhìn thấy được.

| Shot | Thời gian | Camera | Sự kiện |
|---|---|---|---|
| 1. **Camera đi liên tục từ dưới nước lên cao** (một đường, không cắt) | 0–2400 | bắt đầu **dưới nước nhìn ngang mạn phải** pos `(f +0.4, r +2.6, u −0.15)`, nhìn `(f +0.4, r 0, u −0.02)`, FOV 50° (thấy 100% thân và vùng mũi). **Chỉ ở dưới nước 0–600 ms rồi bắt đầu nâng ngay**; **xuyên mặt nước ở khoảng 900 ms** (vệt nước chảy trên ống kính 300 ms, bọt trắng, màu chuyển từ xanh đen sang cảnh trên mặt); tiếp tục nâng và dịch nhẹ `r +2.6 → +2.2` tới pos `(f +0.2, r +2.2, u +1.7)` lúc 2100–2400; điểm nhìn trượt dần từ `(f +0.4, r 0, u −0.02)` sang `(f +0.8, r 0, u 0)`; FOV 50° → 44°. Thấy ≥ 100% thân suốt hành trình | tàu ngầm **nổi từ `y −0.35` lên `+0.05` trong 0–1500 ms, cùng lúc camera đi lên**; bọt khí ballast; **nắp ống `torpedo_flap_0..3` mở ở 1500–1900** (lệch 120 ms mỗi nắp, đèn đỏ bên trong, hơi nước), thấy rõ từ trên khi camera đã lên khỏi mặt nước |
| 2. **Trên cao, thấy tàu và nơi bắn** | 2400–4500 | camera **giữ ở trên cao** `(f +0.2, r +2.2, u +1.7)`, trôi chậm về phía mũi tới `(f +0.6, r +2.2, u +1.7)`, nhìn `(f +0.8, r 0, u 0)`, FOV 44° (thấy ≥ 100% thân và vùng nước phía mũi) | **4 tên lửa-ngư lôi** phóng từ `launch` ở 2700, 2925, 3150, 3375 (cách 225 ms), **vọt lên khỏi ống, thân hero ×2.5 có lửa đuôi và vệt khói trắng**, bay sát mặt nước theo đường đã chọn; mỗi ô đi qua phát vòng sóng trên mặt nước |
| 2a. Insert cận nơi phóng | 2640–3240 | pos `(f +1.9, r +0.7, u +0.25)`, nhìn `launch` `(f +1.4, 0, 0.05)`, FOV 32° | thấy **tên lửa-ngư lôi đủ thân rời ống**, lửa phụt, bọt nước bắn khi thoát; giữ ≥ 600 ms; sau đó cắt về shot 2 |
| 3. Trúng đích | 4500–6300 | toàn cảnh đường đi: `T(f −2.0, r 0, u +4.5)` ở mép vào đường, nhìn dọc đường, FOV 45°, kéo lùi 0.8 | nếu **trúng**: tên lửa-ngư lôi đầu nổ ở ô trúng (`fx_hit_torpedo`), ba quả sau nổ thứ phát cách 150 ms; nếu **trượt hết**: bốn quả mờ dần ở mép xa, vòng sóng cuối, chìm |
Ghi chú: cinematic kể chuyện "tàu mình phóng vào đường đã chọn"; khoảng cách thật tới mép lưới không bắt buộc thể hiện (shot 3 và chuyển cảnh che gián đoạn).

## 6. Tàu sân bay — `line3` (tổng 6750 ms, **ba cảnh chính**)
Ý đồ: gọn và dứt khoát, đúng ba cảnh: **(1) máy bay cất cánh, lia cam theo**; **(2) camera đứng yên ở mặt nước bên địch hướng lên, máy bay bay qua đầu**; **(3) tên lửa rơi xuống**. Bỏ cảnh thiết lập, cảnh bám vòng quanh, cảnh kéo xa và cảnh cận riêng (giảm tổng 25% so với 9000 ms).

### 6.1 Quy tắc điện ảnh (giữ gọn)
- **Dải đen 2.39:1** trượt vào trong 450 ms đầu, trượt ra ở 450 ms cuối; tắt khi "Khung điện ảnh" tắt hoặc `prefers-reduced-motion` (`screens.md` mục 10).
- **Ống kính dài** (FOV 24–34°) cho cả ba cảnh; vật chính đặt ở đường 1/3, chừa khoảng trống phía trước hướng bay. **Độ sâu trường ảnh nông**, nét ở máy bay hoặc tên lửa.
- Cảnh 1 **lia cam mềm** (ease-in-out); cảnh 2 và cảnh 3 gần như **đứng yên** (không rung, không lia). Âm có hiệu ứng **Doppler** khi máy bay vọt qua; nhịp trống nặng lúc ray bắn.

### 6.2 Chuỗi cảnh
| Cảnh | Thời gian | Camera (vị trí, nhìn, FOV) | Sự kiện |
|---|---|---|---|
| **1. Máy bay cất cánh, lia cam** | 0–2400 | camera **thấp ở mép mũi** pos `(f +2.45, r +0.20, u +0.08)`, nhìn **ngược lại dọc ray** `(f +1.2, r +0.10, u +0.14)`, ống kính dài FOV 24°. Giữ nguyên 0–1150; từ 1150 **lia theo máy bay** (tilt up và pan nhẹ) ngả lên trời theo máy bay đầu tới 2400 | 0–700: đèn ray đỏ → xanh, `jbd_0/1` dựng, hơi nước; **700**: ray bắn (nhịp trống), hai máy bay lao về phía camera; **1150–1300**: máy bay vọt qua đầu camera (Doppler); máy bay thứ ba (`plane_2`) cất cánh trên boong sau 450 ms; `plane_N` đã bay thì ẩn; 1300–2400: camera lia theo, máy bay bay xa thành chấm nhỏ trên trời, xếp đội hình hướng về mục tiêu; thấy **tên lửa dưới cánh** (hero ×2.5) lúc đi qua |
| **2. Máy bay bay qua, camera đứng yên dưới nước bên địch** | 2400–4350 | camera **đứng yên, thấp sát mặt nước, ở vùng nước của bên bị tấn công (bên địch)**, pos `T(f −2.0, r +1.0, u +0.10)`, **nhìn lên trời** (nghiêng lên khoảng 45°) về điểm `T(f −0.6, r 0, u +3.2)`, FOV 34°; **không lia, không rung** | **2700**: đội hình chữ V của ba máy bay lọt vào khung từ **góc trên bên trái** (hướng tàu sân bay), bay qua đầu camera ở **3300–3600** (cách nhau 200 ms), ra khỏi khung phía bên kia ở khoảng **4200**; Doppler, tia chói nhẹ lửa đuôi (độ mờ ≤ 0.25), vệt khói; thấy rõ **tên lửa dưới cánh** khi bay qua |
| **3. Tên lửa rơi xuống** | 4350–6750 | camera **thấp bên cạnh dải mục tiêu**, pos `T(f −3.2, r +1.8, u +0.60)`, nhìn dải `T(f 0, r 0, u +0.20)`, FOV 32°, đứng yên hoặc đẩy vào rất chậm 0.3 | máy bay thả tên lửa ở **4350, 4575, 4800** (cách 225 ms; ô ngoài lưới thì không thả); **tên lửa lọt vào khung từ mép trên rồi rơi xuống từng ô** (hero ×1.5, đầu sáng, lửa đuôi, vệt khói rõ ràng); `tImpact` ≈ **5400, 5625, 5850**; mỗi ô nổ theo kết quả; **chậm 0.6×** quanh vụ nổ đầu; 6300–6750 dư âm: khói chùm, dải đen trượt ra, camera trượt về `tactical` |
Máy bay không quay lại tàu trong cinematic.

### 6.3 Mốc đồng bộ (để lập trình)
| Mốc (ms) | Sự kiện |
|---|---|
| 0 | dải đen trượt vào (450 ms), cảnh 1 bắt đầu |
| 700 | ray bắn, máy bay lao |
| 1150–1300 | máy bay vọt qua đầu camera; camera bắt đầu lia theo |
| 2400 | cắt sang cảnh 2 (camera dưới nước bên địch) |
| 2700 | máy bay vào khung |
| 3300–3600 | máy bay bay qua đầu camera |
| 4350 | cắt sang cảnh 3; thả quả đầu |
| 4575, 4800 | thả quả thứ hai và thứ ba |
| 5400, 5625, 5850 | `tImpact` ba ô |
| 6300 | dải đen trượt ra; kết thúc 6750 |

### 6.4 Cài đặt liên quan
Tùy chọn **"Khung điện ảnh"** (bật/tắt) trong Cài đặt (`screens.md` mục 10), mặc định bật cho cinematic tàu sân bay (các cinematic khác không dùng dải đen).

## 7. Bảng tổng
| Đòn | Tàu | Tổng (ms) | Cảnh mở đầu | Cảnh khai hỏa (rộng + cận) |
|---|---|---|---|---|
| rapid | Khu trục hạm | 4800 | nghiêng trên xuống, hai tháp quay hai hướng | mạn tàu 90% thân + 2 insert cận nòng (đạn rõ) |
| precision | Tuần dương | 5250 | đỉnh nhìn thẳng, hơi chéo sau | mạn tàu 100% thân (chao, nổ, ánh sáng) + insert cận đạn pháo lớn |
| cross | Tàu tên lửa | 6600 | mạn tàu 100% thân, tháp ngẩng | mạn tàu 100% thân + 2 insert cận dãy trước và sau (tên lửa rõ) + chùm parabol |
| torpedo | Tàu ngầm | 6300 | dưới nước nhìn ngang mạn, camera đi lên liên tục qua mặt nước (không cắt) | trên cao thấy tàu và nơi bắn + insert cận tên lửa-ngư lôi rời ống + rải thảm |
| line3 | Tàu sân bay | 6750 | cất cánh, lia cam | camera đứng yên dưới nước bên địch nhìn máy bay bay qua, rồi tên lửa rơi xuống |

## 8. Biến thể chung
- **Trượt**: dùng kết quả ô `trượt` (cột nước), không có nhãn lộ tàu.
- **Chìm**: sau khi ô cuối trúng, thêm cảnh chìm 10800 ms, mỗi loại tàu một kiểu (`sinking.md` mục 2, `animations.md` mục 6) ngay sau shot trúng đích. Tổng có thể vượt 5 s; **cảnh chìm tách ra được bỏ qua riêng**.
- **Đòn kết thúc ván**: slow-motion 0.4× lúc tàu cuối chìm (`animations.md` mục 7).
- **Vùng đánh sát mép**: ô ngoài lưới không có đạn rơi, không có hiệu ứng, camera mục tiêu vẫn nhìn vào tâm vùng nằm trong lưới.
- **Ô đã có kết quả từ trước** nằm trong vùng đánh: đạn vẫn bay tới nhưng chỉ có hiệu ứng nhỏ (khói, bụi), không phát lại marker (`rules.md` mục 4).

## 10. Cài đặt liên quan
Trong `screens.md` mục 10 (Settings): tốc độ animation (tắt / x1 / x2), rung màn hình, **cinematic ngắn** (công tắc). Khi "cinematic ngắn" bật, mỗi đòn chỉ phát shot trúng đích (khoảng 1.8 s).

## 9. Kỹ năng nội tại (passive) của hai tàu mới

Kỹ năng nội tại xen vào sự kiện của lượt, không do người chơi chọn, nên cảnh quay phải **ngắn và nhanh** để không làm chậm trận. Tối đa 1.8 s (x1) mỗi lần, bỏ qua được, chạy trong cùng hàng đợi sự kiện (`animations.md` mục 8). Chế độ "cinematic ngắn": chỉ phát cảnh trúng đích.

### 9.1 Tàu cắn lén — `sneak` (tổng 1875 ms mỗi phát)
Phát lúc đầu trận (trước lượt 1) và đầu mỗi lượt chẵn của chủ tàu (`rules.md` 10.1).

| Shot | Thời gian | Camera | Sự kiện |
|---|---|---|---|
| 1. Cận tàu cắn lén (đạn rõ, hero ×1.2) | 0–655 | pos `(f +0.45, r +0.38, u +0.14)` (neo `cam_close`), nhìn `muzzle`, FOV 34° | nhãn ngắn "CẮN LÉN" hiện bên cạnh tàu 560 ms; pháo nhỏ quay nhanh tới hướng ô ngẫu nhiên (190 ms); **hạ nắp che nòng**; bắn ở 700 ms (`fx_muzzle_s` nhỏ, rung 0.01, **ít tiếng**) |
| 2. Đạn bay | 655–1405 | theo đạn, `T(f −3.0, r +0.4, u +2.6)`, FOV 36° | đạn bay **rất nhanh** (28 ô/giây, vệt mảnh), không có vệt rộng; không cầu lửa lúc bắn |
| 3. Chạm đích | 1405–1875 | giữ camera mục tiêu | `tImpact` ≈ 1500; kết quả ô theo `env-and-fx.md` mục 8 nhưng **nhỏ hơn 25%** (đây chỉ là phát phụ); nếu trúng nhẹ lộ khói, nếu chìm thì cảnh chìm đầy đủ 13500 ms (`sinking.md`) |
- Bên bị bắn thấy đạn đột ngột rơi xuống lưới mình, nhãn "PHỤC KÍCH" hiện cạnh ô trúng. Không lộ vị trí tàu cắn lén của địch.
- Đầu trận: hai phát (bên đi trước rồi bên đi sau) phát lần lượt, mỗi phát 1875 ms, camera `tactical` trước và sau.

### 9.2 Tàu hộ vệ — `guard` (hai cảnh: phát hiện rồi chế áp, tổng 2810 ms)
Chèn **sau khi "cảnh trúng đích" của đòn địch bắt đầu** và trước các vụ nổ thật. Gồm hai cảnh nối nhau: **cảnh 1 PHÁT HIỆN** (radar bắt mục tiêu), **cảnh 2 CHẾ ÁP** (pháo nhiều nòng bắn cực nhanh triệt tiêu đạn). Tọa độ camera dùng trục model của tàu hộ vệ `M(x, y, z)`: x về mũi (+X), y lên, z ngang; `in` = hướng đạn bay tới.

**Cảnh 1 — Phát hiện (0–1125 ms)**
| Mốc (ms) | Camera | Sự kiện |
|---|---|---|
| 0–375 | pos `M(−1.5, +1.1, +0.6)`, nhìn vòm radar `M(+0.18, +0.15, 0)`, FOV 34°, dolly vào 0.3 | **vòm radar sáng viền cam** (`mat_emissive_guard` 0 → 1 trong 375 ms) và bắt đầu quay; đèn đỏ cột ăng-ten nhấp nháy; nhãn **"PHÁT HIỆN"** hiện 560 ms cạnh tàu |
| 375–750 | quay (orbit) 15° quanh vòm radar, **rack focus** từ vòm radar ra bầu trời hướng đạn | **tia quét radar** (`fx_radar_sweep`): nón sáng mờ quét 360° trong 875 ms từ vòm radar; **các đạn tới bị khóa**: khung ngắm cam (`fx_lock_reticle`) bật lên quanh từng đạn trên trời, **cách nhau 125 ms**, kèm đường nét đứt cam nối vòm radar với đạn; **số khung khóa bằng số ô bị triệt tiêu** (không nhiều hơn 5) |
| 750–1125 | hạ thấp, pos `M(−0.2, +0.8, +0.5)`, nhìn theo hướng `in` (hướng đạn), FOV 30° | ping radar 3 nhịp (cách 150 ms); **bốn CIWS xoay đồng loạt về hướng đạn** (ciws_1..4, yaw và pitch, 310 ms), cụm nòng **bắt đầu quay lấy đà**; giàn mồi nhử `decoy_N` bung nắp |

**Cảnh 2 — Chế áp bằng pháo nhiều nòng bắn cực nhanh (1125–2815 ms)**
| Mốc (ms) | Camera | Sự kiện |
|---|---|---|
| 1125–1690 | **cận CIWS**: pos `M(+1.02, +0.30, −0.58)`, nhìn `ciws_3` `M(+0.62, +0.11, −0.30)`, FOV 28°, DOF nông | thấy **cụm 6 nòng quay lấy đà** từ 0 tới tốc độ bắn trong 310 ms (mờ thành vòng tròn); **1310**: **bắt đầu xả đạn**: chớp mõm nhấp nháy dồn dập, **vệt đạn dày đặc như một tia sáng liên tục**, **vỏ đạn vàng văng ra thành vòng rơi xuống nước**, khói mõm mỏng, nòng rung |
| 1690–2625 | **toàn cảnh**: `intercept_cam` `M(0, +0.9, −1.4)` trôi nhẹ sang `M(−0.2, +1.0, −1.6)`, nhìn trời hướng `in`, FOV 40° | **cả bốn CIWS xả đạn cùng lúc**, bốn tia đạn hội tụ vào từng đạn tới; mỗi lần trúng: **nổ lửng lơ** (`fx_airburst`) tại vị trí đạn, cách nhau 250 ms (ở 1875, 2125, 2375… theo số ô bị triệt tiêu); với tên lửa lớn có thể nổ chuỗi 3 điểm; giàn mồi nhử phun chaff bạc (`fx_chaff`); tia lửa và mảnh vụn rơi xuống nước |
| 2625–2810 | kéo nhẹ ra, trở về camera mục tiêu | CIWS ngừng bắn (cụm nòng quay chậm dần), khói mõm tan; mảnh vụn và chaff rơi; **các ô bị triệt tiêu hiện marker `blocked`** |

**Thông số "bắn tốc độ cao hàng ngàn viên/phút"** (hiển thị, không phải mô phỏng đạn đạo):
- Mỗi CIWS: **4500 viên/phút (75 viên/giây)**; bốn khẩu: **300 viên/giây**. Mỗi loạt 625–940 ms, tức 40–55 viên mỗi khẩu.
- **Vệt đạn**: bộ phát hạt 75 hạt/giây mỗi nòng (instancing), vận tốc 45 ô/giây, sống 0.35 s, đầu sáng cam–trắng `#FFD27A`, kéo dài thành **tia sáng liên tục** (không nhìn ra từng viên rời rạc); mỗi ô vật thể có đệm sáng nhẹ.
- **Cụm nòng**: 6 nòng, quay 50 vòng/giây (hiển thị mờ thành vòng tròn), node `ciws_N_spin` (xem `ship-escort.md`).
- **Chớp mõm**: nhấp nháy 24 Hz (không nhấp nháy 75 Hz để tránh chói), kèm đèn điểm cam nhẹ dao động; khói mõm mỏng.
- **Vỏ đạn**: 40 hạt/giây mỗi khẩu, kim loại vàng `#E0B04A`, văng sang mạn phải khẩu súng, rơi xuống nước tạo bọt nhỏ.
- **Rung**: 0.01 liên tục suốt loạt bắn (không phải từng viên).
- **Ngư lôi (tên lửa-ngư lôi)**: bay sát mặt biển nên CIWS bắn được; khi bị trúng, nổ cột nước nhỏ (`fx_counter_splash`) thay vì airburst.
- **Âm thanh**: tiếng rền liên tục dạng "brrrt" (không tách từng phát), rền trầm của cụm nòng; ping radar ở cảnh 1.

**Quy tắc chung**
- Nếu toàn bộ ô bị triệt tiêu (đòn 1 ô): chỉ có chuỗi airburst/cột nước, không cầu lửa trúng, không marker `hit`/`miss`; ô hiện marker `blocked`.
- Marker `blocked` xuất hiện đúng thời điểm `tImpact` của ô bị chặn, pop `markerPopMs`.
- Đạn tới và đạn bị chặn đều phải **thấy rõ** (hero ×2.5 ở cảnh rộng) theo quy tắc hiển thị vật bắn ở mục 1.
- Hộ vệ không kích hoạt: không có cảnh gì thêm; nhật ký không ghi.
- Khi hộ vệ chìm: thêm cảnh chìm đầy đủ; UI báo "Hộ vệ bị hạ".

### 9.3 Ghi chú
- Cảnh passive tối đa **5 s** tổng cộng mỗi lượt (tàu cắn lén 1875 ms + hộ vệ 2810 ms = khoảng 4.7 s); nếu cả hai cùng kích hoạt trong một lượt, rút ngắn mỗi cảnh xuống 70% (khoảng 3.3 s tổng).
- Tốc độ x2 chia đôi mốc; "tắt cinematic": chỉ pop marker và nhật ký ngắn.

