# Luật chơi chính xác (nguồn sự thật cho core/)

Tọa độ: `(x, y)`, `x` cột 0..9 trái sang phải, `y` hàng 0..9 trên xuống dưới. Nhãn hiển thị: cột A..J, hàng 1..10.

## 1. Chuẩn bị
- Có 8 loại tàu (`roster` trong `ships.json`). Mỗi bên có đúng `fleetSize` (5) tàu, mỗi loại tối đa một chiếc. Đội hình mặc định là `fleet` (5 tàu cổ điển); người chơi có thể tự chọn 5 trong 8 ở Khí tài/profile. Ở PvE, đội hình AI là bản sao đội hình của người chơi (đơn giản, công bằng).
- Đặt tàu theo `shape`: `line` thẳng hàng ngang hoặc dọc; `square` (tàu hộ vệ) là khối 2×2 không xoay, ô gốc là góc trên-trái, chiếm `(x,y) (x+1,y) (x,y+1) (x+1,y+1)`. Mọi tàu nằm trọn trong lưới, không chồng nhau. Được phép sát nhau, kể cả chạm cạnh.
- Có hàm xếp ngẫu nhiên theo seed.
- Bên đi trước: PvE ngẫu nhiên theo seed; hot-seat và online: bên 1 (online sau).

## 2. Lượt
Một lượt gồm đúng một hành động `FireAction`: `{ shipId, target }`. `target` phụ thuộc loại đòn (mục 4).

Điều kiện hợp lệ: tàu của bên đang đi, còn sống, **có đòn chủ động (`attack` khác `none`)**, `cooldown == 0`, `target` hợp lệ theo loại đòn. Tàu chỉ có kỹ năng nội tại (tàu cắn lén, tàu hộ vệ) không bao giờ là tàu sẵn sàng và không chọn được. Thứ tự đầy đủ của một lượt: xem mục 10.4.

Nếu bên đang đi không có tàu nào sẵn sàng: lượt tự động bỏ (`TurnSkipped`), vẫn chạy bước kết lượt (mục 3), sang lượt đối thủ.

## 3. Hồi chiêu
- Sau khi bắn, tàu vừa bắn đặt `cooldown = cooldownDefault`.
- Cuối lượt, mọi tàu còn sống của bên vừa đi, trừ tàu vừa bắn, giảm `cooldown` đi 1 (tối thiểu 0).
- Hệ quả: tàu hồi chiêu N nghỉ đúng N lượt của bên nó, lượt thứ N+1 bắn lại được. N = 0 bắn mỗi lượt.
- Tàu chìm: `cooldown` không còn ý nghĩa, không chọn được nữa.

## 4. Đòn đánh
Mỗi đòn trả về danh sách ô bị đánh có thứ tự (phục vụ animation). Ô ngoài lưới bị bỏ qua. Ô đã có kết quả (trượt/trúng) từ trước vẫn được xử lý lại nhưng không đổi trạng thái, và không phát event mới cho ô đó.

### 4.1 `rapid` — Khu trục hạm
- `target`: 2 ô phân biệt `[c1, c2]`, mỗi ô trong lưới địch và **chưa bị bắn**.
- Nếu địch còn ít hơn 2 ô chưa bắn: cho phép chỉ 1 ô (trường hợp cực hiếm, gần cuối ván).
- Xử lý lần lượt c1 rồi c2. Nếu c1 làm chìm tàu, c2 vẫn bắn bình thường.

### 4.2 `precision` — Tuần dương
- `target`: 1 ô chưa bị bắn.
- Nếu **trúng** tàu địch (dù chưa chìm): lộ loại tàu của tàu đó (`revealedShipIds` của người xem). Ô trúng hiển thị biểu tượng loại tàu.

### 4.3 `torpedo` — Tàu ngầm
- `target`: `{ axis: 'row' | 'col', index: 0..9, from: 'start' | 'end' }`.
  - `row`, `from='start'`: đi từ `x=0` sang `x=9` ở hàng `index`. `from='end'`: từ `x=9` sang `x=0`.
  - `col`: tương tự theo `y`.
