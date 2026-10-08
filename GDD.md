# Pacific Ash — Game Design Document (v0.1)

## 1. Tóm tắt
Chiến thuật theo lượt kiểu Battleship, lưới 10x10, mỗi bên 5 tàu. Bối cảnh hiện đại, chiến tranh tàn khốc. Mỗi loại tàu có đòn đánh và animation riêng, không có hệ thống skill rời.

- Gameplay chính: 2D (lưới chiến thuật, HUD).
- 3D phụ: nền biển, cảnh bắn/trúng/chìm, màn hình chọn tàu.
- Nền tảng: web desktop trước, kiến trúc sẵn cho mobile.
- Chế độ: PvE vs AI, PvP hot-seat, PvP online (làm sau).

## 2. Hướng nghệ thuật
Tham chiếu: trận chiến Hồng Kông (Pacific Rim 1). Chỉ lấy cảm giác, không dùng asset hay nhân vật của phim.

- Đêm, mưa lớn, sóng nặng, cảng nước sâu, đường chân trời thành phố cháy dở.
- Tông màu tối: thép xám xanh, nền đen, ánh cam của lửa và đèn cảnh báo, ánh xanh lạnh của đèn pha/radar.
- Cảm giác nặng của kim loại: đạn nổ chậm có trọng lượng, rung camera mạnh, khói đặc, sóng xung kích, mảnh vỡ.
- Không gian mở: camera 3D rộng, góc thấp sát mặt nước khi cinematic.
- HUD: lưới chiến thuật phủ trên cảnh 3D như màn hình chỉ huy, viền kim loại xước, chữ mono, ít màu (xanh lạnh = ta, cam đỏ = địch/cảnh báo).

## 3. Luật chơi
1. Đặt 5 tàu lên lưới 10x10 (ngang/dọc, không chồng, không chạm cạnh chéo là tùy chọn).
2. Lượt của mình: chọn **một tàu còn sống và sẵn sàng**, chọn vùng nhắm, xác nhận bắn.
3. Kết quả mỗi ô: trượt / trúng / chìm. Tàu chìm lộ loại tàu. Địch không thấy vị trí tàu chưa chìm.
4. Tàu vừa bắn vào hồi chiêu theo số lượt của nó. Tàu chìm mất luôn đòn đánh.
5. Thắng khi toàn bộ tàu địch chìm.

Không có skill rời chọn được. Hai tàu mới có kỹ năng nội tại tự chạy (không cần chọn, không có đòn chủ động). Muốn mạnh hơn thì giữ tàu mạnh sống lâu, canh nhịp hồi chiêu, và bảo vệ tàu nội tại (chúng chìm là mất kỹ năng). Chi tiết: `design/rules.md` mục 10.

## 4. Đội tàu (8 loại; mỗi bên 5 tàu, mỗi loại tối đa 1)
Đội hình mặc định là 5 tàu cổ điển. Người chơi có thể tự chọn 5 trong 8 loại ở Khí tài/profile.
| Tàu | Ô | Đòn đánh | Hồi chiêu | Animation 3D |
|---|---|---|---|---|
| Khu trục hạm | 2 | Pháo nhanh: 2 phát, chọn 2 ô bất kỳ | 0 | Pháo hạm 2 loạt nhanh, đạn vạch đường sáng, nổ nhỏ |
| Tuần dương | 3 | Pháo chính: 1 ô chính xác, trúng thì lộ loại tàu | 1 | Pháo nòng lớn, lửa mõm, sóng giật, đạn đạo cung |
| Tàu ngầm | 3 | Ngư lôi: bắn dọc 1 hàng hoặc cột từ mép lưới, nổ ở tàu đầu tiên gặp | 2 | Camera dưới nước, ngư lôi sủi bọt, nổ cột nước |
| Tàu tên lửa | 4 | Vùng chữ thập 5 ô | 2 | Phóng thẳng đứng, khói, bay vòng rồi lao xuống, nổ chùm |
| Tàu sân bay | 5 | Không kích rải thảm: dải 1x4 ô, chọn hướng | 3 | Máy bay/UAV cất cánh, bay qua, thả bom rải |
| Siêu chiến hạm | 4 | **Dội pháo**: không cần nhắm, tự đánh 5 ô ngẫu nhiên chưa bắn trên lưới địch | 3 | Năm tháp pháo ba nòng quay và xả đạn hàng loạt, rồi cảnh toàn chiến trường nhìn từ trên cao, camera đi vòng 1/6 đường tròn quanh tâm lưới địch |
| Tàu cắn lén | 1 | **Nội tại**: đầu trận và cứ cách một lượt, tự bắn thêm 1 ô ngẫu nhiên | — | Xuồng tàng hình quay pháo nhỏ, bắn nhanh ít tiếng, đạn mảnh rất nhanh |
| Tàu hộ vệ | 2×2 (khối vuông) | **Nội tại**: cứ cách một đòn địch đánh vào, triệt tiêu ngẫu nhiên 30% số ô (làm tròn lên); đòn 1 ô bị triệt tiêu hẳn | — | CIWS bắn chặn đạn, giàn mồi nhử bung, nổ lửng lơ giữa trời |

Con số là bản nháp, cần playtest cân bằng. Cuối ván tàu bị chìm dần làm đòn đánh của bên đó nghèo đi, tạo thế "tuyết lở" có chủ ý.

