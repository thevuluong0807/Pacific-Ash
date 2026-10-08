# Model 3D của các tàu (khối mượt, nhiều chi tiết, bám theo sprite 2D)

**Quyết định (người thiết kế):** bỏ qua thiết kế 3D realistic cực chi tiết; dùng **model dựng bằng hình khối** nhưng **bề mặt mượt và nhiều chi tiết** (bản 2), bố cục bám theo sprite 2D (thứ tự và vị trí tháp pháo, VLS, cầu, ống khói, sàn bay, xuồng cam...). Bản 1 (khối thô, 264–1 676 tam giác) đã thay thế; mã cũ còn ở `models/_src/make_ships_basic_v1.mjs`. Phần "2. Model 3D" chi tiết trong các file `ship-*.md` (cực chi tiết, vật liệu PBR, 150k–350k tam giác) **tạm hoãn**, giữ làm tham chiếu cho sau này. Từ giờ model dùng trong game là bản khối cơ bản ở file này. Sprite 2D, luật, điểm neo, cinematic không đổi.

| File | Vai trò |
|---|---|
| `models/ship_<id>.glb` | 8 model dùng được ngay: `destroyer`, `cruiser`, `submarine`, `missile`, `carrier`, `raider`, `escort`, `dreadnought` |
| `models/preview_sheet.png` | Ảnh xem trước 7 model đầu (`dreadnought` xem `ship-dreadnought.md`) (dựng bằng three.js từ chính các file glb) |
| `models/_src/glb.mjs` | Bộ dựng glb tối giản (hộp, trụ, cầu, đùn, hình thang khối) |
| `models/_src/make_ships.mjs` | Định nghĩa 8 tàu. Sửa ở đây rồi chạy lại để ra glb mới |
| `models/_src/preview.html` | Trang xem trước (chạy qua máy chủ tĩnh ở gốc dự án) |

## 1. Quy ước chung (mọi model)
- Đơn vị: **1 ô lưới = 10 đơn vị thế giới; model đã nhân 10 sẵn** (khu trục hạm dài 19, tàu sân bay 49; xem `world-scale.md`). Gốc ở giữa thân, trên mặt nước (y = 0). **Mũi +Z**, lên +Y. Riêng **tàu hộ vệ (escort) mũi +X** (footprint vuông, không xoay). Mọi kích thước và tọa độ neo ghi theo **ô** trong các tài liệu `ship-*.md` và bảng dưới: nhân 10 để ra tọa độ trong file glb.
- Kích thước đúng như `ship-*.md` (dài, rộng, mớn nước, mạn khô, vị trí từng bộ phận), **nhân 10**.
- **Thân tàu loft mượt**: nhiều mặt cắt dọc thân, đáy tròn (elip), sườn loe lên mạn, mạn khô tăng về mũi (sheer), mũi nhọn cong, đuôi vát. Hai phần: **dưới mớn nước** (tối `#2C353D`) và **trên mớn nước** (bạc `#C4CDD6`), đường gập là đường nước. Boong có hai lớp (viền boong tối và mặt boong sáng lùi vào, giống sprite 2D).
- **Thượng tầng**: khối hình thang vát **mép trên** (bevel), pháp tuyến mượt theo góc gập, không còn góc vuông cắt phẳng.
- **Trụ, cầu, vòm radar**: nhiều phân đoạn, pháp tuyến mượt (tháp pháo, ống khói, vòm radar, thân tàu ngầm tròn theo mặt tròn xoay).
- **Chi tiết**: lan can có trụ và hai thanh ngang, bích buộc dây, cửa sổ kính theo hàng ở mặt trước và hai bên cầu, tấm radar mảng pha, cột ăng-ten có thanh ngang, đĩa radar quay, ăng-ten roi, CIWS sáu nòng, nòng pháo có miệng giảm giật, lưới nắp VLS có viền hazard, xuồng cam bầu, bè cứu sinh, nắp hầm, đèn hành trình đỏ/xanh/trắng (phát sáng nhẹ), sàn bay có vòng và chữ H, tời neo.
- **Vật liệu** (PBR đơn giản, không cần HDRI để đọc được): thân bạc (metal 0.3, rough 0.5), mặt boong xám `#8A949C`, thượng tầng `#B9C4CE`, thép tối `#3A444E`, cam `#E08A2E` (xuồng, đầu giàn mồi), kính `#0C1E2A`, vòm radar trắng `#E9EEF2`, vạch trắng `#F4F7FA`, hazard vàng `#E8B02E`. Tàu ngầm thân `#4A5866`, tháp `#9AA8B5`; tàu sân bay boong bay `#6F7A84`; tàu cắn lén thân tối `#3C4A56`. Tất cả `doubleSided`.
- Tint theo bên (ta/địch): đổi màu vật liệu `hull`, hoặc đè vật liệu.

