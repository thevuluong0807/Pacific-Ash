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
- Mọi cinematic dài tối đa **5 s** (x1). Nhịp: **cảnh tàu bắn (tạo uy lực) → cảnh đạn bay → cảnh trúng đích.**
- Vào cảnh: chuyển từ camera `tactical` sang shot 1 bằng blend 300 ms. Ra cảnh: về `tactical` 500 ms. Giữa các shot trong một đòn: **cắt cứng** (cut), trừ khi ghi "chuyển mượt".
- Camera không xuyên vào thân tàu (khoảng cách tối thiểu 0.15 tới mọi mặt), near plane 0.05.
- Camera không bao giờ nhìn thấy trực tiếp lưới 2D; lưới 2D mờ về độ mờ 0.25 trong lúc cinematic.
- Chậm lại (slow-motion) chỉ dùng ở cú bắn lớn (0.6× tốc độ trong 400 ms). Tắt khi `prefers-reduced-motion`.
- Khi **địch** bắn: dùng đúng shot list này với tàu bắn là tàu địch; camera đặt theo khung của tàu đó, nên cảnh bị lật hướng tự nhiên.
- **Bỏ qua** (`finishNow`): nhảy tới cuối trong 150 ms (`animations.md` mục 8). **Tốc độ x2**: mọi mốc chia đôi. **Cinematic ngắn** (tùy chọn trong Cài đặt, mục 9): chỉ phát shot cuối (cảnh trúng đích) khoảng 1.2 s.
- Phương án **tắt cinematic**: chỉ pop marker (`animations.md` mục 1).
- Rung, ánh sáng, hạt: số trong `env-and-fx.md` mục 8 và 9, không lặp lại ở đây.

### Theo map
Cinematic giữ nguyên camera và mốc thời gian ở mọi map; chỉ diện mạo đổi theo `maps.md` mục 4 (ánh sáng, tông biển, màu dưới nước, độ sáng lửa và khói). Ví dụ cinematic tàu ngầm ở `truong_sa` có nước xanh ngọc ấm và tia hoàng hôn xuyên nước. Sự kiện nền của map (pháo kích, chớp nổ, sấm) **tạm hoãn** khi cinematic chạy (`maps.md` mục 4.4).

### Mốc chung
Mọi đạn bay tính thời gian từ lúc bắn tới lúc chạm theo vận tốc ở `env-and-fx.md` mục 7. Mốc chạm ô là `tImpact` và là mốc để hiện marker 2D (`onCellResolved`). Nếu thời gian bay thực tế dài hơn bảng dưới, **kéo giãn đoạn bay** (không đổi các mốc khác ngoài mốc chạm).

---

## 2. Khu trục hạm — `rapid` (tổng 2800 ms)
Ý đồ: hai tháp pháo quay về **hai hướng khác nhau** để nhắm hai ô, rồi cận cảnh bắn nhanh liên tiếp.

| Shot | Thời gian | Camera | Sự kiện |
|---|---|---|---|
| 1. Nghiêng từ trên xuống | 0–1000 | pos `(f −2.2, r +1.2, u +3.0)`, nhìn `(f +0.2, r 0, u 0.1)`, FOV 40°, trôi chậm tới `(f −1.8, r +1.0, u +3.0)` | tháp trước `turret_fwd` quay về hướng ô 1; tháp sau `turret_aft` quay về hướng ô 2 (hai hướng khác nhau, 0–800 ms, easing mượt); hai đường ngắm cam mảnh từ nòng tới hướng ô, tắt khi bắn; tiếng cơ khí quay tháp |
| 2. Cận cảnh tháp trước | 1000–1550 | pos `(f +0.55, r +0.45, u +0.16)` đứng cạnh tháp, nhìn `muzzle_1 + (f +0.25)`, FOV 32° | **1150 ms**: phát 1 từ `muzzle_1` (`fx_muzzle_s`), nòng thụt lùi 0.012, vỏ đạn văng, rung 0.02/150; vệt đạn bay đi |
| 3. Cận cảnh tháp sau | 1550–2000 | pos `(f −0.35, r −0.42, u +0.16)`, nhìn `muzzle_2 + (f +0.25)`, FOV 32° | **1600 ms**: phát 2 từ `muzzle_2` (cách phát 1 khoảng 450 ms: chính là chất "pháo nhanh"), rung 0.02/150 |
| 4. Cảnh trúng đích | 2000–2800 | `T(f −3.0, r +0.5, u +3.2)`, nhìn tâm hai ô, FOV 36°, kéo vào chậm 0.4 | `tImpact` ô 1 ≈ 2050, ô 2 ≈ 2500 (hiệu ứng theo kết quả, `env-and-fx.md` mục 8); sau đó aftermath |

