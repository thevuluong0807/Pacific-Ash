# Ô trúng ở 3D: mảnh xác tàu nổi, và khi trúng đủ thì cả con tàu chìm

Cảnh 3D thể hiện **hai mức** hậu quả của đạn:

| Mức | Khi nào | Hình ở 3D |
|---|---|---|
| **Trúng một phần** | một ô của tàu trúng, tàu chưa chìm | **một mảnh xác tàu nổi** (linh kiện chìm nổi) trên mặt nước tại ô đó, kèm hiệu ứng nổi bật |
| **Trúng đủ (chìm)** | mọi ô của tàu đã trúng (`ShipSunk`) | **hình đầy đủ 3D con tàu** hiện ra, đang **cháy nổ và chìm** (hoạt cảnh `sinking.md`) |

2D (lưới) vẫn như cũ: ô trúng hiện marker lỗ đạn nổ (`ui-art.md`), tàu chìm hiện sprite xám kèm dấu X (`sinking.md` mục 1). Phần 3D ở file này chỉ là cảnh nền và cinematic.

| File đi kèm | Vai trò |
|---|---|
| `models/debris/debris_<id>.glb` | 10 mảnh xác tàu dùng được ngay (đã nhân 10 theo `world-scale.md`) |
| `models/debris/preview_debris.png` | ảnh xem trước 10 mảnh |
| `models/_src/make_debris.mjs` | nguồn dựng mảnh xác, sửa rồi chạy lại |

## 1. Trúng một phần: mảnh xác tàu nổi

### 1.1 Bộ mảnh (10 mảnh)
**Mảnh chung** (dùng cho mọi tàu, kể cả khi trúng tàu địch chưa lộ loại, để không lộ thông tin):

| Mảnh | Mô tả | Cỡ (đơn vị) |
|---|---|---|
| `debris_plate` | tấm vỏ tàu xé cong gập, mép nóng đỏ, vết cháy, gỉ, sườn thép thò ra | 8 × 6 |
| `debris_mast` | đoạn cột gãy nghiêng, thanh ngang, tấm radar cong, đầu cột đỏ rực | cao 7 |
| `debris_turret` | mảnh bệ tháp pháo, nòng cong gãy có miệng giảm giật, vết cháy | 7 × 7 |
| `debris_hullchunk` | khối thân tàu lộ sườn bên trong cháy xém | 9 × 6 |
| `debris_cargo` | thùng hàng cam và xám, bình cứu sinh vàng, dây đai | 6 × 6 |
| `debris_funnel` | đoạn ống khói đổ có lưới, ống nhỏ, bồ hóng | 5 × 5 |

**Mảnh riêng theo loại tàu** (chỉ dùng cho **tàu của mình** bị trúng, vì tàu địch chưa lộ loại):

| Mảnh | Tàu | Mô tả |
|---|---|---|
| `debris_wing` | tàu sân bay | cánh máy bay gãy có giá treo và đoạn tên lửa |
| `debris_vls` | tàu tên lửa | mảng nắp VLS có nắp mở, đoạn tên lửa cắm trên |
| `debris_sail` | tàu ngầm | đoạn tháp chỉ huy gãy, tiềm vọng cong, cánh lái nước |
| `debris_radome` | tàu hộ vệ | nửa vòm radar nứt, đoạn CIWS và ăng-ten cong |
Khu trục hạm, tuần dương, tàu cắn lén dùng mảnh chung.

Mỗi file glb là một cây node: gốc `debris_<id>`, các điểm neo rỗng **`float_line`** (mực nước, y = 0), **`fire_point`** (gắn lửa), **`smoke_point`** (gắn cột khói), **`glow_point`** (gắn ánh sáng). Mép bị xé có vật liệu **`ember`** (cam phát sáng) làm nóng đỏ.

### 1.2 Chọn mảnh và đặt mảnh
- **Chọn mảnh**: xác định theo `hash(ô, seed trận)` trong bộ mảnh chung; các ô kề nhau không dùng cùng loại; mỗi ô trúng một mảnh. Tàu của mình thêm mảnh riêng cho đúng loại tàu (ví dụ ô trúng của tàu sân bay có thể ra `debris_wing`).
- **Vị trí**:
  - Tàu địch (chưa lộ): đặt tại **tâm ô**.
  - Tàu của mình (model còn đó): đặt **bên mạn tàu**, cách trục tàu 5.5 đơn vị về phía ngoài (không chồng lên thân tàu), trong phạm vi ô.
