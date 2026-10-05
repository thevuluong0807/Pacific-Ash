# Map và mục "Chọn map"

"Map" là phông 3D phía sau các màn có cảnh biển (cảnh chờ **và màn gameplay**). Người chơi đổi map trong Cài đặt bằng danh sách thả xuống có icon mô tả.

| File đi kèm | Vai trò |
|---|---|
| `art/map_truong_sa.svg` | Hình xem trước (thumbnail 320×180) map "Trường Sa" |
| `art/map_hai_phong.svg` | Hình xem trước map "Hải Phòng hoang tàn" |
| `art/icons.svg` | Icon `map-truong-sa`, `map-hai-phong` (48×48, đơn sắc) |
| `art/ui_settings_mock.svg` | Mock màn Cài đặt, danh sách "Chọn map" đang mở |
| `art/ui_battle_mock.svg` | Mock màn Trận với map `hai_phong` (nền đêm mưa, skyline) |
| `art/ui_battle_mock_truong_sa.svg` | Cùng màn Trận với map `truong_sa` (nền hoàng hôn, đảo, nhà giàn, tàu chìm); UI không đổi, chỉ nền |

## 1. Hai map và phạm vi áp dụng
| Id | Tên hiển thị | Mô tả ngắn (trong danh sách) |
|---|---|---|
| `truong_sa` | Trường Sa | Hoàng hôn, quần đảo cháy, nhiều tàu bắn tên lửa qua nhau |
| `hai_phong` | Hải Phòng hoang tàn | Mưa lớn, thành phố cảng đổ nát và cháy dở, ánh cam lạnh |

- **Map áp dụng cho mọi cảnh 3D có phông biển**: Menu, ModeSelect, Placement, Trận đấu, Result. Cả **màn gameplay** đổi theo map (ánh sáng, trời, biển, vật trang trí nền, hiệu ứng khí quyển, âm nền, cách hiệu ứng nổ hiển thị): xem mục 4.
- **Ngoại lệ**: Hangar luôn dùng phòng xưởng tối trung tính (xem trước tàu cần ánh sáng ổn định); PassDevice và Settings phủ lớp mờ lên cảnh hiện có.
- **Mặc định**: `truong_sa`. Đổi mặc định chỉ là một dòng cấu hình.
- **Đổi map giữa trận**: được phép. Trạng thái trận giữ nguyên; cảnh mới nạp xong rồi crossfade 600 ms. Nếu đang phát cinematic hoặc hàng đợi sự kiện, **chờ phát xong mới đổi**, không cắt giữa chừng. Trong lúc nạp, giữ cảnh cũ.
- Khi mở Cài đặt từ Menu: đổi map thấy ngay ở phông phía sau (mờ dần 600 ms).

## 2. Map "Trường Sa" — hoàng hôn, quần đảo, hải chiến
Kế thừa **tông màu và phong cách** của cảnh hoàng hôn cũ (trời tím cam, mây tối viền cam, mặt trời thấp, tro lửa bay) nhưng bối cảnh là quần đảo Trường Sa: **quần đảo san hô thấp ngay trước mặt, nhà giàn trên cọc, hai bên có nhiều tàu đang đấu tên lửa với nhau, tàu đang chìm**. Không còn núi lửa. Mã nguồn cảnh cũ đã mất, không có lịch sử, nên dựng lại theo mô tả; chỉnh bằng mắt cho đúng tông. Bản tham chiếu: `art/map_truong_sa.svg` (sinh từ `art/_src/scene.mjs`), `art/ui_menu_mock_truong_sa.svg`.

### Ý đồ
Hoàng hôn buông, tối hơn bản cũ khoảng 30% ở trời, nhưng **mặt biển sáng hơn một chút** so với bản trước (xem bảng màu). Quần đảo **gần và rõ**, nhìn thấy từng cây dừa, bãi cát, đá, công trình. Hải chiến sống động: hai phe bắn tên lửa qua nhau trên đầu, hai tàu chìm, đảo cháy.

