# Giao diện: ngôn ngữ hình ảnh và thành phần

Bổ sung cho `screens.md` (bố cục và luồng) và `tokens.json` (màu, font, khoảng cách). File này nói **thành phần trông ra sao** và trạng thái của chúng. Màu và khoảng cách luôn lấy từ `tokens.json`, không viết cứng.

| File đi kèm | Vai trò |
|---|---|
| `art/ui_battle_mock.svg` | Mock màn Trận đấu desktop 1600 × 900. **Nguồn tham chiếu pixel**, dựng từ đúng token và sprite |
| `art/icons.svg` | Bộ icon: tàu (64×32), UI (24×24), đòn đánh (50×50), dạng `<symbol>`, tô bằng `currentColor` |
| `art/markers.svg` | Marker trên lưới, mỗi ô 100×100 |
| `art/logo.svg` | Logo PACIFIC ASH |
| `art/*_2d.svg` | Sprite tàu (xem `ship-*.md`) |

## 1. Ngôn ngữ chung
- Cảm giác: màn hình chỉ huy chiến thuật (CIC), đêm, thép xước, nhiễu hạt nhẹ. Tối, nặng, ít màu.
- Hai màu nghĩa: **xanh lạnh `friendly`** = ta, **cam `hostile`** = địch/nhắm; đỏ `alert` chỉ cho trúng, bắn, cảnh báo; xanh lục `ready` và vàng `cooldown` chỉ cho trạng thái tàu. Không thêm màu khác.
- Góc **vuông**, nét viền 1 px; panel chính có **góc cắt** bằng hai nẹp xanh lạnh dài 10 px ở hai góc đối diện (xem mock). Không bo tròn lớn, không bóng mềm.
- Chữ: tiêu đề in hoa, font heading, giãn chữ `0.08em`; số liệu và nhật ký dùng font mono.
- Panel: nền `steel800` độ mờ 86%, viền `rgba(122,138,153,0.4)`, đặt lên cảnh 3D (không che kín, vẫn thấy bầu trời và skyline mờ qua khe).

## 2. Thành phần và trạng thái

### 2.1 Nút
| Loại | Mặc định | Hover / focus | Nhấn | Vô hiệu |
|---|---|---|---|---|
| Thường | nền `steel700`, viền `steel500`, chữ in hoa heading | viền `friendly` | nền tối hơn 8% | chữ `textDim`, viền mờ 40%, không đổi con trỏ |
| Chính (BẮN) | nền `alert`, chữ trắng 40 px giãn chữ `0.2em`, nẹp trắng ở góc | sáng hơn 10% | tối hơn 10% | nền `steel700`, chữ `textDim` |
| Nhỏ biểu tượng | khung vuông 40, icon 24 | viền `friendly` | nền `steel700` | mờ 40% |
- **Focus ring**: viền `friendly` 2 px cộng 2 px khoảng cách; luôn nhìn thấy khi dùng bàn phím.
- Vùng chạm tối thiểu 44 × 44 px (mobile).

### 2.2 Ô lưới (xem `art/markers.svg`)
| Trạng thái | Hiển thị | Hình dạng |
|---|---|---|
| `unknown` | nền `#0B1117`, viền `gridLine`, vạch radar quét mờ | ô trống |
| `miss` | **hố nước** do đạn rơi: vành nước bắn lên có răng cưa, giọt nước quanh miệng hố, hố tối ở giữa | vành tròn răng cưa + hố |
| `hit` | **lỗ đạn nổ trên thép**: mép thép xé cong ra ngoài, lỗ cháy đen, lõi than hồng cam, vết nứt tỏa ra, bồ hóng, khói mảnh, tia lửa | lỗ lởm chởm có cánh kim loại cong |
| `sunk` | **dấu X đỏ viền trắng trên mỗi ô của tàu đã chìm**, đặt lên **sprite tàu xám tối**; khung ô viền đỏ sẫm. Xem `sinking.md` mục 1 | dấu X |
| ô của mình | viền xanh lạnh 3 px, đệm xanh mờ | khung vuông |
| `blocked` (bị hộ vệ chặn, chưa bắn) | khiên thép nứt có gạch chéo cam, tia lửa; nền cell tối | khiên + gạch chéo |
| nhắm hợp lệ | ngoặc 4 góc cam + chữ thập, đệm cam mờ | ngoặc góc |
| nhắm không hợp lệ | sọc chéo đỏ, viền đứt đỏ | sọc |
| mục tiêu số 1/2 | vòng tròn có số | số trong vòng |
| mép ngư lôi | mũi tên cam vào trong | mũi tên |
- Ô đã bắn dùng hình ảnh hoang tàn (hố nước, lỗ đạn nổ, đổ nát), không dùng ký hiệu trừu tượng. Mỗi trạng thái vẫn khác nhau cả hình dạng lẫn màu (trợ năng).
- `hit`: lõi than hồng nhấp nháy nhẹ (độ mờ lõi 0.85–1, chu kỳ 1.2 s). `sunk`: tĩnh (sprite xám + X, không đổi đến hết ván). `miss`: vành nước bắn ra rồi lặng.
- Phải đọc được ở ô 32 px: chi tiết nhỏ (vết nứt, giọt nước) được phép mờ đi, hình khối chính thì không. Marker `hit` nổi nhất trên lưới.
- Nguồn dựng: `art/_src/markers.mjs` (dùng chung `frags.mjs`).
- Marker phủ **lên** sprite tàu, không thay sprite (`ship-destroyer.md` 1.4).
- Hiệu ứng xuất hiện: pop `markerPopMs` (200 ms), `miss` kèm vòng ngoài gợn ra rồi tắt.
- Nhãn hàng/cột: font mono nhỏ, `textDim`; tô sáng hàng/cột đang trỏ vào.

