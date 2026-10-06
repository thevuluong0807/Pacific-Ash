# Animation và cinematic

Cảm giác chung: nặng, chậm vừa đủ, có lực. Đạn nổ có trọng lượng, camera rung ngắn mà mạnh, khói đặc bốc lên, sóng xung kích lan trên mặt nước. Tông màu tối; nguồn sáng chính là lửa cam và đèn pha xanh lạnh. Không dùng màu mè, không bloom quá tay.

## 1. Quy tắc chung
- Mỗi cinematic có các pha: **Aim** (camera vào góc) → **Fire** → **Flight** → **Impact** (từng ô) → **Aftermath** (khói, lửa, camera về).
- **Shot list chi tiết (camera, mốc thời gian) của 5 đòn nằm ở `cinematics.md` và thắng mục 3–4 của file này.** Mục 3–4 dưới đây giữ làm tóm tắt hiệu ứng; thời lượng ở bảng dưới đã cũ, theo `cinematics.md` mục 7: 2800 / 3200 / 4600 / 3800 / 5000 ms.
- Tổng thời lượng mỗi đòn ghi ở bảng dưới (ở tốc độ x1). Tốc độ x2 chia đôi. Chế độ "tắt cinematic" bỏ toàn bộ, chỉ pop marker 2D (`markerPopMs`).
- **Bỏ qua**: nhảy tới cuối trong 150 ms, vẫn phát tiếng nổ ngắn, rồi cập nhật lưới.
- Mỗi cinematic chỉ nhận danh sách event (`ShotFired`, `CellResolved`, `ShipSunk`...) và tọa độ ô. Không đọc trạng thái `core` trực tiếp.
- Ánh xạ ô lưới sang tọa độ 3D: một hàm duy nhất `cellToWorld(owner, cell)`. Hai lưới là hai vùng biển đặt đối diện, tàu hai bên nhìn nhau qua khoảng nước giữa.
- Camera chiến thuật mặc định: cao, nhìn xuống chéo nhẹ, thấy cả hai vùng biển; mọi cinematic xuất phát và quay về đây.

## 2. Cảnh nền (luôn chạy)
- Biển tối, sóng lớn chậm, bọt trắng xám, phản chiếu ánh lửa (quality cao).
- Mưa xiên, sương thấp, thỉnh thoảng sấm chớp làm sáng trời 100–150 ms.
- Xa: skyline thành phố cảng ven vịnh, nhiều tòa nhà cháy, khói đen bốc nghiêng theo gió; vài tàu hàng hoặc cần cẩu đổ nghiêng.
- Tàu đối phương ở vùng biển xa, tàu mình ở vùng gần, đều bồng bềnh theo sóng nhẹ (nghiêng ±1–2°).

## 3. Bảng tổng
| Đòn | Anim | Tổng (ms) | Camera | Số lần nổ |
|---|---|---|---|---|
| rapid | Khu trục hạm | 2200 | bám tàu bắn rồi cắt sang mục tiêu | 2 |
| precision | Tuần dương | 2400 | thấp, sau pháo, theo đạn | 1 |
| torpedo | Tàu ngầm | 3000 | dưới nước theo ngư lôi | 1 (hoặc 0 nếu trượt hết) |
| cross | Tàu tên lửa | 3400 | tên lửa bay vòng, nhìn xuống vùng đích | tới 5 |
| line3 | Tàu sân bay | 3600 | cất cánh, rồi đón máy bay bay qua | tới 3 |

## 4. Từng đòn

### 4.1 rapid — Khu trục hạm (2200 ms)
- 0–350: camera dịch sang sau lưng khu trục hạm. Tháp pháo quay về hướng ô đầu.
- 350–600: phát 1. Lửa mõm ngắn, tàu giật nhẹ, rung camera nhỏ. Đạn là vệt sáng cam nhanh.
- 600–1000: đạn bay thẳng tới ô 1. Tháp pháo quay sang ô 2.
- 1000–1250: phát 2, tương tự.
- 1250–1600: camera cắt sang vùng mục tiêu, nổ ô 1 rồi ô 2 (mỗi ô theo kết quả, mục 5).
- 1600–2200: aftermath, camera về chiến thuật.

### 4.2 precision — Tuần dương (2400 ms)
- 0–500: camera thấp, sau nòng pháo chính, tháp pháo nâng nòng, tiếng cơ khí nặng.
- 500–800: bắn. Lửa mõm lớn, sóng giật tỏa trên mặt nước, rung camera mạnh.
- 800–1600: đạn bay theo cung cao, camera theo đạn, hơi chậm lại ở đỉnh cung.
- 1600–1800: va chạm ô mục tiêu (kết quả mục 5).
- 1800–2400: nếu trúng, hiện nhãn loại tàu lộ ra ngắn 600 ms rồi về chiến thuật.

