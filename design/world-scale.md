# Tỉ lệ thế giới 3D: model tàu và lưới nhân 10

**Quyết định (người thiết kế):** model tàu to gấp **10** lần bản trước, cho ngang cỡ tàu ở phông màn chờ (tàu nền menu dài khoảng 15 đơn vị). Để tàu vẫn nằm vừa đúng trong ô, **cả lưới 3D cũng nhân 10**.

> **Quy ước mới: 1 ô lưới = 10 đơn vị thế giới (ĐV).** Trước đây 1 ô = 1 đơn vị. Tương ứng khoảng 8 m mỗi ĐV (khu trục hạm 19 ĐV ≈ 155 m).

| Tàu | Ô | Dài trước (ĐV) | **Dài mới (ĐV)** | Ghi chú |
|---|---|---|---|---|
| Khu trục hạm | 2 | 1.9 | **19** | rộng 3.8 |
| Tuần dương | 3 | 2.9 | **29** | rộng 4.0 |
| Tàu ngầm | 3 | 2.9 | **29** | đường kính 2.2 |
| Tàu tên lửa | 4 | 3.9 | **39** | rộng 4.2 |
| Tàu sân bay | 5 | 4.9 | **49** | thân 6.2, boong 8.0 |
| Tàu cắn lén | 1 | 0.9 | **9** | rộng 3.4 |
| Tàu hộ vệ | 2×2 | 1.9 × 1.9 | **19 × 19** | mũi +X, không xoay |

Các file `models/ship_*.glb` **đã được nhân 10 sẵn** (nhân vào đỉnh và vị trí node, gốc `ship_<id>` giữ scale = 1). Không nhân thêm khi nạp.

## 1. Cách đọc các tài liệu khác
- **Số ghi theo "ô"** (cinematic `f, r, u`, độ sâu chìm Δy, kích thước tàu trong `ship-*.md`, "dài 1.9"…): giữ nguyên số, **nhân 10 khi ra thế giới**. Ví dụ `T(f −4.0, r 0, u +3.0)` là cách mục tiêu 40 ĐV và cao 30 ĐV.
- **Số ghi theo "đơn vị"** trong `env-and-fx.md`, `maps.md`, `sinking.md`: nếu nói về tàu, lưới, camera, hiệu ứng gắn vào tàu thì **nhân 10**; nếu nói về phông nền xa thì dùng bảng ở mục 3 dưới đây (phông nền được **đặt lại**, không nhân máy móc).
- **Hình ảnh phông màn chờ (Menu, ModeSelect) không đổi**: tàu nền ở đó vẫn dài khoảng 15 ĐV và cảnh giữ nguyên số. Chính vì vậy tàu trong trận giờ ngang cỡ tàu ở phông.
- Thời gian (ms), góc (độ), tỉ lệ phần trăm, FOV: **không đổi**.

## 2. Số liệu mới (thay các số cũ trong `env-and-fx.md`)

### 2.1 Bố cục lưới
- Mỗi lưới **100 × 100 ĐV** (ô 10 ĐV). Lưới của mình: tâm `(0, 0, +75)`; lưới địch: tâm `(0, 0, −75)`. Khoảng nước giữa hai lưới **50 ĐV** (z −25…+25). Lưới của mình trải z +25…+125, lưới địch z −125…−25, mỗi lưới x −50…+50.
- `cellToWorld(owner, cell) → (x, 0, z)`: `x = (cell.x − 4.5) × 10`, `z = zCenter(owner) + (cell.y − 4.5) × 10`, `zCenter` là +75 (mình) hoặc −75 (địch).
- Tàu đặt ngang quay mũi về +X, đặt dọc quay mũi về +Z (không đổi). Tâm tàu đặt tại tâm vùng các ô nó chiếm.
- Lưới 2D (DOM) vẫn không cần trùng pixel với lưới 3D.

