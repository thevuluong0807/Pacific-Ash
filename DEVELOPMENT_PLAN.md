# DEVELOPMENT PLAN — Pacific Ash

> Kế hoạch phát triển. Tổng hợp từ `GDD.md`, `AGENT_GUIDE.md`, `design/*` (đã đọc toàn bộ ngày 2026-10-05).
> Quan hệ các file:
> - `GDD.md` + `design/*` = **CÁI GÌ** (thiết kế, do người thiết kế sở hữu, agent không tự sửa).
> - `DEVELOPMENT_PLAN.md` (file này) = **LÀM THẾ NÀO, THEO THỨ TỰ NÀO**.
> - `PROGRESS.md` = **ĐÃ LÀM ĐẾN ĐÂU** (tracking, nhật ký quyết định, snapshot file thiết kế).
> - `CLAUDE.md` = nhắc bắt buộc đọc 3 nhóm trên trước khi code.

| Field | Value |
|---|---|
| Version | 0.1.0 |
| Last Updated | 2026-10-05 |
| Stack | Vite 8 + TypeScript (strict) + three. Không thêm framework. |

---

## 1. QUY TRÌNH BẮT BUỘC TRƯỚC KHI CODE

Áp dụng cho mọi task, kể cả sửa một dòng. Người thiết kế sửa `design/` và `GDD.md` bất cứ lúc nào, nên **không tin bộ nhớ, luôn kiểm tra lại**.

### 1.1 Trước khi code (checklist)
1. **Kiểm tra file thiết kế có đổi không.** Chạy:
   ```
   ls -l --time-style=+%Y-%m-%dT%H:%M GDD.md AGENT_GUIDE.md design/*
   ```
   So với bảng "Snapshot file thiết kế" trong `PROGRESS.md`. File nào mới hơn hoặc mới xuất hiện: đọc lại **toàn bộ file đó** và đối chiếu với plan này.
2. Đọc `PROGRESS.md`: phase hiện tại, task đang làm, câu hỏi mở, quyết định đã chốt.
3. Đọc phần phase hiện tại trong file này (Mục 5) và tiêu chí nghiệm thu.
4. Đọc file thiết kế liên quan task, theo thứ tự `AGENT_GUIDE.md` mục 2: `rules.md` → `ships.json` → `core-api.ts` → `screens.md` → `tokens.json` → `animations.md` → `assets.md`. Làm hình ảnh thì đọc thêm `GDD.md` mục 2.
5. Nếu thiết kế đổi so với plan: cập nhật plan + ghi vào Mục 8 (Changelog plan) **trước** khi code.
6. Nếu thiết kế thiếu, mâu thuẫn, hoặc cần dependency mới: **dừng và hỏi** (xem Mục 6). Không tự đoán.

### 1.2 Sau khi code (checklist)
1. Chạy lệnh nghiệm thu của task/phase, ghi kết quả thật (không ghi "chắc chạy").
2. Cập nhật `PROGRESS.md`: trạng thái task, ghi chú "đã làm / chưa làm", file đã đổi.
3. Nếu có nhận xét cân bằng game: ghi vào `PROGRESS.md` mục "Nhận xét cân bằng". **Không** sửa số trong `ships.json`.
4. Nếu đổi hợp đồng `core-api.ts` hoặc luật: không tự làm, hỏi người thiết kế.

### 1.3 Thứ bậc khi hai nguồn mâu thuẫn
1. `design/rules.md` (luật, nguồn sự thật cho `core/`)
2. `design/ships.json`, `design/core-api.ts`
3. `design/screens.md`, `design/tokens.json`, `design/animations.md`, `design/assets.md`
4. `AGENT_GUIDE.md` (ràng buộc kỹ thuật, thứ tự làm)
5. `GDD.md` (tổng quan, bản nháp, thấp nhất)
6. Code hiện có (không có thẩm quyền, sẽ bị sửa theo thiết kế)

Mâu thuẫn trong cùng một tầng: hỏi người thiết kế.

---

## 2. TÓM TẮT GAME (rút từ thiết kế)

