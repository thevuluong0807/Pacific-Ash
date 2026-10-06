/**
 * Hệ số chói toàn cục `glare` (design/cinematics.md mục 1 "Quy tắc giảm chói", tokens.json -> glare).
 * Nhân vào cường độ đèn nổ/chớp mõm, bloom, độ sáng cộng của lửa và quầng; mặc định vừa 0.55 (1.0 là bản cũ, quá chói).
 */
export const GLARE = { low: 0.35, mid: 0.55, high: 1 } as const;
export type GlareLevel = keyof typeof GLARE;
let g: number = GLARE.mid;
export const setGlare = (v: number) => { g = v; };
export const glare = () => g;
/** Hệ số độ sáng cho sprite cộng sáng: ít nhạy hơn `glare` để lửa vẫn đọc được (0.64 / 0.75 / 1). */
export const glareK = () => 0.45 + 0.55 * g;
