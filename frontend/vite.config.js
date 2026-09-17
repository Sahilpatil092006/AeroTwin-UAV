import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'static-asset-404-guard',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const parsedUrl = req.url ? req.url.split('?')[0] : '';
          if (
            parsedUrl.startsWith('/assets/') ||
            parsedUrl.endsWith('.glb') ||
            parsedUrl.endsWith('.gltf') ||
            parsedUrl.endsWith('.bin')
          ) {
            const publicFilePath = path.join(__dirname, 'public', parsedUrl.replace(/^\//, ''));
            if (!fs.existsSync(publicFilePath)) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'text/plain');
              res.end('404 Not Found: Static asset does not exist');
              return;
            }
          }
          next();
        });
      },
    },
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
});
