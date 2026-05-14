import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import vueDevTools from 'vite-plugin-vue-devtools';
import { viteMockServe } from 'vite-plugin-mock';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    vueDevTools(),
    viteMockServe({
      mockPath: 'src/mock',
      enable: true,
    }),
    legacy({
      targets: ['chrome >= 86'],
      modernPolyfills: true,
    }),
  ],
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    host: true,
  },
});