- Battleship theo lượt, lưới 10x10, mỗi bên đúng 5 tàu (khu trục 2, tuần dương 3, tàu ngầm 3, tàu tên lửa 4, sân bay 5).
- Mỗi lượt đúng một `FireAction { shipId, target }`. Mỗi tàu một đòn riêng + hồi chiêu theo lượt của chính bên đó. Không có skill rời, vật phẩm, tiền tệ, tài khoản.
- Chế độ: PvE (AI dễ/vừa/khó), hot-seat; online để sau, chỉ chừa chỗ (`Player.chooseAction()` bất đồng bộ, `Action`/`GameEvent` là JSON).
- Gameplay chính 2D (DOM/CSS). 3D (three.js, một canvas dưới cùng) chỉ làm nền biển đêm mưa, cinematic bắn/trúng/chìm, màn Hangar.
- Hình ảnh: đêm, mưa lớn, thép xám xanh, ánh cam của lửa, xanh lạnh của radar. Tham chiếu cảm giác trận Hồng Kông, **không** dùng asset/tên của phim.
- Web desktop trước, layout sẵn cho mobile (360 px, không hover, chạm hai bước).

---

## 3. HIỆN TRẠNG CODE SO VỚI THIẾT KẾ

Code hiện có là bản demo màn hình chính, viết **trước** khi có thiết kế. Phần lớn lệch hướng.

| Hạng mục | Code hiện tại | Thiết kế | Xử lý |
|---|---|---|---|
| Cảnh nền | Hoàng hôn, núi lửa, tro lửa | Đêm, mưa lớn, skyline thành phố cháy | Bỏ `Volcano.ts`, `Embers.ts`. Viết lại sky/ocean theo đêm (P3) |
| Menu | 3 nút: Chơi / Khí tài / Cài đặt | `screens.md` mục 2: Chơi / Cài đặt (GDD còn có "Thoát") | **Câu hỏi mở Q1** |
| Cấu trúc | `core/` chứa `Game.ts` (three), `world/`, `scenes/`, `modes/` | `core/` thuần TS; `render3d/`, `ui/` | Tổ chức lại ở P0 |
| `modes/index.ts` | Registry chế độ, 1 mục | ModeSelect là màn hình, không cần registry | Xóa (một cài đặt, trừu tượng thừa) |
| Font | Chakra Petch (`@fontsource`) | Barlow Condensed / Barlow / JetBrains Mono | **Câu hỏi mở Q2**; gỡ Chakra Petch |
| Màu/spacing | Viết thẳng trong `style.css` | Đọc từ `tokens.json`, map sang CSS variables | Làm ở P0/P2 |
| Hậu kỳ | Bloom UnrealBloom mạnh | "Không bloom quá tay" | Giảm hoặc tắt bloom ở P3 |
| `Warship.ts` | Tàu thủ tục chi tiết, 1 loại | 5 loại, đúng dài theo ô, có điểm neo; placeholder là hộp | Giữ làm tham chiếu, không dùng làm model chính |
| `Ocean.ts` | Shader Gerstner + `waveHeight` CPU | Biển tối, sóng nặng chậm, bọt xám | **Tái dùng**, đổi màu/sóng ở P3 |
| `core/` luật | Chưa có | `core-api.ts` + `rules.md` | Làm ở P1 |
| `strings.ts`, `manifest.ts`, test | Chưa có | Bắt buộc | P0/P1/P3 |

Không có git trong thư mục dự án. Đề xuất `git init` ở P0 (hỏi trước, xem Q6).

---

## 4. KIẾN TRÚC ĐÍCH

```
src/
  core/        TS thuần. Cấm import three, document, window.
    rng.ts  specs.ts  board.ts  attacks.ts  match.ts  ai/  player.ts
  render3d/    engine (renderer + composer), ocean, sky, rain, skyline, ships, fx, camera, cinematics, cellToWorld
  ui/          screens (state machine), grid, hud, strings, tokens, eventPlayer, settings
  assets/      manifest.ts, models/, textures/, audio/
  main.ts
design/        (người thiết kế sở hữu, chỉ đọc)
```
Chỉ tạo thư mục khi dùng đến.

### 4.1 Luồng dữ liệu
```
Player.chooseAction() ──FireAction──▶ core.applyAction() ──▶ { state, events[] }
                                                                   │
                                          ui.EventPlayer (hàng đợi, phát lần lượt)
                                           ├─ render3d.cinematics (nếu bật)
                                           └─ ui.grid.onCellResolved(cell) → marker 2D
```
- `core` cập nhật state ngay, trả event. UI **không** đọc state mới cho đến khi phát xong event tương ứng (`rules.md` mục 7, `animations.md` mục 8).
- Bỏ qua cinematic = `finishNow()`: chạy hết event, cập nhật lưới một lần, hủy hiệu ứng thừa.