- Ngư lôi đi từng ô theo thứ tự:
  - Ô trống chưa bắn: đánh dấu **trượt**, đi tiếp.
  - Ô đã trượt từ trước: đi qua.
  - Ô là đoạn tàu **đã trúng** từ trước: đi qua (tàu đã hỏng đoạn đó, ngư lôi chui qua).
  - Ô là đoạn tàu **chưa trúng**: đánh dấu **trúng**, dừng.
- Hết đường mà chưa trúng gì: dừng, mọi ô đã đi qua là trượt.
- Lưu ý có chủ ý: đường đi tiết lộ các ô trống. Đó là cái giá và cái lợi của đòn này.

### 4.4 `cross` — Tàu tên lửa
- `target`: tâm `(x, y)` **trong lưới**, tâm chưa cần là ô chưa bắn.
- Vùng: tâm và 4 ô kề (lên, xuống, trái, phải). Thứ tự: tâm, lên, phải, xuống, trái.
- Ô ngoài lưới bị bỏ.

### 4.5 `line3` — Tàu sân bay
- `target`: `{ center: (x,y) trong lưới, orientation: 'h' | 'v' }`.
- Vùng: **4 ô** liền nhau theo hướng (rải thảm); `center` là ô thứ hai của dải. `h`: `x-1, x, x+1, x+2`; `v`: `y-1, y, y+1, y+2`. Ô ngoài lưới bị bỏ. (Id đòn vẫn là `line3` để không đổi mã; tên hiển thị là "Không kích rải thảm".)
- Thứ tự: theo chiều tăng của trục (animation máy bay bay từ trái sang phải hoặc từ trên xuống dưới).

### 4.6 `barrage` — Siêu chiến hạm
- Tàu 1×4 (`line`, 4 ô), hồi chiêu 3. **Không có `target`**: người chơi chỉ chọn tàu rồi bấm BẮN (`FireTarget = { kind: 'barrage' }`).
- Core chọn **`shots` = 5 ô khác nhau, ngẫu nhiên đều** (RNG của trận) trong các ô lưới địch **chưa có kết quả** (`shots == none`; ô `blocked` vẫn được chọn). Ô đã trượt hoặc đã trúng không bị chọn lại. Nếu còn ít hơn 5 ô chưa bắn thì đánh hết các ô đó.
- Thứ tự phân giải là thứ tự rút ngẫu nhiên (ô thứ i do tháp pháo i bắn, cinematic dùng đúng thứ tự này). Mỗi ô phân giải như đòn 1 ô: trượt, trúng, chìm. **Không lộ loại tàu khi trúng** (chỉ lộ khi chìm, như khu trục hạm).
- `previewCells` trả mảng rỗng (người chơi không biết trước ô nào). UI chỉ hiện chữ "5 ô ngẫu nhiên" và nháy mờ cả lưới địch.
- Tàu hộ vệ địch vẫn chặn được: `k = ceil(0.3 × 5) = 2` ô bị triệt tiêu, 3 ô còn lại phân giải (mục 10.2). Việc chọn 5 ô diễn ra **trước** khi hộ vệ triệt tiêu.
- Chìm là mất đòn như mọi tàu khác.

## 5. Kết quả ô và chìm
- Mỗi ô địch có trạng thái từ góc nhìn người bắn: `unknown`, `miss`, `hit`, `sunk`, và cờ phụ `blocked` (ô từng bị hộ vệ triệt tiêu, vẫn chưa bắn; mất cờ ngay khi ô có kết quả, mục 10.2).
- Một tàu **chìm** khi mọi ô của nó đã trúng (tàu 1×1 chìm sau 1 phát, tàu hộ vệ 2×2 sau 4 ô). Khi chìm: mọi ô của tàu đó chuyển `sunk`, lộ loại tàu, phát `ShipSunk`.
- Người bị bắn thấy đầy đủ lưới của mình (tàu, ô trúng, ô trượt).
- Người bắn không bao giờ thấy ô tàu địch chưa trúng, trừ khi đã chìm.