### Thành phần
| Thành phần | Mô tả | Thông số |
|---|---|---|
| Trời, mặt trời, mây | giữ nguyên gradient cũ, mặt trời thấp ở giữa-xa, mây tối viền cam | trời `#0A0710` → `#2B1424` → `#8A431F`… xem bảng màu bên dưới; mặt trời quầng `#FF7A1A` |
| **Quần đảo gần (trái)** | một đảo san hô lớn rộng, cát, đá, 6 cây dừa, tháp đèn đổ cháy, lô cốt nhỏ, cột nổ pháo kích | tâm x −45, z −32; dài 90, cao 3; nước nông xanh ngọc quanh đảo |
| **Quần đảo gần (phải)** | đảo thứ hai cũng lớn, 4 cây dừa, **nhà giàn to đang cháy**, lô cốt cháy | tâm x +50, z −34; dài 85; nhà giàn cao 12 |
| Đảo nhỏ giữa/xa | 3 mỏm cát thấp, xa và mờ | z −75…−100, nằm ngoài vùng giữa |
| **Tàu giao tranh** | **6 chiến hạm**: 3 ở bên trái (một to ở gần, hai nhỏ hơn ở xa hơn, mũi hướng phải), 3 ở bên phải (mũi hướng trái); đang phóng tên lửa, thượng tầng có lửa phóng và khói | cỡ lớn dài 22, cỡ nhỏ dài 14–16; xếp lớp theo chiều sâu z −20…−55 |
| **Tên lửa bay qua nhau** | **6 vệt tên lửa** cong hình parabol, từ tàu trái sang phải và ngược lại, vạch trắng khói, đầu tên lửa có lửa phụt, vài quả đang bay, vài quả vừa trúng | đỉnh cao 25–30, xuyên qua khoảng giữa nhưng **ở cao** (phần trên trời), không đi xuống thấp vào vùng giữa phía nút |
| **Nổ do tên lửa trúng** | 2–3 điểm nổ trên đảo/tàu, cầu lửa và khói | lặp ngẫu nhiên 3–6 s mỗi vụ |
| **Tàu đang chìm** | **2 con**: A nghiêng 20°, thượng tầng cháy (phải); B nghiêng ~50°, mũi chìm (trái) | tư thế cố định, lún rất chậm 0.02 đơn vị/phút, dầu loang, bọt khí |
| Tro lửa | hạt than hồng bay lơ lửng, bốc lên từ đám cháy | 400 hạt (trung), phần lớn ở hai bên; `#FFD27A` → `#FF5A1A` → `#3A2A22` |
| Pháo kích | đạn rơi trúng đảo, cột cát bụi và mảnh san hô bắn lên | 4–9 s ở cảnh chờ, 10–20 s ở gameplay |
| Đạn vạch sáng | 1–3 vệt đạn đứt nét cam–vàng nhạt trên trời | |
| Chớp nổ chân trời, sương | mỗi 3–8 s một chớp cam, sương thấp hồng cam | `#2A1420`, mật độ 0.008 |

### Bảng màu biển (sáng hơn bản trước một chút)
| Vùng | Cũ | Mới |
|---|---|---|
| Chân trời | `#3A1A14` | `#6A3420` |
| Giữa | `#150A0C` | `#3A1D18` → `#1C0F12` |
| Gần | `#050306` | `#0C070A` |
| Nước nông quanh đảo | `#2A4A44` → `#14262A` | `#4A8A82` → `#1D3A3C` (ngọc rõ hơn) |
| Vệt sáng | cam mờ | cam sáng `#FFB15A` độ mờ 0.6 |
Biển vẫn tối ở phía gần camera (để lưới 2D đọc rõ), chỉ sáng ở xa và quanh quần đảo. Biên độ sóng ×0.85.

### Camera
Dùng `menu` (`env-and-fx.md` mục 2) nhìn về giữa quần đảo: nhìn vào `(0, 3, −45)`. Quần đảo ở **sát hai bên màn hình**, không còn lùi xa; hai đảo gần chiếm khoảng 30% chiều rộng mỗi bên.

### Chất lượng
Theo `tokens.json → quality`. **Thấp**: giữ 4 tàu giao tranh và 3 vệt tên lửa, bỏ sóng vỡ trên rạn, chớp nổ chân trời, tro lửa còn 30%. **Trung**: đầy đủ (6 tàu, 6 vệt). **Cao**: thêm phản chiếu biển thật, 700 hạt, khói chi tiết.

