# Màn hình và luồng

Màu, font, khoảng cách: `tokens.json`. Chuỗi: `src/ui/strings.ts`. Nền 3D phía sau mọi màn (trừ khi ghi khác) là cảnh biển đêm; DOM nằm trên.

## 1. Luồng chuyển (state machine)
```
Boot -> Menu
Menu -> ModeSelect | Settings
ModeSelect -> Hangar            (chọn chế độ, độ khó AI)
Hangar -> Placement             (xem tàu xong)
Placement -> Battle             (xác nhận)  [hot-seat: Placement(P1) -> PassDevice -> Placement(P2) -> PassDevice -> Battle]
Battle <-> Settings (overlay)
Battle -> Result
Result -> Placement (chơi lại cùng chế độ) | Menu
Settings -> quay lại màn trước
```
`Online` trong ModeSelect hiển thị khóa với nhãn "Sắp có". Không làm.

## 2. Menu
- Cảnh 3D theo map đã chọn (`maps.md`): camera đứng thấp sát mặt nước; **vật thể dồn hai bên màn hình, vùng giữa thoáng** vì logo và nút ở giữa (`maps.md` mục 8).
- DOM: logo `art/logo.svg` ở giữa trên (xem `logo.md`); ba nút **Chơi**, **Khí tài**, **Cài đặt** xếp dọc ở **giữa** dưới logo (rộng 420 px, cao 64 px), nút Chơi nền `alert`.
- Phím: Enter chọn, Esc quay lại. Tab di chuyển focus rõ ràng (viền friendly).
- Logo tối giản, chuyển động hạn chế (`logo.md` mục 6): chỉ hiện dần và kéo đường nước.

## 3. ModeSelect
Ba thẻ ngang (desktop) / xếp dọc (mobile): **PvE vs AI** (kèm chọn độ khó dễ/vừa/khó), **Hot-seat**, **Online** (khóa).

## 4. Hangar
- Trái: 3D xoay tàu đang chọn (kéo để xoay, tự xoay chậm khi không chạm). Camera cố định, ánh sáng cạnh như xưởng tối.
- Phải: danh sách 5 tàu (chọn một), thông số: tên, số ô, hồi chiêu, tên đòn, mô tả, sơ đồ vùng đánh dạng lưới mini 5x5 tô màu.
- Nút **Xem thử đòn đánh** phát lại cinematic của tàu đó trên nền trống.
- Nút **Tiếp tục**.
- Đây là màn duy nhất canvas 3D nhận input.

## 5. Placement
```
+--------------------------------------------------------------+
| ĐẶT TÀU                                          [Ngẫu nhiên]|
|                                                              |
|  +------ lưới 10x10 ------+     Tàu chưa đặt:               |
|  |  A B C D E F G H I J   |     [Khu trục 2] [Tuần dương 3]  |
|  |1                       |     [Tàu ngầm 3] [Tên lửa 4]     |
|  |2        (kéo tàu vào)  |     [Sân bay 5]                  |
|  |...                     |                                  |
|  +------------------------+     [Xoay (R)]   [Xác nhận]      |
+--------------------------------------------------------------+
```
- Kéo tàu từ khay vào lưới, hoặc chạm tàu rồi chạm ô. Xoay bằng nút hoặc phím R. **Tàu hộ vệ 2×2 là khối vuông, không xoay**: nút Xoay mờ đi khi chọn nó; khi di chuột, ô gốc là góc trên-trái và hiện khối 2×2.
- Ô hợp lệ tô `friendly` mờ, ô không hợp lệ tô `alert` mờ.
- Tàu đã đặt kéo lại được. **Xác nhận** chỉ bật khi đủ 5 tàu hợp lệ.

## 6. PassDevice (hot-seat)
Toàn màn đen mờ (`overlay`), chữ giữa: "Chuyển máy cho Người chơi N". Nút **Tôi là Người chơi N**. Che toàn bộ lưới để không lộ. Hiện ở: sau Placement P1, và sau mỗi lượt của mỗi bên.

## 7. Battle (màn chính)

### 7.1 Desktop (>= 1200 px)
```
+-----------------------------------------------------------------------+
| LƯỢT 12 · CỦA BẠN                         [Tốc độ x1] [Cài đặt]       |
+--------------------+----------------------------+---------------------+
| ĐỘI CỦA BẠN        |       LƯỚI ĐỊCH            |  NHẬT KÝ            |
| [Khu trục   ●●  ✓] |   A B C D E F G H I J      |  12 Bạn: Tên lửa    |
| [Tuần dương ●●● 1] |  1                         |      B4 -> 3 trúng  |
| [Tàu ngầm   ●●● 2] |  2     (nhắm ở đây)        |  11 Địch: Pháo      |
| [Tên lửa   ●●●● ✓] |  ...                       |      ...            |
| [Sân bay  ●●●●● 3] |                            |                     |
|                    |   Lưới của bạn (thu nhỏ)   |  [ BẮN ]            |
+--------------------+----------------------------+---------------------+
```
- Cột trái: 5 tàu của mình. Mỗi hàng: tên, các chấm là ô (đặc = còn, rỗng = trúng, gạch = chìm), nhãn trạng thái: `✓` sẵn sàng (màu `ready`), số = lượt hồi chiêu còn (màu `cooldown`), đã chìm thì mờ và gạch.
- Giữa: lưới địch lớn (nơi nhắm), lưới của mình thu nhỏ bên dưới hoặc nút chuyển.
- Phải: nhật ký, nút **BẮN** (màu `alert`), chỉ bật khi nhắm hợp lệ.
- Trên cùng: số lượt, bên đi, tốc độ animation, cài đặt.