## 6. Kết thúc
- Thắng ngay khi mọi tàu của một bên chìm. Kiểm tra sau mỗi đòn, trước khi đổi lượt.
- Không có hòa. Không có giới hạn số lượt (AI có cơ chế thoát nếu kẹt, xem mục 8).

## 7. Event do core phát ra (thứ tự)
Một hành động sinh một chuỗi event theo thứ tự thật sự xảy ra:
1. `ShotFired { shipId, attack, cells[], source }` — cells là danh sách ô đã tính trước khi phân giải, theo thứ tự; `source` là `'action'` hoặc `'passive'` (tàu cắn lén).
1b. Nếu có hộ vệ chặn: `PassiveTriggered { owner, shipId, kind: 'guard' }` rồi `ShotNullified { owner, shipId, cells[] }` (các ô bị triệt tiêu).
2. Với mỗi ô còn lại: `CellResolved { cell, result: 'miss' | 'hit' }`.
3. `ShipRevealed { shipId }` nếu tuần dương trúng.
4. `ShipSunk { shipId }` nếu có.
5. `TurnSkipped` nếu không có tàu sẵn sàng.
6. `MatchEnded { winner }` nếu xong.
7. `TurnChanged { player }`.

Trạng thái trong `core/` đã cập nhật xong khi trả event. UI không được đọc trạng thái "mới" cho tới khi phát lại xong event tương ứng (xem `animations.md` mục "Đồng bộ").

## 8. AI
Mọi AI chỉ được dùng thông tin hợp lệ (góc nhìn người bắn), không đọc lưới địch thật.

- **Dễ**: chọn ngẫu nhiên một tàu sẵn sàng, nhắm ô hợp lệ ngẫu nhiên (siêu chiến hạm không cần nhắm).
- **Vừa**: như dễ, nhưng sau khi có ô `hit` chưa chìm thì nhắm ô kề; ưu tiên tàu cho vùng lớn khi chưa có `hit`.
- **Khó**: với mỗi cặp (tàu sẵn sàng, mục tiêu) tính xác suất trúng kỳ vọng dựa trên mọi cách đặt hợp lệ của các loại tàu địch còn sống; chọn cặp có kỳ vọng lớn nhất (siêu chiến hạm: kỳ vọng = 5 × xác suất trung bình một ô chưa bắn có tàu; AI dùng khi chưa có ô `hit` dở dang); ngang nhau thì ưu tiên tàu hồi chiêu ngắn hơn để giữ tàu mạnh cho lúc cần.
- Tàu nội tại: AI không "chọn" chúng; AI **không biết** vị trí tàu cắn lén hay hộ vệ nếu chưa chìm. Biết loại tàu địch (đội hình sao chép) nên ở mức Khó, phân bố xác suất tính cả khối 2×2 và ô 1×1.
- Thoát kẹt: nếu không còn ô hợp lệ nào, AI bỏ lượt.
- AI nghĩ ít nhất 700 ms và tối đa 1500 ms (chỉ để UI có nhịp), không chặn render.