## 3. Map "Hải Phòng hoang tàn"
Đúng như thiết kế hiện có: `env-and-fx.md` mục 3–6 (biển, trời, mưa, skyline). Camera `menu` mặc định. Đây là map gốc mà toàn bộ hiệu ứng và cinematic được dựng đầu tiên; `env-and-fx.md` mô tả map này, map khác ghi đè theo mục 4.

## 4. Map trong màn gameplay (Placement, Trận, Result)

Bố cục thế giới, camera `tactical`, vị trí hai lưới, hướng tàu, cinematic, điểm neo tàu: **không đổi theo map** (`env-and-fx.md` mục 1–2, `cinematics.md`). Map chỉ đổi **diện mạo** theo bảng ghi đè dưới đây. `env-and-fx.md` mô tả `hai_phong`; `truong_sa` ghi đè các dòng sau.

### 4.1 Bảng ghi đè
| Thông số | `hai_phong` | `truong_sa` |
|---|---|---|
| Trời | đêm: `#05080B` → `#18222B`, vệt cam mờ | hoàng hôn: `#0A0710` → `#2B1424` → `#8A3216` → `#E0661F` → `#FF9A3A` (mục 2) |
| Sương | `#0B1117`, mật độ 0.011 | `#2A1420`, mật độ 0.008, ngả hồng cam sát mặt nước |
| Mưa | 3000 vệt (trung) | **không mưa**; thay bằng tro lửa 400 hạt bay lơ lửng |
| Sấm chớp | có (`env-and-fx.md` mục 4) | **không**; thay bằng chớp nổ chân trời mỗi 3–8 s |
| Đèn chính | lạnh `#9FB8CC`, chếch từ sau-trên | **ấm `#FF8A4A`, thấp 12°, từ phía mặt trời (bên phải, sau lưới địch)**, cường độ 1.1, bóng đổ dài |
| Hemisphere | trời `#1B2630`, đất `#04090D`, 0.35 | trời `#2A1A2A`, đất `#07050A`, 0.35 |
| Môi trường phản chiếu (HDRI) | `tex_env_night_harbor` | `tex_env_truong_sa` (hoàng hôn tối, vệt mặt trời, ánh lửa); thân tàu bạc ánh cam ấm ở cạnh phải |
| Biển | sâu `#04090D`, trung `#0C1A24`, bọt `#9FB4C2` | sáng hơn bản trước: gần `#0C070A`, giữa `#3A1D18`, chân trời `#6A3420`, nước nông ngọc `#4A8A82`, bọt `#FFD9B0`; biên độ sóng ×0.85 (bảng mục 2) |
| Vệt phản chiếu trên biển | ánh cam skyline | vệt mặt trời và ánh lửa rộng, sóng sánh |
| Nước tung (miss), bọt | trắng xanh `#E9F2F8` | nhuộm ấm: nhân `#FFE0C8` |
| Dưới nước (tàu ngầm, ngư lôi) | `#06141C`, tầm nhìn 6 | xanh ngọc ấm `#0B2A2C`, tầm nhìn 9, tia sáng cam hoàng hôn xuyên nước |
| Hậu kỳ: vignette | 0.25 | 0.30 |
| Phông nền | skyline, cần cẩu, xác tàu hàng, phao | **quần đảo gần**, nhà giàn, tháp đèn đổ, 6 tàu giao tranh bắn tên lửa, hai tàu chìm (mục 2) |
| Âm nền | `amb_sea_rain` + sấm | `amb_sea_dusk` (sóng, gió, tiếng nổ xa, ù ù pháo; không mưa) |

### 4.2 Hiển thị hiệu ứng nổ dưới ánh hoàng hôn
Trời sáng hơn nên lửa và nổ dễ chìm. Khi map là `truong_sa`:
- Nhân độ phát sáng (emissive) của lửa, cầu lửa, chớp lõi **×1.25**.
- Khói đổ **tối hơn một nấc** (`#1A1E22` thay vì `#2A2F35`) để nổi trên nền trời cam.
- Cột nước (trượt) có vành sáng hồng cam phía mặt trời.
- Đèn điểm cam (PointLight) của hiệu ứng giữ nguyên cường độ.
- Bóng đổ của tàu dài về phía camera-trái, nghĩa là bóng tháp pháo, cầu rơi xuống boong rõ hơn.