### 7.2 Quy trình thao tác lượt
1. Chọn tàu ở cột trái (chỉ tàu sẵn sàng bấm được; **tàu nội tại** như cắn lén và hộ vệ có nhãn NỘI TẠI, không bấm chọn được).
   Nếu chỉ còn tàu nội tại, lượt tự bỏ (xem `rules.md` mục 2 và 10.4).
2. Lưới địch chuyển sang chế độ nhắm đúng loại đòn:
   - `rapid`: chọn 2 ô (ô thứ hai chọn tiếp, ô đã chọn có số 1, 2).
   - `precision`: chọn 1 ô.
   - `torpedo`: chạm vào mép lưới để chọn hàng/cột và phía vào; đường đi hiện mũi tên.
   - `cross`: chọn tâm, vùng chữ thập hiện ngay.
   - `line3`: chọn tâm, nút **Xoay** (R) đổi ngang/dọc.
   - `barrage` (siêu chiến hạm): **không chọn ô**; lưới địch nháy mờ toàn bộ kèm chữ "5 Ô NGẪU NHIÊN", bấm BẮN là đánh luôn (`previewCells` rỗng).
3. Vùng xem trước tô `hostile` mờ, ô không hợp lệ không chọn được. Dùng `previewCells`.
4. **BẮN** xác nhận (chạm hai bước trên mobile: chọn rồi nhấn BẮN).
5. Cinematic. Xong, cập nhật lưới, sang lượt địch (hoặc PassDevice).
- Esc hủy lựa chọn hiện tại.
- Không bao giờ phụ thuộc hover.

### 7.3 Mobile (< 768 px), dọc
```
+----------------------+
| LƯỢT 12 · CỦA BẠN  ⚙ |
| [Địch] [Của bạn]     |  tab chuyển lưới
|  lưới chiếm toàn rộng|
|                      |
| Tàu: (thanh trượt    |
|  ngang 5 thẻ tàu)    |
| [ Nhật ký ▾ ]        |
| [        BẮN       ] |
+----------------------+
```
- Ô lưới tối thiểu `grid.cellMin`; toàn lưới vừa chiều rộng, không cuộn ngang.
- Nút BẮN dính đáy, lớn, dễ chạm.
- Tablet (768–1199): giữa hai bố cục, hai cột (lưới | tàu + nhật ký).

### 7.4 Marker trên lưới
- `miss`: chấm tròn nhỏ `miss`, gợn sóng ngắn khi xuất hiện.
- `hit`: ký hiệu lửa/X màu `hit`, nhấp nháy nhẹ.
- `sunk`: hiện lại **sprite tàu xám tối kèm dấu X đỏ viền trắng trên mỗi ô của tàu** (xem `sinking.md` mục 1).
- Kết quả hiện sau cinematic (hoặc ngay khi bỏ qua), pop `markerPopMs`.

## 8. Cinematic overlay
Hiện khi bắn. Lưới 2D mờ dần (`opacity 0.25`) hoặc thu nhỏ để canvas 3D thấy rõ. Nút **Bỏ qua** góc phải. Lưới 2D cập nhật đúng dù bỏ qua. Tối đa 9 s mỗi lần (xem `cinematics.md`).

## 9. Result
- Chữ lớn: **CHIẾN THẮNG** (`friendly`) hoặc **THẤT BẠI** (`alert`).
- Thống kê: số lượt, số phát trúng/trượt, tỉ lệ trúng, tàu còn sống.
- Nút **Chơi lại**, **Về menu**.
- Nền 3D: tàu địch đang chìm hoặc cảnh thắng, máy quay chậm.

## 10. Settings
- Âm lượng: tổng, hiệu ứng, nhạc (thanh trượt).
- Chất lượng đồ họa: thấp / trung / cao (`tokens.json -> quality`).
- Tốc độ animation: tắt cinematic / x1 / x2.
- Rung màn hình: bật/tắt.
- Cinematic ngắn: bật/tắt (chỉ phát cảnh trúng đích, khoảng 1.8 s; `cinematics.md` mục 9).
- **Tàu chìm chạy nền**: bật/tắt (mặc định tắt); bật thì sau 3600 ms của hoạt cảnh chìm 10800 ms trận cho chơi tiếp (`sinking.md` mục 2.7).
- **Độ chói hiệu ứng**: thấp / vừa (mặc định) / cao (hệ số `glare` 0.35 / 0.55 / 1.0; `cinematics.md` mục 1).
- **Khung điện ảnh**: bật/tắt (mặc định bật; dải đen 2.39:1 ở cinematic tàu sân bay, `cinematics.md` mục 6.5).
- **Chọn map**: danh sách thả xuống có icon và ảnh xem trước, đổi phông cảnh chờ (`maps.md`).
- Lưu `localStorage` (bọc try/catch).

## 11. Trợ năng cơ bản
- Mọi nút dùng được bằng bàn phím, focus nhìn thấy.
- Không truyền đạt trạng thái chỉ bằng màu: hit/miss/sunk có hình dạng khác nhau.
- Tương phản chữ/nền đạt tối thiểu 4.5:1.
- `prefers-reduced-motion`: tắt rung camera và nhấp nháy, giữ tối thiểu hiệu ứng.