### 2.3 Hàng tàu trong danh sách đội (cột trái màn Trận)
Một hàng cao khoảng 130 px (desktop), gồm: icon tàu 96 × 48, tên (heading 22), tên đòn đánh (mono 13, `textDim`), các ô tàu (vuông 16, đặc = còn, rỗng = trúng, gạch chéo đỏ = trúng), nhãn trạng thái.
| Trạng thái | Cách hiển thị |
|---|---|
| Sẵn sàng | nền `steel700` 70%, viền `steel500`, icon check xanh lục + "SẴN SÀNG" |
| Hồi chiêu N | nội dung mờ (`textDim`), icon đồng hồ cát vàng + "HỒI CHIÊU N" |
| Đang chọn | nền cam mờ 14%, viền cam 2.5 px, "ĐANG CHỌN" cam |
| Chìm | nội dung mờ 40%, gạch ngang qua tên, các ô tàu đều gạch đỏ, **thêm dấu X nhỏ đè lên icon tàu** (`sinking.md` 1.3) |
| **Nội tại** (cắn lén, hộ vệ) | nền `steel700` 70%, viền `steel500`, nhãn **NỘI TẠI** (mono, viền `friendly`) thay chỗ nút chọn; không có đòn nên không có icon đòn đánh mà có icon kỹ năng (`atk-sneak`, `atk-guard`); dòng trạng thái cho biết "Bắn ở lượt N" (cắn lén) hoặc "Sẵn sàng chặn" / "Nghỉ 1 đòn" (hộ vệ); không chọn được, không có viền cam |
Chạm hàng chỉ chọn được ở trạng thái "sẵn sàng" hoặc "đang chọn".

### 2.4 Thẻ thông tin tàu đang chọn (cột phải)
Icon tàu tô cam, tên heading 32, tên đòn cam mono, sơ đồ vùng đánh (`atk-*`) 120 × 120 tô cam, 3 dòng mô tả (vùng đánh, hồi chiêu, hướng dẫn nhắm).

### 2.5 Nhật ký
Mỗi dòng: số lượt (mono, mờ) · bên (BẠN xanh lạnh / ĐỊCH cam, đậm) · nội dung. Màu nội dung: trượt = text, trúng bên địch lên mình = `alert`, chìm tàu địch = `ready`. Dòng mới nhất ở trên, cuộn được; giữ tối đa 100 dòng.

### 2.6 Thông báo nhanh (toast)
Hộp ở giữa trên, 280 ms trượt xuống, tồn tại 2.5 s: "Đã đánh chìm: <tàu>", "Không có tàu sẵn sàng, bỏ lượt", "Tàu của bạn bị chìm: <tàu>" (viền đỏ). Không chặn thao tác.

### 2.7 Hộp thoại, thanh trượt, công tắc
- Hộp thoại: panel giữa màn, nền `overlay` phủ phía sau, tiêu đề heading, hai nút (chính bên phải).
- Thanh trượt: rãnh `steel700`, thanh `friendly`, nút vuông 16.
- Công tắc: khung chữ nhật 44 × 24, trượt vuông; bật = `friendly`.
- Tab (chuyển lưới trên mobile): hai ô vuông chung hàng, chọn = viền và chữ `friendly`.