### 2.2 Camera
| Preset | Vị trí | Nhìn vào | FOV | Ghi chú |
|---|---|---|---|---|
| `tactical` | (0, 170, 240) | (0, 0, −10) | 38° | khung hình chiếm lưới giống bản trước vì mọi thứ nhân 10 |
| `menu` | **không đổi** | **không đổi** | 50° | |
| `hangar` | quỹ đạo r = **1.6 × chiều dài tàu** (khu trục hạm 30, tàu sân bay 78), cao **0.35 × r**, quanh tàu ở gốc | (0, 3, 0) | 35° | |
| `result` | dolly chậm từ (0, 30, 180) lùi tới (0, 50, 280) trong 8 s | cảnh đang chìm hoặc thắng | 40° | |
| cinematic | offset theo ô nhân 10 | — | không đổi | |
- Mặt phẳng gần (near) **0.5**, mặt phẳng xa (far) **3000**.
- Khoảng cách tối thiểu từ camera tới thân tàu: **1.5 ĐV** (bản cũ 0.15).
- Rung camera: biên độ nhân 10 (ví dụ 0.06 thành 0.6 ĐV); nhịp và thời lượng không đổi.

### 2.3 Biển
Bốn sóng Gerstner (đổi theo tỉ lệ tàu, không nhân đủ 10 để biển còn đọc được):

| Sóng | Biên độ | Bước sóng | Hướng | Tốc độ |
|---|---|---|---|---|
| 1 | 3.5 | 180 | 15° | 3.3 |
| 2 | 2.0 | 90 | −40° | 4.2 |
| 3 | 1.2 | 50 | 70° | 5.7 |
| 4 | 0.6 | 24 | −10° | 7.2 |
- Lưới mặt nước **4000 × 4000 ĐV**, 512 × 512 đỉnh (chất lượng trung; thấp 256, cao 768).
- Sương `density` **0.0011** (bản cũ 0.011).
- Tàu nhấp nhô: nâng hạ **0.2 ĐV** (cũ 0.02), lăn ±1.5° và chúi ±1° không đổi.
- Dải bọt quanh thân, vệt dầu: nhân 10.

### 2.4 Mưa và khí quyển
- Hộp mưa quanh camera **120 × 75 × 120** (cũ 40 × 25 × 40); vệt dài **3** (cũ 0.6), tốc độ **110 ĐV/s** (cũ 22); số vệt giữ nguyên. Vòng gợn mưa bán kính **1.5** (cũ 0.15).
- Tro lửa (Trường Sa): bay lên 3–7 ĐV/s, kích thước hạt nhân 4.

### 2.5 Hiệu ứng và vật bắn
- Kích thước hiệu ứng gắn với tàu (cột nước, lửa, cầu lửa, khói, mảnh vỡ, vòng sóng): **nhân 10** so với `env-and-fx.md` mục 8 (ví dụ cột nước miss nhỏ cao 0.6 → 6 ĐV; chớp lõi 0.25 → 2.5 ĐV). **Ngoại lệ**: kích thước các hạt nhỏ (tia lửa, giọt nước, mảnh vỡ nhỏ) chỉ nhân 4.
- **Vật bắn** (mục 7 `env-and-fx.md`): kích thước **nhân 10**: tên lửa dài 1.2, ⌀0.18; đạn pháo 0.8; tên lửa-ngư lôi 1.5; máy bay sải cánh 1.6; bom 0.4. Vận tốc **ô/giây × 10** (đạn pháo 180 ĐV/s, tên lửa lên 60, vòng 90, lao xuống 140; tên lửa-ngư lôi 70). Hệ số phóng đại hero (×2.5 cảnh rộng, ×1.2 cảnh cận) **giữ nguyên**.
- `PointLight`: khoảng chiếu (distance) nhân 10; cường độ giữ nguyên (đã nhân hệ số chói `glare`). Bóng đổ: khung bóng nhân 10.
- Chớp mõm, khói, vỏ đạn của CIWS: vị trí neo đã nằm trong model (đã nhân 10); kích thước hạt nhân 4 cho vỏ đạn, nhân 10 cho vệt đạn.

