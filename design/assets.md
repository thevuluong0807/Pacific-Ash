# Danh sách asset

Nguyên tắc: làm được với placeholder thì cứ làm, asset thật thay vào sau, không đổi code. Mọi asset tải qua một bảng ánh xạ khóa → đường dẫn duy nhất (`assets/manifest.ts`). Code không hard-code đường dẫn.

## 1. Model 3D (.glb)
> **Xác tàu bị hạ** (chìm một nửa, gãy vỡ nhưng rõ loại tàu): `models/wrecks/wreck_<id>.glb`, 7 model, xem `wreckage.md` mục 3.
> **Mảnh xác tàu nổi** (ô trúng 3D): `models/debris/debris_<id>.glb`, 10 mảnh, xem `wreckage.md`.
> **Tỉ lệ thế giới ×10:** các model đã nhân 10 sẵn (1 ô = 10 đơn vị thế giới), xem `world-scale.md`.
> **Hiện dùng bản khối cơ bản** của 7 tàu: `design/models/ship_<id>.glb` (xem `ships-basic3d.md`), chép vào `src/assets/models/`. Các cột "Tam giác tối đa" LOD0/1/2 và placeholder hộp dưới đây là kế hoạch cũ cho model chi tiết (tạm hoãn); bản hiện tại (khối mượt, nhiều chi tiết) 1 101–11 351 tam giác, một mức duy nhất.

Tỉ lệ: 1 ô lưới = 1 đơn vị thế giới theo chiều dài. Gốc tọa độ ở giữa thân tàu, mũi hướng +Z, đáy sát y=0.

| Khóa | Mô tả | Dài (ô) | Tam giác tối đa | Placeholder |
|---|---|---|---|---|
| `ship_destroyer` | Khu trục hạm, 2 tháp pháo, 2 ống khói, sàn bay. **Chi tiết đầy đủ: `design/ship-destroyer.md`** | 2 | LOD0 150k, LOD1 25k, LOD2 6k | hộp 2x0.5x0.4, màu `placeholderColor` |
| `ship_cruiser` | Tuần dương, 3 tháp pháo nòng đôi. **Chi tiết: `design/ship-cruiser.md`** | 3 | LOD0 200k, LOD1 30k, LOD2 7k | hộp 3x0.6x0.5 |
| `ship_submarine` | Tàu ngầm nổi nửa thân, tháp chỉ huy. **Chi tiết: `design/ship-submarine.md`** | 3 | LOD0 120k, LOD1 20k, LOD2 5k | viên nang nằm ngang |
| `ship_missile` | Tàu tên lửa, hai dãy ô phóng thẳng đứng. **Chi tiết: `design/ship-missile.md`** | 4 | LOD0 250k, LOD1 35k, LOD2 8k | hộp 4x0.6x0.5 + lưới ô nhỏ trên boong |
| `ship_carrier` | Tàu sân bay, boong bay, đảo chỉ huy. **Chi tiết: `design/ship-carrier.md`** | 5 | LOD0 350k, LOD1 50k, LOD2 10k | hộp phẳng 5x0.4x0.9 + khối nhỏ ở bên |
| `ship_raider` | Tàu cắn lén 1×1, thân tàng hình góc cạnh. **Chi tiết: `design/ship-raider.md`** | 1 | LOD0 60k, LOD1 10k, LOD2 3k | hộp 0.9x0.3x0.1, màu tối |
| `ship_escort` | Tàu hộ vệ 2×2, hai thân nối boong, vòm radar lớn. **Chi tiết: `design/ship-escort.md`** | 2 (vuông) | LOD0 220k, LOD1 32k, LOD2 7k | hai hộp 1.85x0.55 nối khối 1.0x1.0 |
| `fx_missile` | Tên lửa | — | 1k | trụ nhỏ |
| `fx_torpedo` | Ngư lôi | — | 1k | trụ nhỏ |
| `fx_shell` | Đạn pháo | — | 300 | vệt sáng (không cần model) |
| `fx_plane` | Máy bay/UAV | — | 5k | tam giác dẹt |
| `fx_bomb` | Bom | — | 500 | quả cầu nhỏ |
| `env_skyline` | Skyline thành phố cảng ven vịnh, nhiều tòa cháy | — | 80k | dải hộp xám đen, vài hộp phát sáng cam |
| `env_cranes` | Cần cẩu, tàu hàng đổ nghiêng | — | 20k | vài hộp |

