import { defineConfig, type Plugin } from 'vite';

/** Để mở thẳng dist/index.html bằng file:// (không cần server): script thường thay vì module, bỏ crossorigin. */
const fileProtocol = (): Plugin => ({
  name: 'file-protocol',
  enforce: 'post',
  transformIndexHtml: (html) =>
    html.replace(/<script type="module" crossorigin/g, '<script defer').replace(/ crossorigin/g, ''),
});

export default defineConfig({
  base: './',
  assetsInclude: ['**/*.glb'],
  plugins: [fileProtocol()],
  build: { rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } } },
});