Biến thể: nếu chỉ còn 1 ô khả dụng (rules 4.1) thì bỏ shot 3, tháp sau không quay; shot 2 kéo dài tới 1800.

## 3. Tuần dương — `precision` (tổng 3200 ms)
Ý đồ: cảnh từ **trên đỉnh nhìn thẳng xuống, hơi chéo từ phía sau** khi tháp pháo quay nòng; sau đó cận cảnh **mạn tàu** lúc khai hỏa để thấy uy lực: tiếng nổ, ánh sáng, tàu chao đảo trên sóng.

| Shot | Thời gian | Camera | Sự kiện |
|---|---|---|---|
| 1. Đỉnh, chéo từ sau | 0–1100 | pos `(f −1.3, r +0.5, u +5.6)`, nhìn `(f +0.4, r 0, u 0)`, FOV 36°, độ nghiêng ≈ 78° so với mặt nước, kéo vào chậm 0.5 | cả ba tháp (`turret_1..3`) cùng quay về hướng ô mục tiêu, nòng ngẩng lên tới 35°; đường ngắm cam; tiếng trục xoay nặng, kim loại rên; một vệt nước rung nhẹ quanh thân |
| 2. Cận cảnh mạn tàu, khai hỏa | 1100–2100 | pos `(f +0.7, r +1.35, u +0.12)` (sát mặt nước, đứng ngang mạn), nhìn `turret_1`, FOV 30°, giữ gần cố định, hơi lắc theo sóng | **1300 ms**: khai hỏa `muzzle_1R` (`fx_muzzle_l`): chớp trắng cam rất sáng, đèn cam chiếu sáng cả thân tàu và mặt nước (PointLight cường độ cao 200 ms), sóng xung kích lan trên mặt nước; **tàu chao**: lăn +3° về phía ngược hướng bắn trong 250 ms rồi tắt dần trong 900 ms, chúi 1.2°, mặt nước dậy sóng quanh thân; khói bốc theo gió; mưa bị chiếu sáng thành vệt; rung 0.05/250; **slow-motion 0.6× từ 1250 đến 1650 ms** |
| 3. Cảnh trúng đích | 2100–3200 | `T(f −4.0, r 0.0, u +3.0)`, nhìn ô mục tiêu, FOV 34°, kéo vào chậm | đạn bay cung cao (vừa bay vừa bám nhìn ở 1700–2100); `tImpact` ≈ 2450; nếu **trúng**: hiện nhãn loại tàu lộ ra 600 ms (`animations.md` 4.2) |

Ghi chú: chỉ `muzzle_1R` bắn; ba tháp quay đồng bộ nhưng một phát. Hai tháp còn lại cũng giật nhẹ (độ lớn 40%) để cảm giác hạm đội, không có đạn từ chúng.

## 4. Tàu tên lửa — `cross` (tổng 3800 ms)
Ý đồ: cảnh **mạn tàu** khi các **tháp phóng tên lửa ngẩng lên**; bắn xong chuyển sang cảnh **cả chùm tên lửa bay vòng parabol lao xuống**.

Thiết kế mô hình tương ứng: xem `ship-missile.md` mục 2.3 (các bệ phóng `launcher_0..4` trồi lên từ khoang rồi ngẩng nòng).

