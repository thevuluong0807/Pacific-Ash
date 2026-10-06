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
- Thứ tự cảnh khi bắn: **cảnh rộng (thấy tàu và cú bắn) → insert cận (thấy vật bắn rời bệ) → trở lại cảnh rộng hoặc theo vật bắn**. Insert cận ngắn (525–1350 ms), cắt cứng ra và vào.

**Camera "mạn tàu"** (nhìn ngang thân tàu): luôn **lùi đủ xa để thấy cả cú bắn và ít nhất 2/3 chiều dài thân tàu; ưu tiên cả thân**. Quy ước tính: với FOV dọc `F` và khung 16:9, bề rộng nhìn thấy ở khoảng cách `d` bằng `2·d·tan(F_ngang/2)`, với `F_ngang = 2·atan(1.78·tan(F/2))`. Cần bề rộng nhìn thấy ≥ 1.2 × (phần thân cần thấy). Khoảng cách camera trong các bảng dưới đã tính theo công thức này (kết quả: khu trục hạm 90%, tuần dương 100%, tàu tên lửa 100%, tàu ngầm 100%, tàu sân bay 100% thân).
- **Camera dưới nước** (tàu ngầm): cũng nhìn ngang thân, thấy ít nhất 2/3 tàu và nơi phóng.

### Theo map
Cinematic giữ nguyên camera và mốc thời gian ở mọi map; chỉ diện mạo đổi theo `maps.md` mục 4 (ánh sáng, tông biển, màu dưới nước, độ sáng lửa và khói). Ví dụ cinematic tàu ngầm ở `truong_sa` có nước xanh ngọc ấm và tia hoàng hôn xuyên nước. Sự kiện nền của map (pháo kích, chớp nổ, sấm) **tạm hoãn** khi cinematic chạy (`maps.md` mục 4.4).

### Mốc chung
Mọi đạn bay tính thời gian từ lúc bắn tới lúc chạm theo vận tốc ở `env-and-fx.md` mục 7. Mốc chạm ô là `tImpact` và là mốc để hiện marker 2D (`onCellResolved`). Nếu thời gian bay thực tế dài hơn bảng dưới, **kéo giãn đoạn bay** (không đổi các mốc khác ngoài mốc chạm).

---

## 2. Khu trục hạm — `rapid` (tổng 4800 ms)
Ý đồ: hai tháp pháo quay về **hai hướng khác nhau**; sau đó cảnh **mạn tàu rộng** (thấy gần cả thân) cho thấy hai phát bắn liên tiếp, kèm hai cú **cận nòng** thấy rõ đạn rời nòng.

| Shot | Thời gian | Camera | Sự kiện |
|---|---|---|---|
| 1. Nghiêng từ trên xuống | 0–1500 | pos `(f −2.2, r +1.2, u +3.0)`, nhìn `(f +0.2, r 0, u 0.1)`, FOV 40°, trôi chậm tới `(f −1.8, r +1.0, u +3.0)` | `turret_fwd` quay về hướng ô 1; `turret_aft` quay về hướng ô 2 (hai hướng khác nhau, 0–1800 ms); hai đường ngắm cam từ nòng tới hướng ô, tắt khi bắn |
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

## 5. Tàu ngầm — `torpedo` (tổng 8100 ms)
Ý đồ: bắt đầu **dưới nước nhìn ngang mạn tàu** (thấy cả thân), tàu **trồi lên**; camera **đi lên liên tục**: từ dưới nước, xuyên mặt nước, rồi **lên hẳn phía trên mặt nước** trước khi tên lửa-ngư lôi phóng, để thấy **cả tàu và nơi bắn**. Sau đó rải thảm theo đường đã chọn.

Thay đổi vật thể: ngư lôi giờ hiển thị là **tên lửa-ngư lôi** (`fx_torpedo`): thân dài 0.15, lửa đuôi cam, vệt khói trắng và vệt nước; phóng ra từ ống ở mũi, **vọt lên khỏi mặt nước và bay sát mặt biển (cao 0.12–0.2)** dọc đường đã chọn rồi lao xuống đích. Trước khi phóng, tàu **nổi cao hơn** (hạ độ sâu: nâng `ship_submarine` lên Δy +0.05) để các nắp ống phóng nằm trên mặt nước, nhìn thấy được.

