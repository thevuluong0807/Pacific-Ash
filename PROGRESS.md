# PROGRESS — Pacific Ash

Tracking. Đọc trước khi code (xem `DEVELOPMENT_PLAN.md` mục 1). Cập nhật khi xong task hoặc có thay đổi trạng thái thật. Ngắn gọn: code + `design/` là nguồn sự thật về *cách chạy*, file này nói *đã làm gì, vì sao*.

## Trạng thái hiện tại
- **Phase đang làm**: đã cập nhật thiết kế 15:36–15:52: 7 tàu (cắn lén, hộ vệ + kỹ năng nội tại), logo tối giản, map Trường Sa mới, cinematic tách cảnh bắn / cảnh kết quả. Tiếp theo: Hangar 3D (P5-02, dùng được glb), âm thanh. Đã nối model glb 7 tàu, xem trận 2D/3D, chế độ "hỏng hóc khí tài" (xem log cuối).
- **Code hiện có**: toàn bộ luồng chơi + cảnh 3D đêm mưa + cinematic 5 đòn (tàu placeholder) + map Trường Sa/Hải Phòng + profile. Âm thanh im lặng, chưa model tàu thật.
- **Cách mở game**: `npm run build` rồi mở thẳng `dist/index.html` (chạy được bằng double-click, `file://`, đã kiểm tra). Mở `index.html` ở thư mục gốc bằng file thì trắng xóa vì đó là mã nguồn; muốn dùng thì chạy `npm run dev`.
- **Lệnh chạy**: `npm run dev` (dev), `npm run build` (tsc + build), `npm test` (78 test gồm 1000 ván mô phỏng, AI vừa/khó, hạm đội 1–5 tàu, kỹ năng nội tại và mốc thời gian cinematic, ~25 s). Thêm `?no3d` vào URL để bỏ nền 3D khi kiểm thử giao diện. E2E: `test/e2e/*.mjs` (xem đầu `playthrough.mjs`).

## Snapshot file thiết kế (lần đọc cuối: 2026-10-05, sau lượt "7 tàu + logo/map mới + cinematic tách cảnh")
Trước khi code, chạy `ls -l --time-style=+%Y-%m-%dT%H:%M GDD.md AGENT_GUIDE.md design/*` và so với bảng. Khác thì đọc lại file đó, đối chiếu plan, ghi vào Nhật ký quyết định, rồi cập nhật bảng này.

