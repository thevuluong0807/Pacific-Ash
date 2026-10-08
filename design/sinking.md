# Tàu bị bắn hạ: hiển thị 2D và hoạt cảnh chìm 3D

Khi một tàu **chìm** (mọi ô đã trúng, `ShipSunk`, `rules.md` mục 5):
- **2D (lưới)**: hiện lại **sprite của tàu** (nhìn rõ loại và vị trí) kèm **dấu X** trên mỗi ô của tàu.
- **3D (cảnh)**: model tàu cháy nổ rồi **chuyển thành xác tàu nổi chìm một nửa** (gãy, vỡ nhưng vẫn nhận ra loại tàu, các mảnh nổi lềnh bềnh), ở lại đến hết ván, kèm vết dầu. Model xác: `models/wrecks/wreck_<id>.glb` (mục 2.8 và `wreckage.md` mục 3). **Mỗi loại tàu có kiểu chìm riêng, dài 10800 ms** (mục 2).

Hai phần chạy theo cùng một hàng đợi sự kiện (`animations.md` mục 8): dấu X chỉ hiện ở thời điểm quy định bên dưới, kể cả khi bỏ qua cinematic.

| File đi kèm | Vai trò |
|---|---|
| `art/sunk_states.svg` | Bảng so sánh 7 tàu (siêu chiến hạm chưa có trong ảnh, dùng `sunk_states` suy ra từ sprite `dreadnought_2d.svg` + dấu X): nguyên vẹn và sau khi chìm (sprite xám tối + dấu X) |
| `art/sinking_timelines.svg` | Sơ đồ thời gian hoạt cảnh chìm 3D của 7 tàu (10800 ms; siêu chiến hạm mô tả bằng bảng ở mục 2.2 và 2.3) |
| `art/markers.svg` | Marker `sunk` (dấu X) cho một ô |
| `models/ship_*.glb` | Model dùng cho hoạt cảnh chìm; tên node ở `ships-basic3d.md` |

---

## 1. Hiển thị 2D: sprite tàu cộng dấu X

### 1.1 Cách hiển thị
- **Sprite tàu** (`art/<id>_2d.svg`) hiện đúng vị trí và hướng tàu trên lưới, nhưng **xám tối**: `filter: grayscale(.85) brightness(.55)` (đã mô phỏng bằng bộ lọc `sunkfx` trong `sunk_states.svg`).
- **Dấu X trên mỗi ô** của tàu: hai nét chéo, **lõi đỏ `#B3261E`**, **viền trắng `#E9EFF4`**, **viền ngoài đen `#05080B`**, góc nét vuông, kích thước khoảng 52% ô, đặt giữa ô. Nét X là nguồn ở `markers.svg` (marker `sunk`).
- **Khung ô** viền đỏ sẫm `#8B1A14` độ mờ 0.8, 3 px, nền đỏ sẫm rất nhạt (độ mờ 0.12) để nhìn ra "khối tàu".
- Tàu nhiều ô có **nhiều dấu X**, mỗi ô một dấu: khu trục hạm 2, tuần dương 3, tàu ngầm 3, tàu tên lửa 4, tàu sân bay 5, tàu cắn lén 1, tàu hộ vệ 4 (2×2).
- **Thay thế marker ô trúng**: trên các ô của tàu đã chìm, không còn hiện marker `hit` (lỗ đạn nổ) mà hiện sprite + X. Các ô `miss` và `hit` của tàu khác không đổi.
- **Lưới của mình**: tàu của mình bị chìm cũng hiện như trên (sprite xám tối + X), không ẩn.
- **Lưới địch**: ô chưa chìm giữ nguyên (`unknown`/`hit`/`miss`/`blocked`). Tàu địch chỉ hiện sprite khi chìm.
- Trạng thái **cố định** đến hết ván; không nhấp nháy.