| Shot | Thời gian | Camera | Sự kiện |
|---|---|---|---|
| 1. **Dưới nước, mạn tàu, tàu trồi lên** | 0–2400 | pos `(f +0.4, r +2.6, u −0.15)` (dưới mặt nước, nhìn ngang mạn phải), nhìn `(f +0.4, r 0, u −0.02)`, FOV 50° (thấy 100% thân và vùng mũi), đứng yên 0–900 rồi bắt đầu **nâng dần** `u −0.15 → −0.05` | tàu ngầm nổi từ `y −0.35` lên `+0.05` (cao hơn bình thường); bọt khí ballast; mặt nước phía trên lung linh; màu xanh đen, tầm nhìn 6 |
| 2. **Xuyên mặt nước** | 2400–3900 | camera **đi lên liên tục** từ `u −0.05` qua mặt nước tới `u +0.30`, đồng thời dịch nhẹ `r +2.6 → +2.4`, nhìn theo điểm phóng `(f +1.2, r 0, u 0)`, FOV 48° | khi camera chạm mặt nước: hiệu ứng ống kính (vệt nước chảy trên ống kính 450 ms, bọt trắng), màu chuyển từ xanh đen sang cảnh trên mặt; **nắp ống phóng `torpedo_flap_0..3` mở ở 2850** (lệch 180 ms mỗi nắp), đèn đỏ bên trong, hơi nước |
| 3. **Trên cao, thấy tàu và nơi bắn** | 3900–6300 | camera đã **lên hẳn phía trên mặt nước**: từ `u +0.30` bay lên tới pos `(f +0.2, r +2.2, u +1.7)` trong 900 ms đầu của shot, nhìn `(f +0.8, r 0, u 0)`, FOV 44° (thấy ≥ 100% thân và vùng nước phía mũi); sau đó trượt chậm về phía mũi `(f +0.6)` | **4 tên lửa-ngư lôi** phóng từ `launch` ở 4050, 2850, 3000, 3150 (cách 150 ms), **vọt lên khỏi ống, thân hero ×2.5 có lửa đuôi và vệt khói trắng**, bay sát mặt nước theo đường đã chọn; mỗi ô đi qua phát vòng sóng trên mặt nước |
| 3a. Insert cận nơi phóng | 4020–4620 | pos `(f +1.9, r +0.7, u +0.25)`, nhìn `launch` `(f +1.4, 0, 0.05)`, FOV 32° | thấy **tên lửa-ngư lôi đủ thân rời ống**, lửa phụt, bọt nước bắn khi thoát; giữ ≥ 600 ms; sau đó cắt về shot 3 |
| 4. Trúng đích | 6300–8100 | toàn cảnh đường đi: `T(f −2.0, r 0, u +4.5)` ở mép vào đường, nhìn dọc đường, FOV 45°, kéo lùi 0.8 | nếu **trúng**: tên lửa-ngư lôi đầu nổ ở ô trúng (`fx_hit_torpedo`), ba quả sau nổ thứ phát cách 150 ms; nếu **trượt hết**: bốn quả mờ dần ở mép xa, vòng sóng cuối, chìm |
Ghi chú: cinematic kể chuyện "tàu mình phóng vào đường đã chọn"; khoảng cách thật tới mép lưới không bắt buộc thể hiện (shot 4 và chuyển cảnh che gián đoạn).

@@CARRIER@@
## 7. Bảng tổng
| Đòn | Tàu | Tổng (ms) | Cảnh mở đầu | Cảnh khai hỏa (rộng + cận) |
|---|---|---|---|---|
| rapid | Khu trục hạm | 4800 | nghiêng trên xuống, hai tháp quay hai hướng | mạn tàu 90% thân + 2 insert cận nòng (đạn rõ) |
| precision | Tuần dương | 5250 | đỉnh nhìn thẳng, hơi chéo sau | mạn tàu 100% thân (chao, nổ, ánh sáng) + insert cận đạn pháo lớn |
| cross | Tàu tên lửa | 6600 | mạn tàu 100% thân, tháp ngẩng | mạn tàu 100% thân + 2 insert cận dãy trước và sau (tên lửa rõ) + chùm parabol |
| torpedo | Tàu ngầm | 8100 | dưới nước nhìn ngang mạn, trồi lên, camera đi lên qua mặt nước | trên cao thấy tàu và nơi bắn + insert cận tên lửa-ngư lôi rời ống + rải thảm |
| line3 | Tàu sân bay | 8400 | mạn tàu 100% thân, cất cánh | tổng thể + insert cận thả tên lửa không đối đất |

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