### 4.2 Screen state machine
`Boot → Menu → ModeSelect → Hangar → Placement → Battle ⇄ Settings(overlay) → Result → (Placement | Menu)`; hot-seat chèn `PassDevice`. Một enum + một hàm chuyển, theo `screens.md` mục 1.

### 4.3 Chất lượng đồ họa
`tokens.json → quality` (low/medium/high): mưa, sương, phản chiếu, `particleScale`, `pixelRatioMax`. Mọi hiệu ứng 3D đọc từ đây.

---

## 5. ROADMAP THEO PHASE

Quy ước ID: `P<phase>-<số>`. Trạng thái nằm ở `PROGRESS.md`. Mỗi phase kết thúc bằng **một lệnh chạy được** và **một ghi chú ngắn** (đã làm / chưa làm). Không sang phase sau khi phase trước chưa qua nghiệm thu. Thứ tự này theo `AGENT_GUIDE.md` mục 5.

### P0 — Dọn nền, khớp cấu trúc thiết kế
Mục tiêu: repo sạch, đúng cấu trúc, chạy được, chưa thêm tính năng.
- P0-01 Xóa code ngoài thiết kế: `world/Volcano.ts`, `world/Embers.ts`, `modes/`, dependency `@fontsource/chakra-petch`.
- P0-02 Chuyển hạ tầng three: `core/Game.ts` → `render3d/engine.ts`; `world/Ocean.ts` → `render3d/ocean.ts`; sky tách `render3d/sky.ts`. `core/` còn rỗng chờ P1.
- P0-03 `ui/strings.ts` (tiếng Việt) và chuyển chuỗi hiện có vào.
- P0-04 `ui/tokens.ts`: nạp `design/tokens.json`, ghi CSS variables vào `:root`; `style.css` chỉ dùng biến.
- P0-05 tsconfig: bật `resolveJsonModule`; giữ `strict`, không `any`.
- P0-06 Menu tạm giữ chạy được trong lúc chuyển (nền cũ chấp nhận, thay ở P3).
- **Nghiệm thu**: `npm run build` sạch; menu vẫn hiện; `grep -r "from 'three'" src/core` rỗng.

### P1 — `core/` (luật, đòn đánh, match, AI dễ) + test
Nguồn: `rules.md`, `ships.json`, `core-api.ts`. Không đổi chữ ký trong `core-api.ts`.
- P1-01 `rng.ts` (`mulberry32`), `specs.ts` (`loadSpecs` đọc `ships.json`, không hard-code số).
- P1-02 `board.ts`: `randomPlacement(seed)`, `isValidPlacement` (thẳng hàng, trong lưới, không chồng, được phép chạm cạnh).
- P1-03 `attacks.ts`: 5 hàm đòn (`rapid`, `precision`, `torpedo`, `cross`, `line3`) + `previewCells`, theo thứ tự ô trong `rules.md` mục 4.
- P1-04 `match.ts`: `newMatch`, `isValidAction`, `readyShips`, `applyAction`, `skipTurn`; hồi chiêu (mục 3), chìm, lộ loại tàu (tuần dương trúng), thắng, thứ tự event (mục 7). Trả state mới, không đổi state cũ.
- P1-05 `viewOfEnemy`: không lộ ô tàu chưa trúng.
- P1-06 `player.ts` (`Player`, `chooseAction` trả `Promise`) + AI dễ.
- P1-07 Test chạy bằng terminal. Bắt buộc: toàn bộ ví dụ `rules.md` mục 9; mỗi đòn có test **giữa lưới, sát mép, ô đã bắn, trúng và chìm**; đúng chu kỳ hồi chiêu; `TurnSkipped`.
- P1-08 Mô phỏng 1000 ván AI vs AI, seed cố định: mọi ván kết thúc, không kẹt, cùng seed cùng kết quả. Kiểm tra `core/` không import `three`/`document`/`window`.
- **Nghiệm thu** (`AGENT_GUIDE.md` mục 6, bước 1): `npm test` xanh, gồm mô phỏng 1000 ván.
- **Phụ thuộc**: cần chạy TS trong terminal. Node 20 không chạy TS trực tiếp. Xem **Q3**.

