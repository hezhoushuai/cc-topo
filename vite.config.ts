import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import vueDevTools from 'vite-plugin-vue-devtools';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    vueDevTools(),
    legacy({
      targets: ['chrome >= 49'],
      modernPolyfills: true,
    }),
  ],
  server: {
    port: 5173,
    host: true,
  },
});
