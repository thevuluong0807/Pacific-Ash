/**
 * Chế độ 2 "Hải chiến" (bắn thuyền góc nhìn thứ ba/thứ nhất): dữ liệu tạm cho 3 cỡ tàu và 8 khí tài.
 * Thiết kế chính thức sẽ bổ sung sau, mọi số ở đây là giá trị cân bằng tạm (đơn vị thế giới ≈ mét, giây, radian).
 * Quy ước góc: hướng `θ` có vectơ (sin θ, cos θ) trên mặt phẳng x–z, mũi tàu +Z; góc tăng = quay sang MẠN TRÁI (+X khi mũi +Z).
 * `Slot.x > 0` là mạn trái. Góc tháp `β` đo so với mũi tàu (0 = thẳng mũi, π = thẳng đuôi).
 */
export type HullId = 'small' | 'medium' | 'large';
export type WeaponId = 'heavy' | 'cannon' | 'howitzer' | 'torpedo' | 'missile' | 'rocket' | 'autocannon' | 'mg';
export const HULL_IDS: readonly HullId[] = ['small', 'medium', 'large'];
export const WEAPON_IDS: readonly WeaponId[] = ['heavy', 'cannon', 'howitzer', 'torpedo', 'missile', 'rocket', 'autocannon', 'mg'];

export const GRAVITY = 80; // tạm: nhỏ hơn 9.8 × tỉ lệ để tầm bắn vừa đấu trường
export const ARENA_RADIUS = 1500;
export const MAX_PLAYERS = 6;

export interface SlotSpec {
  /** Cỡ lớn nhất của khí tài gắn được (1 nhẹ, 2 vừa, 3 nặng). */
  size: 1 | 2 | 3;
  x: number; y: number; z: number;
  /** Hướng tâm cung bắn và nửa góc cung (π = quay 360°). */
  center: number; half: number;
  label: string;
}

export interface HullSpec {
  id: HullId; nameVi: string; descVi: string;
  length: number; beam: number; freeboard: number; draft: number; tower: number;
  hp: number;
  /** Hệ số nhận sát thương (giáp: nhỏ hơn 1 = bền hơn). */
  armor: number;
  vmax: number;       // tốc độ tối đa khi chưa gắn gì (đv/s)
  thrust: number;     // gia tốc ở ga đầy (đv/s²)
  maxYaw: number;     // tốc độ quay tối đa (rad/s) khi chạy nhanh
  yawTau: number;     // hằng số thời gian của đà quay (s): lớn = trễ nhiều
  rudderRate: number; // tốc độ bẻ bánh lái (1/s)
  latDrag: number;    // sức cản ngang (1/s): nhỏ = trôi nhiều khi cua
  cam: { dist: number; height: number };
  slots: SlotSpec[];
}