### P2 — UI 2D bằng khối màu (chưa có 3D)
Nguồn: `screens.md`, `tokens.json`. DOM/CSS grid, `rem`/`clamp`, pointer events, không hover bắt buộc.
- P2-01 Screen state machine (Menu, ModeSelect, Placement, Battle, Result, Settings; Hangar/PassDevice để P5).
- P2-02 Menu, ModeSelect (PvE + độ khó; hot-seat khóa tạm đến P5; Online khóa "Sắp có").
- P2-03 Placement: kéo thả + chạm-chạm, xoay (nút, phím R), xếp ngẫu nhiên, Xác nhận chỉ bật khi đủ 5 tàu hợp lệ.
- P2-04 Battle: 3 cột desktop (≥1200), 2 cột tablet, dọc mobile (<768). Danh sách tàu với trạng thái sẵn sàng/hồi chiêu/chìm. Lưới địch + lưới mình (thu nhỏ/tab).
- P2-05 Nhắm theo từng loại đòn (rapid 2 ô có số 1,2; precision; torpedo chọn mép; cross; line3 + xoay), vùng xem trước từ `previewCells`, BẮN hai bước, Esc hủy.
- P2-06 `EventPlayer` bản đơn giản: phát event, cập nhật marker theo `CellResolved` (`markerPopMs`), nhật ký lượt, AI nghĩ 700–1500 ms.
- P2-07 Marker `miss` / `hit` / `sunk` khác **hình dạng**, không chỉ khác màu.
- P2-08 Result (thống kê) + chơi lại; Settings (âm lượng, chất lượng, tốc độ animation, rung màn hình) lưu `localStorage` bọc try/catch.
- P2-09 Trợ năng: bàn phím đầy đủ, focus nhìn thấy, tương phản ≥ 4.5:1, `prefers-reduced-motion`.
- **Nghiệm thu** (bước 2 + responsive): không nhắm được ô không hợp lệ; xem trước đúng `rules.md`; tàu hồi chiêu không chọn được; hết tàu sẵn sàng thì tự bỏ lượt có thông báo; chơi trọn một ván với AI; 360 px chơi được, không cuộn ngang.

### P3 — Nền 3D (biển đêm, mưa, camera chiến thuật)
Nguồn: `animations.md` mục 1–2, 10; `tokens.json → quality`.
- P3-01 `assets/manifest.ts` (khóa → đường dẫn, code không hard-code đường dẫn).
- P3-02 Biển tối từ shader Gerstner hiện có (đổi màu, sóng lớn chậm, bọt xám), trời đêm + mây đen thủ tục.
- P3-03 Mưa xiên, sương thấp, sấm chớp 100–150 ms. Tất cả theo `quality`.
- P3-04 Skyline thành phố cháy + cần cẩu/tàu hàng đổ (placeholder hộp xám, vài hộp phát sáng cam), khói đen nghiêng theo gió.
- P3-05 `cellToWorld(owner, cell)` duy nhất; hai vùng biển đối diện; 1 ô = 1 đơn vị; tàu placeholder đúng kích thước, bồng bềnh ±1–2°.
- P3-06 Camera chiến thuật cố định (thấy cả hai vùng biển); camera menu thấp sát mặt nước + một bóng tàu lớn.
- P3-07 Ba mức chất lượng; canvas nằm dưới, DOM nằm trên, canvas không nhận input (trừ Hangar).
- P3-08 Giảm bloom (không quá tay).
- **Nghiệm thu** (bước 3): 60 fps ở mức trung trên máy thường; mức thấp tắt mưa/sương/phản chiếu. Cần máy thật để đo (headless chỉ kiểm tra hình).

### P4 — Cinematic
Nguồn: `animations.md` (timeline từng đòn).
- P4-01 `EventPlayer` đầy đủ + `finishNow()`; cinematic chỉ nhận event + tọa độ ô, không đọc state `core`.
- P4-02 Kết quả ô dùng chung: trượt (cột nước), trúng (cầu lửa, lửa cháy đến hết ván trên ô đó), chìm (1800 ms, nhãn "Đã đánh chìm").
- P4-03 Năm cinematic: `rapid` 2200, `precision` 2400, `torpedo` 3000, `cross` 3400, `line3` 3600 ms (x1; x2 chia đôi).
- P4-04 Camera rig: tactical ↔ cinematic, rung camera (tắt theo cài đặt và `prefers-reduced-motion`).
- P4-05 Kết thúc ván: slow-mo 0.4x ~1 s, kéo camera rộng, sang Result.
- P4-06 Bỏ qua (150 ms, tiếng nổ ngắn), tắt cinematic (chỉ pop marker), tốc độ x1/x2.
- P4-07 Ngân sách: ~2000 hạt tối đa ở mức cao × `particleScale`; tối đa một đèn động mạnh.
- **Nghiệm thu** (bước 4): mỗi cinematic bỏ qua được, tắt được, x1/x2 đúng; lưới 2D luôn đúng dù bỏ qua.

