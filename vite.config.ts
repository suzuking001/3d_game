import { defineConfig } from 'vite';
export default defineConfig({
  // Relative URLs work on /, /repository-name/, and custom domains.
  base: './',
  build: { reportCompressedSize: false },
});