## 9. Ví dụ kiểm thử bắt buộc
- Hộ vệ, đòn 1 ô (tuần dương): ô bị triệt tiêu hoàn toàn, không có `CellResolved`, có `ShotNullified` với 1 ô.
- Hộ vệ, tên lửa chùm 5 ô: đúng 2 ô bị triệt tiêu (30% × 5 = 1.5, làm tròn lên); 3 ô còn lại được phân giải.
- Hộ vệ kích hoạt ở đòn thứ 1, nghỉ ở đòn thứ 2, kích hoạt lại ở đòn thứ 3 của địch.
- Tàu cắn lén bắn ở đầu trận (trước lượt 1 của cả hai bên), nghỉ lượt 1, bắn lại ở lượt 2 của bên nó; tàu chìm thì ngừng.
- Bắn ngẫu nhiên của tàu cắn lén chỉ chọn ô chưa có kết quả; không bị hộ vệ chặn; không lộ loại tàu khi trúng (chỉ lộ khi chìm).
- Tàu hộ vệ 2×2 chìm sau đủ 4 ô trúng; tàu cắn lén 1×1 chìm sau 1 ô trúng.
- Tên lửa nhắm `(0,0)`: chỉ 3 ô trong lưới `(0,0), (1,0), (0,1)`.
- Sân bay `h` tại `(9,5)`: chỉ `(8,5), (9,5)`.
- Sân bay `h` tại `(4,5)`: đủ 4 ô `(3,5), (4,5), (5,5), (6,5)`; `v` tại `(5,0)`: chỉ `(5,0), (5,1), (5,2)`.
- Ngư lôi `row 3 from start` với tàu địch ở `(4,3)`: ô `(0..3,3)` trượt, `(4,3)` trúng.
- Ngư lôi đi qua đoạn tàu đã trúng, trúng đoạn tiếp theo cùng hàng.
- Hồi chiêu 2: bắn ở lượt 1, không chọn được ở lượt 2 và 3, chọn được ở lượt 4 (tính theo lượt của chính bên đó).
- Khu trục hạm, c1 trùng c2: từ chối.
- Siêu chiến hạm: đúng 5 ô khác nhau, đều chưa bắn; cùng seed cho cùng 5 ô; còn 3 ô chưa bắn thì chỉ đánh 3 ô; đánh xong tàu vào hồi chiêu 3; không lộ loại tàu khi trúng.
- Siêu chiến hạm đánh lưới có hộ vệ (đang kích hoạt): đúng 2 trong 5 ô bị triệt tiêu, 3 ô còn lại phân giải.
- Tuần dương trúng tàu địch chưa chìm: loại tàu lộ.

## 10. Kỹ năng nội tại (passive): tàu cắn lén và tàu hộ vệ

Hai tàu mới **không có đòn chủ động**. Kỹ năng tự kích hoạt, không cần chọn. Chu kỳ `period = 2` nghĩa là "kích hoạt, rồi nghỉ 1 lần, rồi kích hoạt lại" (cách một lượt một lần). Đổi `period` trong `ships.json` thành 1 nếu muốn "mỗi lượt" (không cần sửa mã).

### 10.1 Tàu cắn lén (`raider`, 1×1, `sneak`)
- **Thời điểm**: (a) **đầu trận**, trước lượt 1 của cả hai bên (bên đi trước xử lý trước); (b) ở **đầu lượt của chủ tàu** (trước khi chủ chọn hành động), cứ cách một lượt: sau lần kích hoạt đầu trận nghỉ lượt 1, bắn ở lượt 2, 4, 6…
- Bộ đếm: mỗi tàu có `rest`. Đầu trận kích hoạt và đặt `rest = 1`. Mỗi đầu lượt của chủ: nếu `rest > 0` thì `rest -= 1` và không bắn; ngược lại bắn và đặt `rest = 1`.
- **Hiệu ứng**: bắn 1 ô **ngẫu nhiên** (đều, theo RNG của trận) trong các ô lưới địch **chưa có kết quả** (`shots == none`). Không còn ô nào thì bỏ qua.
- Phân giải như đòn 1 ô: trượt / trúng / chìm (có thể làm chìm tàu, thắng trận). Trúng **không** lộ loại tàu, chỉ lộ khi chìm.
- **Không bị hộ vệ chặn** (hộ vệ chỉ chặn đòn chủ động, mục 10.2).
- Event: `PassiveTriggered { owner, shipId, kind: 'sneak' }`, `ShotFired { attack: 'sneak', cells: [ô], source: 'passive' }`, rồi `CellResolved`, `ShipSunk`, `MatchEnded` nếu có. Bên bị bắn và bên bắn đều biết có "phục kích" nhưng bên bị bắn không biết tàu cắn lén ở đâu.
- Chìm là ngừng hẳn.