## 2. Cây node (khớp `ship-*.md`)
Mỗi model là một cây: gốc là `ship_<id>`, con trực tiếp là thân, thượng tầng, các bộ phận động, các điểm neo (node rỗng) và các nhóm hư hại rỗng (`dmg_cell0..N`, trống, agent code gắn hiệu ứng lên).
- **Bộ phận động**: `turret_*` (xoay quanh Y) chứa `barrel_*` (xoay quanh X, có `muzzle_*`); `radar_rotor` (xoay quanh Y); `periscope` (tịnh tiến Y); `launcher_N` + `launcher_N_pitch` (tàu tên lửa, xoay quanh X); `plane_N` (tàu sân bay, ẩn hiện được); `jbd_0/1`; `torpedo_flap_N`; `propulsor_spin`; `decoy_N` (hộ vệ); `ciws_N` (cây `ciws_N` yaw → `ciws_N_pitch` → `ciws_N_spin` quay cụm 6 nòng; neo `ciws_N_muzzle` ở đầu nòng, có trên mọi tàu có CIWS).
- **Điểm neo chuẩn** (node rỗng, con trực tiếp của `ship_<id>`): `muzzle`, `launch`, `bow`, `stern`, `deck`, `cell_N`, `fire_N`; riêng từng tàu thêm neo như trong file của nó (`muzzle_1/2`, `cam_under`, `vls_slot_N`, `plane_slot_N`, `cat_start_N`, `cat_end_N`, `takeoff_end`, `cam_close`, `intercept_cam`, `cam_gun`).
- Tên node là hợp đồng với code; **không đổi tên** khi chưa hỏi.

## 3. Từng tàu: các khối chính
Số tam giác là của bản hiện tại (1 101–11 351).