const PI = Math.PI;
export const HULLS: Record<HullId, HullSpec> = {
  small: {
    id: 'small', nameVi: 'Tàu cỡ nhỏ', descVi: 'Nhanh, lái nhạy, mỏng giáp. Ít khí tài nhưng khó bị bắn trúng.',
    length: 90, beam: 20, freeboard: 7, draft: 3, tower: 8, hp: 240, armor: 1,
    vmax: 58, thrust: 10, maxYaw: 0.6, yawTau: 0.7, rudderRate: 2.4, latDrag: 2.6, cam: { dist: 150, height: 55 },
    slots: [
      { size: 2, x: 0, y: 8.5, z: 26, center: 0, half: 2.2, label: 'Mũi' },
      { size: 1, x: 0, y: 8.5, z: -30, center: PI, half: 2.5, label: 'Đuôi' },
      { size: 1, x: 0, y: 16.5, z: -9, center: 0, half: PI, label: 'Đỉnh' },
    ],
  },
  medium: {
    id: 'medium', nameVi: 'Tàu cỡ vừa', descVi: 'Cân bằng giữa tốc độ, giáp và hỏa lực.',
    length: 160, beam: 30, freeboard: 11, draft: 5, tower: 14, hp: 520, armor: 0.85,
    vmax: 42, thrust: 5, maxYaw: 0.28, yawTau: 1.3, rudderRate: 1.5, latDrag: 1.6, cam: { dist: 250, height: 90 },
    slots: [
      { size: 3, x: 0, y: 12.5, z: 52, center: 0, half: 2.6, label: 'Mũi' },
      { size: 2, x: 0, y: 12.5, z: -52, center: PI, half: 2.6, label: 'Đuôi' },
      { size: 2, x: 11, y: 12.5, z: 14, center: PI / 2, half: 1.7, label: 'Mạn trái' },
      { size: 2, x: -11, y: 12.5, z: 14, center: -PI / 2, half: 1.7, label: 'Mạn phải' },
      { size: 1, x: 0, y: 26.5, z: -16, center: 0, half: PI, label: 'Đỉnh' },
    ],
  },
  large: {
    id: 'large', nameVi: 'Tàu cỡ lớn', descVi: 'Chậm, nặng nề nhưng bền nhất và đủ vũ khí nhất.',
    length: 260, beam: 42, freeboard: 16, draft: 8, tower: 24, hp: 1000, armor: 0.7,
    vmax: 31, thrust: 2.6, maxYaw: 0.14, yawTau: 2.4, rudderRate: 0.9, latDrag: 0.95, cam: { dist: 380, height: 140 },
    slots: [
      { size: 3, x: 0, y: 17.5, z: 92, center: 0, half: 2.6, label: 'Mũi 1' },
      { size: 3, x: 0, y: 25, z: 60, center: 0, half: 2.7, label: 'Mũi 2' },
      { size: 2, x: 17, y: 17.5, z: 14, center: PI / 2, half: 1.7, label: 'Mạn trái' },
      { size: 2, x: -17, y: 17.5, z: 14, center: -PI / 2, half: 1.7, label: 'Mạn phải' },
      { size: 2, x: 0, y: 17.5, z: -88, center: PI, half: 2.6, label: 'Đuôi' },
      { size: 1, x: 0, y: 41.5, z: -26, center: 0, half: PI, label: 'Đỉnh 1' },
      { size: 1, x: 0, y: 17.5, z: -62, center: PI, half: PI, label: 'Đỉnh 2' },
    ],
  },
};

export type ProjKind = 'shell' | 'bullet' | 'torpedo' | 'missile' | 'rocket';
export interface WeaponSpec {
  id: WeaponId; nameVi: string; descVi: string;
  size: 1 | 2 | 3; weight: number; kind: ProjKind;
  v: number;          // vận tốc đầu nòng (đv/s)
  gScale: number;     // hệ số trọng lực (tên lửa có cánh nâng nên nhỏ)
  drag: number;       // cản không khí bậc hai (1/đv)
  accel: number;      // tên lửa/rocket: gia tốc đẩy dọc hướng bay (đv/s²) tới `vTop`
  vTop: number;
  homing: number;     // tốc độ bẻ hướng bám mục tiêu (rad/s), 0 = không
  mag: number;        // số phát một băng đạn
  interval: number;   // giây giữa hai phát
  reload: number;     // giây nạp lại sau khi hết băng (cooldown)
  dmg: number; splash: number; splashDmg: number;
  spread: number;     // góc tản đạn (rad)
  yawMax: number; yawAcc: number; // quay ngang: tốc độ tối đa và gia tốc (độ trễ kim loại nặng)
  elMax: number; elAcc: number; elMin: number; elHi: number; // ngẩng: tốc độ, gia tốc, giới hạn dưới/trên (rad)
  fov: number;        // góc nhìn thứ nhất (độ): nòng nặng ngắm xa nên hẹp hơn
  life: number; barrel: number; // thời gian sống đạn và độ dài nòng
  color: number;
}