### 4.3 Vật trang trí nền không được lấn vào vùng chơi
- Mọi vật nền nằm ngoài vùng `|x| < 14` và `z > −40` (vùng hai lưới và khoảng nước giữa, cộng đệm). Với `truong_sa`: **các đảo gần đặt ở `|x| ≥ 18`** (tâm x ∓45/+50, z −32…−34) để nhìn thấy rõ ở hai bên lưới nhưng không chạm vùng chơi; tàu giao tranh ở `|x| ≥ 24`; tên lửa bay ở độ cao ≥ 18 phía trên các lưới. Skyline và cần cẩu của `hai_phong` ở z ≤ −45.
- Không vật nền nào che hai lưới từ camera `tactical`, và không che đường nhìn từ camera cinematic tới ô mục tiêu.
- Hai tàu đang chìm của `truong_sa` luôn là vật nền xa; không bị coi là tàu của trận.

### 4.4 Sự kiện nền khi đang chơi
Sự kiện nền (pháo kích trên đảo, chớp nổ chân trời, đạn vạch sáng, sấm chớp) **tạm hoãn** trong lúc cinematic chạy và thêm 800 ms sau đó, để không tranh sự chú ý với cú bắn thật.
Tần suất trong gameplay thấp hơn ở cảnh chờ: pháo kích 1 đợt mỗi 10–20 s (thay vì 4–9 s), chớp nổ chân trời mỗi 6–14 s, và chỉ 1–2 vệt đạn sáng cùng lúc.

### 4.5 Từng màn
| Màn | `truong_sa` | `hai_phong` |
|---|---|---|
| Placement | camera `tactical`, hai lưới mờ, mặt trời ở phía sau lưới địch | như hiện tại |
| Trận đấu | cảnh đầy đủ như mục 2 và 4.1 | cảnh đầy đủ như `env-and-fx.md` |
| Result | camera `result` lùi xa; thắng: hoàng hôn sáng dần 10%, tàu địch đang cháy; thua: tối hơn 10%, khói phủ | camera `result`; thắng/thua như `animations.md` mục 7 |
| Hangar | phòng xưởng trung tính (không đổi theo map) | phòng xưởng trung tính |

### 4.6 Đồng bộ giữa các màn
Menu, ModeSelect, **Placement, Trận đấu, Result dùng cùng một bộ phông** (cùng đảo, nhà giàn, tàu giao tranh, tàu chìm, tên lửa, tro lửa, ánh sáng, màu biển); **chỉ đổi camera và mật độ sự kiện**. Không được có màn nào nhìn như thuộc map khác.
| Màn | Camera | Khác biệt so với cảnh chờ |
|---|---|---|
| Menu, ModeSelect | `menu` thấp sát mặt nước | đầy đủ sự kiện, vật thể dồn hai bên |
| Placement | `tactical` | giữ nguyên toàn bộ vật nền ở hai bên lưới; sự kiện nền bằng gameplay (thưa); tên lửa vẫn bay nhưng ít (2 vệt) |
| Trận đấu | `tactical` | như Placement; hoãn mọi sự kiện nền khi cinematic (mục 4.4) |
| Result | `result` | như Trận; thắng sáng hơn 10%, thua tối hơn 10% |
- Quần đảo, nhà giàn, tàu chìm **không đổi vị trí** giữa các màn, chỉ đổi theo góc nhìn của camera. Nhìn từ `tactical` (cao hơn, xa hơn) thấy chúng ở hai bên và phía sau lưới địch.
- `art/ui_battle_mock_truong_sa.svg` là mock đồng bộ: cùng cảnh với Menu, đặt dưới giao diện Trận.

### 4.7 Chất lượng
Theo mục 2 và `tokens.json → quality`. Thấp: `truong_sa` tắt sóng vỡ trên rạn, tắt chớp nổ chân trời, tro lửa còn 30%; `hai_phong` như `env-and-fx.md` mục 13.