| Shot | Thời gian | Camera | Sự kiện |
|---|---|---|---|
| 1. Mạn tàu, tháp phóng ngẩng | 0–1300 | pos `(f +0.1, r +2.3, u +0.6)`, nhìn `(f +0.1, r 0, u +0.15)`, FOV 38°, trượt dọc thân 0.6 về mũi | nắp khoang mở (300 ms); `launcher_0..4` trồi lên và ngẩng tới 75° (800 ms, lệch nhau 80 ms mỗi bệ); đèn hazard nhấp nháy, còi báo; hơi nóng |
| 2. Khai hỏa | 1300–1900 | cùng vị trí, lùi 0.5 và hạ xuống `u +0.4`, FOV 42° | **1300–1600**: 5 quả nổ máy lệch nhau 60 ms (`fx_launch`), ánh lửa chiếu hết thân tàu và mặt nước, vệt khói trắng cột; rung 0.07/600 ms; tên lửa vọt lên khỏi khung hình |
| 3. Chùm bay vòng parabol | 1900–3400 | `T(f −8.0, r 0, u +9.0)` (cao, xa phía sau mục tiêu nhìn về phía tàu bắn), nhìn tâm vùng đánh, FOV 40°, hạ dần xuống `u +7.4` | 5 vệt khói vẽ **parabol**: lên cao tới đỉnh `6 + 0.4 × khoảng cách` ô, rồi lao xuống góc 60–70°; các quả cách nhau 120 ms theo thứ tự tâm, lên, phải, xuống, trái; tiếng rít cao dần |
| 4. Chạm đích | 3000–3800 | cắt xuống `T(f −3.5, r 0, u +2.4)`, nhìn tâm, FOV 34° | `tImpact` các quả ≈ 3050, 3170, 3290, 3410, 3530; mỗi ô theo kết quả riêng; aftermath khói chùm |
Shot 3 và 4 chồng nhau ở 3000–3400: dùng cắt cứng sang shot 4 tại 3000 ms hoặc chuyển mượt 300 ms, chọn một cách duy nhất cho cả game (đề xuất: cắt cứng).

## 5. Tàu ngầm — `torpedo` (tổng 4600 ms)
Ý đồ: bắt đầu **dưới nước**, tàu ngầm **trồi lên**, mở nắp ống phóng, rồi **bắn rải thảm** dọc đường đã chọn.

| Shot | Thời gian | Camera | Sự kiện |
|---|---|---|---|
| 1. Dưới nước, tàu trồi lên | 0–1500 | pos `(f +1.0, r −0.35, u −0.16)` (neo `cam_under`), nhìn lên tàu `(f −0.2, r 0, u −0.02)`, FOV 50°, quay quanh mũi 20° | tàu ngầm nổi từ `y −0.35` lên vị trí chuẩn; bọt khí ballast; mặt nước lung linh phía trên; tầm nhìn 6, màu xanh đen; tiếng ù lọc thấp tần |
| 2. Mở nắp ống phóng | 1500–2100 | pos `(f +1.7, r −0.12, u −0.12)`, nhìn `launch`, FOV 38°, đứng yên | `torpedo_flap_0..3` mở 80°, mỗi bản lề lệch 120 ms; đèn đỏ bên trong, bọt và hơi nước; tiếng kim loại nặng |
| 3. Bắn rải thảm | 2100–3900 | **3a (2100–2700)** chase: đặt sau ngư lôi đầu `(f −0.8, r 0, u +0.55)`, nhìn về phía trước theo đường đi, FOV 55°; **3b (2700–3900)**: nâng lên toàn cảnh đường đi, pos `T(f −2.0, r 0, u +4.5)` ở mép vào của đường, nhìn dọc đường, FOV 45° | **4 ngư lôi** phóng từ `launch` cách nhau 90 ms, chạy thành hàng nối đuôi nhau (cách 150 ms), vào đường đã chọn từ mép lưới; **mỗi ô đi qua phát một vòng sóng trên mặt nước** (đường "thảm" sáng dần theo đường đi); ngư lôi đầu là ngư lôi thật quyết định kết quả |
| 4. Trúng đích | 3900–4600 | giữ 3b, kéo lùi 0.8 | nếu **trúng** (`rules.md` 4.3): ngư lôi đầu nổ ở ô trúng (`fx_hit_torpedo`), ba ngư lôi sau nổ thứ phát cách nhau 100 ms phía sau (hiệu ứng, không tạo thêm kết quả ô); nếu **trượt hết**: cả bốn mờ dần ở mép xa, lăn vòng sóng cuối, chìm xuống |

Ghi chú: cinematic này kể chuyện "tàu mình phóng vào đường", khoảng cách thật giữa tàu và mép lưới không bắt buộc được thể hiện; chuyển cảnh 3a→3b che sự gián đoạn.

## 6. Tàu sân bay — `line3` (tổng 5000 ms)
Ý đồ: máy bay **cất cánh vèo ra từ boong**, camera bám theo và đổi góc; sau đó **cảnh tổng thể từ xa**, máy bay rải tên lửa xuống dải mục tiêu.