const d = (deg: number) => (deg * PI) / 180;
export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  heavy: {
    id: 'heavy', nameVi: 'Pháo 406 mm', descVi: 'Pháo hạng nặng. Đạn rất chậm, rơi cong, sát thương và nổ lan lớn. Nạp 7 giây.',
    size: 3, weight: 6, kind: 'shell', v: 360, gScale: 1, drag: 0.00002, accel: 0, vTop: 0, homing: 0,
    mag: 1, interval: 0, reload: 7, dmg: 120, splash: 55, splashDmg: 0.45, spread: 0.006,
    yawMax: d(7), yawAcc: d(14), elMax: d(5), elAcc: d(12), elMin: d(0), elHi: d(50), fov: 26, life: 12, barrel: 22, color: 0xffb36b,
  },
  cannon: {
    id: 'cannon', nameVi: 'Pháo 203 mm', descVi: 'Pháo chủ lực. Đạn nhanh hơn, độ cong vừa. Nạp 3 giây.',
    size: 2, weight: 4, kind: 'shell', v: 470, gScale: 1, drag: 0.00002, accel: 0, vTop: 0, homing: 0,
    mag: 1, interval: 0, reload: 3.2, dmg: 55, splash: 28, splashDmg: 0.4, spread: 0.008,
    yawMax: d(13), yawAcc: d(32), elMax: d(10), elAcc: d(28), elMin: d(-2), elHi: d(42), fov: 32, life: 10, barrel: 16, color: 0xffcf8a,
  },
  howitzer: {
    id: 'howitzer', nameVi: 'Cối 280 mm', descVi: 'Bắn vòng cung gần thẳng đứng, nổ lan rộng. Chỉ ngẩng nòng 35–80°.',
    size: 2, weight: 4, kind: 'shell', v: 300, gScale: 1, drag: 0.00002, accel: 0, vTop: 0, homing: 0,
    mag: 1, interval: 0, reload: 5, dmg: 70, splash: 80, splashDmg: 0.6, spread: 0.012,
    yawMax: d(10), yawAcc: d(24), elMax: d(8), elAcc: d(18), elMin: d(35), elHi: d(80), fov: 34, life: 16, barrel: 8, color: 0xe0a060,
  },
  torpedo: {
    id: 'torpedo', nameVi: 'Ngư lôi', descVi: 'Chạy thẳng sát mặt nước, rất chậm nhưng cực mạnh. Chỉ xoay ngang.',
    size: 2, weight: 3, kind: 'torpedo', v: 80, gScale: 0, drag: 0, accel: 0, vTop: 0, homing: 0,
    mag: 1, interval: 0, reload: 10, dmg: 170, splash: 0, splashDmg: 0, spread: 0.004,
    yawMax: d(20), yawAcc: d(70), elMax: 0, elAcc: 0, elMin: 0, elHi: 0, fov: 45, life: 22, barrel: 6, color: 0x9fd8ff,
  },
  missile: {
    id: 'missile', nameVi: 'Tên lửa chống hạm', descVi: 'Bay thấp, tự bẻ hướng theo mục tiêu gần chỗ ngắm. Nạp 8 giây.',
    size: 2, weight: 3, kind: 'missile', v: 240, gScale: 0.12, drag: 0, accel: 260, vTop: 520, homing: 1.3,
    mag: 1, interval: 0, reload: 8, dmg: 95, splash: 45, splashDmg: 0.5, spread: 0.01,
    yawMax: d(28), yawAcc: d(90), elMax: d(22), elAcc: d(70), elMin: d(2), elHi: d(40), fov: 40, life: 7, barrel: 8, color: 0xff7a4a,
  },
  rocket: {
    id: 'rocket', nameVi: 'Dàn rocket', descVi: 'Bắn loạt 6 quả, tản rộng, nổ lan nhỏ. Nạp 6 giây.',
    size: 1, weight: 2, kind: 'rocket', v: 200, gScale: 0.5, drag: 0.00004, accel: 220, vTop: 420, homing: 0,
    mag: 6, interval: 0.18, reload: 6, dmg: 15, splash: 24, splashDmg: 0.6, spread: 0.035,
    yawMax: d(40), yawAcc: d(160), elMax: d(30), elAcc: d(120), elMin: d(0), elHi: d(55), fov: 42, life: 9, barrel: 6, color: 0xffd24a,
  },
  autocannon: {
    id: 'autocannon', nameVi: 'Pháo tự động 40 mm', descVi: 'Bắn nhanh, đạn thẳng hơn pháo lớn. Băng 12 phát, nạp 4 giây.',
    size: 1, weight: 2, kind: 'bullet', v: 820, gScale: 1, drag: 0.00008, accel: 0, vTop: 0, homing: 0,
    mag: 12, interval: 0.28, reload: 4, dmg: 9, splash: 6, splashDmg: 0.5, spread: 0.012,
    yawMax: d(90), yawAcc: d(360), elMax: d(60), elAcc: d(300), elMin: d(-5), elHi: d(70), fov: 46, life: 4, barrel: 8, color: 0xfff08a,
  },
  mg: {
    id: 'mg', nameVi: 'Súng máy 12,7 mm', descVi: 'Đạn rất nhanh, gần như đường thẳng, sát thương nhỏ. Băng 40 phát, nạp 3,5 giây.',
    size: 1, weight: 1, kind: 'bullet', v: 1250, gScale: 1, drag: 0.0002, accel: 0, vTop: 0, homing: 0,
    mag: 40, interval: 0.07, reload: 3.5, dmg: 2.6, splash: 0, splashDmg: 0, spread: 0.02,
    yawMax: d(150), yawAcc: d(700), elMax: d(110), elAcc: d(600), elMin: d(-8), elHi: d(75), fov: 52, life: 2.5, barrel: 4, color: 0xfff4c0,
  },
};

