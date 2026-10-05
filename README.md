# Pacific Ash

Game bắn tàu chiến theo lượt, đồ họa 3D, chạy ngay trên trình duyệt. Hai bên mỗi bên một lưới 10×10, xếp hạm đội trong bí mật rồi lần lượt bắn để đánh chìm toàn bộ tàu đối phương. Chơi với máy, chơi chung một máy với bạn, hoặc chơi online.

## Cài đặt

Cần [Node.js](https://nodejs.org) 20 trở lên.

```bash
git clone https://github.com/thevuluong0807/Pacific-Ash.git
cd Pacific-Ash
npm install
npm run build
```

### Chơi một mình hoặc chung một máy

Mở thẳng file `dist/index.html` bằng trình duyệt (không cần máy chủ), hoặc chạy:

```bash
npm run dev
```

rồi mở địa chỉ hiện ra (thường là `http://localhost:5173`).

### Chơi online

Chạy máy chủ (phục vụ luôn game đã build ở `dist/`):

```bash
npm run build
npm run server
```

Mở `http://localhost:8787`. Cổng đổi bằng biến môi trường `PORT`. Để chơi với bạn ở xa, đặt máy chủ này trên một máy có địa chỉ công khai (VPS, Render, Fly.io…) rồi gửi địa chỉ đó cho bạn bè. Nếu game chạy ở nơi khác với máy chủ (ví dụ GitHub Pages), vào Online → mục **Máy chủ** và nhập địa chỉ WebSocket, ví dụ `wss://ten-mien-cua-ban`.

## Cách chơi

1. Chọn **Chơi**, rồi chọn chế độ:
   - **PvE vs AI**: đấu với máy, ba mức dễ / vừa / khó.
   - **Hot-seat**: hai người chung một máy, chuyền tay nhau (có màn che để không lộ lưới).
   - **Online**: xem bên dưới.
2. **Xếp tàu**: chọn tối đa 5 tàu trong 7 loại, kéo tàu vào lưới (hoặc chạm tàu rồi chạm ô). Nút **Xoay** hoặc phím `R` đổi hướng. **Ngẫu nhiên** xếp giúp bạn.
3. **Trận đấu**: tới lượt, chọn một tàu sẵn sàng ở cột trái, nhắm vào lưới địch rồi bấm **Bắn**. Đánh chìm hết tàu địch trước là thắng.

Mục **Khí tài** cho tạo profile (bộ tàu mang vào trận) và đánh dấu yêu thích để chọn nhanh khi xếp tàu.

### Các loại tàu

| Tàu | Ô | Đòn đánh | Hồi chiêu |
|---|---|---|---|
| Khu trục hạm | 2 | Pháo nhanh: 2 ô tùy chọn | 0 (bắn mỗi lượt) |
| Tuần dương | 3 | Pháo chính: 1 ô chính xác, trúng thì lộ loại tàu | 1 lượt |
| Tàu ngầm | 3 | Ngư lôi: cả một hàng hoặc cột từ mép lưới, chạy tới khi trúng tàu | 2 lượt |
| Tàu tên lửa | 4 | Tên lửa chùm: chữ thập 5 ô | 2 lượt |
| Tàu sân bay | 5 | Không kích: dải 3 ô ngang hoặc dọc | 3 lượt |
| Tàu cắn lén | 1 | Nội tại: tự bắn một ô ngẫu nhiên đầu trận và cách một lượt | không có đòn chủ động |
| Tàu hộ vệ | 2×2 | Nội tại: triệt tiêu khoảng 30% số ô của mỗi đòn địch, cách một đòn (ô bị chặn hiện dấu khiên) | không có đòn chủ động |

Mỗi loại chỉ mang tối đa một chiếc. Tàu chìm khi mọi ô của nó bị trúng, và lộ loại tàu. Tàu hộ vệ là khối vuông, không xoay. Tàu có hồi chiêu phải nghỉ số lượt tương ứng sau khi bắn.

### Chế độ xem

Nút **2D / 3D** (phím `V`) ở thanh trên của trận:
- **2D**: lưới phẳng, rõ ràng, dễ nhắm.
- **3D**: xem cả chiến trường, kéo chuột để xoay 360°, cuộn để zoom, chạm ô lưới địch để nhắm. Khi nhắm hiện vùng đánh và đường bay của đạn.

Mỗi đòn đánh có cảnh quay điện ảnh riêng, có thể **Bỏ qua**, đổi tốc độ x1 / x2 hoặc tắt trong **Cài đặt**. Cài đặt cũng có chất lượng đồ họa, âm lượng, rung màn hình và chọn **map** (Trường Sa hoàng hôn hoặc Hải Phòng đêm mưa).

### Hỏng hóc khí tài (tùy chọn)

Ở màn chọn chế độ có thể bật **Hỏng hóc khí tài**: tàu bị trúng quá 50% số ô sẽ mất kỹ năng đặc biệt. Tàu có đòn chủ động chỉ còn bắn 1 ô thường (hồi chiêu giữ nguyên), tàu hộ vệ ngừng chặn đòn.

## Chơi online

Vào **Chơi → Online**, có ba cách:

- **Tạo phòng**: nhận mã phòng 5 ký tự và một **link mời**. Gửi cho bạn bè; họ mở link là tự vào phòng.
- **Vào phòng**: nhập mã phòng bạn bè gửi.
- **Ghép ngẫu nhiên**: hai người cùng bấm tìm trận ở cùng thời điểm sẽ được ghép với nhau.

Khi đủ hai người, mỗi bên xếp tàu rồi chờ đối thủ xếp xong là bắt đầu. Máy chủ giữ luật và chỉ gửi cho mỗi bên những gì họ được biết, nên không thể nhìn lén lưới đối thủ. Thoát giữa trận thì bên còn lại thắng.

## Giấy phép

Dự án cá nhân, chưa chọn giấy phép.