### 10.2 Tàu hộ vệ (`escort`, 2×2, `guard`)
- **Thời điểm**: khi **địch thực hiện một đòn chủ động** (`FireAction`) lên lưới của chủ hộ vệ, cứ cách một đòn một lần: đòn thứ 1 bị giảm, đòn thứ 2 không, đòn thứ 3 bị giảm… Bộ đếm `rest`: ban đầu 0; khi có đòn tới, nếu `rest == 0` thì kích hoạt và đặt `rest = 1`; nếu `rest > 0` thì `rest -= 1` và không kích hoạt. Chỉ tính khi hộ vệ còn sống.
- **Hiệu ứng**: gọi `N` là số ô trong vùng đòn nằm trong lưới (danh sách ô theo mục 4). Triệt tiêu `k = ceil(0.3 × N)` ô, chọn **ngẫu nhiên đều** trong danh sách đó (nếu `k ≥ N` thì mất hết). Ô bị triệt tiêu **không được phân giải**: không đổi trạng thái, không trúng, không trượt, không `CellResolved`.
  - 1 ô (tuần dương): triệt tiêu hoàn toàn. 5 ô ngẫu nhiên (siêu chiến hạm): mất 2 ô, giống tên lửa chùm.
  - 2 ô (khu trục hạm, hai ô): mất 1 ô. 4 ô (không kích rải thảm): mất 2 ô (ceil 1.2). 5 ô (tên lửa chùm): mất 2 ô.
  - Ngư lôi: `N` = số ô ngư lôi sẽ đi qua (từ mép vào tới ô dừng hoặc hết đường); tính đường đi và ô dừng như bình thường rồi triệt tiêu `k` ô ngẫu nhiên trong đó. Nếu ô dừng (ô trúng) bị triệt tiêu thì **không trúng**. Đường đi không đổi.
- **Cờ `blocked`**: các ô bị triệt tiêu đánh dấu `blocked` trên lưới địch của bên bắn, để biết "ở đó có chuyện" (và biết có tàu hộ vệ). Cờ mất khi ô sau này được bắn. Ô `blocked` vẫn chọn bắn được bình thường.
- Event: sau `ShotFired`, phát `PassiveTriggered { owner, shipId, kind: 'guard' }` rồi `ShotNullified { owner, shipId, cells[] }`; các ô còn lại phân giải như thường. Nếu `ShotNullified` chiếm hết vùng đòn thì không có `CellResolved`.
- Chìm là ngừng hẳn. Hộ vệ chỉ chặn đòn chủ động của địch, **không chặn** bắn ngẫu nhiên của tàu cắn lén.
- Một đội chỉ có một tàu hộ vệ (mỗi loại tối đa một chiếc), nên không có chuyện hai hộ vệ chồng hiệu ứng.

### 10.3 Tương tác giữa hai tàu
- Tàu cắn lén của A bắn khi hộ vệ của B còn sống: không bị chặn.
- Đòn chủ động của A lên B khi B có hộ vệ: bị giảm theo 10.2, kể cả khi đòn đó làm lộ tuần dương (đòn 1 ô bị triệt tiêu thì không lộ).
- Cả hai tàu mới có thể bị bắn trúng, chìm, và dĩ nhiên khi chìm là mất kỹ năng.

### 10.4 Thứ tự đầy đủ
1. **Đầu trận**: tàu cắn lén của bên đi trước, rồi của bên đi sau (nếu còn sống). Kiểm tra thắng sau mỗi phát.
2. **Mỗi lượt của bên X**: (a) tàu cắn lén của X theo bộ đếm (10.1), kiểm tra thắng; (b) X chọn và thực hiện hành động chủ động; trong lúc phân giải, hộ vệ của bên kia có thể triệt tiêu ô (10.2); (c) kiểm tra thắng; (d) kết lượt: giảm hồi chiêu (mục 3), `TurnChanged`.
3. Nếu X không có tàu sẵn sàng (chỉ còn tàu nội tại hoặc đều hồi chiêu): `TurnSkipped`, nhưng bước (a) vẫn chạy.
4. Mọi lựa chọn ngẫu nhiên dùng RNG của trận (cùng seed cho cùng kết quả).