/** Tốc độ và gia tốc xoay/ngẩng khí tài nhân thêm 25% (chỉnh theo yêu cầu khi đổi sang ngắm bằng chuột). */
export const SLEW_BOOST = 1.25;
for (const w of Object.values(WEAPONS)) { w.yawMax *= SLEW_BOOST; w.yawAcc *= SLEW_BOOST; w.elMax *= SLEW_BOOST; w.elAcc *= SLEW_BOOST; }

/** Mỗi điểm trọng lượng khí tài làm tàu chậm 0.8% (gia tốc và tốc độ tối đa). */
export const WEIGHT_DRAG = 0.008;

/** Thiết kế tàu do người chơi lắp: chọn cỡ thân, gắn khí tài vào từng chỗ (null = bỏ trống). */
export interface ShipDesign { id: string; name: string; hull: HullId; slots: (WeaponId | null)[] }

export const canMount = (hull: HullId, slot: number, w: WeaponId): boolean => {
  const s = HULLS[hull].slots[slot];
  return !!s && WEAPONS[w].size <= s.size;
};

/** Cắt/đệm `slots` đúng số chỗ của thân và bỏ khí tài không lắp vừa. */
export function normalizeDesign(dz: ShipDesign): ShipDesign {
  const hull = HULL_IDS.includes(dz.hull) ? dz.hull : 'medium';
  const slots = HULLS[hull].slots.map((_, i) => {
    const w = dz.slots?.[i] ?? null;
    return w && WEAPON_IDS.includes(w) && canMount(hull, i, w) ? w : null;
  });
  return { id: dz.id, name: (dz.name || 'Tàu').slice(0, 24), hull, slots };
}

export interface DesignStats { hp: number; vmax: number; turn: number; weight: number; speedMul: number; count: number; slotCount: number }
export function designStats(dz: ShipDesign): DesignStats {
  const h = HULLS[dz.hull];
  const weight = dz.slots.reduce((a, w) => a + (w ? WEAPONS[w].weight : 0), 0);
  const speedMul = 1 - WEIGHT_DRAG * weight;
  return { hp: h.hp, vmax: h.vmax * speedMul, turn: h.maxYaw * speedMul, weight, speedMul, count: dz.slots.filter(Boolean).length, slotCount: h.slots.length };
}

/** Ba mẫu dựng sẵn, có thể chơi ngay. */
export const PRESET_DESIGNS: ShipDesign[] = [
  { id: 'pre-small', name: 'Báo biển', hull: 'small', slots: ['cannon', 'mg', 'rocket'] },
  { id: 'pre-medium', name: 'Tuần dương', hull: 'medium', slots: ['heavy', 'torpedo', 'cannon', 'missile', 'autocannon'] },
  { id: 'pre-large', name: 'Pháo đài nổi', hull: 'large', slots: ['heavy', 'heavy', 'cannon', 'cannon', 'howitzer', 'autocannon', 'mg'] },
];