| Shot | Thời gian | Camera | Sự kiện |
|---|---|---|---|
| 1. Cất cánh trên boong | 0–1200 | pos `(f +1.7, r +0.45, u +0.15)` gần ray phóng nhìn về phía đuôi, nhìn `(f +0.9, r 0, u +0.15)`, FOV 38° | `jbd_0/1` dựng lên; hai máy bay (từ `plane_0`, `plane_1`) vào `cat_start_0/1`, lao theo ray tới `cat_end_*` trong 500 ms, **vèo qua** ống kính, luồng khí và hơi nước phụt từ ray, gió thổi mưa ngang; rung 0.03/300; máy bay thứ ba (`plane_2`) chạy trên boong cất cánh sau 300 ms; `plane_N` đã bay thì ẩn |
| 2. Bám theo, đổi góc | 1200–2200 | camera tách khỏi boong, **bám** máy bay đầu: bắt đầu `Plane(−1.2, +0.4, +0.25)`, quay quanh máy bay 120° trong 1000 ms sang góc phía trước-bên, FOV 45° | ba máy bay vươn lên, nghiêng đổi hướng về phía mục tiêu, xếp hình chữ V, vệt khói cuối cánh |
| 3. Cảnh tổng thể tiếp cận | 2200–3400 | `T(f −7.0, r +3.0, u +6.5)` nhìn ngang dải mục tiêu, FOV 38°, đứng yên | ba máy bay hiện từ xa, bay thẳng hàng qua dải 3 ô theo hướng `orientation` |
| 4. Rải tên lửa | 3400–4400 | camera thấp bám dọc dải: `T(f −1.5, r +1.2, u +1.4)` đi theo máy bay đầu, FOV 36°, **chậm 0.6×** quanh nhát đầu | máy bay thả tên lửa, mỗi quả một ô theo trục tăng, cách nhau 150 ms; `tImpact` từng ô khoảng 3800, 3950, 4100 (kết quả theo ô, bỏ ô ngoài lưới); ô nào ngoài lưới thì máy bay vẫn bay qua nhưng không thả |
| 5. Rút lên | 4400–5000 | kéo lên cao, FOV 40°, trở về `tactical` | máy bay vọt lên, khói chùm, mây bụi |
Máy bay không quay lại tàu trong cinematic.

---

## 7. Bảng tổng
| Đòn | Tàu | Tổng (ms) | Số shot | Cảnh mở đầu | Cảnh khai hỏa |
|---|---|---|---|---|---|
| rapid | Khu trục hạm | 2800 | 4 | nghiêng trên xuống, hai tháp quay hai hướng | cận cảnh từng tháp |
| precision | Tuần dương | 3200 | 3 | đỉnh nhìn thẳng, hơi chéo sau | cận mạn tàu, chao đảo, ánh sáng |
| cross | Tàu tên lửa | 3800 | 4 | mạn tàu, tháp phóng ngẩng | chùm parabol lao xuống |
| torpedo | Tàu ngầm | 4600 | 4 | dưới nước, trồi lên | rải thảm dọc đường |
| line3 | Tàu sân bay | 5000 | 5 | cất cánh vèo ra, camera bám | tổng thể rải tên lửa từ xa |

## 8. Biến thể chung
- **Trượt**: dùng kết quả ô `trượt` (cột nước), không có nhãn lộ tàu.
- **Chìm**: sau khi ô cuối trúng, thêm cảnh chìm 7200 ms, mỗi loại tàu một kiểu (`sinking.md` mục 2, `animations.md` mục 6) ngay sau shot trúng đích. Tổng có thể vượt 5 s; **cảnh chìm tách ra được bỏ qua riêng**.
- **Đòn kết thúc ván**: slow-motion 0.4× lúc tàu cuối chìm (`animations.md` mục 7).
- **Vùng đánh sát mép**: ô ngoài lưới không có đạn rơi, không có hiệu ứng, camera mục tiêu vẫn nhìn vào tâm vùng nằm trong lưới.
- **Ô đã có kết quả từ trước** nằm trong vùng đánh: đạn vẫn bay tới nhưng chỉ có hiệu ứng nhỏ (khói, bụi), không phát lại marker (`rules.md` mục 4).

## 10. Cài đặt liên quan
Trong `screens.md` mục 10 (Settings): tốc độ animation (tắt / x1 / x2), rung màn hình, **cinematic ngắn** (công tắc). Khi "cinematic ngắn" bật, mỗi đòn chỉ phát shot trúng đích (khoảng 1.2 s).

## 9. Kỹ năng nội tại (passive) của hai tàu mới

