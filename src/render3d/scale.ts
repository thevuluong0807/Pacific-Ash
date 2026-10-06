/**
 * Tỉ lệ thế giới 3D (design/world-scale.md): 1 ô lưới = 10 đơn vị thế giới. Model glb đã nhân 10 sẵn (khu trục hạm dài 19, tàu sân bay 49);
 * khi nạp, đỉnh và vị trí node được co về đơn vị "ô" (×0.1) rồi rig phóng `CELL` lần, nên kích thước ra đúng bằng file glb và toàn bộ mã
 * cinematic (ghi theo ô) giữ nguyên.
 */
export const CELL = 100; // người dùng yêu cầu ×10 nữa so với `world-scale.md` (10): tàu to gấp 10 lần so với sóng; sóng/biên độ giữ nguyên
/** Thân tàu không kéo cao thêm: model mới đã ngang cỡ tàu nền (bản cũ kéo 1.5 vì model dẹt). */
export const HEIGHT = 1;
/** So với kích thước ô cũ (4.5). */
export const UNIT = CELL / 4.5;
/**
 * Phông nền ở chế độ trận phóng hệ số này; menu không phóng. `world-scale.md` mục 3 ứng với ≈ UNIT × 1.5 (3.3), nhưng người dùng yêu cầu
 * phông sát lưới, chỉ chừa một khoảng thoáng nhỏ: UNIT × 0.8 (≈ 1.8) đặt skyline/cần cẩu ngay sau mép lưới địch (z ≈ −125…−130), xác tàu và đảo
 * ngay ngoài |x| = 50. Tăng hằng này để đẩy phông ra xa.
 */
export const WORLD_SCALE = UNIT * 0.8;
/** Vùng biển lặng dưới hai lưới (chế độ trận): sóng còn 30%, ngoài vùng chơi tăng dần về 100% sau 80 ĐV. Giữ thân tàu không bị sóng tràn che. */
export const CALM_ZONE = { hx: 62, hz: 135, min: 1, ramp: 80 }; // min 1 = tắt vùng lặng (đã thử 0.25–0.3, hoàn lại)
/**
 * Độ nổi của tàu trong lưới, lấy theo tàu phông nền (`warship.ts`: mạn khô 3.7 / dài 50 = 7.4% chiều dài, bám sóng không kẹp góc).
 * Model glb có mạn khô chỉ ≈4% chiều dài nên sóng 3.5 ĐV tràn lên boong; nâng thân tới `FREEBOARD_RATIO` × chiều dài (nhỏ hơn 7.4% một chút
 * để không trông lơ lửng, bản nâng cố định 3 ĐV đã bị chê "bay bay giả"). Tàu ngầm không nâng. Số đo từ `design/models/*.glb` (ĐV thế giới ở CELL = 10).
 */
export const FREEBOARD_RATIO = 0.06;
const HULL: Record<string, [length: number, freeboard: number]> = {
  destroyer: [19, 0.75], cruiser: [29, 0.85], missile: [39, 0.8], carrier: [49, 1.3], raider: [9, 0.6], escort: [19, 0.75],
};
/** Phần nâng thân tàu (đơn vị thế giới). */
export const shipLift = (id: string) => { const h = HULL[id]; return h ? Math.max(0, FREEBOARD_RATIO * h[0] - h[1]) * (CELL / 10) : 0; };
/** Phóng bước sóng, biên độ, tốc độ sóng và chia mật độ sương (`world-scale.md` mục 2.3: biên độ 3.5…0.6, sương 0.0011). */
export const WAVE_UNIT = 10;