## 5. Cấu trúc dữ liệu
```
MapId = 'truong_sa' | 'hai_phong'
MapDef = {
  id: MapId,
  nameKey: 'map.<id>.name',          // chuỗi trong strings.ts
  descKey: 'map.<id>.desc',
  icon: 'map-<id-dạng-gạch-ngang>',  // symbol trong icons.svg
  thumb: 'ui_map_<id>',              // thumbnail (svg/png)
  quality: Record<'low'|'medium'|'high', {...}>
}
```
- `settings.map`: lưu `localStorage` (khóa `pacific-ash.map`), bọc try/catch; giá trị hợp lệ chỉ hai id trên, sai thì về mặc định.
- Mỗi map là một lớp cảnh riêng chung giao diện `RenderScene` (đã có), nạp theo nhu cầu, giải phóng khi đổi map.
- Chuỗi hiển thị nằm trong `ui/strings.ts`.
- Tên map dài ("Hải Phòng hoang tàn") phải vừa khung: cho thu chữ xuống 85% hoặc xuống dòng, không tràn ra ngoài danh sách (xem `ui-art.md` mục 8).

## 6. Mục "Chọn map" trong Cài đặt

Nhãn: **Chọn map**. Hình dạng: danh sách thả xuống tùy biến (không dùng `<select>` gốc vì cần icon và ảnh xem trước). Xem `art/ui_settings_mock.svg`.

### Nút đóng
Chiều cao 56 px, rộng theo hàng. Gồm icon map 48 × 48 (tô cam khi đang chọn), tên (heading 20, in hoa), mô tả ngắn một dòng (mono 12, `textDim`), mũi tên xuống ở cuối. Viền `friendly`.

### Danh sách mở
Mỗi mục cao 88 px: icon 48 × 48 bên trái, **ảnh xem trước 128 × 72**, tên, hai dòng mô tả, dấu tích ở mục đang chọn. Mục đang chọn: nền cam mờ 14%, viền cam. Mục đang trỏ (hover/focus): viền `friendly`. Danh sách đè lên các hàng cài đặt bên dưới, nền `steel800`.

### Hành vi
- Mở bằng chạm, Enter hoặc Space. Đóng bằng Esc, chạm ra ngoài, hoặc chọn một mục.
- Phím ↑ ↓ di chuyển, Enter chọn, Home/End về đầu/cuối.
- Chọn mục → áp dụng ngay, lưu, crossfade phông 600 ms (hoặc đổi tức thời khi `prefers-reduced-motion`).
- ARIA: `role="listbox"` cho danh sách, `role="option"` và `aria-selected` cho mục; nút đóng có `aria-haspopup="listbox"` và `aria-expanded`.
- Mobile: danh sách mở thành bảng trượt từ dưới lên chiếm toàn chiều rộng; ảnh xem trước thu còn 96 × 54.
- Đang tải cảnh mới: icon xoay nhỏ trên nút trong lúc nạp; nếu lỗi thì giữ map cũ và hiện toast "Không tải được map".

### Vị trí trong Cài đặt
Đặt sau "Rung màn hình", trước các nút cuối. Thứ tự: Âm lượng tổng, Hiệu ứng, Nhạc, Chất lượng đồ họa, Tốc độ animation, Rung màn hình, Cinematic ngắn, **Chọn map**.

## 7. Icon map
Icon đơn sắc 48 × 48, nét 2, vuông. `map-truong-sa`: đảo san hô có cây dừa, nhà giàn trên cọc và mặt trời. `map-hai-phong`: các tòa nhà cảng, mưa, mặt nước. Tô màu theo trạng thái như icon khác (`ui-art.md` mục 5): đang chọn = cam, bình thường = `text`.

## 8. Bố cục cảnh chờ (Menu, ModeSelect): vật thể dồn hai bên, giữa thoáng

Ở Menu và Chọn chế độ, **logo và các nút nằm ở giữa màn hình**. Nên cảnh nền phải để **vùng giữa thoáng** và dồn vật thể **dày đặc ở hai bên**, để chữ và nút đọc rõ, không bị rối. Xem `art/ui_menu_mock_truong_sa.svg`.