Kỹ năng nội tại xen vào sự kiện của lượt, không do người chơi chọn, nên cảnh quay phải **ngắn và nhanh** để không làm chậm trận. Tối đa 1.2 s (x1) mỗi lần, bỏ qua được, chạy trong cùng hàng đợi sự kiện (`animations.md` mục 8). Chế độ "cinematic ngắn": chỉ phát cảnh trúng đích.

### 9.1 Tàu cắn lén — `sneak` (tổng 1000 ms mỗi phát)
Phát lúc đầu trận (trước lượt 1) và đầu mỗi lượt chẵn của chủ tàu (`rules.md` 10.1).

| Shot | Thời gian | Camera | Sự kiện |
|---|---|---|---|
| 1. Cận tàu cắn lén | 0–350 | pos `(f +0.45, r +0.38, u +0.14)` (neo `cam_close`), nhìn `muzzle`, FOV 34° | nhãn ngắn "CẮN LÉN" hiện bên cạnh tàu 300 ms; pháo nhỏ quay nhanh tới hướng ô ngẫu nhiên (150 ms); **hạ nắp che nòng**; bắn ở 250 ms (`fx_muzzle_s` nhỏ, rung 0.01, **ít tiếng**) |
| 2. Đạn bay | 350–750 | theo đạn, `T(f −3.0, r +0.4, u +2.6)`, FOV 36° | đạn bay **rất nhanh** (28 ô/giây, vệt mảnh), không có vệt rộng; không cầu lửa lúc bắn |
| 3. Chạm đích | 750–1000 | giữ camera mục tiêu | `tImpact` ≈ 800; kết quả ô theo `env-and-fx.md` mục 8 nhưng **nhỏ hơn 25%** (đây chỉ là phát phụ); nếu trúng nhẹ lộ khói, nếu chìm thì cảnh chìm đầy đủ 7200 ms (`sinking.md`) |
- Bên bị bắn thấy đạn đột ngột rơi xuống lưới mình, nhãn "PHỤC KÍCH" hiện cạnh ô trúng. Không lộ vị trí tàu cắn lén của địch.
- Đầu trận: hai phát (bên đi trước rồi bên đi sau) phát lần lượt, mỗi phát 1000 ms, camera `tactical` trước và sau.

### 9.2 Tàu hộ vệ — `guard` (chèn 600–900 ms vào cảnh trúng đích của đòn địch)
Khi đòn của địch tới, **sau shot "cảnh trúng đích" bắt đầu** (shot cuối của mỗi đòn, `mục 2–6`) và trước các nổ:
| Mốc | Camera | Sự kiện |
|---|---|---|
| 0–200 ms | giữ camera mục tiêu của đòn đó, kéo nhẹ vào | vòm radar của tàu hộ vệ sáng viền cam (`mat_emissive_guard`); nhãn "HỘ TỐNG" hiện 400 ms ở cạnh tàu |
| 200–600 ms | cắt nhanh `intercept_cam` (0, 0.9, −1.4) nhìn vào tàu hộ vệ (FOV 40°) trong 250 ms rồi cắt về mục tiêu | CIWS xoay và bắn loạt mảnh về phía đạn; giàn mồi nhử bung nắp, phóng mảnh nhiễu chaff |
| 600–900 ms | camera mục tiêu | **mỗi ô bị triệt tiêu**: đạn/tên lửa/bom nổ lửng lơ giữa trời (`fx_airburst`: nổ nhỏ sáng cam, khói xám trắng, mảnh vụn rơi xuống nước); ngư lôi nổ dưới nước thành cột nước nhỏ trước khi tới ô (`fx_counter_splash`); **các ô còn lại** nổ bình thường |
- Nếu toàn bộ ô bị triệt tiêu (đòn 1 ô): chỉ có airburst/cột nước, không có cầu lửa trúng, không marker `hit`/`miss`; ô hiện marker `blocked`.
- Marker `blocked` xuất hiện đúng thời điểm `tImpact` của ô bị chặn, pop `markerPopMs`.
- Hộ vệ không kích hoạt: không có cảnh gì thêm; nhật ký không ghi.
- Khi hộ vệ chìm: thêm cảnh chìm đầy đủ; UI báo "Hộ vệ bị hạ".

### 9.3 Ghi chú
- Cảnh passive **không** được kéo dài trận quá 3 s tổng cộng mỗi lượt; nếu cả tàu cắn lén và hộ vệ cùng kích hoạt, ưu tiên cả hai nhưng rút ngắn mỗi cảnh xuống 70%.
- Tốc độ x2 chia đôi mốc; "tắt cinematic": chỉ pop marker và nhật ký ngắn.

