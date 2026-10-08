# Cinematic các đòn đánh (năm đòn đầu, thêm đòn dội pháo ở mục 11)

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

## 6. Tàu sân bay — `line3` (tổng 6450 ms, **hai cảnh: một cú máy liên tục trên trời, rồi cảnh mặt nước thả tên lửa**)
Ý đồ: gọn và mượt. **Cảnh 1** là **một cú máy liên tục duy nhất** (không cắt, không đổi góc đột ngột): camera lia theo đoàn máy bay từ lúc cất cánh cho tới khi tới vùng mục tiêu. **Cảnh 2** camera **đứng ở mặt nước bên địch**, thấy rõ **mặt biển và sóng** ở tiền cảnh, đoàn máy bay bay ngang trên cao và **thả tên lửa xuống từng ô**. Bỏ các cảnh trời rời rạc cũ (cắt ngang giữa lúc máy bay cất cánh, nhìn lên trời, rồi lại cắt).

### 6.1 Quy tắc điện ảnh (giữ gọn)
- **Dải đen 2.39:1** trượt vào trong 450 ms đầu, trượt ra ở 450 ms cuối; tắt khi "Khung điện ảnh" tắt hoặc `prefers-reduced-motion` (`screens.md` mục 10).
- Cảnh 1: **không có cú cắt nào**; camera chuyển động liên tục theo đường cong mượt (ease-in-out), chuyển động **lia (pan) và đẩy theo (dolly)** theo hướng bay; không giật, không xoay đột ngột; FOV đổi chậm 28° → 34°.
- Cảnh 2: camera **đứng yên** (chỉ nhấp nhô theo sóng, mục 6.2); ống kính FOV 38°; **độ sâu trường ảnh nông**, nét ở máy bay và tên lửa. Âm có hiệu ứng **Doppler** khi máy bay vọt qua; nhịp trống nặng lúc ray bắn.

### 6.2 Chuỗi cảnh
| Cảnh | Thời gian | Camera | Sự kiện |
|---|---|---|---|
| **1. Một cú máy: cất cánh và bay tới mục tiêu** | 0–3000 | **một đường camera liên tục**. Bắt đầu 0: pos `(f +2.2, r +0.9, u +0.12)` (thấp, cạnh cuối ray bên mạn phải), nhìn `(f +1.4, r +0.1, u +0.15)`, FOV 28°. Từ 700: **lia theo máy bay dẫn đầu** (đặt điểm nhìn = máy bay đầu đàn, làm mượt 400 ms); pos **đẩy tiến về phía bay** với tốc độ 35% tốc độ máy bay và **nâng dần** tới `(f +24, r +1.6, u +1.0)` ở 3000 (ngả từ thấp lên cao, thấy biển và đường chân trời bên dưới), FOV mở 28° → 34° | 0–700: đèn ray đỏ → xanh, `jbd_0/1` dựng, hơi nước; **700**: ray bắn (nhịp trống), hai máy bay lao dọc ray; **900–1000**: máy bay vọt qua camera, Doppler; máy bay thứ ba (`plane_2`) cất cánh trên boong sau 450 ms, máy bay thứ tư (`plane_3`) sau thêm 450 ms; **1000–3000**: camera bám đàn bay, **tên lửa dưới cánh** (hero ×2.5) thấy rõ lúc còn gần; đàn xếp thành **hàng nối đuôi nhau, cách nhau 10 ĐV**, bay cao dần tới độ cao **22 ĐV** (u +2.2), tốc độ **90 ĐV/s**, hướng theo trục dải mục tiêu; thấy mặt biển, sóng và bọt trắng chạy bên dưới; **tới 3000**: đàn tiến vào vùng mục tiêu ở xa, thành các chấm nhỏ ở mép khung |
| **2. Mặt nước: máy bay thả tên lửa xuống** | 3000–6450 | camera **đứng ở mặt nước, bên cạnh dải mục tiêu**, ở **tâm dải `M`** lùi vuông góc trục dải **4.6 ô về phía gần camera chiến thuật**, lệch `−0.4 ô` theo hướng ngược chiều bay: pos `M + (f −0.4, r +4.6, u +0.35)` (cao 3.5 ĐV so với mặt nước; **mặt biển và sóng chiếm khoảng 1/3 khung dưới**), nhìn `M + (u +1.1)`, FOV **38°** (rộng 5.6 ô, đủ cả dải 4 ô; cao từ u −0.45 đến u +2.65 ô); **đứng yên**, chỉ nhấp nhô theo sóng (nâng hạ ±1.5 ĐV, lăn ±1°, tần số theo biển); vài giọt nước bắn lên ống kính khi có cột nước | **3470–3770**: máy bay dẫn đầu lọt vào khung từ mép trái, bay ngang trên đầu ở độ cao 22 ĐV; **các máy bay nối đuôi nhau cách nhau 10 ĐV**, tốc độ 90 ĐV/s; mỗi máy bay thả **một tên lửa** khi bay qua đúng ô của nó (máy bay `i` thả lên ô `i` của dải, theo chiều tăng của trục): thả ở **3600, 3825, 4050, 4275** (cách 225 ms; ô ngoài lưới thì không thả); **thấy tên lửa tách khỏi giá treo dưới cánh** (kẹp bật, đẩy nhẹ), rơi chúi đầu, **nổ máy ở 250 ms sau khi tách** (lửa đuôi cam, vệt khói trắng đục) rồi **lao xuống ô** (hero ×1.5, đầu sáng, viền tối mỏng); `tImpact` = lúc thả + 1050 ≈ **4650, 4875, 5100, 5325**; mỗi ô nổ theo kết quả (cột nước, lửa), sóng xung kích làm nước ở tiền cảnh rung; **chậm 0.6×** quanh vụ nổ đầu (4600–5200); máy bay cuối ra khỏi khung bên phải ở khoảng 4700; 5600–6450 dư âm: khói chùm trôi theo gió, mặt biển lặng dần; dải đen trượt ra từ 6000 |
Máy bay không quay lại tàu trong cinematic. Các máy bay thả quả không có ô ngoài lưới thì vẫn bay qua nhưng không có tên lửa tách giá.

