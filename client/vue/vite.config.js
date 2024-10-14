import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const fullReloadAlways = {
  name: 'full-reload',
  handleHotUpdate({ server }) {
    server.ws.send({ type: 'full-reload' });
    return [];
  },
};
// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: 'es2022',
  },
  plugins: [vue(), fullReloadAlways],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
