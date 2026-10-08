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
   - **Hải chiến**: lái một chiến hạm (góc nhìn thứ ba, cầm khí tài thì chuyển sang góc nhìn thứ nhất), tối đa 6 tàu, đánh đơn hoặc chia đội; hiện chơi với máy. Phím: `W/S` ga, `A/D` bánh lái, `1`–`7` hoặc `Q/E` cầm khí tài (lúc đó **di chuột** để xoay/ngẩng nòng, `W/A/S/D` tinh chỉnh), `Space`/chuột trái bắn, `X`/`Esc` thoát khí tài, `T` đường đạn, `Tab` bảng điểm. Thiết kế tàu ở **Khí tài → Chế tạo tàu**.
   - **Online**: xem bên dưới.
2. **Xếp tàu**: chọn tối đa 5 tàu trong 8 loại, kéo tàu vào lưới (hoặc chạm tàu rồi chạm ô). Nút **Xoay** hoặc phím `R` đổi hướng. **Ngẫu nhiên** xếp giúp bạn.
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

### Giới hạn thời gian mỗi lượt (tùy chọn)

Ở màn chọn chế độ có thể đặt giới hạn mỗi lượt: không giới hạn, 15, 30, 60, 90 hoặc 120 giây. Đồng hồ đếm ngược hiện ở thanh trên của trận; hết giờ, hệ thống tự bắn một phát ngẫu nhiên hợp lệ thay bạn. Khi chơi online, người tạo phòng quyết định giới hạn này.

### Hỏng hóc khí tài (tùy chọn)

Ở màn chọn chế độ có thể bật **Hỏng hóc khí tài**: tàu bị trúng quá 50% số ô sẽ mất kỹ năng đặc biệt. Tàu có đòn chủ động chỉ còn bắn 1 ô thường (hồi chiêu giữ nguyên), tàu hộ vệ ngừng chặn đòn.

## Chơi online

Vào **Chơi → Online**, có ba cách:

- **Tạo phòng**: nhận mã phòng 5 ký tự và một **link mời**. Gửi cho bạn bè; họ mở link là tự vào phòng.
- **Vào phòng**: nhập mã phòng bạn bè gửi.
- **Ghép ngẫu nhiên**: hai người cùng bấm tìm trận ở cùng thời điểm và cùng mức giới hạn thời gian sẽ được ghép với nhau.

Khi đủ hai người, mỗi bên xếp tàu rồi chờ đối thủ xếp xong là bắt đầu. Máy chủ giữ luật và chỉ gửi cho mỗi bên những gì họ được biết, nên không thể nhìn lén lưới đối thủ. Thoát chủ động giữa trận thì bên còn lại thắng.

**Mất kết nối:** nếu rớt mạng, game tự thử nối lại và trả bạn về đúng trận đang chơi, kể cả khi bạn tải lại trang. Thời gian chờ nối lại bằng giới hạn mỗi lượt của phòng (tối thiểu 30 giây; phòng không giới hạn thì 90 giây). Trong lúc đó đối thủ thấy thông báo chờ; quá hạn mà chưa nối lại được thì đối thủ thắng. Nếu rớt đúng lượt của bạn và phòng có giới hạn thời gian, hết giờ máy chủ vẫn tự bắn thay bạn.

## Giấy phép

Dự án cá nhân, chưa chọn giấy phép.