### 1.2 Thời điểm hiện
- Sprite xám và dấu X hiện **cùng lúc** ở mốc `tImpact` của ô cuối cùng làm chìm tàu (nghĩa là ngay khi cú nổ cuối vừa chạm), với pop `markerPopMs` (200 ms): X phóng từ 150% về 100%, độ mờ 0 → 1; sprite hiện dần độ mờ 0 → 1 trong 200 ms.
- Nếu bỏ qua cinematic hoặc tắt cinematic: hiện ngay lập tức khi nhận `ShipSunk`.
- Âm thanh kèm: tiếng "đóng dấu" ngắn (`sfx_ui_confirm` hạ giọng) cộng `sfx_ship_sink` ở 3D.

### 1.3 Danh sách đội (cột trái)
Hàng tàu của mình bị chìm: nội dung mờ 40%, **thêm dấu X nhỏ đè lên icon tàu** (cùng kiểu X, cỡ nhỏ), gạch ngang tên (`ui-art.md` mục 2.3). Hàng tàu địch (nếu có hiển thị) khi chìm cũng thêm dấu X lên icon.

### 1.4 Nhật ký và toast
- Nhật ký: dòng `ĐÃ ĐÁNH CHÌM: <tên tàu>` màu `ready` (tàu địch) hoặc `alert` (tàu mình), kèm biểu tượng X nhỏ.
- Toast: "Đã đánh chìm: <tên tàu>" (`ui-art.md` 2.6).

---

> **Tỉ lệ ×10 (`world-scale.md`):** các giá trị Δy và dịch chuyển theo ô trong mục này nhân 10 khi ra thế giới.

## 2. Hoạt cảnh chìm 3D: mỗi loại tàu một kiểu, dài gấp đôi (10800 ms)

> **Cập nhật:** thời lượng chặn **10800 ms** (gấp 1.5 lần bản 7200 ms; bản đầu là 1800 ms), mỗi loại tàu có **kiểu chìm riêng**. Mọi mốc thời gian, độ trễ giữa các nổ và thời gian chìm nốt (6000 ms) trong mục này đã nhân 1.5 theo bản 7200 ms.

Hoạt cảnh chạy trên model `ship_<id>.glb`: dịch chuyển và xoay **node gốc** theo bảng khóa, cộng chuyển động và hiệu ứng riêng của từng tàu. Bảng thời gian trực quan: `art/sinking_timelines.svg`.

### 2.1 Nguyên tắc chung
- **Thời lượng chặn: 10800 ms** (x1; x2 chia đôi; tắt cinematic bỏ hẳn). Sau đó game cho chơi tiếp; xác tàu **còn nhấp nhô và ổn định chỗ** tối đa thêm **6000 ms** (không chặn) rồi nằm yên nổi lềnh bềnh đến hết ván (**không biến mất, không chìm hẳn**).
- Vì dài, **nút Bỏ qua riêng cho cảnh chìm** hiện ngay từ đầu (tách khỏi bỏ qua cinematic bắn); bỏ qua thì tàu chuyển ngay sang tư thế xác nổi cuối trong 450 ms. Đặt mặc định cho phép nhấn bất kỳ lúc nào.
- Điểm xoay: gốc `ship_<id>` (y = 0). Quy ước: **chúi mũi** là xoay quanh X **dương** (mũi xuống), **âm** là đuôi chìm trước (mũi chổng); **nghiêng** là xoay quanh Z, dương nghiêng về phía mạn có ô trúng cuối (hoặc ngẫu nhiên); Δy âm là đi xuống (đơn vị ô).
- Nội suy giữa các mốc bằng đường cong mượt (cosine hoặc spline). Mọi tàu có **cú giật 0–900 ms** do sức nổ trước khi vào mốc đầu tiên.
- **Mặt nước che** phần chìm (biển đục); nếu trong suốt, nhuộm dần vật liệu về màu nước (`#0B1C22`) theo độ sâu, tối đi tới 0.55.
- **Máy quay chung**: bắt đầu ở camera mục tiêu của đòn làm chìm; trong 10800 ms **lùi dần** 0.4 → 0.9 và nâng lên 1.0, xoay chậm 20°; mỗi tàu có thêm ghi chú riêng bên dưới. Slow-motion 0.4× nếu là tàu cuối cùng của ván.
- Hiệu ứng, âm: dùng `fx_sink` và các mã trong `env-and-fx.md` mục 8; mỗi tàu thêm các hiệu ứng riêng (2.3).

