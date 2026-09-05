import { defineConfig } from 'vite';

// D20/D36: relative base so the build works from local preview and GitHub Pages alike.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
  },
});
