# Âm thanh

Bổ sung cho `assets.md` mục 4 (danh sách khóa). File này nói **âm thanh nghe ra sao**, ghép lớp thế nào, trộn thế nào. Cảm giác: nặng, ẩm, kim loại, có chiều sâu; không cường điệu kiểu phim hành động. Không dùng nhạc hay âm thanh có bản quyền.

## 1. Bảng âm (palette)
- **Trầm** (sub, dưới 120 Hz): trọng lượng của nổ, pháo, tên lửa. Không bỏ tầng này.
- **Kim loại**: tiếng thép va, cơ khí xoay tháp pháo, xích, bản lề nắp ô phóng, thân tàu rên khi nghiêng.
- **Nước**: sóng, tung, sủi, chảy ào khi chìm.
- **Lửa**: nổ lách tách kéo dài, khói rít.
- **Khí quyển**: mưa, gió, sấm xa.
- Nhạc: tối, trống nặng, âm thanh tổng hợp thấp, dây chùng; tiết tấu chậm 70–84 BPM; không có giai điệu "anh hùng".

## 2. Bus và mức trộn
| Bus | Mức mặc định | Ghi chú |
|---|---|---|
| Master | 0 dB | giới hạn đỉnh −1 dBFS |
| Nhạc | −14 dB | nén nhẹ, hạ −6 dB trong 400 ms khi có nổ lớn (ducking) rồi hồi lại trong 1.2 s |
| Hiệu ứng (SFX) | −6 dB | đỉnh −3 dBFS |
| Môi trường (amb) | −18 dB | vòng lặp liên tục, không bao giờ tắt tiếng đột ngột |
| UI | −10 dB | ngắn, khô |
Cài đặt (`screens.md` mục 10) có thanh tổng, hiệu ứng, nhạc. Môi trường đi cùng hiệu ứng.

## 3. Sự kiện và các lớp
Mỗi sự kiện ghi các lớp phát cùng lúc (khóa trong `assets.md` mục 4, trừ khi đánh dấu mới).

| Sự kiện | Lớp | Ghi chú |
|---|---|---|
| Chọn tàu / xác nhận | `sfx_ui_click`, `sfx_ui_confirm` | một tiếng cơ khí ngắn, khô |
| Nhắm không hợp lệ | `sfx_ui_error` | trầm, ngắn |
| Khu trục hạm bắn (mỗi phát) | `sfx_cannon_light` + nước giật nhỏ + rung trầm | hai phát cách nhau theo timeline |
| Tuần dương bắn | `sfx_cannon_heavy` + sóng giật + đuôi vang dài | |
| Siêu chiến hạm dội pháo | `sfx_cannon_super` (ba nòng, 15 viên chia 5 đợt), bass sâu 40–60 Hz, sóng giật, đuôi vang dài 1.5 s; quay nòng: `sfx_turret_traverse` ×5 lệch nhau 80 ms | slow-motion 0.6×: hạ cao độ 8%; đạn rơi: `sfx_shell_whistle` ×5 rồi nổ lần lượt |
| Tên lửa phóng | `sfx_missile_launch` + gầm trầm + khói rít | 5 quả cách nhau 60 ms, đẩy nhẹ độ vang |
| Tên lửa lao xuống | `sfx_missile_fall` | tiếng rít cao dần, ngắt ngay khi nổ |
| Ngư lôi | `sfx_torpedo_launch`, `sfx_torpedo_run` (lặp), tiếng nước bị lọc thấp tần | camera dưới nước: lọc thông thấp 1.2 kHz, thêm ù |
| Máy bay | `sfx_plane_pass` (đi từ phải sang trái hoặc theo hướng bay) | pan theo vị trí |
| Bom rơi | `sfx_bomb_fall` | rít ngắn |
| Đạn trượt | `sfx_water_splash` (nhỏ/lớn theo `fx_splash_s/l`) | |
| Đạn trúng | `sfx_explosion_small` + kim loại xé + tia lửa | tầng trầm, kim loại, nước: ba lớp, theo `assets.md` |
| Tàu chìm | `sfx_explosion_big` + `sfx_ship_sink` + bọt khí | ducking nhạc |
| Cắn lén bắn | `sfx_cannon_light` hạ −8 dB, lọc cao tần nhẹ + `sfx_whistle_fast` (mới, tiếng rít ngắn rất nhanh) | ít tiếng, "lén"; bên bị bắn nghe tiếng rít rồi nổ |
| Hộ vệ phát hiện | `sfx_radar_ping` (mới, 3 ping, cách 120 ms), tiếng quét radar nhẹ | cảnh 1 |
| Hộ vệ chế áp | `sfx_ciws_burst` (**rền liên tục "brrrt", không tách từng phát**, 4500 viên/phút mỗi khẩu) + rền trầm của cụm nòng quay + `sfx_airburst` (nổ giòn lửng lơ) + `sfx_chaff` (xì nhẹ) + `sfx_casings` (mới, tiếng vỏ đạn rơi lách tách) | nổ giữa trời ngắn, không có tầng trầm nặng của nổ trúng |
| Mảnh xác rơi xuống nước (trúng một phần) | `sfx_water_splash` lớn + `sfx_metal_clang` (mới, tiếng kim loại va) | lúc mảnh chạm nước |
| Mảnh xác cháy | `amb_fire_loop` (lớn theo số mảnh đang cháy) + tiếng lách tách | lặp nền |
| Tàu mình chìm | thêm `sfx_alert` (hai hồi) | hạ nhạc −9 dB trong 1 s |
| Sấm | tiếng sấm vọng sau 0.4–2.5 s kể từ chớp (mới: `sfx_thunder`) | trầm, kéo dài |
| Mưa, sóng (map `hai_phong`) | `amb_sea_rain` | vòng lặp, độ dài 60 s, không nghe ra điểm nối |
| Sóng, gió, nổ xa (map `truong_sa`) | `amb_sea_dusk` (mới) | sóng vỡ trên rạn, gió, tiếng ù và nổ xa thưa; không mưa, không sấm; 60 s lặp liền |
| Cháy | lớp `amb_fire_loop` nhẹ khi có ô cháy (mới) | lớn dần theo số ngọn lửa, tối đa +6 dB |
| Thắng / thua | `mus_win` / `mus_lose` | nhạc ngắn 8–12 s, không lặp |