### 6.3 Mốc đồng bộ (để lập trình)
| Mốc (ms) | Sự kiện |
|---|---|
| 0 | dải đen trượt vào (450 ms), cảnh 1 bắt đầu |
| 700 | ray bắn; camera bắt đầu lia theo máy bay dẫn đầu |
| 900–1000 | máy bay vọt qua camera |
| 1150, 1600 | `plane_2`, `plane_3` cất cánh trên boong |
| 3000 | **cắt duy nhất**: sang cảnh 2 (mặt nước) |
| 3470 | máy bay dẫn đầu vào khung |
| 3600, 3825, 4050, 4275 | thả tên lửa thứ 1, 2, 3, 4 (nổ máy sau 250 ms) |
| 4650, 4875, 5100, 5325 | `tImpact` bốn ô |
| 4600–5200 | chậm 0.6× |
| 6000 | dải đen trượt ra; kết thúc 6450 |

### 6.4 Cài đặt liên quan
Tùy chọn **"Khung điện ảnh"** (bật/tắt) trong Cài đặt (`screens.md` mục 10), mặc định bật cho cinematic tàu sân bay (các cinematic khác không dùng dải đen).
- **Cinematic ngắn**: chỉ phát cảnh 2 rút gọn khoảng 2000 ms (máy bay đã ở giữa khung khi bắt đầu, thả ở 300, 525, 750, 975 ms).
- **Địch bắn**: cảnh 1 theo khung tàu địch; cảnh 2 đặt camera ở mặt nước bên lưới của mình, cùng quy tắc `M`.

## 7. Bảng tổng
| Đòn | Tàu | Tổng (ms) | Cảnh mở đầu | Cảnh khai hỏa (rộng + cận) |
|---|---|---|---|---|
| rapid | Khu trục hạm | 4800 | nghiêng trên xuống, hai tháp quay hai hướng | mạn tàu 90% thân + 2 insert cận nòng (đạn rõ) |
| precision | Tuần dương | 5250 | đỉnh nhìn thẳng, hơi chéo sau | mạn tàu 100% thân (chao, nổ, ánh sáng) + insert cận đạn pháo lớn |
| cross | Tàu tên lửa | 6600 | mạn tàu 100% thân, tháp ngẩng | mạn tàu 100% thân + 2 insert cận dãy trước và sau (tên lửa rõ) + chùm parabol |
| torpedo | Tàu ngầm | 6300 | dưới nước nhìn ngang mạn, camera đi lên liên tục qua mặt nước (không cắt) | trên cao thấy tàu và nơi bắn + insert cận tên lửa-ngư lôi rời ống + rải thảm |
| barrage | Siêu chiến hạm | 8400 | quay nòng năm tháp, từ trên chéo sau | mạn tàu 100% thân + 2 insert cận nòng (15 viên đạn) + **toàn chiến trường nhìn từ trên cao, camera đi vòng 1/6 đường tròn quanh tâm lưới địch** |
| line3 | Tàu sân bay | 6450 | **một cú máy liên tục**: cất cánh, lia theo đàn bay tới mục tiêu | camera đứng ở mặt nước (thấy sóng) nhìn đàn máy bay thả tên lửa xuống từng ô |

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