### 2.2 Bảng khóa chính (chúi°, nghiêng°, Δy) theo từng tàu
Mốc ms: 0 / 1800 / 3600 / 5400 / 7200 / 9000 / 10800.

| Tàu | 0 | 1800 | 3600 | 5400 | 7200 | 9000 | 10800 |
|---|---|---|---|---|---|---|---|
| **Khu trục hạm** | (0,0,0) | (2,4,−0.01) | (18,10,−0.10) | (34,16,−0.30) | (52,22,−0.55) | (68,26,−0.85) | (78,28,−1.20) |
| **Tuần dương** | (0,0,0) | (0,4,−0.01) | (3,16,−0.03) | (5,36,−0.08) | (6,62,−0.16) | (8,84,−0.28) | (12,96,−0.60) |
| **Tàu tên lửa** | (0,0,0) | (0,2,−0.01) | (−4,5,−0.04) | (−10,8,−0.10) | (−20,12,−0.22) | (−32,16,−0.45) | (−42,18,−0.80) |
| **Tàu ngầm** | (0,0,0) | (2,0,−0.03) | (6,2,−0.12) | (10,3,−0.30) | (16,5,−0.60) | (24,6,−1.00) | (30,8,−1.50) |
| **Tàu sân bay** | (0,0,0) | (0,3,−0.01) | (1,10,−0.03) | (3,22,−0.07) | (−4,34,−0.12) | (−8,42,−0.20) | (−10,48,−0.30) |
| **Tàu cắn lén** | (0,0,0) | (8,12,−0.01)@1200 | (14,60,−0.03)@2400 | (12,110,−0.04) | (6,178,−0.10) | (6,180,−0.20) | (10,180,−0.45) |
| **Siêu chiến hạm** | (0,0,0) | (0,2,−0.01) | (1,6,−0.03) | (3,12,−0.07) | (5,18,−0.12) | (8,24,−0.20) | (10,30,−0.32) |
| **Tàu hộ vệ** | (0,0,0) | (0,2,−0.01) | (2,8,−0.04) | (3,16,−0.12) | (4,24,−0.28) | (5,28,−0.50) | (6,32,−0.80) |
Chú ý: nghiêng trên 90° nghĩa là lật úp (tuần dương, tàu cắn lén). **Lưu ý quan trọng:** các giá trị chúi, nghiêng lớn và Δy sâu trong bảng này (ví dụ khu trục hạm 78° và −1.2 ô) mô tả **bản cũ tàu chìm hẳn**; chúng chỉ áp dụng tới **mốc hoán đổi sang xác nổi** ở mục 2.8, sau mốc đó tư thế do `wreck_<id>.glb` quyết định (chìm một nửa). Phần "đuôi chìm nốt" bản cũ: tăng Δy thêm khoảng 0.6–1.0 trong 6000 ms rồi biến mất.

### 2.3 Kiểu chìm riêng từng tàu

#### Khu trục hạm: "lao mũi, đuôi dựng đứng" (nhanh, dứt khoát)
| Mốc | Diễn biến |
|---|---|
| 0–1500 | nổ thứ phát dọc thân (các `fire_N`); **tháp pháo trước (`turret_fwd`) bị bật bay**: tách khỏi tàu, bay lên theo cung (vận tốc lên 0.35 ô/s, ngang 0.04, trọng lực −0.23 ô/s², xoay tự do), rơi xuống nước ở khoảng 3900 ms gây cột nước |
| 1500–5400 | mũi chúi mạnh 18° → 34°, nghiêng nhẹ; sóng trắng dồn lên boong mũi; lửa phụt từ cầu |
| 5400–9000 | **đuôi dựng cao**, chúi 52° → 68°, **chân vịt lộ ra khỏi nước** (mảnh vỡ và nước chảy từ đuôi); sàn bay trượt dốc, xuồng cam bong ra rơi xuống |
| 9000–10800 | gần thẳng đứng (78°) trượt hẳn xuống; xoáy nước và bọt khí lớn; mảnh vỡ nổi |
- Hiệu ứng riêng: tia lửa từ mất tháp pháo, dầu phun từ ống khói. Âm: loạt nổ sắc ngắn rồi tiếng kim loại rít, tiếng "ục" khi chìm. Máy quay: cận mạn tàu lúc tháp bay (0–2400 ms, FOV 34°), rồi lùi xa.

