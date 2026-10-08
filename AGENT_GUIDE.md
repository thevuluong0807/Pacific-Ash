# AGENT_GUIDE — Pacific Ash

Tài liệu giao việc cho agent code. Người thiết kế không code. Mọi quyết định thiết kế đã chốt trong `design/`. Nếu thiếu hoặc mâu thuẫn, hỏi lại, không tự đoán.

## 0. Trước khi code (luôn làm)
Thiết kế có thể đổi bất cứ lúc nào. Trước mỗi lần code: kiểm tra mtime `GDD.md`, `AGENT_GUIDE.md`, `design/*` so với snapshot trong `PROGRESS.md` (file mới hơn thì đọc lại), đọc `PROGRESS.md`, đọc `DEVELOPMENT_PLAN.md` mục 1 và phase hiện tại. Sau khi code: cập nhật `PROGRESS.md`. Chi tiết: `DEVELOPMENT_PLAN.md` mục 1.

## 1. Game là gì
Battleship theo lượt, lưới 10x10, mỗi bên 5 tàu. Mỗi loại tàu có đòn đánh và animation riêng, hồi chiêu theo lượt. Gameplay chính là 2D (lưới + HUD bằng DOM). 3D (three.js) chỉ làm nền biển, cinematic bắn/trúng/chìm, và màn hình chọn tàu. Web desktop trước, nhưng cấu trúc phải sẵn cho mobile.

Tổng quan nghệ thuật và lý do: `GDD.md`. Đọc `GDD.md` mục 2 trước khi làm bất cứ thứ gì nhìn thấy được.

## 2. Thứ tự đọc
1. `design/rules.md` — luật chơi chính xác từng trường hợp biên. Nguồn sự thật duy nhất cho `core/`.
2. `design/ships.json` — dữ liệu 8 tàu (5 cổ điển + 2 tàu nội tại + siêu chiến hạm). `core/` đọc file này, không hard-code.
3. `design/core-api.ts` — hợp đồng kiểu và chữ ký hàm. Không đổi tên/kiểu khi chưa hỏi.
4. `design/screens.md` — màn hình, wireframe, luồng chuyển.
5. `design/tokens.json` — màu, font, khoảng cách, breakpoint, thời lượng. UI đọc từ đây, không viết màu trực tiếp trong CSS/TS.
6. `design/animations.md` — timeline từng đòn đánh.
7. `design/assets.md` — danh sách asset, tên file, placeholder.
8. `design/ship-<tên>.md` (destroyer, cruiser, submarine, missile, carrier) — hình dạng, sprite 2D, spec model 3D, điểm neo từng tàu. `ship-destroyer.md` chứa phần chung.
9. `design/env-and-fx.md` — biển, trời, mưa, skyline, đạn, hiệu ứng, camera, rung.
10. `design/ui-art.md` — thành phần giao diện và trạng thái; mock tham chiếu `design/art/ui_battle_mock.svg`.
11. `design/audio.md` — bus, lớp âm theo sự kiện, nhạc.
12. `design/ship-raider.md`, `design/ship-escort.md` — hai tàu nội tại mới (1×1 cắn lén, 2×2 hộ vệ); luật ở `rules.md` mục 10.
13. `design/cinematics.md` — shot list camera 5 đòn đánh (thắng `animations.md` mục 4).
14. `design/sinking.md` — tàu bị bắn hạ: sprite 2D + dấu X, hoạt cảnh chìm 3D (khóa từng tàu).
15. `design/ships-basic3d.md` — **model 3D khối cơ bản dùng được ngay** (`design/models/ship_*.glb`); model chi tiết trong `ship-*.md` mục 2 đã hoãn.
16. `design/world-scale.md` — **tỉ lệ thế giới: 1 ô = 10 đơn vị, model tàu và lưới nhân 10**, camera, biển, hiệu ứng, phông nền đặt lại. Đọc trước khi dựng cảnh 3D.
17. `design/wreckage.md` — ô trúng ở 3D: mảnh xác tàu nổi (10 glb) kèm hiệu ứng; trúng đủ thì cả con tàu 3D cháy nổ rồi thành **xác tàu chìm một nửa** (7 glb `wreck_*`, gãy vỡ nhưng rõ loại tàu).
18. `design/maps.md` — hai map (áp dụng cho cả gameplay), bố cục cảnh chờ dồn hai bên, mục "Chọn map" trong Cài đặt.
19. `design/logo.md` — logo mới (hầm hố, cháy nổ), emblem, cách dùng, chuyển động mở màn.
20. `design/ship-dreadnought.md` — siêu chiến hạm 1×4 (`barrage`: 5 ô ngẫu nhiên, không nhắm): sprite `dreadnought_2d.svg`, model `ship_dreadnought.glb`, xác `wreck_dreadnought.glb`; cinematic `cinematics.md` mục 11 (camera trên cao đi vòng 1/6 đường tròn quanh tâm lưới địch).
Sprite và icon: `design/art/*.svg` dùng thẳng được, không vẽ lại.