| Tàu | Tam giác | Các khối chính và chi tiết |
|---|---|---|
| **Khu trục hạm** `destroyer` (dài 1.9, rộng 0.38) | 8 121 | thân 2 khối đùn; cầu 2 tầng hình thang khối + kính; nhà boong giữa; nhà chứa; 2 ống khói; cột + tấm radar; 2 tháp pháo (đế trụ + khối vát + nòng trụ) ở z +0.66 và −0.40; ô VLS; 2 CIWS (trụ + cầu); 2 xuồng cam; sàn bay (vòng trắng + chữ H) |
| **Tuần dương** `cruiser` (2.9, 0.40) | 9 677 | cầu 2 tầng cao; nhà boong; **ống khói to**; nhà chứa; **3 tháp pháo nòng đôi** (tháp 2 trên bệ cao) ở z +1.0, +0.74, −0.42; 2 CIWS; sàn bay lớn |
| **Tàu ngầm** `submarine` (2.9, ⌀0.22) | 5 100 | thân tròn xoay mượt (mũi tròn, đuôi thon) + các vòng gạch cách âm; tháp chỉ huy bo mép và gờ ôm; 2 tiềm vọng có đầu kính (`periscope`); cột radar, ống thở; cánh lái nước hai bên; cánh đuôi chữ thập; vòng chân vịt có lõi; 4 nắp ống phóng và 4 miệng ống; sống boong có thanh ngang; nắp hầm |
| **Tàu tên lửa** `missile` (3.9, 0.42) | 11 351 | **2 dãy ô phóng 8×4** (khối + lưới nắp nhỏ + viền hazard); 5 bệ `launcher_N` xoay được; cầu có 4 tấm radar kính; nhà boong, 2 ống khói; pháo nhỏ; 2 CIWS; sàn bay |
| **Tàu sân bay** `carrier` (4.9, thân 0.62, boong 0.80) | 5 871 | thân; **boong bay** là khối đùn rộng hơn thân, mũi nhọn; vạch tim và đường hạ cánh chéo; **đảo chỉ huy** mạn phải (−X) + cột radar; 2 thang máy; 2 ống phóng + 2 `jbd`; **4 máy bay đậu** (`plane_0..3`, mỗi cái có thân, cánh, đuôi); 4 CIWS; xe kéo cam |
| **Tàu cắn lén** `raider` (0.9, 0.34) | 1 101 | thân góc cạnh tối; thượng tầng hình thang khối + kính; 1 tháp pháo nhỏ; cột radar nhỏ; 2 hộp cam ở đuôi |
| **Tàu hộ vệ** `escort` (1.9 × 1.9, mũi +X) | 8 942 | **2 thân song song** (đùn) nối boong trung tâm; cầu hình thang khối + kính; **vòm radar lớn** (cầu dẹt); cột ăng-ten; 4 CIWS; 4 giàn mồi nhử (hộp tối + đầu cam, mỗi giàn có `decoy_N_launch`) |
| **Siêu chiến hạm** `dreadnought` (3.94, 0.54) | 15 357 | **5 tháp pháo ba nòng** (3 mũi, 2 lái; tháp 2 và 4 trên bệ cao); tháp chỉ huy nhiều tầng kiểu chùa có dải kính, 4 tấm radar, cột radar cao; 2 ống khói to vạch cam; 8 pháo phụ nòng đôi; 4 CIWS; dải giáp hai mạn; sàn trực thăng; chi tiết `ship-dreadnought.md` |

## 4. Chất lượng và dung lượng
- Một mức duy nhất, thay cho LOD0/1/2: 1 101–11 351 tam giác, 100–910 KB mỗi file glb. Đủ nhẹ cho 10 tàu cùng lúc trên màn; nếu cần giảm, bỏ các mesh `rails`, `bollards`, `antennas`, `*_hatches` (không ảnh hưởng node điều khiển).
- Khi có model chi tiết sau này, thay file cùng tên và giữ nguyên cây node; không cần đổi mã.
- Thiếu so với bản cực chi tiết (chấp nhận): không texture, không vân kim loại xước, không decal số hiệu, không đinh tán/đường hàn, không `dmg_*` có hình học (chỉ node rỗng).

## 5. Cách dùng trong code
- Chép `design/models/ship_<id>.glb` vào `src/assets/models/` và khai báo trong `manifest.ts` với khóa `ship_<id>` như `assets.md`. Nạp bằng `GLTFLoader`, **scale = 1** (model đã nhân 10).
- Hướng: model mũi +Z; khi đặt lên lưới, xoay quanh Y theo hướng tàu (`env-and-fx.md` mục 1). **Escort mũi +X và không xoay.**
- Có thể thay model hộp đặt tạm trong `shipModels.ts` bằng các file này mà không đổi API.

## 6. Dựng lại / chỉnh
```
node design/models/_src/make_ships.mjs "$PWD/design/models"
```
Tỉ lệ thế giới nằm ở hằng `WORLD_SCALE = 10` đầu file `make_ships.mjs`; đổi tại đó rồi chạy lại nếu cần tỉ lệ khác.
Cần Node. Xem trước: chạy một máy chủ tĩnh ở gốc dự án (ví dụ `python3 -m http.server 8765`) rồi mở `http://localhost:8765/design/models/_src/preview.html` (cần `node_modules/three` đã cài; tham số `?yaw=..&pitch=..` đổi góc nhìn).