#### Tuần dương: "lật úp nặng nề" (chậm, nặng)
| Mốc | Diễn biến |
|---|---|
| 0–1800 | **nổ dây chuyền ba tháp pháo** lần lượt (tháp 1 → 2 → 3, cách 600 ms), mỗi tháp phụt lửa lên cao; không bị bật bay |
| 1800–7200 | **nghiêng rất chậm**, nghiêng 4° → 62°, mũi hơi chúi; nước tràn lên boong; nòng pháo rũ xuống |
| 7200–9000 | **lật úp** gần tới 84°, ống khói và cột chạm nước, thượng tầng bắt đầu ngập; thân nổi lên một lúc |
| 9000–10800 | lật hẳn (96°), đáy tàu (phần tối) hiện ra, nổi úp; bọt khí và dầu xì mạnh từ các khe |
- Hiệu ứng riêng: tiếng thép rên dài, bọt khí lớn từng đợt, khói đậm. Máy quay: lùi chậm nhất, như nhìn một con tàu lớn đổ xuống.

#### Tàu tên lửa: "cháy dây chuyền, đuôi chìm trước"
| Mốc | Diễn biến |
|---|---|
| 0–1800 | nổ thứ phát ở **hai dãy ô phóng**: nắp VLS bật tung theo lưới (từng hàng nắp bay lên, cách 180 ms) |
| 1800–6000 | **các tên lửa tự phóng loạn**: từ `launcher_N` và `vls_slot_N` vút lên theo hướng lung tung (vệt khói trắng xoắn, vài quả bay xuống nước rồi nổ), mỗi quả cách 450–750 ms; thân tàu rung |
| 6000–10800 | **đuôi chìm trước**: chúi âm 20° → 42° (mũi chổng cao), lửa liếm dọc dãy phóng; thân dần trượt về phía sau |
- Hiệu ứng riêng: tên lửa bay lung tung (tối đa 8 vệt), nắp VLS bay, lửa đáy phóng; cột khói xoắn. Âm: tiếng rít tên lửa, nổ ngắt quãng. Máy quay: nhìn từ trên cao xéo, theo các vệt tên lửa loạn rồi hạ xuống thân tàu.

#### Tàu ngầm: "nén vỡ dưới sâu" (lạnh, không lửa)
| Mốc | Diễn biến |
|---|---|
| 0–2100 | **tiềm vọng thụt vào** (`periscope`), nắp ống phóng đóng; tàu xả ballast: bọt khí trắng xối từ hai bên, chân vịt (`propulsor_spin`) quay chậm dần |
| 2100–6600 | **lặn nghiêng chúi 6° → 16°, sâu dần**; vật liệu tối theo độ sâu, thân mờ dần vào nước (độ mờ 1 → 0.4) |
| 6600–8100 | **nén vỡ (implosion)** ở độ sâu: chớp sáng nhẹ dưới nước, **vòng sóng xung kích lên mặt biển** (cột nước thấp, sóng tròn), thân vỡ và **hiện hai nửa xác nổi** (xem 2.8) |
| 8100–10800 | bọt khí nổi lên thành cột, dầu loang dần, mảnh vỡ nhỏ nổi lên mặt nước |
- Hiệu ứng riêng: không lửa và ít khói; nhiều bọt khí và dầu. Âm: tiếng kim loại rền chìm (lọc thông thấp), một cú nén nặng ở 9900 ms. Máy quay: nửa đầu trên mặt nước nhìn xuống, sau cú nén chuyển nhanh sang dưới nước (`cam_under`) 1800 ms rồi quay lại.