### 9.1 Tàu cắn lén — `sneak` (tổng 1500 ms mỗi phát)
Phát lúc đầu trận (trước lượt 1) và đầu mỗi lượt chẵn của chủ tàu (`rules.md` 10.1).

| Shot | Thời gian | Camera | Sự kiện |
|---|---|---|---|
| 1. Cận tàu cắn lén (đạn rõ, hero ×1.2) | 0–525 | pos `(f +0.45, r +0.38, u +0.14)` (neo `cam_close`), nhìn `muzzle`, FOV 34° | nhãn ngắn "CẮN LÉN" hiện bên cạnh tàu 450 ms; pháo nhỏ quay nhanh tới hướng ô ngẫu nhiên (150 ms); **hạ nắp che nòng**; bắn ở 560 ms (`fx_muzzle_s` nhỏ, rung 0.01, **ít tiếng**) |
| 2. Đạn bay | 525–1125 | theo đạn, `T(f −3.0, r +0.4, u +2.6)`, FOV 36° | đạn bay **rất nhanh** (28 ô/giây, vệt mảnh), không có vệt rộng; không cầu lửa lúc bắn |
| 3. Chạm đích | 1125–1500 | giữ camera mục tiêu | `tImpact` ≈ 1200; kết quả ô theo `env-and-fx.md` mục 8 nhưng **nhỏ hơn 25%** (đây chỉ là phát phụ); nếu trúng nhẹ lộ khói, nếu chìm thì cảnh chìm đầy đủ 10800 ms (`sinking.md`) |
- Bên bị bắn thấy đạn đột ngột rơi xuống lưới mình, nhãn "PHỤC KÍCH" hiện cạnh ô trúng. Không lộ vị trí tàu cắn lén của địch.
- Đầu trận: hai phát (bên đi trước rồi bên đi sau) phát lần lượt, mỗi phát 1500 ms, camera `tactical` trước và sau.

### 9.2 Tàu hộ vệ — `guard` (chèn 900–2025 ms vào cảnh trúng đích của đòn địch)
Khi đòn của địch tới, **sau shot "cảnh trúng đích" bắt đầu** (shot cuối của mỗi đòn, `mục 2–6`) và trước các nổ:
| Mốc | Camera | Sự kiện |
|---|---|---|
| 0–450 ms | giữ camera mục tiêu của đòn đó, kéo nhẹ vào | vòm radar của tàu hộ vệ sáng viền cam (`mat_emissive_guard`); nhãn "HỘ TỐNG" hiện 600 ms ở cạnh tàu |
| 300–1350 ms | cắt nhanh `intercept_cam` (0, 0.9, −1.4) nhìn vào tàu hộ vệ (FOV 40°) trong 375 ms rồi cắt về mục tiêu | CIWS xoay và bắn loạt mảnh về phía đạn; giàn mồi nhử bung nắp, phóng mảnh nhiễu chaff |
| 900–2025 ms | camera mục tiêu | **mỗi ô bị triệt tiêu**: đạn/tên lửa/bom nổ lửng lơ giữa trời (`fx_airburst`: nổ nhỏ sáng cam, khói xám trắng, mảnh vụn rơi xuống nước); ngư lôi nổ dưới nước thành cột nước nhỏ trước khi tới ô (`fx_counter_splash`); **các ô còn lại** nổ bình thường |
- Nếu toàn bộ ô bị triệt tiêu (đòn 1 ô): chỉ có airburst/cột nước, không có cầu lửa trúng, không marker `hit`/`miss`; ô hiện marker `blocked`.
- Marker `blocked` xuất hiện đúng thời điểm `tImpact` của ô bị chặn, pop `markerPopMs`.
- Hộ vệ không kích hoạt: không có cảnh gì thêm; nhật ký không ghi.
- Khi hộ vệ chìm: thêm cảnh chìm đầy đủ; UI báo "Hộ vệ bị hạ".

### 9.3 Ghi chú
- Cảnh passive **không** được kéo dài trận quá 3 s tổng cộng mỗi lượt; nếu cả tàu cắn lén và hộ vệ cùng kích hoạt, ưu tiên cả hai nhưng rút ngắn mỗi cảnh xuống 70%.
- Tốc độ x2 chia đôi mốc; "tắt cinematic": chỉ pop marker và nhật ký ngắn.

