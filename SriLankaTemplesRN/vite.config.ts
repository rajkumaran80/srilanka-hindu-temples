import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['react-native', 'react-native-maps', '@react-navigation/native', '@react-navigation/native-stack', 'react-native-safe-area-context', 'react-native-screens', 'react-native-modal-selector'],
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.web.js', '.web.tsx'],
  },
  ssr: {
    external: ['react-native', 'react-native-maps', '@react-navigation/native', '@react-navigation/native-stack', 'react-native-safe-area-context', 'react-native-screens', 'react-native-modal-selector'],
  },
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5173,
    host: true,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
    minify: 'terser',
    rollupOptions: {
      external: ['react-native', 'react-native-maps'],
      output: {
        globals: {
          'react-native': 'ReactNative',
          'react-native-maps': 'ReactNativeMaps',
        },
      },
    },
  },
});