#### Tàu sân bay: "boong nổ liên hoàn, nghiêng lớn" (chậm nhất)
| Mốc | Diễn biến |
|---|---|
| 0–2100 | nổ lớn trên boong bay; cột lửa từ đảo chỉ huy; thang máy bật lên |
| 2100–6600 | **máy bay đậu (`plane_N`) nổ lần lượt** (cách 750 ms, nổ ở chỗ đậu) rồi các mảnh trượt về mạn thấp; `jbd_*` đổ; boong nghiêng dần 10° → 34° |
| 6600–9900 | **đuôi nhấc lên** (chúi âm 4° → 10°), đảo chỉ huy nghiêng, cột radar gãy ngả; máy bay còn lại và xe kéo trượt rơi xuống biển |
| 9900–10800 | bắt đầu chìm; thân vẫn lớn trên mặt nước. **Phần đuôi chìm nốt kéo dài thêm 6000 ms** (không chặn): nghiêng tới 60°, chìm hẳn |
- Hiệu ứng riêng: nổ liên hoàn trên boong (tối đa 6 điểm), khói đen dày che nửa tàu, bọt khí. Âm: loạt nổ, tiếng rên kim loại thật dài. Máy quay: lùi xa nhất (0.9 → 1.4) để thấy cả tàu và boong.

#### Tàu cắn lén: "lật nhanh, nổi úp, rồi chìm"
| Mốc | Diễn biến |
|---|---|
| 0–1200 | giật mạnh: chúi 8° nghiêng 12°; pháo nhỏ văng ra khỏi bệ (nhẹ) |
| 1200–4200 | **lật úp rất nhanh** tới 150° (cú lật gọn, văng nước) |
| 4200–7200 | **nổi úp** với đáy hướng lên (178°), lắc nhẹ trên sóng; bọt khí xì |
| 7200–10800 | **chìm thẳng xuống** (nổi úp rồi lún), để lại ít dầu |
- Hiệu ứng riêng: ít lửa, nhiều nước. Âm: một cú nổ nhỏ gọn, tiếng nước ào, tiếng "bộp" khi úp. Máy quay: cận (0.7) rồi lùi nhẹ; đây là tàu nhỏ nên giữ gần.

#### Siêu chiến hạm: "nổ hầm đạn, gãy đôi" (nặng, lâu, nhiều nổ phụ)
| Mốc | Diễn biến |
|---|---|
| 0–1800 | năm tháp pháo **xoay loạn**, nòng chúi xuống, pháo phụ bắn loạn; nổ nhỏ dọc mạn rồi tắt |
| 1800–3600 | **hầm đạn nổ phụ liên hoàn**: chớp trắng cam phụt từ khe tháp, **tháp 2 và tháp 4 bật nắp** (nắp bay lên 4 ĐV rồi rơi nước), lửa phụt cao từ ống khói |
| 3600–6600 | **nổ lớn giữa thân** (sau tháp chỉ huy): lửa và khói đen cột cao, thân bắt đầu chúi nhẹ, nghiêng 12° → 24°; **tháp 3 bay khỏi bệ** (ballistic, rơi cách tàu 6–10 ĐV); đèn tắt dần |
| 6600 | **mốc hoán đổi**: nổ lớn che chỗ ghép, thay bằng `wreck_dreadnought` (gãy đôi, mục 2.8) |
| 6600–10800 | hai nửa xác dịch về pose cuối, **mũi ngóc lên**, đuôi nghiêng, lửa cháy dai trên cả hai nửa |
- Hiệu ứng riêng: nhiều nổ phụ (tối đa 3 cầu lửa lớn cùng lúc), tia lửa đạn nổ lép bép, lửa dầu loang rộng. Âm: tiếng nổ hầm đạn trầm, tiếng thép xé khi gãy. Máy quay: lùi xa dần để thấy cả hai nửa, đi vòng nhẹ 20°. **Chìm nhanh hơn tuần dương nhưng nhiều nổ hơn.**