### P5 — Hot-seat, Hangar, Cài đặt hoàn chỉnh
- P5-01 PassDevice: che toàn lưới; hiện sau Placement P1 và sau mỗi lượt mỗi bên.
- P5-02 Hangar: xoay 3D tàu, thông số, sơ đồ vùng đánh 5x5 vẽ bằng CSS/SVG từ `ships.json`, nút "Xem thử đòn đánh" (phát cinematic trên nền trống). Màn duy nhất canvas nhận input.
- P5-03 Settings hoàn chỉnh, nối vào âm thanh/chất lượng/tốc độ thật.
- P5-04 Mở khóa hot-seat trong ModeSelect.

### P6 — AI vừa / khó
- P6-01 Vừa: săn quanh ô `hit` chưa chìm; ưu tiên tàu vùng lớn khi chưa có `hit`.
- P6-02 Khó: xác suất trúng kỳ vọng theo mọi cách đặt hợp lệ của các loại tàu địch còn sống; hòa thì ưu tiên tàu hồi chiêu ngắn hơn. Chỉ dùng thông tin góc nhìn người bắn. Xem **Q5** về chi phí tính.
- P6-03 Test: AI khó thắng AI dễ vượt trội trên 1000 ván; AI không bao giờ đọc lưới thật.

### P7 — Asset thật và âm thanh
- P7-01 Thay placeholder bằng model glb theo `assets.md` (tên khóa trong `manifest.ts`, điểm neo `muzzle/launch/bow/stern/deck`). Model sai tỉ lệ hoặc thiếu điểm neo: báo lại, không tự chỉnh.
- P7-02 Âm thanh theo danh sách `assets.md` mục 4; mỗi cú nổ ba tầng (trầm, kim loại, nước).
- **Bị chặn bởi**: nguồn asset (người thiết kế quyết định, chưa chọn).

### P8 — Online (CHƯA LÀM)
Chỉ giữ cho khỏi cản đường: `Player.chooseAction()` async; `FireAction`/`GameEvent` là JSON thuần; server (sau này) giữ luật. Không viết code online trong phạm vi hiện tại.

---

## 6. CÂU HỎI MỞ / ĐÃ CHỐT

Q1–Q7 đã được người thiết kế chốt ngày 2026-10-05 (xem cột Quyết định trong `PROGRESS.md`). Giữ bảng dưới làm lịch sử; thêm câu hỏi mới ở cuối.

| ID | Câu hỏi | Đề xuất |
|---|---|---|
| Q1 | Menu có 2 nút (Chơi, Cài đặt theo `screens.md`) hay 3 nút (thêm **Khí tài** như yêu cầu ban đầu)? GDD còn ghi "Thoát". | 3 nút: Chơi / Khí tài (mở thẳng Hangar) / Cài đặt; bỏ "Thoát" (web không thoát được). Cập nhật `screens.md` nếu chốt. |
| Q2 | Font Barlow Condensed/Barlow/JetBrains Mono: thêm `@fontsource/*` tự host (dependency mới)? | Có, tự host (`assets.md` ưu tiên offline). |
| Q3 | Chạy test TS trong terminal cần công cụ (Node 20 không chạy TS trực tiếp). Thêm devDependency `tsx`? | Có, chỉ devDependency. |
| Q4 | Âm thanh: chưa có file. P2–P6 để im lặng với stub `play(key)`, hay sinh âm tạm bằng WebAudio? | Stub im lặng; nối âm thật ở P7. |
| Q5 | AI khó "mọi cách đặt hợp lệ" bùng nổ tổ hợp. Chấp nhận xấp xỉ: mật độ vị trí từng loại tàu còn sống (bỏ qua ràng buộc không chồng giữa các tàu)? | Có, ghi rõ giới hạn bằng comment. |
| Q6 | `git init` trong dự án này (hiện không có git)? | Có, ở P0. |
| Q7 | Nguồn model tàu thật (tự dựng / mua / miễn phí) và thời điểm có. | Chưa chốt, không chặn P1–P6. |

Ghi nhận mâu thuẫn nhỏ đã tự xử theo thứ bậc (không cần hỏi): GDD nói "không chạm cạnh chéo là tùy chọn" còn `rules.md` cho phép chạm cạnh. Theo `rules.md`: được phép sát nhau.