Mỗi model tàu cần các điểm neo (empty hoặc node tên): `muzzle` (đầu nòng pháo), `launch` (ống phóng/cất cánh), `bow` (mũi), `stern` (đuôi), `deck` (boong). Khu trục hạm có thêm `muzzle_1`, `muzzle_2`, `cell_0/1`, `fire_0/1` (xem `ship-destroyer.md` mục 2.6).

Tàu chìm: không cần model riêng, dùng animation nghiêng và chìm xuống bằng mã.

## 2. Texture và vật liệu
- Thép xước, gỉ nhẹ cho tàu; nhiễu hạt và rỉ sét có thể dùng chung một bộ.
- Normal map nước hoặc shader sóng thủ tục (ưu tiên thủ tục để nhẹ).
- Hạt: lửa, khói, bọt nước, tia lửa, mưa (sprite atlas một ảnh duy nhất `tex_fx_atlas`, 16 ô, xem `env-and-fx.md` mục 11).
- Map: `ui_map_truong_sa`, `ui_map_hai_phong` (thumbnail xem trước, nguồn `art/map_*.svg`), icon `map-*` trong `icons.svg` (xem `maps.md`).
- Môi trường: `tex_env_truong_sa` (HDRI hoàng hôn tối cho map Trường Sa, 1K–2K), `tex_env_night_harbor` (HDRI đêm cảng 1K–2K cho phản chiếu), atlas cửa sổ tòa nhà `tex_city_windows`.
- Bầu trời: gradient tối + mây đen thủ tục, không cần ảnh.
- Kích thước tối đa: texture tàu 2048², atlas hạt 1024².
- Nén: KTX2/Basis hoặc webp nếu có; cảnh báo nếu tổng asset > 40 MB.

## 3. UI
- Biểu tượng loại tàu 5 cái (SVG, nét mảnh, 1 màu): destroyer, cruiser, submarine, missile, carrier.
- Biểu tượng: lửa (trúng), chấm sóng (trượt), X sunk, xoay, bỏ qua, cài đặt, khóa.
- Sơ đồ vùng đánh dạng lưới mini 5 mẫu (rapid, precision, torpedo, cross, line3), vẽ bằng CSS/SVG từ `ships.json`, không dùng ảnh.
- Logo "PACIFIC ASH": chữ thuần (font heading), không cần ảnh.
- Font: Barlow Condensed, Barlow, JetBrains Mono (Google Fonts hoặc tự host). Tự host ưu tiên nếu offline.

## 4. Âm thanh (.ogg + dự phòng .mp3)
Tên khóa → mô tả:
- `sfx_ui_click`, `sfx_ui_confirm`, `sfx_ui_error`
- `sfx_thunder`, `amb_fire_loop`, `amb_sea_dusk` (mới, xem `audio.md`)
- `sfx_cannon_light` (khu trục), `sfx_cannon_heavy` (tuần dương)
- `sfx_missile_launch`, `sfx_missile_fall`
- `sfx_torpedo_launch`, `sfx_torpedo_run` (vòng lặp)
- `sfx_plane_pass`, `sfx_bomb_fall`
- `sfx_explosion_small`, `sfx_explosion_big`, `sfx_water_splash`
- `sfx_ship_sink` (kim loại gãy, nước)
- `sfx_alert` (tàu mình bị chìm)
- `amb_sea_rain` (vòng lặp: mưa, sóng, sấm xa)
- `mus_menu`, `mus_battle` (tối, trống nặng, tiết tấu chậm, căng), `mus_win`, `mus_lose`
Không dùng nhạc phim có bản quyền.

## 5. Quy ước đặt tên và thư mục
```
src/assets/
  models/*.glb
  textures/
  audio/sfx/  audio/music/  audio/amb/
  ui/icons/*.svg
  manifest.ts
```
Tên viết thường, gạch dưới, không dấu.

## 6. Nguồn asset (người thiết kế sẽ quyết)
Chưa chọn. Agent code mặc định dùng placeholder trong bảng trên. Khi có asset thật, thay file cùng khóa trong `manifest.ts`; nếu model khác tỉ lệ hoặc thiếu điểm neo, báo lại thay vì tự chỉnh.