#### Tàu hộ vệ: "vỡ phòng thủ, chìm lệch" 
| Mốc | Diễn biến |
|---|---|
| 0–1800 | **CIWS bắn loạn** (cả bốn quay tứ phía, bắn mất kiểm soát) rồi lần lượt tắt; đèn đỏ vòm radar nhấp nháy |
| 1800–5400 | **vòm radar nứt rồi bật tung** (node `radome` tách khỏi tàu, bay lên rồi rơi); các giàn mồi nhử nổ bung chaff cả loạt (`decoy_N`, `fx_chaff`) |
| 5400–9000 | **một thân chìm trước** (thân gần mạn nghiêng bị trúng: Δy riêng của `hull_port` hoặc `hull_stbd` giảm thêm 0.1 ngay mốc 5400), tàu nghiêng 16° → 28°, boong trượt |
| 9000–10800 | thân còn lại chìm theo, nghiêng 32°, xoáy nước lớn hơn do mặt cắt rộng |
- Hiệu ứng riêng: chaff bạc lấp lánh bay khắp, tia lửa điện từ vòm radar, khói trắng nhạt. Âm: tiếng CIWS rít loạn rồi tắt, tiếng điện xẹt, nổ giòn. Máy quay: cận CIWS (0–1800 ms), cắt lên cao xéo khi vòm radar bật, rồi lùi.

### 2.4 Chuyển động phụ chung (mọi tàu)
- **Đèn hành trình** (`nav_*`) tắt ở 3600 ms; **radar quay** (`radar_rotor`) dừng ở 2250 ms.
- **Tháp pháo** (`turret_*`, trừ trường hợp riêng ở trên): xoay lệch ±30° quanh Y ở 3600 ms, nòng rũ xuống 10°.
- **Mảnh vỡ**: tối đa 40 mảnh kim loại bắn ra và nổi trên mặt nước, tồn tại đến hết đuôi chìm.
- **Dầu loang** (`fx_oil`) bắt đầu từ khoảng 3600 ms, lan rộng dần, tồn tại đến hết ván.

### 2.5 Hiệu ứng đi kèm (tổng quát, `env-and-fx.md` mục 8)
| Mốc (ms) | Hiệu ứng chung |
|---|---|
| 0–900 | nổ đầu (`fx_hit` ở các `fire_N` cùng lúc), rung 0.12/700, chớp sáng cam (trừ tàu ngầm: chớp xanh dưới nước ở 6600) |
| 900–7200 | khói lửa đậm và bọt khí, hơi nước phụt quanh mạn thấp, vòng sóng quanh thân |
| 7200–10800 | thân gần chìm, xoáy nước, cột bọt khí |
| sau 10800 | xác nổi ổn định chỗ trong 6000 ms rồi nằm yên; dầu loang, lửa nhỏ và cột khói trên các mảnh xác tồn tại đến hết ván (xem `wreckage.md` mục 1.3 cho hiệu ứng, mục 3 cho model) |
Âm: `sfx_explosion_big` ở 0 ms, `sfx_ship_sink` bắt đầu ở 2700 ms, thêm lớp riêng theo từng tàu như đã ghi. Ducking nhạc −6 dB trong suốt 10800 ms.