---

## 7. CHIẾN LƯỢC KIỂM THỬ

| Lớp | Cách | Khi nào |
|---|---|---|
| `core/` | Test thuần trong terminal, seed cố định, mô phỏng 1000 ván | P1, chạy lại mỗi khi đụng `core/` |
| Ranh giới | Script kiểm tra `core/` không import `three`/`document`/`window` | P1, chạy cùng test |
| UI | Chơi tay theo checklist nghiệm thu từng phase; chụp ảnh headless để kiểm bố cục (360, 768, 1200+) | P2 trở đi |
| 3D | Chụp ảnh headless kiểm hình; **đo fps trên máy thật** | P3, P4 |
| Hồi quy | Lỗi gặp phải thì thêm test tái hiện trước khi sửa | Mọi lúc |

---

## 8. CHANGELOG PLAN

- 2026-10-05 v0.6.0: chạy lại thiết kế mới: map áp dụng cho cả gameplay (`maps.md`), logo mới và chuyển động mở màn (`logo.md`), Menu ba nút ở giữa (`screens.md`). Kiến trúc map: `MapWorld`.
- 2026-10-05 v0.7.0: 7 tàu (cắn lén 1×1, hộ vệ 2×2) và kỹ năng nội tại (`rules.md` mục 10, `core-api.ts`); logo tối giản; map Trường Sa mới (quần đảo gần, 6 tàu giao tranh, tên lửa); cinematic tách cảnh bắn (dừng khi đạn rời nòng, tên lửa ~70%) và cảnh kết quả riêng, blend mượt. Chưa nối `design/models/*.glb`.
- 2026-10-05 v0.8.0: nối 7 model glb (`design/models`), xem trận 2D/3D (quỹ đạo 360°, ô nhắm, đường đạn), chế độ "hỏng hóc khí tài" (không thuộc `rules.md`, Q15).
- 2026-10-05 v0.9.0: tàu bị bắn hạ theo `sinking.md` (2D sprite xám + X, 3D 3600 ms từng loại tàu), lưới và tàu to hơn (`CELL = 2.4`), lưới luôn hiện và sáng hơn 125%.
- 2026-10-05 v0.5.0: P4 (cinematic) hoàn tất phần chính theo `cinematics.md`; thêm Q12 (tàu địch giả khi bắn). Còn thiếu: âm thanh, model thật, các hiệu ứng phụ trong `PROGRESS.md`.
- 2026-10-05 v0.4.0: hoàn tất P2b (giao diện theo `ui-art.md`), thêm hệ map (`maps.md`: Trường Sa, Hải Phòng), mục Cài đặt mới (Cinematic ngắn, Chọn map). `cinematics.md` và `cinematic_plan.svg` (shot list 5 đòn, thời lượng mới 2800/3200/4600/3800/5000 ms, tối đa 5 s) quyết định nội dung P4: đọc lại trước khi làm.
- 2026-10-05 v0.3.0: Flow mới: Menu → Chọn chế độ → Đặt tàu (chọn tàu mang theo: Tất cả tàu / Theo profile), Khí tài = quản lý profile. Hạm đội 1–5 tàu khác loại mỗi bên (lệch `rules.md`, xem Q8–Q10 trong `PROGRESS.md`). P3 làm theo `design/env-and-fx.md`. Thêm P2b (giao diện theo `ui-art.md`) sau P4.
- 2026-10-05 v0.2.0: theo yêu cầu người dùng, làm đủ gameplay bằng hình khối cơ bản trước (P2, P5 trừ 3D, P6). P3, P4, phần 3D của P5-02, P7 làm sau. Cập nhật theo `design/ship-destroyer.md` và `design/art/*` (sprite 2D khu trục dùng ngay, model 3D chờ file glb).
- 2026-10-05 v0.1.2: P1 hoàn tất. Ghi 7 diễn giải luật vào `PROGRESS.md`; chờ người thiết kế xác nhận.
- 2026-10-05 v0.1.1: chốt Q1–Q7. Menu 3 nút; Barlow + `tsx` được thêm; AI khó dùng xấp xỉ; model tàu đến từ file thiết kế bổ sung. P0 hoàn tất.
- 2026-10-05 v0.1.0: tạo plan từ GDD v0.1 + `AGENT_GUIDE.md` + `design/*`. Ghi nhận code demo cũ lệch thiết kế; thêm Phase 0 dọn nền.