- **Dáng nổi**: ngập 40% trong nước (mép nước tại `float_line`), nghiêng ngẫu nhiên 10–35°, quay ngẫu nhiên quanh Y, nhấp nhô 0.3 đơn vị theo sóng, trôi chậm 0.2 đơn vị/s nhưng **không ra khỏi ô**.
- **Cỡ**: giữ nguyên số ở bảng; đòn nặng (tên lửa chùm, không kích, tuần dương) nhân 1.4. Từ camera `tactical`, mảnh phải nhìn thấy rõ (rộng tối thiểu 28 px trên màn hình).
- Tối đa **25 mảnh** cùng lúc; mảnh cũ nhất tắt lửa khi vượt giới hạn lửa 16 (xem 1.4).

### 1.3 Hiệu ứng nổi bật
**Lúc trúng (đúng mốc `tImpact`)** `fx_wreck_toss`:
1. Vụ nổ hất mảnh xác bay lên theo **cung đạn đạo**: đỉnh cao 15–25 đơn vị, bay 900 ms, xoay 1–2 vòng, kéo **vệt lửa và khói** sau mảnh.
2. Rơi xuống nước: **cột nước và vòng sóng** (`fx_splash`, nhân 1.5), mảnh ngập sâu 40% rồi **nổi lên** trong 600 ms và bắt đầu nhấp nhô.

**Tồn tại đến hết ván (hoặc đến khi tàu chìm hẳn)**, mọi hiệu ứng đều nhân hệ số chói `glare`:
| Mã | Hiệu ứng | Thông số |
|---|---|---|
| `fx_fire` | ngọn lửa trên mảnh | cao 8–12 đơn vị, nhấp nháy 8 Hz, gắn vào `fire_point` |
| `fx_smoke_column` | cột khói đen mảnh | cao **40**, rộng 3 → 8, nghiêng theo gió 12°, gắn vào `smoke_point`; **thấy rõ từ camera trận** |
| `fx_oil` | vết dầu loang quanh mảnh | bán kính 6, tối bóng loáng |
| `fx_wreck_glow` | ánh sáng cam từ lửa | `PointLight` bán kính 14 đơn vị nhấp nháy, chỉ tối đa 3 đèn thật cùng lúc, còn lại dùng quầng sáng emissive |
| `fx_glow_ring` | vòng sáng cam lan trên mặt nước | vòng bán kính 6 → 12 mở rộng mỗi 1.6 s, độ mờ 0.35 → 0, để mắt dễ thấy ô trúng |
| `fx_embers` | than hồng bay lên | 20 hạt/giây, bay lên 3–6 đơn vị |
| `fx_spark_burst` | chùm tia lửa | mỗi 2–4 s ngẫu nhiên, 20 hạt bắn ra từ mép nóng đỏ |

### 1.4 Giới hạn và chất lượng
- Lửa tối đa **16** ngọn đồng thời (như `env-and-fx.md`); mảnh cũ nhất hạ lửa thành than hồng (chỉ `fx_embers` và `fx_oil`).
- Cột khói tối đa 12 cùng lúc.
- Chất lượng thấp: bỏ cột khói, `fx_glow_ring`, `fx_spark_burst`; giữ mảnh và một ngọn lửa. Trung: đủ nhưng không `fx_wreck_glow` thật (dùng quầng emissive).
- Mảnh không cần bóng đổ thật (bóng giả bằng đĩa tối dưới mảnh).

## 2. Trúng đủ: cả con tàu 3D chìm và cháy nổ

Khi ô cuối cùng của tàu trúng (`ShipSunk`):
- **Hiện đầy đủ model 3D con tàu** đúng vị trí, hướng và kích thước của nó (kể cả tàu địch vốn bị ẩn): xuất hiện bằng **một vụ nổ lớn che chỗ ghép** (chớp lõi và cầu lửa 300 ms), không có hiện dần trong suốt.
- Tàu **đang cháy khắp thân** (lửa ở mọi neo `fire_N`, khói đặc, tia lửa), **nổ liên hoàn** (nổ thứ phát dọc thân, ở thời điểm đã định riêng từng tàu), rồi **chìm xuống** theo hoạt cảnh riêng 10800 ms ở `sinking.md` mục 2.
- Các **mảnh xác nổi** đã có từ các lần trúng trước **trôi về phía thân tàu và gộp vào xác tàu** (từ 4500 đến 9000 ms), riêng **2 mảnh ngẫu nhiên** ở lại nổi riêng cạnh xác (tắt lửa sau 6 s, giữ vết dầu).
- Sau đó tàu **không biến mất**: nó thành **xác tàu nổi chìm một nửa** (`wreck_<id>`, mục 3) và ở lại đến hết ván cùng dầu loang. Các mảnh xác riêng lẻ (mục 1) của tàu đó được thay bằng chính xác tàu.
- Dấu X và sprite xám ở 2D hiện cùng lúc với vụ nổ lớn (`sinking.md` 1.2).