## 11. Siêu chiến hạm — `barrage` (tổng 8400 ms, ba cảnh)
Ý đồ: **quay nòng** năm tháp về năm hướng khác nhau, **xả đạn hàng loạt** từ mạn tàu, rồi **cảnh toàn chiến trường**: camera nhìn thẳng từ trên cao xuống, **đi vòng ngang 1/6 đường tròn (60°)** quanh tâm lưới địch trong lúc năm cụm đạn rơi và nổ. Đòn này **không có nhắm**; năm ô do core chọn ngẫu nhiên (`rules.md` mục 4.6), thứ tự `cells[i]` ứng với tháp pháo `i + 1`. Mô hình tàu: `ship-dreadnought.md`.

| Shot | Thời gian | Camera | Sự kiện |
|---|---|---|---|
| 1. **Quay nòng, từ trên chéo sau** | 0–1800 | pos `(f −3.0, r +1.8, u +4.6)`, nhìn `(f 0, r 0, u +0.1)`, FOV 40°, trôi chậm tới `(f −2.4, r +1.5, u +4.4)` (thấy cả thân dài 4 ô và các tháp) | **năm tháp xoay về năm hướng khác nhau** (mỗi tháp ngắm ô của nó; góc xoay tối đa 180°/giây, 0–1400 ms, lệch nhau 80 ms), nòng ngẩng 40°; pháo phụ `turret_s*` xoay theo; **năm đường ngắm cam** từ tháp tới hướng ô, tắt khi bắn; còi báo, đèn hazard nhấp nháy |
| 2. **Mạn tàu, thấy cả thân** | 1800–3900 | pos `(f 0, r +4.2, u +0.45)`, nhìn `(f 0, r 0, u +0.15)`, FOV 42° (thấy 100% thân, đủ khoảng trống phía mũi để thấy đạn bay) | **khai hỏa hàng loạt**: tháp 1 ở **2100**, tháp 2 ở 2250, tháp 3 ở 2400, tháp 4 ở 2700, tháp 5 ở 2850; mỗi tháp nhả **ba viên** cách nhau 40 ms (`fx_muzzle_l`, hero ×2.5, quầng sáng cam), tổng **15 viên**; chớp mõm theo quy tắc giảm chói (mỗi tháp cách nhau tối thiểu 150 ms để không cháy trắng); sóng giật mạnh hai bên thân; **tàu chao** (lăn +4° trong 450 ms, tắt dần 1500 ms, chúi 1.6°, nhấc lên 0.5 ĐV); khói dày; rung 0.08/500 (×10 ĐV); **slow-motion 0.6× từ 2070 đến 2670** |
| 2a. Insert cận nòng, đội mũi | 2040–2640 | pos `(f +1.5, r +0.9, u +0.5)`, nhìn tháp 2, FOV 32° | thấy ba tháp mũi lần lượt nhả đạn: **ba viên rời nòng rõ ràng**, nòng thụt, vỏ đạn bay, lửa mõm, tháp chao; giữ ≥ 600 ms |
| 2b. Insert cận nòng, đội lái | 2640–3240 | pos `(f −1.2, r +0.9, u +0.5)`, nhìn tháp 4, FOV 32° | tháp 4 (2700) và tháp 5 (2850) khai hỏa |
| 3. **Toàn chiến trường, đi vòng 1/6 đường tròn** | 3900–8400 | camera **nhìn thẳng từ trên cao xuống tâm lưới địch** `C`, quỹ đạo ghi dưới | thấy **cả lưới địch** và các cụm đạn bay vòng cung cao lao xuống; năm vụ nổ lần lượt, lửa, khói, cột nước; aftermath |
Biến thể: nếu chỉ còn `n < 5` ô chưa bắn thì chỉ n tháp đầu (theo thứ tự trên) nhả đạn; các tháp còn lại vẫn quay nòng nhưng không bắn.