## 4. Không gian và vị trí
- Pan âm thanh theo vị trí ngang của ô trong cảnh 3D (từ −0.6 trái tới +0.6 phải), không pan tuyệt đối.
- Tàu địch ở xa hơn: giảm 3 dB và hạ thông thấp (cắt cao tần 10 kHz → 7 kHz).
- Vang (reverb): một bus vang chung "biển mở", thời gian 1.6 s, trộn ướt 12% (nổ lớn thêm 6%).
- Trọng lượng: các sự kiện lớn có một "đuôi trầm" kéo dài 600–900 ms.
- Camera dưới nước (tàu ngầm): toàn bộ bus SFX qua lọc thông thấp 1.2 kHz và ù nhẹ; khi lên mặt nước mở lại trong 300 ms.

## 5. Nhạc
| Khóa | Dùng khi | Độ dài | Ghi chú |
|---|---|---|---|
| `mus_menu` | menu, chọn chế độ, hangar | 90 s lặp | thưa, trống thấp mơ hồ, drone dây |
| `mus_battle` | trận đấu | 120 s lặp, 3 lớp | lớp 1 luôn bật (drone, nhịp chậm); lớp 2 vào khi có tàu bị trúng; lớp 3 vào khi một bên chỉ còn 2 tàu |
| `mus_win` | kết quả thắng | 10 s | không giai điệu vui, chùng và nhẹ nhõm |
| `mus_lose` | kết quả thua | 10 s | trầm, tắt dần |
- Nhạc `mus_battle` chuyển lớp mượt (crossfade 1.5 s), không bắt đầu lại.
- PassDevice, tạm dừng, cài đặt: hạ nhạc −8 dB.

## 6. Định dạng và giới hạn
- `.ogg` (Vorbis, 44.1 kHz, chất lượng 5), dự phòng `.mp3`. Một số tiếng ngắn dùng PCM 16-bit nếu cần chính xác.
- Điểm lặp (`amb_*`, `mus_*` lặp, `sfx_torpedo_run`) phải có điểm lặp không nghe ra điểm nối; ghi mốc lặp vào tên metadata.
- Đỉnh −3 dBFS cho SFX, nhạc chuẩn −16 LUFS, môi trường −24 LUFS.
- Tổng dung lượng âm thanh ≤ 15 MB.
- Chưa phát âm thanh khi trình duyệt chưa có thao tác người dùng; hiện lời nhắc "Chạm để bật âm thanh" ở menu lần đầu.
- Khóa mới ngoài `assets.md`: `sfx_thunder`, `amb_fire_loop`, `amb_sea_dusk`, `sfx_whistle_fast`, `sfx_ciws_burst`, `sfx_airburst`, `sfx_chaff`, `sfx_radar_ping`, `sfx_casings`, `sfx_metal_clang`. `sfx_thunder` chỉ phát ở map `hai_phong`.

## 7. Trợ năng
- Mọi sự kiện quan trọng đều đã có dòng trong nhật ký và toast (không chỉ dựa vào âm thanh).
- Nút tắt tiếng nhanh trên thanh trên.
- Chế độ giảm cường độ: hạ SFX nổ −6 dB, bỏ rung trầm (kết hợp với tùy chọn rung màn hình).