### 2.1 Không phụ thuộc cinematic
- Cảnh 3D phía sau lưới (nền biển, tàu, hiệu ứng) **luôn phát** hoạt cảnh này, kể cả khi người chơi **tắt cinematic** hoặc dùng **cinematic ngắn**. Khi đó hoạt cảnh chạy ở nền **bản rút gọn 4000 ms** (cùng kiểu chìm riêng, cùng dấu hiệu cháy nổ, nhanh hơn) và **không chặn lượt**. Chế độ đầy đủ 10800 ms chạy khi cinematic bình thường.
- Nút bỏ qua riêng cho cảnh chìm đẩy hoạt cảnh tới cuối trong 450 ms (`sinking.md` 2.1).

## 3. Model xác tàu bị hạ theo từng loại tàu

Mỗi loại tàu có **một model xác** dùng làm trạng thái cuối khi bị hạ (`ShipSunk`). Tàu **chìm một nửa**, có thể **gãy thành nhiều mảnh**, mọi mảnh **nổi lềnh bềnh**, **vẫn nhận ra loại tàu** nhờ các bộ phận đặc trưng còn lại.

| File | Mô tả |
|---|---|
| `models/wrecks/wreck_<id>.glb` | 7 model xác (đã nhân 10 theo `world-scale.md`) |
| `models/wrecks/preview_wrecks.png` | ảnh xem trước (có mặt nước che nửa dưới, đúng như trong cảnh) |
| `models/_src/make_wrecks.mjs` | nguồn dựng: tái dùng chính builder của tàu nguyên vẹn rồi cắt, nghiêng, hạ |

| Tàu | Mảnh | Còn nhận ra nhờ | Tam giác |
|---|---|---|---|
| `wreck_destroyer` | 2 mảnh (mũi, đuôi) | cầu có cột và tháp pháo trước; sàn bay chữ H, hai ống khói, tháp sau | 5 617 |
| `wreck_cruiser` | 1 mảnh nghiêng nặng | ba tháp pháo nòng đôi, ống khói to, cầu cao | 10 001 |
| `wreck_missile` | 2 mảnh (mũi và nhà boong, đuôi) | hai dãy ô phóng 8×4, bệ phóng, cầu có tấm radar | 7 201 |
| `wreck_submarine` | 2 mảnh (mũi, thân) | tháp chỉ huy có tiềm vọng, cánh lái, vân gạch cách âm | 5 300 |
| `wreck_carrier` | 2 mảnh (thân, đuôi) | boong bay với vạch kẻ, đảo chỉ huy, thang máy sọc hazard, máy bay | 7 117 |
| `wreck_raider` | 1 mảnh lật một phần | thân nhỏ góc cạnh, cột radar, tháp pháo nhỏ | 1 177 |
| `wreck_escort` | 3 mảnh (thân + boong, thân tách, vòm radar) | hai thân song song, vòm radar to, giàn mồi nhử, CIWS | 7 038 |

- Cấu trúc node: gốc `wreck_<id>`; các nhóm mảnh `section_*` (mỗi nhóm đã đặt sẵn pose cuối, dùng để nội suy từ pose 0 trong hoạt cảnh); điểm neo `fire_N` đã nằm trong đúng mảnh, `smoke_point_<mảnh>`, `float_line`, và neo ô `cell_N` ở gốc (không dịch).
- Mặt cắt gãy: tấm kín tối, sườn thép thò ra, viền đỏ nóng (vật liệu `ember`); mỗi neo lửa có vết cháy và điểm nóng.
- Pose cuối từng mảnh và mốc hoán đổi từ model nguyên vẹn sang model xác: `sinking.md` mục 2.8.
- Với tàu bị hạ ở **lưới địch (đã ẩn)**: model xác hiện đúng vị trí tàu khi hoán đổi, như tàu nguyên vẹn.

## 4. Ghi chú cho agent code
- Nạp `models/debris/debris_<id>.glb` bằng `GLTFLoader`, scale = 1 (đã nhân 10). Dùng instancing nếu nhiều mảnh. Neo `fire_point`, `smoke_point`, `glow_point` là nơi gắn hiệu ứng.
- Mảnh chung dùng cho mọi ô để không lộ loại tàu địch; mảnh riêng chỉ cho tàu của mình.
- Khi `ShipSunk`: tạo model tàu nguyên vẹn tại vị trí đã biết của tàu (từ `core`), phát hoạt cảnh tới **mốc hoán đổi** (`sinking.md` 2.8), thay bằng `wreck_<id>.glb`, nội suy các `section_*` từ pose 0 tới pose cuối, và giữ xác đến hết ván. Các mảnh xác trong ô gộp vào xác theo mục 2.
- Tỉ lệ thế giới: `world-scale.md`.