### 11.1 Quỹ đạo camera ở shot 3 (tính theo thế giới, đơn vị ĐV)
- `C` = tâm lưới bị bắn: lưới địch `(0, 0, −75)` khi người chơi bắn; lưới mình `(0, 0, +75)` khi địch bắn. `D` = hướng nằm ngang từ `C` về phía bên bắn (`+Z` nếu `C` là lưới địch, `−Z` nếu là lưới mình).
- Camera luôn nhìn vào `C` (nhìn xuống), **độ cao y = 110**, **bán kính ngang 60** (độ chúi nhìn xuống khoảng 61°), FOV dọc 45° (cho cái nhìn bao trọn lưới 100 × 100 ĐV, biên rộng).
- **Quay quanh trục thẳng đứng đi qua `C`**: góc phương vị `φ` đo từ `D`, chạy từ **−30° tới +30°** (tổng **60° = 1/6 vòng**), chiều cố định theo kim đồng hồ nhìn từ trên (từ bên trái sang bên phải của người chơi). Vị trí camera khi `D = +Z`: `(60 sin φ, 110, C.z + 60 cos φ)`; khi `D = −Z` (địch bắn): `(−60 sin φ, 110, C.z − 60 cos φ)` (xoay 180° quanh `C`, cùng chiều quay).
- Đường cong tốc độ góc: ease-in-out nhẹ (sine); không rung camera xoay, chỉ rung từ vụ nổ (biên độ ≤ 0.6 ĐV, tắt dần).
- **Vị trí các vụ nổ trên màn hình** (mốc `tImpact`): tháp 1 ở 4500, tháp 2 ở 4650, tháp 3 ở 4800, tháp 4 ở 5100, tháp 5 ở 5250. Đạn bay **cung cao**: đỉnh cao `35 + 0.4 × khoảng cách ngang` ĐV, thời gian bay **2400 ms** (kéo giãn, bản `Mốc chung`), mỗi cụm ba viên cách nhau 40 ms rơi lệch tối đa 0.4 ĐV quanh ô.
- Đạn **hero ×2.5**: đạn pháo siêu nặng dài 1.0 ĐV thành 2.5, quầng sáng cam, vệt khói trắng đục kéo dài; tại shot này đạn bay **từ ngoài khung vào qua phía trên camera**, nên người chơi thấy đạn đi sượt qua trước khi rơi.
- Kết quả từng ô theo `CellResolved` (hiệu ứng `env-and-fx.md` mục 8): trượt = cột nước, trúng = nổ và lửa, chìm kéo theo cảnh chìm riêng (`sinking.md`). Năm vụ nổ gần nhau nên **giới hạn hiệu ứng đồng thời**: tối đa 3 cầu lửa lớn sống cùng lúc, các vụ còn lại hạ một bậc (cầu lửa nhỏ), không khung hình nào quá 20% diện tích cháy trắng.
- Ô bị hộ vệ triệt tiêu (`ShotNullified`): đạn của ô đó **nổ lửng lơ trên không** ở độ cao 60 ĐV (tái dùng hiệu ứng nổ chặn của hộ vệ, `9.2`), không tới mặt nước. Camera không đổi.
- Tàu bị chìm vì đòn này: cảnh chìm chèn sau shot 3 như mọi đòn (mục 8).

### 11.2 Cài đặt và biến thể
- **Cinematic ngắn** (mục 10): phát shot 3 rút gọn **2400 ms**, quỹ đạo vẫn 60°, đạn đã ở giữa không trung khi bắt đầu, các vụ nổ ở 300, 420, 540, 780, 900 ms.
- Tốc độ x2: mọi mốc chia đôi (tổng 4200 ms). Bỏ qua: nhảy tới cuối 150 ms (`animations.md` mục 8). Tắt cinematic: chỉ pop marker năm ô lần lượt, cách nhau 120 ms.
- Địch bắn: shot 1 và 2 đặt camera theo khung tàu của địch (lật hướng tự nhiên); shot 3 dùng `C` = lưới của mình, `D = −Z`.
- Âm thanh: xem `audio.md`, hàng "Siêu chiến hạm" trong bảng âm theo sự kiện.
