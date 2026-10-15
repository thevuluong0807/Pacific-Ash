/** Ổ cắm tối thiểu server cần: `ws` (Node) khớp sẵn, Durable Object bọc lại ở `worker.ts`. */
export interface Sock { readonly readyState: number; send(data: string): void; terminate(): void; ping?(): void }
export const OPEN = 1;