## 3. Ràng buộc kỹ thuật (không thương lượng)
- Giữ stack đã có: Vite + TypeScript + three. Không thêm framework game/UI (Phaser, Babylon, React...). Thêm dependency khác chỉ khi hỏi trước.
- `src/core/` thuần TypeScript: cấm import `three`, `document`, `window`. Mọi hàm là hàm thuần, trạng thái bất biến, kết quả chơi tái lập được bằng seed.
- `core/` không biết gì về animation. Nó trả về danh sách `GameEvent`. Lớp hiển thị phát lại event.
- UI 2D dùng DOM/CSS, không vẽ lưới trên canvas. Layout bằng CSS grid, `rem`/`clamp`, không pixel cố định. Input dùng pointer events (chuột và chạm chung một đường).
- Một canvas three.js nằm dưới cùng, DOM nằm trên. Canvas không nhận input trừ màn Hangar.
- Màn hình là một state machine đơn giản (enum + hàm chuyển), xem `screens.md`.
- `strict: true` trong tsconfig. Không `any`.
- Chuỗi hiển thị nằm trong một file `src/ui/strings.ts` (tiếng Việt, có chỗ cho ngôn ngữ khác). Không rải chuỗi trong code.

## 4. Cấu trúc thư mục
```
src/
  core/        rules, ships, attacks, match, ai, rng   (không import three/DOM)
  render3d/    scene, ocean, sky, ships, fx, camera, cinematics
  ui/          screens, grid, hud, strings, tokens
  assets/      models/ textures/ audio/
  main.ts
index.html
tsconfig.json
vite.config.ts
```
Chỉ tạo thư mục khi dùng đến. Không dựng khung rỗng.

## 5. Thứ tự làm (mỗi bước chạy và kiểm tra được trước khi sang bước sau)
1. **core**: `ships.json` loader, board, đặt tàu, 5 hàm đòn đánh, match, cooldown, AI dễ. Kèm test chạy trong terminal (`node`/`tsx`), mô phỏng 1000 ván AI vs AI không lỗi, không kẹt.
2. **UI 2D** bằng khối màu: đặt tàu, trận với AI, chơi trọn một ván. Chưa có 3D.
3. **Nền 3D**: biển, trời đêm, mưa, camera chiến thuật cố định.
4. **Cinematic** theo `animations.md`, dùng model placeholder.
5. Hot-seat, Hangar, Cài đặt.
6. AI vừa/khó.
7. Thay placeholder bằng model thật khi có asset.
8. Online (chưa làm, chỉ đừng cản đường: xem mục 7).

Mỗi bước kết thúc bằng một lệnh chạy được và một ghi chú ngắn nói đã làm gì, chưa làm gì.

## 6. Tiêu chí nghiệm thu theo bước
- **Bước 1**: 1000 ván AI vs AI, seed cố định, kết thúc hết; cùng seed cho cùng kết quả; mỗi đòn đánh có test cho ít nhất: giữa lưới, sát mép, ô đã bắn, trúng và chìm.
- **Bước 2**: không nhắm được ô không hợp lệ; xem trước vùng đòn đánh đúng với `rules.md`; tàu hồi chiêu không chọn được; hết tàu sẵn sàng thì tự bỏ lượt có thông báo.
- **Bước 3**: 60 fps ở chất lượng trung trên máy thường; có 3 mức chất lượng (thấp tắt mưa/sương/phản chiếu).
- **Bước 4**: mỗi cinematic bỏ qua được, tắt được, tốc độ x1/x2 chạy đúng; lưới 2D luôn cập nhật đúng dù cinematic bị bỏ qua.
- **Responsive**: cửa sổ 360 px chiều rộng vẫn chơi được (layout mobile ở `screens.md`), không cuộn ngang.

## 7. Chừa chỗ cho tương lai (không làm bây giờ)
- **Online**: `Player.chooseAction()` bất đồng bộ (`Promise<Action>`). Người chơi từ xa chỉ là một `Player` khác. `Action` và `GameEvent` là JSON thuần.
- **Mobile**: UI không phụ thuộc hover. Mọi thao tác nhắm phải làm được bằng chạm hai bước (chạm chọn, chạm xác nhận).
- **Ngôn ngữ**: chuỗi qua `strings.ts`.

## 8. Không làm
- Không thêm skill rời, vật phẩm, tiền tệ, tài khoản, bảng xếp hạng.
- Không đổi con số trong `ships.json` để "cân bằng" khi chưa hỏi. Ghi nhận xét vào cuối báo cáo.
- Không dùng asset, logo, tên nhân vật của Pacific Rim hay bất kỳ phim nào. Chỉ lấy tông và cảm giác.
- Không tối ưu sớm, không viết lớp trừu tượng cho thứ chỉ có một cài đặt.

## 9. Khi cần hỏi
Hỏi khi: luật trong `rules.md` thiếu hoặc mâu thuẫn; cần dependency mới; asset thật chưa có và placeholder không đủ; cần đổi hợp đồng `core-api.ts`.