### 2.6 Hoạt cảnh chìm
Δy và vị trí trong `sinking.md` là theo ô: **nhân 10** (khu trục hạm chìm xuống 12 ĐV ở mốc cuối, tàu sân bay 3 ĐV…). Bay ballistic của tháp pháo: vận tốc lên 0.35 ô/s thành **3.5 ĐV/s**, trọng lực −0.23 ô/s² thành **−2.3 ĐV/s²** (rơi xuống nước đúng giữa hoạt cảnh).

## 3. Phông nền: đặt lại vì lưới đã to gấp 10

Vùng chơi (hai lưới, khoảng nước giữa, cộng đệm): **`|x| < 60` và `z` từ −135 tới +135** (camera `tactical` ở z +240). **Mọi vật nền nằm ngoài vùng này**, và không che đường nhìn từ camera trận hay camera cinematic tới ô mục tiêu.

### 3.1 Hải Phòng hoang tàn (thay các số ở `env-and-fx.md` mục 6)
| Thành phần | Trước | **Mới** |
|---|---|---|
| Skyline lớp 1 | z −70, cao 18–60 | z **−220**, cao **45–150** |
| Skyline lớp 2 | z −110, cao 30–90 | z **−300**, cao **75–225** |
| Skyline lớp 3 | z −160, cao 40–130 | z **−400**, cao **100–325**; trải x ±500 |
| Cần cẩu | x −40/−18/+22/+45, z −45…−60, cao 28 | x **−130/−60/+70/+140**, z **−150…−190**, cao **70** |
| Xác tàu hàng | x ±26, z −30, dài 24 | x **±85**, z **−110**, dài **70** (cùng cỡ tàu to) |
| Phao | ngoài hai bên lưới | ở x **±70** hoặc xa hơn |
| Mảnh vỡ nổi, đèn pha | trong vùng nhìn | chỉ ngoài vùng chơi |

### 3.2 Trường Sa (thay các số ở `maps.md` mục 2 và 4.3)
| Thành phần | Trước | **Mới** |
|---|---|---|
| Đảo gần trái | tâm x −45, z −32, dài 90 | tâm x **−135**, z **−75**, dài **90** (trải x −180…−90) |
| Đảo gần phải | tâm x +50, z −34, dài 85 | tâm x **+135**, z **−80**, dài **85** (trải x +92…+178) |
| Nhà giàn | cao 12 | cao **12** (giữ nguyên số tuyệt đối), đặt ở đảo phải |
| Tàu giao tranh nền | dài 14–22, z −20…−55, \|x\| ≥ 24 | dài **22–40** (cùng cỡ tàu trong trận), \|x\| **≥ 75**, z **−60…−160** |
| Tên lửa nền | đỉnh cao 25–30 | đỉnh cao **60–90**, qua phía trên lưới và khoảng nước giữa |
| Tàu chìm A, B | dài 20 và 14 | dài **30** và **22**, đặt ở \|x\| ≥ **80** |
| Đảo xa mờ | z −75…−100 | z **−200…−260** |
Cảnh Menu và ModeSelect của Trường Sa **không dùng các số mới này**; giữ số cũ (mock `art/ui_menu_mock_truong_sa.svg`).

## 4. Ghi chú cho agent code
- Đổi `cellToWorld`, vị trí và kích thước lưới 3D, các preset camera, near/far, bước sóng và biên độ sóng, mật độ sương, hộp mưa, kích thước hạt, vận tốc và kích thước vật bắn, khoảng chiếu đèn, khung bóng theo mục 2.
- Nạp `ship_*.glb` với `scale = 1` (đã nhân 10). Nếu đang có hệ số `UNIT = 1` trong code, đổi thành `UNIT = 10` ở mọi chỗ đổi từ ô sang thế giới.
- Phông nền Hải Phòng và Trường Sa (gameplay, Đặt tàu, Kết quả): đặt lại theo mục 3. Phông Menu: giữ nguyên.
- Kiểm tra: từ camera `tactical` hai lưới 100 × 100 nằm gọn trong khung; tàu đặt vào ô khớp đúng; camera cinematic không xuyên thân tàu (khoảng cách ≥ 1.5 ĐV); sóng không che ô (biên độ sóng 3.5 ĐV so với thân tàu cao khoảng 3–4 ĐV: kiểm tra mạn khô nhìn thấy).