| File | mtime đã đọc |
|---|---|
| GDD.md | 2026-10-05T15:40 |
| AGENT_GUIDE.md | 2026-10-05T16:47 |
| design/animations.md | 2026-10-05T16:53 |
| design/assets.md | 2026-10-05T16:17 (đã đọc mục 1 về glb) |
| design/audio.md | 2026-10-05T15:40 |
| design/cinematics.md | 2026-10-05T16:53 |
| design/core-api.ts | 2026-10-05T15:37 |
| design/env-and-fx.md | 2026-10-05T16:53 |
| design/logo.md | 2026-10-05T15:52 |
| design/maps.md | 2026-10-05T15:52 |
| design/rules.md | 2026-10-05T15:37 |
| design/screens.md | 2026-10-05T16:47 |
| design/ship-carrier.md | 2026-10-05T16:10 (không đọc lại: model chi tiết mục 2 đã hoãn) |
| design/ship-cruiser.md | 2026-10-05T16:10 (không đọc lại: model chi tiết mục 2 đã hoãn) |
| design/ship-destroyer.md | 2026-10-05T16:10 (không đọc lại: model chi tiết mục 2 đã hoãn) |
| design/ship-missile.md | 2026-10-05T16:10 (không đọc lại: model chi tiết mục 2 đã hoãn) |
| design/ship-submarine.md | 2026-10-05T16:10 (không đọc lại: model chi tiết mục 2 đã hoãn) |
| design/ships.json | 2026-10-05T15:36 |
| design/ship-raider.md | 2026-10-05T16:10 (đã đọc đầu file 15:4x; chưa đọc lại) |
| design/ship-escort.md | 2026-10-05T16:10 (chưa đọc kỹ, chỉ dùng số liệu `ships.json`) |
| design/sinking.md | 2026-10-05T16:53 (đã đọc, đã làm) |
| design/ships-basic3d.md | 2026-10-05T16:17 (đã đọc, đã nối) |
| design/models/*.glb | 2026-10-05T16:15 (7 model, đã chép vào `src/assets/models/` và nối) |
| design/tokens.json | 2026-10-05T11:31 |
| design/ui-art.md | 2026-10-05T16:47 |
| design/art/* (svg) | đã dùng: icons, markers, logo (mới), logo_emblem, map_*, 5 sprite tàu; đã xem: ui_battle_mock(+_truong_sa), ui_menu_mock_truong_sa, ui_settings_mock; chưa mở: cinematic_plan, fx_storyboard, destroyer_blueprint/concept |

(`AGENT_GUIDE.md` mtime đã cập nhật sau khi thêm mục 0 "Trước khi code"; phần thiết kế còn lại không đổi.)

## Bảng task
Trạng thái: `TODO` · `DOING` · `DONE` · `BLOCKED` · `DROPPED`.

### P0 — Dọn nền
| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P0-01 | Xóa Volcano, Embers, modes/, @fontsource/chakra-petch | DONE | |
| P0-02 | Chuyển Game/Ocean/Sky sang `render3d/` | DONE | |
| P0-03 | `ui/strings.ts` | DONE | |
| P0-04 | `ui/tokens.ts` → CSS variables | DONE | |
| P0-05 | tsconfig `resolveJsonModule` | DONE | |
| P0-06 | Menu tạm vẫn chạy | DONE | menu 3 nút theo Q1 |

### P1 — core
| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P1-01 | rng + loadSpecs | DONE | `tsx` đã cài (Q3) |
| P1-02 | board: placement + validate | DONE | |
| P1-03 | attacks ×5 + previewCells | DONE | |
| P1-04 | match: apply/skip/cooldown/sunk/win/events | DONE | |
| P1-05 | viewOfEnemy | DONE | |
| P1-06 | Player + AI dễ | DONE | |
| P1-07 | Test theo rules mục 9 + 4 tình huống/đòn | DONE | |
| P1-08 | Mô phỏng 1000 ván + kiểm ranh giới core | DONE | |

### P2 — UI 2D
| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P2-01 | Screen state machine | DONE | |
| P2-02 | Menu, ModeSelect | DONE | menu 3 nút (Q1); Khí tài → Hangar |
| P2-03 | Placement | DONE | |
| P2-04 | Battle layout 3 breakpoint | DONE | |
| P2-05 | Nhắm 5 loại đòn + BẮN hai bước | DONE | |
| P2-06 | EventPlayer đơn giản + nhật ký + AI think | DONE | |
| P2-07 | Marker khác hình dạng | DONE | |
| P2-08 | Result + Settings | DONE | |
| P2-09 | Trợ năng | PARTIAL | Bàn phím (mũi tên + Enter trên lưới, R, Esc), focus nhìn thấy, marker khác hình dạng, `prefers-reduced-motion`. Chưa đo tương phản 4.5:1 |

### P2b — Giao diện theo `ui-art.md`, map, Cài đặt (thiết kế mới 13:58–14:47)
| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P2b-01 | `ui/sprites.ts`: nạp icon/marker/logo từ `design/art` (không vẽ lại) | DONE | `<use href>` trên sprite nội tuyến, chạy được bằng `file://` |
| P2b-02 | Marker hố nước / lỗ đạn nổ / đổ nát, ngoặc nhắm, vòng số 1–2, vạch ngư lôi, sọc không hợp lệ | DONE | `ô của mình` chỉ dùng viền CSS, chưa dùng marker `own` |
| P2b-03 | Màn Trận theo `ui_battle_mock.svg`: thanh trên (LƯỢT · CỦA BẠN, TỐC ĐỘ x1, gear), hàng tàu 4 trạng thái, thẻ tàu đang chọn + icon `atk-*`, nhật ký (số lượt · BẠN/ĐỊCH · nội dung theo màu), HỦY CHỌN, BẮN đỏ, toast, viền đỏ khi mất tàu | DONE | |
| P2b-04 | Panel hai nẹp xanh lạnh 10 px, góc vuông, nút theo bảng 2.1 | DONE | |
| P2b-05 | Menu: logo SVG giữa trên, cột nút bên trái | DONE | bỏ nền chữ nhật của `logo.svg` để đặt lên cảnh 3D |
| P2b-06 | Cài đặt theo `ui_settings_mock.svg`: thanh trượt, nút phân đoạn, công tắc, **Cinematic ngắn**, **Chọn map** | DONE | Cinematic ngắn mới lưu cài đặt, hiệu lực ở P4 |
| P2b-07 | Chọn map: danh sách thả xuống có icon + ảnh xem trước, ARIA listbox, bàn phím ↑↓ Home End Enter Esc, bảng trượt dưới trên mobile, lưu `pacific-ash.map` | DONE | |
| P2b-08 | Map "Trường Sa" (mặc định cho Menu/ModeSelect) | DONE | dựng lại từ mô tả, chỉnh bằng mắt; xem hạn chế bên dưới |
| P2b-09 | Mờ chuyển 600 ms khi đổi map/cảnh, giữ map cũ + toast "Không tải được map" nếu lỗi | DONE | 300 ms tối + 300 ms sáng; tức thời khi `prefers-reduced-motion` |
| P2b-10 | Trạng thái rỗng, chuỗi dài chịu được +40% | PARTIAL | nhật ký rỗng "Chưa có lượt nào." có; chưa kiểm thử chuỗi dài |

### P3 — Nền 3D
| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P3-01 | assets/manifest.ts | PARTIAL | `assets/manifest.ts` có 5 khóa `ui_ship_*`. Các khóa khác (glb, atlas hạt, HDRI, âm thanh) chưa có file |
| P3-02 | Biển đêm + trời | DONE | `ocean.ts` (4 sóng Gerstner theo bảng thiết kế, bọt, vệt cam skyline), `nightSky.ts` (gradient, mây thủ tục, pháo sáng xa), PMREM từ trời đêm thay HDRI |
| P3-03 | Mưa, sương, sấm chớp | PARTIAL | Mưa 3000 vệt (thấp 0, cao 4500), sương mũ 0.011, sấm chớp đúng mẫu 100/60/60/300 ms. Chưa có: gợn mưa trên mặt nước, tia sét đánh biển, giọt mưa trên ống kính |
| P3-04 | Skyline cháy + cần cẩu placeholder | DONE | `harbor.ts`: 3 lớp skyline có cửa sổ cam/xanh nhấp nháy, 6 điểm cháy + khói nghiêng 12°, tòa đổ, 6 bảng hiệu, 4 cần cẩu (1 đổ), 2 xác tàu, 2 mảng dầu cháy, ~40 mảnh vỡ, 6 phao, 3 đèn pha. Atlas cửa sổ làm bằng shader, không dùng ảnh |
| P3-05 | cellToWorld + tàu placeholder | DONE | `cellToWorld(owner, cell)` ở `battleScene.ts` theo công thức thiết kế; tàu placeholder đúng chiều dài, mũi +X (ngang) / +Z (dọc); nhấp nhô theo sóng (kẹp lăn 1.5°, chúi 1°). Tàu địch chỉ hiện khi đã chìm |
| P3-06 | Camera chiến thuật + camera menu | PARTIAL | Camera `tactical`, `menu`, `result` có. Chưa có `hangar` (quỹ đạo) và chuyển camera cinematic |
| P3-07 | 3 mức chất lượng | DONE | `tokens.quality`: thấp tắt mưa, sương (còn mỏng 0.003 để hòa chân trời), phản chiếu, bloom, nhiễu hạt, đèn pha, mảnh vỡ; áp dụng ngay khi đổi trong Cài đặt. Chưa đo fps trên GPU thật |
| P3-08 | Giảm bloom | DONE | Bloom ngưỡng 0.9, cường độ 0.35; vignette 0.25; nhiễu hạt 3% |

### P4 — Cinematic
| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P4-01 | EventPlayer đầy đủ + finishNow | DONE | `render3d/cinematic.ts`: timeline theo mốc ms, `finishNow` = `skip()` (phát nốt event, dọn hiệu ứng, về tactical 150 ms). UI phát event đúng mốc chạm ô qua `onEvent` |
| P4-02 | Kết quả ô: trượt / trúng / chìm | DONE | `render3d/fx3d.ts`: trượt (cột nước, vòng sóng, giọt), trúng (chớp lõi 80 ms, cầu lửa 400 ms, tia lửa, mảnh vỡ ≤60, khói 3–4 s, đèn cam), lửa kéo dài ≤16 ngọn (cũ nhất thành than hồng), tàu chìm 1800 ms rồi dầu loang |
| P4-03 | 5 cinematic | DONE | Năm shot list theo `cinematics.md`: rapid 2800, precision 3200, cross 3800, torpedo 4600, line3 5000 ms (+1800 khi chìm). Tàu là placeholder nên bộ phận chuyển động chỉ là hộp: tháp pháo, bệ phóng, nắp ống, máy bay |
| P4-04 | Camera rig + rung | DONE | Camera ghi đè trong cinematic: vào cảnh blend 300 ms, ra cảnh 500 ms, cắt cứng giữa các shot, rung camera theo bảng (tắt theo cài đặt và `prefers-reduced-motion`), near plane 0.05 |
| P4-05 | Kết thúc ván slow-mo | DONE | Kết thúc ván: `endShot()` slow-motion 0.4× ~1 s, camera kéo rộng, rồi sang Kết quả |
| P4-06 | Bỏ qua / tắt / x1 x2 | DONE | Bỏ qua, tắt cinematic (chỉ pop marker), x1/x2 (mọi mốc chia đôi), cinematic ngắn (~1.2 s, chỉ cảnh trúng đích) |
| P4-07 | Ngân sách hạt, đèn | DONE | Ngân sách: tối đa 420 sprite hạt (≤ ngưỡng 2000 của thiết kế), 3 PointLight, 16 ngọn lửa, 60 mảnh vỡ; nhân `particleScale` theo chất lượng |

### P5–P8
| ID | Việc | Trạng thái | Ghi chú |
|---|---|---|---|
| P5-01 | PassDevice | DONE | |
| P5-02 | Hangar | PARTIAL | Bản 2D: danh sách, thông số, sơ đồ 5x5, sprite. Còn: xoay 3D, "Xem thử đòn đánh" (nút đang khóa) |
| P5-03 | Settings đầy đủ | PARTIAL | Lớp phủ + lưu `localStorage` + tốc độ animation có tác dụng. Âm lượng/chất lượng/rung chưa có hệ thống để tác động |
| P5-04 | Mở khóa hot-seat | DONE | |
| P6-01 | AI vừa | DONE | |
| P6-02 | AI khó | DONE | xấp xỉ mật độ (Q5) |
| P6-03 | Test AI vừa/khó | DONE | vừa thắng dễ ≥140/200; khó thắng dễ ≥180/200, thắng vừa ≥110/200; không đọc lưới thật |
| P7-01..02 | Model thật, âm thanh | BLOCKED | model sẽ đến từ file thiết kế bổ sung (Q7) |
| P8 | Online | DROPPED (tạm) | chỉ chừa chỗ, không làm |

## Câu hỏi mở
Ngày 2026-10-05 (lượt đổi flow + P3) phát sinh Q8–Q11, cần người thiết kế xác nhận:

| ID | Trạng thái | Nội dung |
|---|---|---|
| Q8 Hạm đội 1–5 tàu | MỞ | Đã làm theo yêu cầu "tối đa 5 tàu khác nhau": `core` cho 1–5 tàu khác loại mỗi bên (hằng `MAX_FLEET = 5` ở `core/specs.ts`). `rules.md` mục 1 và `GDD.md` mục 3 vẫn ghi "đúng 5 tàu, mỗi loại một chiếc" — nhờ cập nhật. Số tàu mỗi bên là công khai, loại tàu thì ẩn |
| Q9 Hạm đội của máy | MỞ | PvE: máy mang số tàu bằng số tàu người chơi, loại chọn ngẫu nhiên theo seed. Có thể đổi thành luôn 5 tàu hoặc theo độ khó |
| Q10 Tàu địch trong cảnh 3D | MỞ | `animations.md` mục 2 vẽ tàu địch ở vùng xa, nhưng vẽ đúng ô sẽ lộ vị trí. Hiện chỉ vẽ tàu địch khi đã chìm (giống luật sprite 2D). Nếu muốn vẽ sớm hơn thì cần đặt chúng ở ô không trùng thật |
| Q11 Giao diện kiểu `ui-art.md` | ĐÃ LÀM | Làm xong ở P2b (2026-10-05). Xem bảng P2b |
| Q12 `rules.md` 1 "đúng 5 tàu" vs `ships.json` "chọn tối đa 5" | MỞ | `core` vẫn cho 1–5 tàu khác loại (linh hoạt, Q8). Nếu đúng 5 bắt buộc thì đổi `isValidPlacement` và UI Đặt tàu (nút Xác nhận chỉ bật khi đủ 5) |
| Q13 Cinematic tách cảnh trái `cinematics.md` | MỞ | Theo yêu cầu người dùng: cảnh bắn dừng khi đạn rời nòng (tên lửa ~70% đường bay), cảnh kết quả riêng, blend 450 ms. Tổng đổi: precision 3000 (cũ 3200). `cinematics.md` chưa cập nhật: nhờ người thiết kế sửa |
| Q14 Model glb mới | ĐÃ LÀM | Đã nối 7 glb (xem log cuối). Escort mũi +X được xoay trong nhóm con |
| Q15 Hỏng hóc khí tài | ĐÃ CHỐT hồi chiêu | Người dùng chốt: giữ nguyên hồi chiêu của tàu gốc. Còn cần ghi vào `rules.md`. | Tính năng người dùng yêu cầu, không có trong `rules.md`. Đang làm: tàu trúng quá 50% tổng ô (ô trúng×2 > số ô) mất kỹ năng; tàu có đòn thành tàu thường bắn 1 ô (`precision`, không lộ loại tàu), **hồi chiêu giữ nguyên**; tàu hộ vệ ngừng chặn; cắn lén 1 ô nên chìm luôn. Cần xác nhận hồi chiêu (có nên về 0?) và ghi vào `rules.md` |
Chi tiết ở `DEVELOPMENT_PLAN.md` mục 6. Đánh dấu khi được trả lời.

| ID | Trạng thái | Quyết định |
|---|---|---|
| Q1 Menu 2 hay 3 nút (Khí tài) | ĐÃ CHỐT | 3 nút: Chơi / Khí tài (mở Hangar) / Cài đặt; bỏ Thoát. **`screens.md` mục 2 chưa cập nhật: nhờ người thiết kế sửa.** |
| Q2 Font Barlow tự host | ĐÃ CHỐT | Có. Đã cài `@fontsource/barlow-condensed`, `barlow`, `jetbrains-mono`. |
| Q3 `tsx` làm devDependency | ĐÃ CHỐT | Có. Đã cài `tsx` (devDependency). |
| Q4 Âm thanh tạm | ĐÃ CHỐT | Stub im lặng `play(key)` đến P7. |
| Q5 AI khó dùng xấp xỉ | ĐÃ CHỐT | Có: mật độ vị trí từng loại tàu còn sống, ghi giới hạn bằng comment. |
| Q6 `git init` | ĐÃ CHỐT | Đã `git init` (2026-10-05). Chưa commit. |
| Q7 Nguồn model tàu | ĐÃ CHỐT | Model lấy từ file thiết kế bổ sung sau. Dùng placeholder, không chặn P1–P6. |

## Nhật ký quyết định
- 2026-10-05: Người dùng cập nhật thiết kế và yêu cầu chạy lại một lượt, đưa ba nút Menu về giữa. Đã đọc `maps.md` (viết lại: map áp dụng cho cả gameplay, bố cục cảnh chờ hai bên), `logo.md` (mới), `screens.md` mục 2 (ba nút ở giữa, Chơi nền `alert`, 420×64), `ui-art.md` mục 3–4, `env-and-fx.md`/`audio.md`/`cinematics.md`/`assets.md` (ghi chú theo map).
- 2026-10-05: **Tàu bắn của địch dùng tàu giả** đặt cố định sau lưới địch `(0, 0, −16.5)` thay vì vị trí thật, vì `cinematics.md` mục 1 bảo "camera đặt theo khung của tàu địch" sẽ lộ vị trí tàu địch mỗi lần chúng bắn. Tàu địch thật chỉ hiện khi chìm (lúc chìm dựng tạm đúng vị trí vừa lộ).
- 2026-10-05: Người dùng yêu cầu code lại theo thiết kế mới trong tracking trước khi sang P4. Hiểu là: `ui-art.md` (Q11) + `maps.md` + mục Cài đặt mới của `screens.md`. Đã đọc `maps.md`, `ui-art.md`, phần đổi của `screens.md`, `animations.md`, `env-and-fx.md`, `ship-*.md`, `assets.md`, `AGENT_GUIDE.md`. `cinematics.md` (P4) chưa đọc kỹ.
- 2026-10-05: Map chỉ đổi cảnh chờ (Menu, ModeSelect). Hangar/Placement/Trận/Result luôn dùng cảnh Hải Phòng (BattleScene). Đổi map từ giữa trận chỉ lưu, áp dụng khi về Menu (do cảnh Menu không hiện lúc đó).
- 2026-10-05: Người dùng đổi flow: bỏ Hangar giữa ModeSelect và Đặt tàu. Khí tài (từ menu) thành nơi quản lý profile: tạo, đổi tên, xóa, gắn tối đa 5 tàu khác nhau, gắn yêu thích cho profile và cho từng tàu. Đặt tàu có hai cách chọn tàu mang theo: Tất cả tàu và Theo profile; cả hai đưa mục yêu thích lên đầu. Lưu `localStorage` khóa `pacific-ash.profiles`.
- 2026-10-05: Đã đọc `env-and-fx.md`, `ui-art.md`, `audio.md` mới và `assets.md`/`AGENT_GUIDE.md` sửa 13:52. P3 làm theo `env-and-fx.md`. `ui-art.md` (làm lại giao diện) chưa làm, ghi vào Q11.
- 2026-10-05: Người dùng yêu cầu làm đủ gameplay bằng hình khối cơ bản trước, bổ sung thiết kế/tính năng/chế độ sau. Đảo thứ tự: P2 + P5 (trừ 3D) + P6 làm trước; P3, P4, phần 3D của P5-02, P7 làm sau.
- 2026-10-05: Người thiết kế thêm `design/ship-destroyer.md`, `design/art/*`, sửa `assets.md` trong lúc làm. Đã đọc. Tác động: dùng `destroyer_2d.svg` làm sprite khu trục trên lưới; lưới địch chỉ vẽ sprite khi tàu chìm; tàu chìm lọc `grayscale(.85) brightness(.55)`; marker phủ lên sprite. Model 3D khu trục không viết bằng code, chờ file glb (Q7). Khóa manifest `ui_ship_destroyer` để thêm ở P3-01.
- 2026-10-05: Chọn Three.js + TypeScript + Vite ban đầu (trình duyệt, dễ thêm online). Thiết kế sau đó xác nhận giữ nguyên stack, thêm ràng buộc: không framework khác, `core/` thuần TS.
- 2026-10-05: Thiết kế (GDD + design/) cho thấy game là Battleship theo lượt, gameplay 2D, 3D chỉ nền và cinematic. Demo menu 3D cũ lệch art direction (hoàng hôn vs đêm mưa). Quyết định: giữ làm nền tạm, thay ở P3.
- 2026-10-05: `rules.md` thắng `GDD.md` ở điểm đặt tàu (cho phép chạm cạnh).
- 2026-10-05: Quy tắc từ người thiết kế: mọi thay đổi (code, thiết kế, quyết định) phải ghi vào file này ngay khi làm. Sửa lỗi chính tả `design/screens.md` ("ccao" → "cao").
- 2026-10-05: Người thiết kế thêm thiết kế khu trục hạm: `design/ship-destroyer.md` (sprite 2D cartoon + model 3D bạc kim loại chi tiết), `design/art/destroyer_2d.svg` (sprite dùng được ngay), `design/art/destroyer_blueprint.svg` (bản vẽ trực giao). Sửa `design/assets.md`: dòng `ship_destroyer` đổi ngân sách tam giác (LOD0 150k / LOD1 25k / LOD2 6k thay cho 12k) và thêm điểm neo `muzzle_1/2`, `cell_0/1`, `fire_0/1`. Agent code cần đọc lại ba file này và cập nhật bảng snapshot. Chưa đụng `ships.json`, `rules.md`, code. Model 3D chi tiết chưa có file glb (chờ Q7).
- 2026-10-05: Người thiết kế thêm ảnh phác thảo 3D khu trục hạm (png): `design/art/destroyer_concept_sheet.png` (4 góc: 3/4 mũi, 3/4 đuôi, cạnh, trên), `destroyer_concept_hero.png`, kèm svg nguồn và `_concept_render.mjs` (script dựng, `node _concept_render.mjs <thư mục ra>`). Đây là bản phác khối shading phẳng để duyệt hình dáng và bố cục, không phải render PBR; model chi tiết vẫn chờ Q7. Chưa đụng code, `ships.json`, `rules.md`.
- 2026-10-05: Người thiết kế bỏ công đoạn ảnh phác 3D/Blender, thiết kế nốt bốn tàu còn lại. File mới: `design/ship-cruiser.md`, `ship-submarine.md`, `ship-missile.md`, `ship-carrier.md` (mỗi file: sprite 2D + spec model 3D, tham chiếu chung tới `ship-destroyer.md`), cùng `design/art/{cruiser,submarine,missile,carrier}_2d.svg` (sprite dùng được ngay). Sửa `design/assets.md`: bốn dòng `ship_*` đổi ngân sách tam giác theo LOD0/LOD1/LOD2. Điểm neo mới theo tàu: nhiều `muzzle_N` (tuần dương), `cam_under` (tàu ngầm), `vls_slot_0..4` và `vls_hatch_0..4` (tàu tên lửa), `plane_slot_0..3`, `cat_start/end_0..1`, `takeoff_end`, `jbd_0/1` (tàu sân bay). Agent code cần đọc lại 8 file này và cập nhật bảng snapshot. Chưa đụng `ships.json`, `rules.md`, code. Model 3D chi tiết vẫn chờ Q7.
- 2026-10-05: Người thiết kế hoàn tất nhóm đối tượng ngoài tàu. File mới: `design/env-and-fx.md` (bố cục thế giới + `cellToWorld`, camera, biển, trời, mưa, skyline, đạn, danh mục hiệu ứng, rung, hậu kỳ, atlas hạt), `design/ui-art.md` (thành phần UI và trạng thái), `design/audio.md` (bus, lớp âm, nhạc). Asset: `design/art/{icons,markers,logo}.svg`, `ui_battle_mock.svg` (mock màn Trận 1600×900, dựng từ token và sprite thật), `fx_storyboard.svg`. Sửa `AGENT_GUIDE.md` mục 2 (thêm thứ tự đọc 8–11) và `design/assets.md` (thêm `tex_fx_atlas`, `tex_env_night_harbor`, `tex_city_windows`, `sfx_thunder`, `amb_fire_loop`). Agent code cần đọc lại các file này và cập nhật bảng snapshot. Chưa đụng `ships.json`, `rules.md`, `core-api.ts`, code. Bộ thiết kế coi như đủ để bắt đầu P0–P2.
- 2026-10-05: Người thiết kế đổi marker ô đã bắn sang hình ảnh hoang tàn: miss = hố nước, hit = lỗ đạn nổ trên thép (mép xé cong, lõi than hồng), sunk = đống đổ nát + dầu + dầm chéo. Sửa `design/art/markers.svg`, `icons.svg` (3 icon `i-hit`, `i-miss`, `i-sunk`), `ui_battle_mock.svg`, `design/ui-art.md` mục 2.2. Thêm nguồn dựng `design/art/_src/` (`frags.mjs`, `markers.mjs`, `mock.mjs`, `fx.mjs`). Hình dạng vẫn khác nhau theo từng loại. Agent code cần đọc lại `ui-art.md` và `markers.svg`, cập nhật snapshot.
- 2026-10-05: **Quyết định thiết kế (cinematic + map).** (1) Viết `design/cinematics.md` (shot list 5 đòn: khu trục hạm nghiêng trên xuống rồi cận hai tháp quay hai hướng; tuần dương đỉnh thẳng hơi chéo sau rồi cận mạn tàu chao đảo; tàu tên lửa mạn tàu bệ phóng ngẩng rồi chùm parabol; tàu ngầm dưới nước trồi lên, mở ống, bắn rải thảm; tàu sân bay cất cánh vèo ra, bám đổi góc, tổng thể rải tên lửa) và `art/cinematic_plan.svg`. Thời lượng mới 2800/3200/3800/4600/5000 ms (tối đa 5 s), thắng `animations.md` mục 3–4; sửa `animations.md`, `screens.md` (mục 8 đổi ≤5 s, mục 10 thêm Cinematic ngắn và Chọn map). (2) `ship-missile.md`: thêm bệ phóng `launcher_0..4` ngẩng nòng (thay `vls_hatch_N`). (3) `ship-destroyer.md`: chốt hai tháp nhắm hai ô. (4) **Khôi phục cảnh chờ cũ "hoàng hôn núi lửa" làm map `dusk_volcano`**, tối hơn ~30%, thêm cháy nổ; thêm mục "Chọn map" (danh sách thả xuống có icon) trong Cài đặt, mặc định `dusk_volcano` cho Menu/ModeSelect, các màn khác giữ `night_harbor`. File mới: `design/maps.md`, `art/map_dusk_volcano.svg`, `map_night_harbor.svg`, `ui_settings_mock.svg`, icon `map-*` trong `icons.svg`. Sửa `AGENT_GUIDE.md` mục 2 và `assets.md`. LƯU Ý: code cũ `Volcano.ts`/`Embers.ts` đã bị xóa ở P0-01 và không có lịch sử git, nên dựng lại theo mô tả trong `maps.md`. Điều này đảo lại quyết định "bỏ Volcano/Embers" ở `DEVELOPMENT_PLAN.md` mục 3. Agent code cần đọc lại các file này, cập nhật plan, thêm task mới (map, cài đặt, cinematic theo shot list) và snapshot.
- 2026-10-05: Người thiết kế đặt tên map: cảnh tòa nhà, mưa, cháy nổ (trước là `night_harbor`) = **"Hải Phòng hoang tàn"** (`hai_phong`); cảnh hoàng hôn (trước là `dusk_volcano`) = **"Trường Sa"** (`truong_sa`). Đổi id và tên trong `design/maps.md`, `assets.md`, `art/icons.svg` (`map-truong-sa`, `map-hai-phong`), `art/ui_settings_mock.svg`, đổi tên file `art/map_truong_sa.svg` và `art/map_hai_phong.svg`; `env-and-fx.md` mục 6 ghi cảnh skyline thuộc map Hải Phòng. **Giữ nguyên** tên texture `tex_env_night_harbor` để khỏi vỡ `manifest.ts`. Các dòng nhật ký cũ ở trên còn dùng id cũ (`night_harbor`, `dusk_volcano`), hiểu là hai map này. Nội dung cảnh không đổi. Agent code cần đổi `MapId` theo.
- 2026-10-05: **Map Trường Sa đổi nội dung** (theo yêu cầu người thiết kế, tông màu và phong cách giữ như hoàng hôn cũ): bỏ núi lửa và dung nham; thay bằng đảo san hô thấp, nước nông, sóng vỡ trên rạn, cây dừa gãy cháy, nhà giàn trên cọc đang cháy, tháp đèn đổ, pháo kích (cột cát bụi, mảnh san hô bắn parabol), đạn vạch sáng. Viết lại `maps.md` mục 2, `art/map_truong_sa.svg`, icon `map-truong-sa`, `art/ui_settings_mock.svg`. Giữ tro lửa, mây, mặt trời, tàu cháy xa, chớp nổ chân trời. Hạt tro bay giờ bốc lên từ các đám cháy. Agent code đọc lại `maps.md`; nếu đã dựng núi lửa thì bỏ.
- 2026-10-05: Map Trường Sa thêm **hai tàu đang chìm** (A: nghiêng 20–25°, mũi chìm, thượng tầng cháy, dầu loang; B: gần thẳng đứng, đuôi và chân vịt chổng lên) để thể hiện mức độ chiến tranh. Cập nhật `maps.md` mục 2 (bảng thành phần), `art/map_truong_sa.svg`, `art/ui_settings_mock.svg`. Tàu giữ tư thế, chỉ lún rất chậm, không có hoạt cảnh chìm lặp lại. Agent code: dùng lại model tàu thủ tục hiện có (nghiêng, nhúng nửa vào nước) cho hai tàu này.
- 2026-10-05: **Map áp dụng cho cả màn gameplay** (theo yêu cầu người thiết kế): đảo lại ghi chú trước đó "các màn khác luôn dùng hai_phong". Nay Placement, Trận, Result và cảnh chờ đều theo map đã chọn; chỉ Hangar giữ phòng xưởng trung tính. Bố cục thế giới, camera, cinematic, điểm neo không đổi theo map; map chỉ đổi diện mạo (trời, sương, mưa, sấm chớp, đèn chính, HDRI, màu biển, màu dưới nước, vật nền, âm nền). Thêm `maps.md` mục 4 (bảng ghi đè Trường Sa so với Hải Phòng, hiển thị nổ dưới hoàng hôn ×1.25 lửa và khói tối hơn, vật nền không lấn vùng chơi, sự kiện nền tạm hoãn khi cinematic, bảng từng màn), đổi mục dữ liệu và bỏ `appliesTo`. Mặc định vẫn `truong_sa`. Đổi map giữa trận được, chờ hết hàng đợi sự kiện rồi mới crossfade. Sửa `env-and-fx.md` (ghi đây là bộ thông số `hai_phong`, sấm chớp chỉ ở `hai_phong`), `ui-art.md` mục 3, `audio.md` (thêm `amb_sea_dusk`, sấm chỉ ở Hải Phòng), `assets.md` (thêm `tex_env_truong_sa`, `amb_sea_dusk`), `cinematics.md` (mục theo map). Asset mới: `art/ui_battle_mock_truong_sa.svg`. Agent code: mở rộng nạp cảnh theo `MapId` cho mọi màn có biển, tách bộ thông số theo map, đổi map giữa trận chờ xong event queue; cần thêm task và cập nhật snapshot.
- 2026-10-05: **Thiết kế lại logo** (bản cũ "nhựa"): chữ stencil khối góc cạnh dựng bằng path, thép bị bắn phá (rỗ, nứt, lỗ đạn), cháy sém, lửa liếm, cầu lửa và mảnh vỡ phía sau, hai tầng PACIFIC nhỏ / ASH to. File mới: `design/logo.md`, `art/logo.svg` (thay bản cũ), `art/logo_emblem.svg`, `art/_src/logo.mjs`, `art/ui_menu_mock_truong_sa.svg`. Sửa `ui-art.md` mục 4, `screens.md` mục 2 (Menu), `AGENT_GUIDE.md`. **Bố cục cảnh chờ**: logo và 3 nút (Chơi, Khí tài, Cài đặt) nằm giữa, nên nền dồn vật thể **dày đặc hai bên**, vùng giữa thoáng; thêm `maps.md` mục 8 (chia vùng 32/36/32, thế giới `|x| ≥ 32`, danh sách vật thể từng map, màn dọc, tương phản dưới nút). Không áp dụng cho màn gameplay. Agent code: bố trí lại vật nền của hai map ở Menu/ModeSelect theo mục 8, thay logo trong `MainMenu`, cần thêm task và cập nhật snapshot.
- 2026-10-05: **Logo thiết kế lại lần 2** (theo người thiết kế: cháy nổ giữ nguyên, nhưng cần lực, kim loại, hiện đại, phong cách tận thế hoang tàn, và nhìn ra game tàu chiến). Thay `art/logo.svg`, `art/logo_emblem.svg`, `art/_src/logo.mjs`, viết lại `design/logo.md`. Chữ nghiêng −8°, tấm giáp nặng đùn cạnh, kim loại chải xước có vát sáng (filter SVG), đường hàn, đinh tán, gỉ, góc bị xé, lỗ đạn; **chiến hạm đổ nghiêng sau chữ**, mặt nước vỡ, số hiệu PA-17, thước mớn nước, mỏ neo, lưới lục giác chiến thuật. Emblem có chiến hạm và mỏ neo. Màn Menu mock cập nhật (`ui_menu_mock_truong_sa.svg`). Chưa xuất PNG. Agent code: thay logo trong `MainMenu`, nếu filter nặng thì dùng PNG xuất sẵn.
- 2026-10-05: **Thêm 2 tàu nội tại** (người thiết kế yêu cầu). (1) **Tàu cắn lén** `raider` 1×1: không đòn chủ động; kỹ năng `sneak`: đầu trận và cứ cách một lượt của chủ, tự bắn 1 ô ngẫu nhiên (ô chưa có kết quả) lên lưới địch, không bị hộ vệ chặn, trúng không lộ loại tàu. (2) **Tàu hộ vệ** `escort` 2×2 (khối vuông, không xoay): không đòn chủ động; kỹ năng `guard`: cứ cách một đòn chủ động của địch, triệt tiêu ngẫu nhiên `ceil(30%)` số ô của đòn đó (đòn 1 ô: triệt tiêu hẳn; chữ thập 5 ô: mất 2 ô; ngư lôi: tính trên đường đi), ô bị chặn gắn cờ `blocked`. **Diễn giải "cách mỗi lượt" = cứ cách một lần (`period: 2`: kích hoạt, nghỉ 1, kích hoạt lại)**; muốn "mỗi lượt" đổi `period` thành 1 trong `ships.json`, không sửa mã. Sửa `ships.json` (thêm `roster`, `fleetSize`, `shape`, `passive`, hai tàu mới; `fleet` mặc định giữ 5 tàu cổ điển; chọn 5 trong 7 ở Khí tài), `rules.md` (mục 1, 2, 5, 7, 8, 9, và mục 10 mới "Kỹ năng nội tại"), `core-api.ts` (`ShipId` thêm hai tàu, `ShipShape`, `PassiveSpec`, `PlacedShip.rest`, `CellMark`, event `PassiveTriggered`/`ShotNullified`, `ShotFired.source`, `runPassivesAtMatchStart`/`AtTurnStart`, `viewOfEnemy` thêm `marks`, `randomPlacement(seed, fleet?)`), `GDD.md` mục 3–4, `screens.md`, `ui-art.md`, `audio.md`, `env-and-fx.md` (4 hiệu ứng mới), `assets.md`, `cinematics.md` (mục 9 cảnh passive ≤1.2 s), `AGENT_GUIDE.md`. File mới: `design/ship-raider.md`, `design/ship-escort.md`, `art/raider_2d.svg`, `art/escort_2d.svg`; icon `ship-raider`, `ship-escort`, `atk-sneak`, `atk-guard` trong `icons.svg`; marker `blocked` trong `markers.svg`. Điểm cần lưu ý cho agent code: tàu hộ vệ 2×2 phá giả định "tàu thẳng hàng" (đặt, xếp ngẫu nhiên, AI mật độ, sprite xoay), tàu nội tại không bao giờ là tàu sẵn sàng (có thể làm lượt tự bỏ), PvE AI sao chép đội hình người chơi. Nhận xét cân bằng cho người thiết kế: hộ vệ rất mạnh trước đòn 1 ô và pháo nhanh; cắn lén chỉ 1 ô nên dễ chìm sớm; cần playtest. Agent code cần đọc lại các file trên, cập nhật snapshot và thêm task.
- 2026-10-05: **Logo làm lại tối giản, hạn chế animation** (bản trước quá rối): chữ stencil phẳng PACIFIC (thép) + ASH (cam), gạch chân là bóng chiến hạm trên đường nước, "NAVAL WARFARE"; không lửa, không nứt, không hạt, không filter. Chuyển động chỉ hiện dần + kéo đường nước, 0.9 s. Viết lại `design/logo.md`, thay `art/logo.svg`, `art/logo_emblem.svg`, `art/_src/logo.mjs`; sửa `ui-art.md` mục 4, `screens.md` mục 2. **Map Trường Sa**: (1) quần đảo **gần và rõ**, hai đảo lớn sát hai bên (tâm x −45/+50, z −32…−34; trước đây lùi xa); (2) **6 chiến hạm giao tranh** bắn **6 vệt tên lửa** qua nhau, thêm vào hai tàu chìm; (3) **mặt biển sáng hơn** (bảng màu mới ở `maps.md` mục 2); (4) **đồng bộ phông giữa Menu, ModeSelect, Placement, Trận, Result** (`maps.md` mục 4.6): cùng đảo, tàu, nhà giàn, tên lửa, chỉ khác camera và mật độ sự kiện. Cập nhật `maps.md` (mục 1, 2, 4.1, 4.3, 4.6, 4.7, 8.2). Asset mới/đổi: `art/map_truong_sa.svg` (sinh từ `_src/scene.mjs`), `ui_menu_mock_truong_sa.svg`, `ui_battle_mock_truong_sa.svg` (mock đồng bộ), `ui_settings_mock.svg`. Hải Phòng không đổi. Agent code: dựng lại cảnh Trường Sa theo bảng mới, bố trí đảo và tàu nền sao cho Placement/Trận nhìn từ `tactical` khớp với Menu; cần thêm task và cập nhật snapshot.
- 2026-10-05: **Bỏ model 3D realistic chi tiết, chuyển sang model khối cơ bản** (người thiết kế). Mục "2. Model 3D" chi tiết trong `ship-*.md` tạm hoãn (có banner ở đầu mỗi file). Thêm `design/ships-basic3d.md` và **7 file glb dùng được ngay** `design/models/ship_{destroyer,cruiser,submarine,missile,carrier,raider,escort}.glb` (hộp, hình thang khối, trụ, cầu, đa giác đùn; 264–1 676 tam giác; đúng kích thước, cây node, điểm neo như `ship-*.md`: `turret_*`/`barrel_*`/`muzzle`, `launcher_N`, `plane_N`, `periscope`, `decoy_N`, `cell_N`, `fire_N`, `dmg_cellN` rỗng, v.v.), kèm `models/preview_sheet.png`, nguồn dựng `models/_src/{glb,make_ships}.mjs`, `preview.html`. Escort mũi +X không xoay. Sửa `assets.md` (ghi chú model cơ bản), `AGENT_GUIDE.md` mục 2. Agent code: chép glb vào `src/assets/models/`, khai báo `manifest.ts`, thay hộp placeholder trong `shipModels.ts`; tên node là hợp đồng, không đổi.
- 2026-10-05: **Model 3D nâng cấp: khối mượt và nhiều chi tiết, bám sprite 2D** (người thiết kế). Thay 7 file `design/models/ship_*.glb` bằng bản 2: thân loft mượt (mặt cắt, mạn khô tăng về mũi, đáy tròn), thượng tầng hình thang vát mép, pháp tuyến mượt, lan can, bích, hàng cửa sổ, tấm radar, ăng-ten, CIWS sáu nòng, VLS có lưới nắp và viền hazard, xuồng, bè cứu sinh, đèn hành trình, gạch cách âm tàu ngầm, boong bay có vạch và thang máy hazard, máy bay có cánh xuôi và kính. 1 101–11 351 tam giác (trước 264–1 676), 100–910 KB. **Cây node, tên neo, kích thước không đổi** so với bản 1 nên code không phải sửa. Cập nhật `ships-basic3d.md`, `assets.md`, `models/preview_sheet.png`, nguồn `models/_src/{glb,make_ships}.mjs` (bản 1 lưu ở `make_ships_basic_v1.mjs`). Agent code: thay file glb, kiểm tra tải được (đã nạp thử bằng GLTFLoader).
- 2026-10-05: **Tàu bị bắn hạ**: 2D hiện lại sprite tàu (xám tối) **kèm dấu X trên mỗi ô** thay cho marker đống đổ nát (người thiết kế yêu cầu); 3D là **hoạt cảnh chìm xuống** của model tàu (không dùng model riêng). Thêm `design/sinking.md` (nguyên tắc 2D và 3D, khóa chúi/nghiêng/độ sâu cho 7 tàu ở các mốc 0/300/900/1500/1800 ms, chuyển động phụ tháp pháo/máy bay/bệ phóng/tiềm vọng, hiệu ứng, thời điểm hiện dấu X, nhật ký), `art/sunk_states.svg` (bảng 7 tàu nguyên vẹn và đã chìm), `art/_src/sunk.mjs`. Marker `sunk` trong `markers.svg` đổi thành dấu X (nguồn `_src/frags.mjs`). Sửa `ui-art.md` (marker sunk, hàng đội), `screens.md` 7.4, `ship-destroyer.md` 1.4, `animations.md` mục 6 và `env-and-fx.md` (trỏ tới `sinking.md`), `AGENT_GUIDE.md`. Mock Trận và Menu đã dựng lại với X mới. Agent code: thay marker `sunk` trong lưới, vẽ sprite + X theo ô, dựng hoạt cảnh chìm theo bảng khóa; cần task và cập nhật snapshot.
- 2026-10-05: **Animation chìm tàu: mỗi loại tàu một kiểu riêng, tăng gấp đôi thời lượng (1800 → 3600 ms)**. Viết lại `design/sinking.md` mục 2: khu trục hạm lao mũi và đuôi dựng đứng (tháp pháo trước bật bay), tuần dương lật úp nặng nề (nổ dây chuyền 3 tháp), tàu tên lửa cháy dây chuyền với tên lửa tự phóng loạn và đuôi chìm trước, tàu ngầm lặn rồi nén vỡ (implosion, không lửa), tàu sân bay boong nổ liên hoàn rồi nghiêng lớn (máy bay nổ lần lượt, đuôi chìm nốt thêm 2000 ms), tàu cắn lén lật úp nhanh rồi nổi úp, tàu hộ vệ vỡ phòng thủ (CIWS bắn loạn, vòm radar bật tung, một thân chìm trước). Bảng khóa 7 mốc (0/600/…/3600) cho từng tàu, chuyển động phụ, hiệu ứng, âm, máy quay riêng. Thêm nút **bỏ qua riêng** cho cảnh chìm; "cinematic ngắn" bỏ hoạt cảnh chìm 3D. Thêm `art/sinking_timelines.svg` (+ nguồn `_src/sinking_timelines.mjs`). Sửa `animations.md` mục 6, `env-and-fx.md` (`fx_sink` 3600 ms), `cinematics.md`. **Diễn giải**: "animation" ở đây là animation tàu chìm vừa thiết kế; cinematic bắn 5 đòn KHÔNG tăng gấp đôi (đã 2800–5000 ms, giới hạn 5 s). Agent code: tách node `turret_fwd`/`radome`/`plane_N` để bay ballistic, nút bỏ qua riêng; cần task và cập nhật snapshot.
- 2026-10-05: **Hoạt cảnh chìm tăng lên 7200 ms** (người thiết kế: 3600 ms chưa đủ). Nhân đôi toàn bộ mốc thời gian, độ trễ giữa các nổ và thời gian đuôi chìm nốt (2000 → 4000 ms) trong `design/sinking.md` mục 2; bảng khóa 7 mốc nay là 0/1200/2400/3600/4800/6000/7200; thông số bay của tháp pháo khu trục hạm chỉnh lại (vận tốc lên 0.5, trọng lực −0.5) để vẫn rơi xuống nước đúng giữa hoạt cảnh; thêm mục 2.7 "Chặn lượt và chạy nền" và tùy chọn Cài đặt **"Tàu chìm chạy nền"** (mặc định tắt; bật thì sau 2400 ms trận cho chơi tiếp, hoạt cảnh chìm chạy ở nền). Sửa `animations.md`, `env-and-fx.md`, `cinematics.md`, `screens.md` mục 10, và `art/sinking_timelines.svg` (+ nguồn). Agent code: thời lượng 7200 ms, nút bỏ qua riêng, tùy chọn chạy nền; cập nhật task.

## Nhận xét cân bằng (không sửa `ships.json`)
(trống)

## Nhật ký phase
Mỗi phase xong ghi: lệnh nghiệm thu + kết quả thật, đã làm, chưa làm.

### P0 — xong 2026-10-05
- Nghiệm thu: `npx tsc --noEmit` sạch; `npx vite build` thành công; chụp headless 1600x980: menu hiện đúng 3 nút, "Chơi" nổi bật, cùng cỡ và font; `src/core/` chưa tồn tại nên không có import `three`.
- Đã làm: xóa Volcano, Embers, `modes/`, Chakra Petch. Chuyển hạ tầng sang `src/render3d/` (`engine`, `renderScene`, `ocean`, `sky`, `menuScene`, `warship`). Thêm `ui/strings.ts`, `ui/tokens.ts` (tokens.json → CSS variables), font Barlow/JetBrains Mono, `resolveJsonModule`. `style.css` chỉ dùng biến token. Cài `tsx`. `git init`.
- Chưa làm: bloom vẫn mạnh (P3-08). Cảnh nền vẫn hoàng hôn (P3). `strings.ts` mới có chuỗi menu. Chưa có script `npm test` (làm ở P1-07).
- Lưu ý: `render3d/warship.ts` là tàu thủ tục cũ, chỉ dùng cho nền menu tạm; không phải model chính.

### P1 — xong 2026-10-05
- Nghiệm thu: `npm test` → 34 test, 34 pass, 0 fail (~6.7 s). Gồm: 1000 ván AI dễ vs AI dễ (seed 1..1000) đều kết thúc, mỗi ván đúng một `MatchEnded`; cùng seed cho cùng kết quả (4 seed so sánh toàn bộ kết quả + event); toàn bộ ví dụ `rules.md` mục 9; mỗi đòn có test giữa lưới, sát mép, ô đã bắn, trúng và chìm; chu kỳ hồi chiêu 0/1/2; `skipTurn`; thắng; state cũ không bị đổi; `viewOfEnemy` không lộ; kiểm tra tĩnh `src/core` không import `three`/`document`/`window`. `tsc --noEmit` và `vite build` sạch.
- Đã làm: `src/core/` gồm `rng`, `specs` (đọc `ships.json`), `board`, `attacks`, `match`, `ai/easy`, `ai/index` (`createAi`), `runner` (`playTurn`, `playMatch` có chặn kẹt), `index`. Kiểu lấy trực tiếp từ `design/core-api.ts`, không đổi chữ ký. Thêm `npm test` (`tsx --test test/*.test.ts`).
- Chưa làm: AI vừa/khó (`createAi` ném lỗi "chưa làm (P6)"). Test chưa được tsc kiểm kiểu: thiếu `@types/node` (dependency mới, chưa hỏi); chạy bằng `tsx` nên không ảnh hưởng chạy.

#### Cách diễn giải luật khi `rules.md` chưa nói rõ (người thiết kế xem lại)
1. `CellResolved.shipId` luôn bỏ trống: để không lộ loại tàu cho người bắn. Loại tàu chỉ lộ qua `ShipRevealed` (tuần dương trúng) và `ShipSunk`.
2. `ShipRevealed` phát mỗi lần tuần dương trúng, kể cả tàu đã lộ trước đó (nhãn loại tàu ở `animations.md` 4.2 cần hiện lại).
3. Sau `MatchEnded` không phát `TurnChanged`; `turn` và `turnNumber` giữ nguyên.
4. `ShipSunk` phát sau toàn bộ `CellResolved` của đòn đó (kể cả tàu chìm ở ô đầu của khu trục), đúng thứ tự mục 7.
5. `ShotFired.cells` của ngư lôi là các ô đã đi qua (tới và gồm ô trúng). `previewCells` của ngư lôi trả cả đường để UI vẽ mũi tên.
6. Tàu chìm cũng làm lộ loại tàu (mục 5) và được thêm vào `revealed`.
7. Ngư lôi `index` ngoài 0..9 là hành động không hợp lệ.

#### Nhận xét cân bằng (từ mô phỏng, không sửa `ships.json`)
Mô phỏng chưa đo cân bằng (AI ngẫu nhiên không phản ánh người chơi). Chưa có kết luận.

### Gameplay đầy đủ bằng hình khối — xong 2026-10-05 (P2 + P5 trừ 3D + P6)
- Nghiệm thu: `npm test` 39/39 đạt. `tsc --noEmit` và `vite build` sạch. E2E bằng Chrome headless (`test/e2e/`): chơi trọn ván tới màn kết quả cho PvE dễ/vừa/khó và hot-seat, ở 360, 820, 1000, 1300, 1440 px, không lỗi trang; kiểm tra đặt tàu (kéo thả, chồng bị từ chối, chạm-chạm, xoay, kéo ra ngoài để gỡ, ngẫu nhiên, bàn phím); kiểm tra nhắm 5 loại đòn (số thứ tự pháo nhanh, ô không hợp lệ không chọn được, ngư lôi chọn hàng/cột và đổi phía, line3 xoay, chữ thập ở góc chỉ 3 ô, Esc hủy, hiện hồi chiêu sau khi bắn).
- Đã làm: `src/ui/` (app state machine, grid, 7 màn hình, cài đặt dạng lớp phủ, event player, strings, tokens), `src/core/ai/{medium,hard}.ts`, export thêm `sunkShips` ở `core` (chỉ bổ sung, không đổi hợp đồng).
- Chưa làm / hạn chế:
  - 3D: nền vẫn hoàng hôn tạm, chưa có tàu/hiệu ứng 3D, chưa có cinematic (P3, P4).
  - Âm thanh: `play(key)` im lặng (Q4). Chất lượng đồ họa, rung màn hình: chỉ lưu cài đặt.
  - Hangar chưa xoay 3D, nút "Xem thử đòn đánh" khóa.
  - ~~Chỉ khu trục có sprite thật~~ Đã nối sprite 2D cho cả 5 tàu (xem mục dưới).
  - Chưa đo tương phản chữ/nền. Chưa thử trên thiết bị cảm ứng thật (kéo thả dùng pointer events, `touch-action: none`); chỉ thử bằng Chrome headless.
  - Không có nút "Bỏ qua" cho AI nghĩ (chờ 0.7–1.5 s theo `tokens.json`).
- Lệch nhỏ so với `screens.md` (người thiết kế xem lại):
  1. Ngư lôi chọn đường bằng nhãn **trái (hàng)** và **trên (cột)**; chạm lần nữa đổi phía vào (▶/◀, ▼/▲). Không có tay nắm ở mép phải/dưới để lưới 10 ô cỡ `cellMin` 2rem vẫn vừa màn 360 px.
  2. Màn Cài đặt là lớp phủ dùng chung (menu và giữa trận), không phải màn riêng.
  3. Trên mobile, sau lượt AI giao diện tự chuyển sang tab "Của bạn" để thấy thiệt hại, rồi về "Địch" khi tới lượt mình.
- Nhận xét cân bằng (từ chơi thử bằng bot chọn ngẫu nhiên, chỉ mang tính tham khảo): AI khó thắng bot ngẫu nhiên sau khoảng 13 lượt, AI vừa khoảng 25–30 lượt, AI dễ thua; hồi chiêu sân bay 3 và tên lửa 2 khiến AI thường có lượt "bỏ lượt" giữa ván. Cần playtest bằng người.

### Sửa lỗi: mở file HTML ra trắng xóa — 2026-10-05
- Nguyên nhân: build mặc định dùng `<script type="module">` và đường dẫn tuyệt đối `/assets/...`; trình duyệt chặn cả hai khi mở bằng `file://`. `index.html` gốc trỏ tới `/src/main.ts` nên luôn cần server.
- Sửa: `vite.config.ts` đặt `base: './'`, xuất bundle `iife` và đổi thẻ script thành `defer` không `crossorigin`. Kiểm tra bằng Chrome headless: `dist/index.html` mở bằng `file://` hiện đủ menu và cảnh 3D, không lỗi console; `npm run dev` vẫn chạy (HTTP 200, menu hiện).
- Kiểm tra lặp lại: `node test/e2e/open.mjs file:///…/dist/index.html`.

### Nối sprite 5 tàu + kéo thả theo giữa tàu — 2026-10-05
- Sprite: `shipArt.ts` dùng `design/art/{destroyer,cruiser,submarine,missile,carrier}_2d.svg`, bỏ hẳn khối màu placeholder. Đặt dọc xoay 90° theo chiều kim đồng hồ (mũi hướng xuống), ô chỉ số 0 ở đuôi, đúng `ship-*.md` mục 1. Áp dụng cho đặt tàu, lưới của mình, lưới địch (chỉ khi chìm) và Khí tài. Đã đọc 4 file `ship-*.md` mới và `assets.md` (13:40); phần model 3D vẫn chờ file glb (Q7).
- Con trỏ ở giữa tàu khi đặt tàu: ô dưới con trỏ có chỉ số `ceil(n/2) - 1` (3 ô: giữa; 5 ô: giữa; 2 ô: ô trái; 4 ô: ô thứ 2 từ trái, dọc thì tính từ trên). Áp dụng cho kéo từ khay, kéo tàu đã đặt (bắt ở ô nào cũng nhảy về giữa tàu), và ảnh tàu đi kèm con trỏ khi kéo. **Cũng áp dụng cho chạm-chạm** (chạm ô = ô giữa tàu) để hai cách nhất quán; người dùng chỉ nói về kéo thả, đổi lại nếu muốn ô đầu tàu cho chạm-chạm.
- Hệ quả: tàu 5 ô không đặt được ở 2 cột đầu/cuối khi nằm ngang nếu con trỏ ở sát mép (ô gốc ra ngoài lưới thì bị từ chối, tàu ở lại khay hoặc vị trí cũ).
- Kiểm tra: `test/e2e/placement.mjs` viết lại (carrier thả cột 4 → gốc 2; destroyer thả cột 7 → gốc 7; missile thả cột 5 → gốc 4; cruiser thả cột 0 bị từ chối, cột 1 → gốc 0; submarine dọc thả hàng 8 → gốc 7; kéo tàu đã đặt; con trỏ nằm trong khối giữa của ảnh tàu khi kéo). `npm test` 39/39; playthrough PvE và hot-seat, aiming đều đạt, không lỗi trang.

### Đổi flow Khí tài/profile + P3 nền 3D — 2026-10-05
- Nghiệm thu: `npm test` 42/42. `tsc --noEmit` và `vite build` sạch. E2E (`test/e2e/`): playthrough PvE và hot-seat không lỗi, placement/aiming không đổi kết quả, **profiles.mjs** (tạo, đổi tên bằng Enter, gắn/bỏ tàu, yêu thích profile và tàu đưa lên đầu, lưu qua reload, xóa hai bước, xem Tất cả tàu/Theo profile, Dùng profile, chơi hết ván với hạm đội 1 tàu và kết quả hiện 0/1 – 1/1), **scene3d.mjs** (menu, đặt tàu, trận ở chất lượng cao và thấp, không lỗi console/WebGL). Mở `dist/index.html` bằng `file://` vẫn chạy.
- Core: `isValidPlacement` nhận 1–`MAX_FLEET` tàu khác loại; `randomPlacement(seed, ids?)` (tham số thứ hai tùy chọn, tương thích ngược). Thêm test hạm đội lệch và mô phỏng 300 ván hạm đội ngẫu nhiên với cả ba AI.
- UI: `ui/profiles.ts` (store), `screens/hangar.ts` (viết lại), `screens/placement.ts` (roster mang theo), `ModeSelect` vào thẳng Đặt tàu, thanh hạm đội địch hiển thị đúng số tàu (loại ẩn), kết quả "x/tổng".
- 3D: `render3d/{ocean,nightSky,rain,lightning,harbor,world,buoyancy,shipModels,battleScene,menuScene,blankScene,engine}.ts`. Menu/ModeSelect: cảnh menu; Hangar/PassDevice: nền tối trơn; Đặt tàu/Trận/Kết quả: `BattleScene` (camera tactical/result).
- Chưa làm: xem bảng task P3 (gợn mưa, bọt quanh thân tàu, vết dầu, dưới nước, atlas hạt, HDRI thật, reflection probe, đổ bóng, cinematic). Hiệu năng 60 fps chưa đo được (chỉ có SwiftShader); cần chạy thử trên máy thật, nếu nặng thì giảm số tòa nhà (150), hạt mưa hoặc `pixelRatioMax`.
- Chưa dùng được `settings.waveScale` của thiết kế (chưa có ô cài đặt); mặc định 1.
- Lỗi cũ sửa kèm: nhật ký ghi "Tàu Tàu tên lửa của bạn bị chìm".

### P2b: giao diện theo `ui-art.md` + map + Cài đặt — 2026-10-05
- Nghiệm thu: `npm test` 42/42; `tsc` và `vite build` sạch; E2E đều đạt sau khi cập nhật bộ chọn (`.fcard`→`.frow`, vòng số 1–2 là marker SVG): playthrough PvE khó/vừa (cả 360 px) và hot-seat, placement, aiming, profiles; chụp ảnh với WebGL ở 1440 và 390 px: menu hai map, Cài đặt mở danh sách map, đặt tàu, trận (có và không có tàu đang chọn). Không lỗi console.
- Đã làm: xem bảng P2b. Thêm `ui/{sprites,toast,mapPicker}.ts`, viết lại `ui/settingsOverlay.ts`, `ui/screens/battle.ts`, `style.css`; `render3d/{truongSaScene,fx}.ts`; `Ocean.setPalette`; `settings.map` và `settings.shortCinematic`; chuỗi `S.map.*`.
- Map Trường Sa đã có: trời hoàng hôn 5 mốc màu, đĩa mặt trời nửa chìm, hai lớp mây viền cam, đảo giữa + 2 đảo nhỏ, nước nông và sóng vỡ trên rạn, 8 cây dừa (2 cháy), đèn biển đổ cháy, nhà giàn cháy, tàu cháy xa, hai tàu đang chìm (23° và 57°, lún 0.02/phút), dầu loang, pháo kích 4–9 s (vệt đạn đứt nét, cầu lửa, cột bụi, mảnh parabol), chớp nổ chân trời, tro lửa 120/400/700 hạt, sương hồng cam, tàu thủ tục trôi qua. Chưa làm: nước biển có vệt phản chiếu tách riêng của mặt trời ở mức "cao" (probe thật), bọt khí/hơi nước quanh tàu chìm, âm thanh nổ xa.
- Hạn chế / lệch:
  1. Hiệu năng chưa đo trên GPU thật (chỉ có SwiftShader). Cảnh Trường Sa dùng ~700 hạt CPU ở mức cao.
  2. Nút Menu đặt cột bên trái theo `ui-art.md` mục 3 (trước đó ở giữa).
  3. Toàn bộ nút/panel đã bỏ góc cắt chéo, chuyển sang góc vuông + nẹp xanh theo `ui-art.md`.
  4. `screens.md` mục 7.2 mô tả chạm nhãn mép để chọn ngư lôi; vẫn dùng hai tay nắm trái/trên (đã ghi ở lượt trước).
  5. Màn Trận ở 1440×900 vẫn phải cuộn một chút để thấy hết lưới của mình thu nhỏ (giống mock, nó cũng bị cắt ở đáy).
  6. Nhãn lưới địch/ta dùng màu cam/xanh; thẻ "TÀU ĐANG CHỌN" hiện cả ở lượt đối thủ chỉ khi đã chọn tàu (không chọn được lúc đó).

### P4: cinematic 5 đòn — 2026-10-05
- Nghiệm thu: `npm test` 58/58, gồm **16 test mốc thời gian** (`test/cinematic.test.ts`, chạy Node không cần WebGL): rapid chạm ≈2050/2500 ms tổng 2800; precision chạm ≈2450 tổng 3200 (có slow-mo 0.6× làm thời gian thực dài hơn mốc cảnh); cross 5 quả chạm 3050+120i tổng 3800, góc (0,0) chỉ 3 quả; torpedo ô cuối chạm ≈3950, tổng 4600, trượt hết 10 ô; line3 chạm 3800/3950/4100 tổng 5000, sát mép 2 ô; chìm thêm 1800 ms với `ShipSunk` ở đầu cảnh chìm; x2 chia đôi; bỏ qua phát nốt đúng thứ tự trong ≤ 150 ms; cinematic ngắn < 2.6 s; mọi event phát đúng một lần, `ShotFired` đầu, event cuối cùng cuối; địch bắn chạy trọn. `tsc` và `vite build` sạch. E2E WebGL (`test/e2e/cinematic.mjs`): chơi PvE bắn đủ 5 loại đòn, mọi cinematic bật rồi tắt lớp `cine`, marker 2D cập nhật, không lỗi trang (mỗi cinematic mất 15–29 s thực do SwiftShader chỉ ~4 fps).
- Đã làm: `render3d/{cinematic,fx3d}.ts`, `shipModels.ts` (placeholder có tháp pháo, bệ phóng, nắp ống, máy bay), `battleScene.ts` (rig tàu, tàu giả, lửa kéo dài, vết dầu, camera ghi đè, `endShot`), `Ocean` nhìn từ dưới nước (`uUnder`), `NightWorld.setUnderwater`, UI: lưới 2D mờ 0.25 khi chiếu, nút Bỏ qua, toast lộ loại tàu, "Cinematic ngắn" có tác dụng.
- Kiểm tra hình: `test/e2e/cine_frames.mjs` (dùng `?debug`, chạy đồng hồ cảnh chậm) chụp 5 khung/đòn ở mốc cố định; đã xem khung của rapid, precision, cross, torpedo, line3: camera đúng khung tàu bắn và khung mục tiêu, 5 bệ phóng ngẩng lên kèm khói, cầu lửa + tia lửa + vòng sóng + cột nước + mảnh vỡ ở ô chạm, tháp pháo nòng đôi của tuần dương, tàu ngầm trồi nhìn từ dưới nước. Sau khi xem, đã sửa: camera bám cao độ sóng (trước đó chui xuống nước), hạ chiều cao thân placeholder về mạn khô thật (camera 0.12–0.16 nằm dưới boong), chế độ dưới nước chỉ bật khi tàu ngầm trồi, đạn dùng sprite sáng lớn hơn.
- Hạn chế / chưa làm:
  1. **Ảnh chỉ kiểm tra trên SwiftShader**; chưa đánh giá cảm giác thật, fps, độ sáng trên GPU thật. Cảnh khá tối (đêm, tàu placeholder).
  2. Tàu chỉ là hộp: tháp pháo/ bệ phóng/ nắp ống/ máy bay rất đơn giản; chưa có đèn hành trình, thang, jbd, tên lửa là sprite.
  3. Chưa có: sóng xung kích lan lên thân tàu, bọt quanh thân khi chao, tia sét đánh biển, giọt mưa trên ống kính, mưa bắn trên boong, nghiêng 1° về phía tàu bị trúng (`env-and-fx.md` mục 3).
  4. Âm thanh: `play(key)` im lặng, nên chưa có ducking nhạc hay tiếng nổ.
  5. Ngư lôi: đường bọt trắng và vòng sóng từng ô có, nhưng thân ngư lôi chỉ là hình trụ nhỏ và "dải nước lõm theo sau" chưa làm.
  6. Máy bay (line3) bay theo đường cong đơn giản (Catmull-Rom) từ ray tới dải mục tiêu; không có ray phóng, hơi nước hay đèn hành trình nhấp nháy.
  7. Trượt/trúng ở ô đã có kết quả trước đó chỉ có khói nhỏ (đúng thiết kế); chưa có nhãn "Đã đánh chìm" dạng chữ lớn trong cảnh 3D (đã có toast).

### Chạy lại thiết kế: map cho cả gameplay, logo mới, menu ở giữa — 2026-10-05
- Nghiệm thu: `npm test` 61/61 (thêm 3 test sấm chớp: đúng mẫu, hoãn khi cinematic, reduced-motion); `tsc`, `vite build` sạch; e2e không-3D đều đạt (playthrough PvE khó/dễ 360 px, hot-seat, placement, aiming, profiles); `file://` vẫn chạy; WebGL: menu hai map, đặt tàu và trận ở Trường Sa, **đổi map giữa trận** (Cài đặt → Chọn map: `truong_sa` → `hai_phong`, vẫn ở màn trận, đủ 5 tàu, không lỗi), chuyển động mở màn logo ở 350/800/1250/1700 ms.
- Menu: ba nút Chơi / Khí tài / Cài đặt ở giữa dưới logo, rộng 420 px cao 64 px, Chơi nền `alert`, ngoặc xanh lạnh ở góc; nút loa góc trái trên (tắt/mở âm lượng tổng) như mock. Logo mới `art/logo.svg` nhúng nội tuyến; chuyển động mở màn 1.8 s (chiến hạm trượt vào, PACIFIC rồi ASH đập xuống, mảnh vỡ, lửa bùng, thanh phụ và nút hiện lên), bỏ qua bằng phím hoặc chạm, tắt khi `prefers-reduced-motion`. Favicon là `logo_emblem.svg`.
- Map: kiến trúc mới `MapWorld` (`render3d/mapWorld.ts`, `createWorld.ts`): `NightWorld` (Hải Phòng) và `DuskWorld` (Trường Sa, trích từ cảnh cũ) cho hai bố cục `menu` (vật thể dồn hai bên, giữa thoáng; mặt trời ở giữa chân trời) và `play` (vật nền ở z ≤ −55, không lấn vùng chơi; mặt trời bên phải sau lưới địch). `MenuScene(map)` và `BattleScene` dùng chung. Ghi đè theo map trong gameplay: trời, sương, mưa (Trường Sa không mưa, thay bằng tro lửa), sấm chớp (chỉ Hải Phòng), đèn chính ấm, biển (sóng ×0.85), nước dưới (xanh ngọc ấm, tầm nhìn 9), vignette 0.30, lửa/nổ ×1.25 sáng, khói tối hơn, nước tung ấm. Sự kiện nền hoãn khi cinematic chạy và thêm 800 ms; pháo kích gameplay 10–20 s/đợt, chớp nổ chân trời 6–14 s. Màn kết quả: thắng sáng 10%, thua tối 10% (chỉ đèn chính). Đổi map giữa trận chờ cinematic phát xong rồi mờ chuyển 600 ms. Hangar giữ nền tối trung tính.
- Chưa làm / hạn chế:
  1. Bố cục dọc/hẹp của cảnh chờ (`maps.md` 8.4: vật thể dồn dải trên và dưới) mới chỉ đổi FOV 60° và hướng nhìn, chưa dựng lại vật thể.
  2. `tex_env_truong_sa` (HDRI) chưa có: Trường Sa không có môi trường phản chiếu cho thân tàu; Hải Phòng dùng môi trường sinh từ mã. Bóng đổ dài về phía camera-trái (4.2) chưa làm (chưa bật shadow map).
  3. Âm nền `amb_sea_dusk`, `sfx_thunder` chưa có (âm thanh vẫn im lặng).
  4. Logo: chưa xuất PNG dự phòng (`ui_logo`, `ui_logo_emblem` dạng PNG) cho máy yếu; chưa có biến thể đơn sắc / giảm hiệu ứng riêng ngoài việc tắt chuyển động. Chưa kiểm tra logo dưới 360 px (bỏ dòng PA-17/NAVAL WARFARE/FLEET OPS và thước mớn nước).
  5. Số vật thể hai bên Hải Phòng ở cảnh chờ mới tăng bằng cách đẩy cần cẩu, xác tàu ra hai bên và hạ skyline ở giữa; chưa tăng gấp 1.5–2 lần số tòa nhà/khói như `maps.md` 8.5. Chớp sáng vùng giữa chưa giảm 50%.
  6. Chưa có icon xoay nhỏ khi nạp map; lỗi nạp map chỉ giữ cảnh cũ + toast.

### 7 tàu, logo tối giản, map Trường Sa mới, cinematic tách cảnh — 2026-10-05
- Nghiệm thu: `npm test` 74/74 (thêm `test/passives.test.ts` 10 test theo `rules.md` mục 9: hộ vệ 1 ô / 5 ô / chu kỳ đòn 1-nghỉ-3, ngư lôi + hộ vệ, cắn lén đầu trận / nghỉ lượt 1 / bắn lượt 2, 1×1 và 2×2 chìm, tàu nội tại không chọn được, 7 loại với AI cả ba mức; 3 test cinematic mới); `tsc`, `vite build` sạch; e2e GL (scene3d) và chơi thử PvE có raider + escort (cinematic x2) không lỗi console.
- Core: `ShipShape` (`square` 2×2 gốc trên-trái, không xoay), `ShipAttack 'none'`, `runPassivesAtMatchStart/AtTurnStart` (idempotent theo lượt), `PassiveTriggered`, `ShotNullified`, cờ `blocked` (`viewOfEnemy().marks`), RNG theo (seed, lượt, mục đích) nên cùng seed cùng kết quả. AI: không chọn tàu nội tại; ở mức Khó xác suất tính cả khối 2×2 và ô 1×1 theo đội hình của chính mình (bản sao). PvE: đội AI = bản sao đội người chơi (Q9 đổi theo `rules.md`).
- UI: Khí tài/Đặt tàu có 7 tàu; tàu hộ vệ kéo thả không xoay (góc trên-trái dưới con trỏ), tàu cắn lén 1×1; sprite `raider_2d`, `escort_2d`; marker `blocked`; thẻ đội hình có nhãn NỘI TẠI + trạng thái (nghỉ / sẵn sàng); toast "Địch phục kích" / "Hộ vệ chặn n ô"; nhật ký ghi cắn lén và hộ vệ chặn. Cắn lén đầu trận chạy một lần mỗi ván (`Session.started`), mỗi phát một cảnh.
- Logo: `logo.svg` mới (phẳng, hai màu), chuyển động 0.9 s (hiện dần + trượt 8 px, đường nước kéo từ trái, chiến hạm hiện cùng lúc), chất lượng thấp hoặc reduced-motion hiện tức thời. Dòng phụ "NAVAL WARFARE" đang rất mờ so với nền: giữ đúng màu `#7F8E9B` theo `logo.md`.
- Map Trường Sa: một bộ phông chung mọi màn (`DuskWorld`), 2 đảo gần (tâm x −45 / +50, z −32 / −34), 3 mỏm xa, nhà giàn cao 12 đang cháy, 6 chiến hạm giao tranh, 2 tàu chìm (nghiêng 20° và ~50°), 6 vệt tên lửa (đỉnh 25–30; gameplay chỉ 2 vệt, chất lượng thấp 3 vệt và 4 tàu), biển sáng hơn theo bảng màu mới, camera menu nhìn `(0,3,−45)`. Layout `menu`/`play` chỉ đổi mật độ sự kiện.
- Cinematic: cảnh bắn kết thúc khi đạn rời nòng (rapid ≈1850, precision 1650, cross 2550 ≈ 70% đường bay, torpedo 2100, line3 2200), sau đó cảnh kết quả riêng (`resultCam`: trúng = máy tiến vào, nâng theo khói; trượt = máy sát nước) với blend 450 ms. Mốc chạm giữ nguyên; tổng: rapid 2800, precision 3000, cross 3800, torpedo 4600, line3 5000. Passive: `sneak` 1000 ms (chạm ≈750); `guard` chèn 700 ms trước mốc chạm (airburst / cột nước nhỏ ở ô bị chặn, camera `intercept_cam`), ô còn lại nổ bình thường. Tàu hộ vệ địch dùng tàu giả (không lộ vị trí).
- Chưa làm / hạn chế:
  1. Nhãn 3D "CẮN LÉN", "PHỤC KÍCH", "HỘ TỐNG" (dùng toast UI thay thế); `mat_emissive_guard` chỉ là một đèn điểm; CIWS/chaff chỉ là hạt đơn giản.
  2. Hộ vệ + cắn lén cùng lượt: chưa rút ngắn 70% mỗi cảnh (chỉ hộ vệ rút 70% khi là phát phụ).
  3. Thông báo "Hộ vệ bị hạ" chỉ qua cảnh chìm và toast chìm chung.
  4. Marker 2D `blocked` đã có, nhưng thông tin "tàu địch có hộ vệ" chỉ gợi ý bằng ô khóa (đúng luật).
  5. Model 3D vẫn là hộp placeholder (raider/escort cũng vậy); chưa nối glb (Q14).
  6. Chưa kiểm hình ảnh từng cảnh cinematic mới ở nhiều góc (chỉ kiểm timing bằng test và chạy GL không lỗi).

### Model glb, xem trận 2D/3D, "hỏng hóc khí tài" — 2026-10-05
- Nghiệm thu: `npm test` 78/78 (thêm 4 test hỏng khí tài), `tsc`, `vite build` sạch; `dist/index.html` mở bằng file:// nạp được cả 7 model (nhúng data URI `?inline`, `assetsInclude: **/*.glb`); e2e chơi PvE khó và hot-seat vừa (không-3D) đạt; e2e GL: đặt tàu 7 loại, trận 3D, nhắm, kéo xoay, bắn có cinematic, không lỗi console.
- Model: `render3d/shipGlb.ts` nạp 7 glb (`GLTFLoader.parseAsync`), dựng rig từ cây node (tháp pháo → yaw/pitch/muzzle, `launcher_N`, `torpedo_flap_N`, `plane_N`, `cat_*`, `launch`, CIWS của escort), sắp tháp từ mũi về đuôi; nâng nhẹ độ sáng vật liệu (emissive 30% màu gốc) vì cảnh tối. Chưa nạp xong hoặc lỗi: dùng hộp placeholder. Màn Đặt tàu: cảnh 3D phía dưới tự dùng model mới.
- Xem trận 2D/3D: nút 2D/3D ở thanh trên (phím V, nhớ lựa chọn). 3D: lưới 2D ẩn, canvas nhận chuột: kéo xoay 360° (độ cao 7°–83°), cuộn zoom, rê và chạm ô lưới địch để nhắm; vùng đánh tô cam, đường đạn đứt nét (cung cho pháo/tên lửa/bom, thẳng cho ngư lôi) kèm tên lửa mô hình chạy dọc đường; marker trượt trên mặt nước và ô bị hộ vệ chặn. Ngư lôi: chạm ô chọn hàng, chạm lại đổi phía, nút Xoay đổi hàng ↔ cột. Cinematic vẫn chạy và trả về camera quỹ đạo.
- Hỏng hóc khí tài (checkbox ở màn chọn chế độ, nhớ lựa chọn): xem Q15. Core: `newMatch(..., {equipDamage})`, `effectiveAttack`, `isDamaged`; AI dùng đòn thực tế. UI: thẻ tàu hiện "Hỏng khí tài", toast khi tàu mình vừa hỏng; tàu địch hỏng không lộ.
- Chưa làm / hạn chế:
  1. Hangar chưa dùng 3D (P5-02).
  2. Xoay chạm hai ngón / pinch zoom trên điện thoại chưa có (chỉ kéo một ngón xoay).
  3. Tàu địch chưa chìm không hiển thị trong 3D (đúng luật ẩn thông tin). Đường đạn chỉ xem trước khi nhắm, chưa giữ vệt sau khi bắn.
  4. Chưa kiểm hình ảnh cinematic với model glb ở nhiều góc (`aimTurret`, `launcher_N_pitch` trục xoay đặt theo giả định, có thể lệch).
  5. Tàu cắn lén/hộ vệ hỏng khí tài: hiện cắn lén 1 ô nên không áp dụng, hộ vệ có.

### Tàu bị bắn hạ 3600 ms, lưới/tàu to hơn, lưới luôn hiện — 2026-10-05
- Nghiệm thu: `npm test` 78/78 (test chìm đổi theo mốc mới), `tsc`, `vite build` sạch, e2e PvE không-3D đạt; GL: chụp từng đòn (rapid, precision, cross, torpedo, line3) và cảnh chìm tàu sân bay với model glb, không lỗi console.
- Kích thước: hằng `CELL = 2.4` (`render3d/scale.ts`). Lưới vẫn 10×10, nhưng mỗi ô 2.4 đơn vị; model tàu, camera, hiệu ứng (`Fx.unit`), cinematic (`Frame.P`), đường đạn, nhắm 3D đều nhân theo. Tàu sân bay ≈ 12 đơn vị, ngang cỡ tàu nền (14–22). Phông nền đẩy ra ngoài để không đè lên lưới lớn hơn: Trường Sa (đảo x −56/+60, tàu giao tranh, tàu chìm) và Hải Phòng (mảnh vỡ, phao). Mốc luật/tọa độ ô không đổi.
- Lưới 3D: sáng hơn 125% (màu và độ mờ), thêm lớp lưới thứ hai vẽ xuyên sóng (45% độ đậm) nên lưới không còn biến mất khi sóng lướt qua; marker 3D (trượt, bị chặn, ô nhắm) vẽ xuyên sóng.
- Tàu chìm (`design/sinking.md`): 2D: sprite xám + dấu X mỗi ô (cả lưới mình), khung ô đỏ sẫm, X pop 200 ms, hiện ngay sau ô cuối chạm (trước đây hiện ở đầu cảnh chìm); thẻ đội có ✕ trước tên. 3D: khóa (chúi, nghiêng, Δy) 7 tàu theo bảng 2.2, giật 0–300 ms, nổ dọc thân, khói/bọt khí, dầu loang từ 1200 ms, máy quay lùi và xoay 20°; riêng từng tàu: khu trục hạm bật tháp pháo trước, tuần dương nổ dây chuyền 3 tháp, tàu tên lửa phóng loạn tới 8 quả, tàu ngầm thụt tiềm vọng và nén vỡ ở 2200 ms, tàu sân bay nổ máy bay lần lượt, tàu hộ vệ CIWS loạn + vòm radar bật tung + chaff, tàu cắn lén lật úp. Chế độ cinematic ngắn bỏ cảnh chìm 3D.
- Lệch so với thiết kế: đuôi chìm nốt (tối đa 2000 ms, không chặn) đang **chặn** 1200 ms; nút Bỏ qua dùng chung với cinematic bắn chứ chưa tách riêng; chưa làm mờ vật liệu tàu ngầm, tách thân `hull_port/stbd` của hộ vệ, mảnh nắp VLS bay, ducking nhạc, âm thanh.
- Chưa kiểm hình ảnh mọi cảnh chìm (chỉ tàu sân bay). Nên xem tay: tàu ngầm dưới nước (đã sửa bầu trời lộ khi dưới nước), hộ vệ, tàu tên lửa.

### Tàu cao và to hơn nữa — 2026-10-05
- `CELL` 2.4 → 3.0; thêm `HEIGHT = 1.5` (`render3d/scale.ts`): rig tàu scale `(CELL, CELL×HEIGHT, CELL)` nên thân và thượng tầng cao hơn, bớt dẹt. Phông nền Trường Sa (đảo x −70/+76, tàu giao tranh, tàu chìm) và Hải Phòng (mảnh vỡ, phao) đẩy ra thêm. Chỉnh hai hằng này để đổi cỡ.
- Hạn chế: scale không đều làm nòng pháo hơi méo khi chúc xuống; tests 78/78, `tsc` sạch, e2e 3D không lỗi. Chưa xem lại từng cảnh cinematic ở cỡ mới.

### Tàu ngang cỡ tàu nền — 2026-10-05
- Người dùng muốn "gấp 10"; đã hỏi lại và chọn "tàu ngang tàu nền": `CELL` 3.0 → 4.5 (`render3d/scale.ts`), carrier ≈ 22 đơn vị, bằng tàu nền lớn nhất. `HEIGHT` giữ 1.5. Phông nền đẩy ra thêm (Trường Sa: đảo x −108/+114, tàu giao tranh, tàu chìm; Hải Phòng: cần cẩu, mảnh vỡ, phao, lửa). `npm test` 78/78, `tsc` sạch, e2e 3D không lỗi.

### Online (phòng mã, link mời, ghép ngẫu nhiên) + README — 2026-10-05
- Server `server/index.ts` (Node + `ws`, `npm run server`, cổng 8787 hoặc `PORT`, phục vụ luôn `dist/`): giữ trận bằng `core/`, kiểm xếp tàu và hành động, tự chạy kỹ năng nội tại đầu lượt và bỏ lượt; gửi mỗi bên lưới của chính họ cộng event công khai. Thoát giữa trận thì bên kia thắng. Giao thức: `src/net/protocol.ts`; client: `src/net/client.ts`; phía người chơi dựng lại trạng thái bằng `core/mirror.ts` (lưới địch chỉ có ô đã bắn, ô bị chặn, tàu đã chìm).
- UI: thẻ Online mở sảnh (`screens/online.ts`): tạo phòng (mã 5 ký tự + link `?room=`), vào bằng mã, ghép ngẫu nhiên, ô Máy chủ (mặc định cùng máy chủ với trang; dev/file dùng `ws://localhost:8787`; `?server=` đổi được). Đặt tàu → chờ đối thủ → trận. Mỗi phát bắn (kể cả cắn lén chen giữa) một cảnh cinematic.
- Nghiệm thu: `npm test` 81/81 (3 test online: phòng mã chơi trọn ván không lộ tàu địch, ghép ngẫu nhiên + lỗi mã/xếp tàu, đối thủ thoát); e2e hai trình duyệt tạo phòng, vào bằng link, chơi 77 lượt, không lỗi.
- Hạn chế: không nối lại khi rớt mạng (rớt là thua), chưa có giới hạn thời gian mỗi lượt, chưa giới hạn tốc độ gửi tin, ghép ngẫu nhiên luôn tắt "hỏng hóc khí tài", GitHub Pages chỉ host client (cần server riêng cho online).