## 5. Đối tượng thiết kế

### 5.1 Logic (thuần TS, không phụ thuộc DOM/three)
- `ShipType`: id, size, attack, cooldown, assetKey.
- `Ship`: type, vị trí, hướng, ô bị trúng, cooldown còn lại.
- `Board`: 10x10, ô: trống / tàu / trượt / trúng.
- `Attack`: hàm từ (ship, mục tiêu) ra danh sách ô bị đánh. Mỗi tàu một hàm.
- `Match`: lượt, bên đi, trạng thái, lịch sử nước đi.
- `Player`: người / AI / từ xa, cùng chung interface `chooseAction()`.
- `AI`: dễ (ngẫu nhiên), vừa (săn quanh ô trúng), khó (xác suất theo loại tàu còn lại).
- `Action`/`Event`: dữ liệu thuần, JSON được. PvP online chỉ cần truyền cái này.

### 5.2 Hiển thị 3D
- Biển (shader nước, sóng, bọt), trời đêm, mưa, sương, tia chớp.
- Skyline Hồng Kông, cầu cảng, cần cẩu, tàu hàng chìm làm vật thể phụ.
- 5 model tàu, mỗi tàu có đòn đánh riêng.
- Đạn, tên lửa, ngư lôi, máy bay/UAV, bom.
- Hiệu ứng: lửa mõm, nổ, khói, cột nước, mảnh vỡ, tàu chìm, lửa cháy trên tàu trúng.
- Camera rig: góc chiến thuật (mặc định), góc cinematic, rung camera.

### 5.3 UI 2D
- Lưới của mình, lưới địch (có thể chuyển/thu nhỏ).
- Danh sách tàu: icon, ô còn sống, hồi chiêu.
- Bảng nhắm: hiển thị trước vùng đòn đánh khi di chuột.
- Nhật ký lượt, nút xác nhận bắn, nút bỏ qua cinematic.
- Marker: trượt, trúng, chìm, vùng nhắm.

## 6. Màn hình
1. **Màn hình chính**: logo, cảnh biển 3D nền, Chơi / Cài đặt / Thoát.
2. **Chọn chế độ**: PvE (chọn độ khó), Hot-seat, Online (khóa, "sắp có").
3. **Chọn tàu (Hangar)**: xem 5 tàu xoay 3D, thông số, đòn đánh, bản xem trước animation.
4. **Đặt tàu**: kéo thả, xoay, xếp ngẫu nhiên, xác nhận.
5. **Màn hình trao máy** (hot-seat): che lưới, bấm để tiếp.
6. **Trận đấu**: cảnh 3D phía sau, hai lưới, danh sách tàu, nhật ký.
7. **Cinematic bắn**: tối đa khoảng 3 giây, bỏ qua được, có chế độ tắt.
8. **Kết quả**: thắng/thua, thống kê, chơi lại.
9. **Cài đặt**: âm thanh, chất lượng đồ họa, tốc độ animation, ngôn ngữ.

## 7. Công nghệ
Đã có sẵn: Vite, TypeScript, three.

- **Một engine, hai lớp**: một canvas three.js (3D) bên dưới, UI 2D bằng DOM/CSS bên trên. Lưới và HUD là HTML, không vẽ bằng canvas.
  - Lý do: DOM responsive tốt cho mobile sau này, dễ co giãn, dễ test.
  - Lưới 2D vẫn đọc như gameplay chính, 3D chỉ là nền và cinematic.
- **Tách `core/` khỏi hiển thị**: luật chơi, AI, trạng thái là TS thuần. Dùng lại được cho online, test tự động, mobile.
- **Màn hình = state machine** đơn giản (một enum + một hàm chuyển).
- **Responsive từ đầu**: layout bằng CSS grid, đơn vị `rem`/`clamp`, không pixel cố định. Input qua pointer events (chuột và chạm cùng một đường).
- **Online (sau)**: WebSocket, server chỉ chuyển `Action`/`Event` của `core/`, server giữ luật để chống gian lận.
- **Không dùng game framework** (Phaser, Babylon, React). Chưa cần.

Cấu trúc thư mục dự kiến:
```
src/
  core/      luật, tàu, AI, match (không import three/DOM)
  render3d/  scene, biển, tàu, hiệu ứng, camera
  ui/        màn hình, lưới, HUD
  assets/    model glb, texture, âm thanh
  main.ts
```

## 8. Rủi ro / việc cần quyết
- **Asset realistic**: model tàu chất lượng cao cần nguồn (tự dựng, mua, hay asset miễn phí). Đây là chi phí lớn nhất.
- **Hiệu năng**: biển + mưa + khói + hiệu ứng trên trình duyệt cần mức chất lượng thấp/trung/cao.
- **Cân bằng**: con số ở mục 4 chỉ là điểm xuất phát.
- **Âm thanh**: chưa có kế hoạch, rất quan trọng cho cảm giác nặng.

## 9. Lộ trình đề xuất
1. `core/`: luật + 5 loại đòn + AI dễ + test chạy được trong terminal.
2. UI 2D: đặt tàu, trận đấu bằng khối màu, chơi trọn một ván với AI.
3. Nền 3D: biển, trời, mưa, camera.
4. Cinematic từng tàu, thay dần placeholder bằng model thật.
5. Hot-seat, hangar, cài đặt.
6. Online.