### 4.3 torpedo — Tàu ngầm (3000 ms)
- 0–500: camera chìm xuống dưới mặt nước, tàu ngầm lờ mờ, đèn xanh yếu.
- 500–900: ống phóng mở, ngư lôi lao ra, sủi bọt trắng.
- 900–2200: camera theo ngư lôi dọc đường đi; đường nước xanh đen, cát khói, các ô đi qua và trượt hiện vòng sóng nhẹ trên mặt (lộ ô trống). Tốc độ đều, hơi gia tốc.
- 2200–2700: nếu trúng, nổ dưới thân tàu, cột nước vọt lên, rung camera mạnh, camera nổi lên mặt.
- 2700–3000: về chiến thuật. Nếu trượt hết, ngư lôi chìm dần ở mép xa, không nổ.

### 4.4 cross — Tàu tên lửa (3400 ms)
- 0–500: camera quanh tàu, nắp ống phóng thẳng đứng mở.
- 500–1000: phóng (tối đa 5 quả gần như đồng thời, cách nhau 60 ms). Cột khói trắng, lửa bốc dưới đáy, rung camera mạnh, tiếng gầm.
- 1000–1900: tên lửa bay lên cao, nghiêng, vẽ vòng; camera kéo lên cao theo, nhìn xuống vùng đích.
- 1900–2300: lao xuống, mỗi quả nhắm một ô trong thứ tự `rules.md` mục 4.4 (tâm, lên, phải, xuống, trái), cách nhau 120 ms. Mỗi ô nổ theo kết quả riêng.
- 2300–3400: aftermath, khói chùm bốc lên, camera về.

### 4.5 line3 — Tàu sân bay (3600 ms)
- 0–600: camera quét dọc boong, máy bay hoặc UAV tăng tốc, đèn cảnh báo nhấp nháy.
- 600–1200: cất cánh (hai hoặc ba chiếc), bay lên, tản ra.
- 1200–2200: camera đổi sang góc nhìn vùng mục tiêu, máy bay bay thẳng hàng qua dải 3 ô theo hướng `orientation`.
- 2200–2800: thả bom rải: mỗi ô một quả, cách nhau 150 ms theo thứ tự trục tăng; nổ từng ô theo kết quả.
- 2800–3600: máy bay vọt lên, khói, camera về.

## 5. Kết quả mỗi ô (dùng chung)
- **Trượt**: cột nước vọt lên rồi đổ xuống 500 ms, vòng sóng lan ra, không lửa. Âm thanh nước tung.
- **Trúng**: nổ cầu lửa cam 400 ms, mảnh kim loại bay, rung camera, sau đó lửa nhỏ cháy kéo dài trên ô đó cho đến hết ván, khói đen mỏng. Lửa chỉ bật ở ô trúng.
- **Chìm** (mục 6).
- Ô bị bỏ qua hoặc đã có kết quả trước đó: không phát hiệu ứng.

## 6. Tàu chìm (10800 ms, mỗi tàu một kiểu)
> **Chi tiết đầy đủ ở `sinking.md`**: **thời lượng 10800 ms (gấp sáu bản 1800 ms ban đầu), mỗi loại tàu có kiểu chìm riêng**, khóa chuyển động trên model 3D, dấu X và sprite 2D. Các mốc ms ghi dưới đây là bản tóm tắt CŨ (1800 ms) chỉ để tham khảo, không dùng.

Phát sau nổ của ô cuối cùng làm chìm.
- 0–300: nổ lớn dọc thân tàu, rung camera lớn, tiếng kim loại gãy.
- 300–1500: tàu nghiêng 15–30°, đuôi hoặc mũi chìm trước, lửa và khói đậm, mảnh vỡ nổi, bọt khí. Nước đóng lại.
- 1500–1800: chỉ còn dầu loang đen và lửa trên mặt nước một lúc, nhãn "Đã đánh chìm: <tên tàu>" hiện rồi tắt.
- Khi tàu mình chìm: thêm âm cảnh báo, viền đỏ lưới 400 ms.

## 7. Kết thúc ván
Slow-motion 0.4x khi tàu cuối chìm (khoảng 1 s), camera kéo ra rộng, rồi sang màn Result.

## 8. Đồng bộ với UI
- `core` trả `events` ngay lập tức. Một hàng đợi (`EventPlayer`) phát lần lượt từng nhóm event của một hành động.
- Trong lúc phát: nút BẮN và chọn tàu vô hiệu. Lưới 2D chỉ cập nhật marker khi cinematic gọi `onCellResolved(cell)` (hoặc khi bỏ qua, cập nhật hết một lần).
- Sau khi hết hàng đợi: bật lại input hoặc sang lượt AI.
- Khi bỏ qua: gọi hàm `finishNow()`, hàng đợi chạy hết event ngay, hiệu ứng thừa bị hủy.

## 9. Âm thanh gắn với animation
Danh sách trong `assets.md` mục 4. Mỗi cú nổ có tầng âm trầm (trọng lượng), tầng kim loại, tầng nước. Âm lượng phụ thuộc kết quả (chìm lớn nhất, trượt nhỏ nhất).

## 10. Ngân sách hiệu năng
- Hạt: tối đa ~2000 hạt đồng thời ở chất lượng cao, nhân `particleScale` theo mức chất lượng.
- Tối đa một nguồn sáng động mạnh một lúc (lửa nổ), phần còn lại dùng emissive.
- Rung camera tắt khi `prefers-reduced-motion` hoặc cài đặt tắt rung.