### 2.6 Liên hệ cinematic
- Cảnh chìm **chèn sau shot "cảnh trúng đích"** của đòn làm chìm (`cinematics.md` mục 8). Tổng thời gian một lượt có thể lên tới 9 s + 10.8 s; vì vậy **có nút bỏ qua riêng**, và "cinematic ngắn" không chặn lượt: hoạt cảnh chìm 3D chạy ở nền bản rút gọn 4000 ms, sprite xám + X vẫn hiện ngay.
- Đòn kết thúc ván: làm chậm 0.4× lúc tàu cuối chìm (làm chậm 0.4× trong 3600 ms đầu rồi về tốc độ thường, tổng khoảng 16 s; chỉ áp dụng cho tàu cuối, và cho bỏ qua).
- Chìm do tàu cắn lén (bắn phụ): vẫn phát đủ hoạt cảnh riêng của tàu bị chìm; không có cú giật mạnh của cinematic bắn.
- Hai tàu chìm cùng một đòn: chìm đồng thời, mỗi tàu một kiểu; máy quay chọn tàu lớn hơn làm trọng tâm.
- Chế độ "tắt cinematic", "cinematic ngắn" hoặc bỏ qua: **cảnh 3D phía sau lưới vẫn phát hoạt cảnh chìm ở nền** (bản rút gọn 4000 ms, không chặn lượt; `wreckage.md` mục 2.1); bỏ qua thì tàu biến mất trong 450 ms. Khi tàu địch chìm, model đầy đủ **hiện ra bằng một vụ nổ lớn** rồi cháy nổ và chìm (không còn bị ẩn).

### 2.7 Chặn lượt và chạy nền (vì hoạt cảnh dài 10.8 s)
- Mặc định: **chặn** cho tới khi hết 10800 ms (hoặc người chơi bỏ qua).
- Tùy chọn trong Cài đặt: **"Tàu chìm chạy nền"** (mặc định **tắt**). Khi bật, sau **3600 ms** (hết pha mở đầu) trận cho phép chơi tiếp: camera về `tactical`, hoạt cảnh chìm vẫn tiếp tục ở nền, và các cinematic bắn mới phát bình thường (tàu chìm chạy dưới nền). Dấu X 2D không đổi.
- Bỏ qua: bấm nút bỏ qua, phím Space hoặc chạm; tàu chuyển ngay sang tư thế xác nổi cuối trong 450 ms, dầu loang giữ nguyên.
- Tốc độ x2: mọi mốc chia đôi (10800 ms thành 5400 ms).

### 2.8 Từ tàu nguyên vẹn tới xác nổi (chìm một nửa, gãy vỡ nhưng vẫn rõ loại tàu)

Tàu **không chìm hẳn**. Thay vì biến mất, hoạt cảnh kết thúc ở **xác tàu nổi**:
1. Từ 0 tới **mốc hoán đổi**: dùng model nguyên vẹn `ship_<id>` và các chuyển động ở mục 2.3 (cháy nổ liên hoàn, tháp bay, tên lửa phóng loạn, máy bay nổ...). Bỏ các chuyển động "chìm sâu" (chúi lớn, Δy lớn) trong bảng 2.2.
2. Ở **mốc hoán đổi**: **một vụ nổ lớn (450 ms) che chỗ ghép**, model nguyên vẹn được thay bằng `wreck_<id>` (các mảnh). Giữ nguyên vị trí và hướng ban đầu của tàu.
3. Từ mốc hoán đổi tới 10800 ms: **các mảnh xác dịch từ pose vừa gãy** (góc 0, Δy 0, vị trí gốc) **sang pose cuối** bên dưới bằng nội suy mượt, nhấp nhô; sau 10800 ms ổn định thêm tối đa 6000 ms rồi **nằm yên nổi lềnh bềnh** (chỉ nhấp nhô theo sóng).

