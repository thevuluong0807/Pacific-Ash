import tokens from '../../design/tokens.json';

/** Ghi design/tokens.json thành CSS variables trên :root (--color-hostile, --font-heading, --space-md...). */
export function applyTokens(root: HTMLElement = document.documentElement) {
  const set = (name: string, value: string | number) => root.style.setProperty(`--${name}`, String(value));
  for (const [k, v] of Object.entries(tokens.color)) set(`color-${k}`, v);
  for (const k of ['heading', 'body', 'mono'] as const) set(`font-${k}`, tokens.font[k]);
  for (const [k, v] of Object.entries(tokens.font.size)) set(`size-${k}`, v);
  for (const [k, v] of Object.entries(tokens.font.tracking)) set(`tracking-${k}`, v);
  for (const [k, v] of Object.entries(tokens.space)) set(`space-${k}`, v);
  for (const [k, v] of Object.entries(tokens.radius)) set(`radius-${k}`, v);
  for (const [k, v] of Object.entries(tokens.border)) set(`border-${k}`, v);
  for (const [k, v] of Object.entries(tokens.motion)) set(`motion-${k}`, typeof v === 'number' ? `${v}ms` : v);
}

export { tokens };