## 3. Nền và phông cho từng màn
| Màn | Cảnh 3D phía sau | Ghi chú |
|---|---|---|
| Menu | camera `menu`, tàu lớn trôi chậm, phông theo **map đã chọn** (`maps.md`) | logo ở giữa trên, nút bên trái, mờ dần vào 350 ms |
| ModeSelect | giữ nguyên cảnh menu, làm mờ nhẹ | thẻ chế độ là panel; Online khóa có icon `lock` và nhãn "Sắp có" |
| Hangar | nền tối trơn, đèn cạnh lạnh, mặt sàn kim loại phản chiếu mờ | không có mưa, tàu quay |
| Placement | camera `tactical`, hai lưới 3D mờ, chỉ lưới mình sáng; phông theo map | |
| PassDevice | phủ `overlay` kín, không thấy gì phía sau | chữ giữa, nút lớn |
| Trận đấu | camera `tactical`, cảnh đầy đủ theo map đã chọn (ánh sáng, trời, biển, vật nền: `maps.md` mục 4) | UI giữ nguyên, panel vẫn đọc rõ trên cả nền hoàng hôn |
| Result | camera `result`, theo map đã chọn | chữ lớn 3 rem, thống kê ở panel |
| Settings | phủ `overlay` 78% lên màn trước | |

## 4. Logo
Logo **tối giản**: chữ stencil phẳng hai màu (thép sáng và cam), gạch chân là bóng chiến hạm trên đường nước; hầu như không hiệu ứng, chuyển động ngắn. Toàn bộ quy cách, màu, cách dùng: `logo.md`. File: `art/logo.svg` (chính), `art/logo_emblem.svg` (biểu tượng). Logo nằm ở giữa trên màn Menu, nút ở giữa dưới.

## 5. Icon (xem `art/icons.svg`)
| Nhóm | Icon | Kích thước | Dùng ở |
|---|---|---|---|
| Tàu | destroyer, cruiser, submarine, missile, carrier | 64×32 (hiển thị 96×48) | danh sách đội, thẻ thông tin, Hangar |
| Trạng thái | hit, miss, sunk, check, cooldown | 24×24 | nhật ký, chú thích |
| Hành động | rotate, skip, aim, back | 24×24 | nút xoay, bỏ qua, BẮN, hủy |
| Hệ thống | gear, lock, sound, info, fleet, log | 24×24 | cài đặt, khóa, âm thanh |
| Đòn đánh | rapid, precision, torpedo, cross, line3 | 50×50 (hiển thị 100–120) | thẻ thông tin, Hangar |
Nét 2 px, đầu nét vuông, một màu. Màu chọn theo trạng thái (mục 1), không chọn tùy ý.

## 6. Chuyển động giao diện
- Thời lượng lấy từ `tokens.json → motion`: `uiFastMs` 120 (hover), `uiMs` 220 (đổi trạng thái), `markerPopMs` 200, `screenFadeMs` 350 (đổi màn).
- Easing: `cubic-bezier(0.2, 0.7, 0.2, 1)`.
- Không dùng animation lặp trên UI ngoài `hit` nhấp nháy và đèn "lượt của bạn".
- `prefers-reduced-motion`: bỏ nhấp nháy, giữ đổi màu tức thời.
- Khi cinematic chạy: lưới 2D mờ về độ mờ 0.25 trong 200 ms, trở lại khi xong.

## 7. Co giãn (responsive)
- Desktop ≥ 1200: đúng như mock.
- Tablet 768–1199: hai cột (lưới | tàu + nhật ký); thẻ thông tin gập lại thành một dòng.
- Mobile < 768: một cột; hai lưới chuyển bằng tab; danh sách tàu là thanh trượt ngang gồm 5 thẻ 96 × 96; nút BẮN dính đáy cao 56 px; nhật ký thu thành một dòng bấm để mở.
- Ô lưới tối thiểu `grid.cellMin` (2 rem), tối đa `grid.cellMax` (3.25 rem). Trên mobile lưới luôn vừa chiều rộng.

## 8. Chuỗi dài và ngôn ngữ khác
Mọi nhãn phải chịu được dài thêm 40%: không cắt cứng, cho xuống dòng hoặc thu nhỏ chữ tới 85%. Số và ký hiệu hàng/cột dùng chữ Latin ở mọi ngôn ngữ.

## 9. Trạng thái rỗng và lỗi
- Chưa bắn: nhật ký hiện "Chưa có lượt nào."
- Không còn tàu sẵn sàng: toast bỏ lượt (mục 2.6) và nhật ký ghi lại.
- Mất kết nối (online, sau này): hộp thoại với nút Thử lại / Về menu.
- Không tải được tài nguyên 3D: giữ nền tối trơn có gradient, UI vẫn chơi được.
