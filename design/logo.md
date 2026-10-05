# Logo PACIFIC ASH

Hướng: **tối giản (minimalism)**, hạn chế hiệu ứng và chuyển động. Bản trước (kim loại, lửa, nứt, chiến hạm đổ nghiêng) bị bỏ vì quá rối và quá nhiều hiệu ứng. Logo chỉ cần đọc rõ tên game và gợi ra tàu chiến; cảnh nền đã đủ cháy nổ.

| File | Vai trò |
|---|---|
| `art/logo.svg` | Logo chính 1400 × 400, nền trong suốt |
| `art/logo_emblem.svg` | Biểu tượng vuông 320 × 320 (chữ A + đường nước + chiến hạm) |
| `art/_src/logo.mjs` | Script dựng cả hai file |
| `art/ui_menu_mock_truong_sa.svg` | Mock Menu có logo, nền Trường Sa |

## 1. Thiết kế
- **Chữ**: một dòng "PACIFIC ASH", chữ in hoa khối góc cạnh kiểu stencil quân sự (tự dựng bằng đường vẽ, không phụ thuộc font), cắt vát 45°, nét dày. Mỗi chữ có **một khe stencil** cắt nghiêng 8°. Không viền, không bóng, không đùn khối, không bevel, không vân kim loại.
- **Hai màu**: **PACIFIC** màu thép sáng `#E9EFF4`, **ASH** màu cam `#E8742A` (màu tro lửa). Không gradient.
- **Gạch chân là chiến hạm**: một đường nước mảnh `#7F8E9B` chạy hết chiều rộng chữ, trên đó là **bóng chiến hạm nằm ngang** màu thép `#C9D4DC` (cầu chỉ huy, cột radar, ống khói, pháo), một điểm cờ cam nhỏ ở cột. Đây là chi tiết duy nhất nói "game tàu chiến".
- **Chữ phụ**: "NAVAL WARFARE", cỡ nhỏ, giãn chữ rộng, `#7F8E9B`, dưới đường nước.
- Không lửa, không khói, không nứt, không lỗ đạn, không hạt, không hào quang.

## 2. Emblem
Khung vuông tối `#0B1117` viền thép 3 px, hai ngoặc góc cam, chữ **A** stencil trắng có khe cam, dưới là đường nước và bóng chiến hạm nhỏ. Dùng cho favicon, ảnh đại diện, màn tải.

## 3. Màu
| Vai trò | Màu |
|---|---|
| PACIFIC, chữ A emblem | `#E9EFF4` |
| ASH, điểm nhấn | `#E8742A` |
| Chiến hạm | `#C9D4DC` |
| Đường nước, chữ phụ | `#7F8E9B` |
| Nền emblem | `#0B1117` |
Chỉ năm màu này.

## 4. Cách dùng
- **Menu**: logo ở giữa trên, ba nút ở giữa dưới (xem mock). Nền hai bên dày vật thể, giữa thoáng (`maps.md` mục 8); phần nền sau logo phải thoáng để chữ đọc rõ.
- Luôn trên nền tối. Dùng được trên ảnh cảnh vì chữ trắng/cam tương phản mạnh.
- **Emblem** từ 64 px trở xuống thay cho logo chữ.
- Kích thước tối thiểu logo chính: rộng 300 px; dưới đó bỏ chữ phụ.
- Vùng đệm: tối thiểu bằng chiều cao chữ xung quanh.
- Không kéo giãn, không đổi màu, không thêm hiệu ứng.

## 5. Biến thể
- **Đơn sắc**: chữ và chiến hạm một màu `#E9EFF4` (nền tối) hoặc `#0B1117` (nền sáng), không phân PACIFIC/ASH.
- Không có bản "có hiệu ứng": logo tĩnh ở mọi mức chất lượng.

## 6. Chuyển động (hạn chế)
Chỉ hai bước, tổng 0.9 s, bỏ qua được bằng phím hoặc chạm; `prefers-reduced-motion` hoặc chất lượng thấp: hiện tức thời.
1. 0–400 ms: logo hiện dần (độ mờ 0 → 1), trượt lên 8 px.
2. 300–900 ms: đường nước kéo từ trái sang phải; chiến hạm hiện cùng lúc.
Không rung, không nổ, không lửa, không hạt, không lặp. Sau khi hiện xong, logo đứng yên.

## 7. Ghi chú kỹ thuật
- SVG phẳng, không filter, nên nhẹ và rõ ở mọi kích thước. Không cần xuất PNG; nếu cần, xuất 2800 × 800 (logo) và 512 × 512 (emblem), khóa `manifest.ts` là `ui_logo`, `ui_logo_emblem`.
- Phần chữ lớn là đường vẽ sẵn, không phụ thuộc font; chỉ dòng "NAVAL WARFARE" dùng font heading.