### 8.1 Chia vùng theo chiều ngang màn hình (16:9)
| Vùng | Rộng | Nội dung |
|---|---|---|
| Trái | 0–32% | **dày đặc**: vật thể lớn, nhiều tầng, lửa, khói, tro |
| Giữa | 32–68% | **thoáng**: chỉ có mặt trời/ánh nền thấp, chân trời, mặt biển, tro lửa lác đác; nơi đặt logo (nửa trên) và nút (nửa dưới) |
| Phải | 68–100% | **dày đặc**, cân bằng nhưng không đối xứng với bên trái (đa dạng hình dáng, cao thấp khác nhau) |
- Quy ra thế giới với camera `menu` (FOV 50°, 16:9): ở khoảng cách 100, nửa chiều rộng nhìn thấy ≈ 86, vùng giữa ứng với `|x| < 28`. Đặt vật thể ngoài `|x| ≥ 32`; camera đung đưa ±6 nên cần đệm 4.
- Ở **chiều cao**: các đám cháy, khói, cột nổ có thể cao tới 70% màn hình ở hai bên; vùng giữa phía trên logo chỉ có khói mờ, không có vật cứng.
- Trên **màn dọc/hẹp (mobile)**: hai bên không còn chỗ; chuyển sang bố cục "trên – dưới": vật thể dồn ở **hai dải trên và dưới** logo/nút, giữa vẫn thoáng. Chi tiết ở mục 8.4.

### 8.2 Trường Sa
| Bên | Vật thể (từ nhiều tới ít chú ý) |
|---|---|
| **Trái** | quần đảo gần: đảo lớn có 6 cây dừa, tháp đèn đổ cháy, lô cốt, cột nổ pháo kích; **3 chiến hạm** (một to, hai nhỏ) đang phóng tên lửa sang phải; tàu chìm B; khói 2–3 cột; tro lửa dày |
| **Phải** | đảo lớn thứ hai với **nhà giàn to đang cháy**, 4 cây dừa, lô cốt cháy; **3 chiến hạm** đang phóng tên lửa sang trái; tàu chìm A; khói 3 cột; tro lửa dày |
| **Giữa** | mặt trời thấp và quầng sáng sau chân trời, mặt biển rộng, vệt phản chiếu dọc xuống dưới nút, **vài vệt tên lửa bắc cầu qua phía trên** (cao, mảnh, không xuống thấp), tro lửa thưa |
- Các vệt tên lửa vẽ **phía sau logo** và không đi xuống vùng nút; phần đoạn hạ cánh của chúng ở hai bên.
- Không có tàu trôi qua giữa màn hình.

### 8.3 Hải Phòng hoang tàn
| Bên | Vật thể |
|---|---|
| **Trái** | cụm nhà cao tầng đổ nát cao và dày, 2 cần cẩu (một đổ gãy), nhiều tòa cháy, cột khói đen, xác tàu hàng nghiêng nửa chìm, đèn pha quét |
| **Phải** | cụm nhà cao tầng khác chiều cao, 2 cần cẩu và đống container, tòa nhà đổ, bảng hiệu nhấp nháy, xác tàu hàng thứ hai, cột khói |
| **Giữa** | khe thoáng nhìn ra vịnh: skyline thấp, sương và ánh cam xa, mặt nước, vài phao; mưa thưa hơn hai bên |
- Mưa, chớp: toàn cảnh nhưng chớp sáng không làm lóa vùng giữa (cường độ chớp giảm 50% ở vùng giữa trên màn).

### 8.4 Màn hẹp/dọc
- Vùng trên (0–30%): khói, trời, cột nổ, vật cao (tháp đèn/cần cẩu).
- Vùng giữa (30–70%): logo và nút, nền thoáng.
- Vùng dưới (70–100%): đảo/bến, tàu chìm, tro, sóng.
- Camera đổi: FOV 60°, nhìn thấp hơn một chút.

### 8.5 Quy tắc khác
- Hai bên **dày hơn rõ rệt** so với phiên bản trước (gấp khoảng 1.5–2 lần số vật thể, khói, hạt ở hai bên); vùng giữa **ít hơn** bản cũ. Tổng số hạt không đổi (dồn từ giữa sang hai bên).
- Tương phản: vùng giữa không có vật sáng gắt phía sau nút (độ sáng nền dưới nút ≤ 35%) để chữ nút đọc rõ; quầng mặt trời chỉ nằm trên đường chân trời ở giữa, không nằm sau nút.
- Không đặt vật thể cứng phía sau logo. Khói mờ và hào quang được phép.
- Không áp dụng quy tắc 8.1 ở màn gameplay (xem mục 4): ở đó giữa là lưới và hai bên đã có panel.