| Tàu | Mốc hoán đổi (ms) | Các mảnh xác và pose cuối (đơn vị ô; xoay theo trục) |
|---|---|---|
| Khu trục hạm | 5400 | **2 mảnh**: mũi (cầu, tháp pháo trước, cột, ô VLS): ngóc mũi 14°, nghiêng 16°, Δy −0.035, dịch +0.05 theo z; đuôi (nhà boong, 2 ống khói, tháp sau, nhà chứa, sàn bay): chúi 9°, nghiêng −12°, Δy −0.05, dịch x +0.07 và z −0.14 |
| Tuần dương | 7200 | **1 mảnh nghiêng nặng**: nghiêng 38°, ngóc mũi 4°, Δy −0.06; ba tháp pháo nòng đôi, ống khói to, cầu còn nhận ra |
| Tàu tên lửa | 6000 | **2 mảnh**: mũi và nhà boong (hai dãy ô phóng trước, cầu): nghiêng 18°, ngóc mũi 7°, Δy −0.055; đuôi (dãy ô phóng sau, sàn bay): nghiêng −24°, chúi đuôi 28°, Δy −0.07, dịch x −0.05 và z −0.28 |
| Tàu ngầm | 6600 | **2 mảnh**: mũi: ngóc 32°, nghiêng 20°, Δy −0.03, dịch x +0.1 và z +0.22; thân chính (tháp chỉ huy, tiềm vọng, đuôi): nghiêng 28°, chúi 5°, Δy −0.04. Thay "lặn sâu và biến mất" bằng "nổi lên rồi vỡ đôi tại mặt nước bằng một vụ nổ nén, hai nửa trôi dạt" |
| Tàu sân bay | 6600 | **2 mảnh**: thân chính (boong bay, đảo chỉ huy, ống phóng): nghiêng 28°, ngóc mũi 5°, Δy −0.06; đuôi (phần đường hạ cánh): nghiêng 40°, chúi 8°, Δy −0.08, dịch x +0.12 và z −0.3 |
| Tàu cắn lén | 4200 | **1 mảnh lật úp một phần**: nghiêng 58°, ngóc mũi 8°, Δy −0.028; thấy đáy tàu, cột và một phần tháp pháo |
| Siêu chiến hạm | 6600 | **2 mảnh**: mũi (ba tháp pháo, tháp chỉ huy, cột radar): ngóc mũi 12°, nghiêng 14°, Δy −0.04, dịch z +0.05; đuôi (hai ống khói, hai tháp pháo, sàn trực thăng): chúi 11°, nghiêng −16°, Δy −0.06, dịch x +0.08 và z −0.2 |
| Tàu hộ vệ | 5400 | **3 mảnh**: boong và cầu và một thân: nghiêng dọc 12°, Δy −0.05; thân kia **tách rời**: nghiêng −28°, Δy −0.09, dịch x −0.1 và z −0.25; **vòm radar bật ra nổi riêng**: nghiêng 18° và 22°, Δy −0.13, dịch x +0.4 và z +0.8 |
- Mọi mảnh đều **chìm một nửa** (nửa trên lộ ra khỏi mặt nước) và **nổi lềnh bềnh**: biên độ nhấp nhô 0.3 đơn vị thế giới, lắc nhẹ ±3°.
- Mặt cắt gãy có **tấm kín tối, sườn thép thò ra và viền nóng đỏ** (đã có trong model).
- Hiệu ứng trên xác: lửa, cột khói, dầu loang, tro lửa và vòng sáng ở các neo của từng mảnh (`fire_N` đã nằm đúng mảnh, `smoke_point_<mảnh>`), xem `wreckage.md` mục 1.3; cường độ giảm dần: lửa thu nhỏ 50% sau 20 s, tắt hẳn sau 60 s (chỉ còn khói mỏng và dầu).

## 3. Ghi chú cho agent code
- Sprite xám dùng cùng filter ở `ship-destroyer.md` 1.4; dấu X lấy từ `markers.svg` (marker `sunk`), đặt mỗi ô một lần, kích thước theo ô lưới (co giãn theo `grid.cellMin`…`cellMax`).
- Hoạt cảnh chìm điều khiển bằng key thời gian ở bảng 2.2 áp lên node gốc; chuyển động phụ và hiệu ứng riêng theo 2.3. Một số tàu cần **tách node ra khỏi cây** để bay ballistic: `turret_fwd` (khu trục hạm), `radome` (tàu hộ vệ), mảnh `plane_N` (tàu sân bay). Các node đó có sẵn trong glb. Tên node: `ships-basic3d.md` mục 2.
- Không cần LOD riêng; không cần model tàu chìm.
