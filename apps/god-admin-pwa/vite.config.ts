import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  root: __dirname,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'QuickBlink Platform God Admin',
        short_name: 'Platform God',
        description: 'Multi-Store Platform SaaS Management Console',
        theme_color: '#090d16',
        background_color: '#090d16',
        display: 'standalone',
      },
    }),
  ],
  resolve: {
    alias: {
      '@quickcommerce/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@quickcommerce/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3003,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
