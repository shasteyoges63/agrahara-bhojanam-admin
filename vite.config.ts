import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import http from 'node:http';
import path from 'node:path';
import type { Connect } from 'vite';
import { defineConfig, loadEnv } from 'vite';

function createSilentApiProxy(apiPort: number): Connect.NextHandleFunction {
  return (req, res, next) => {
    if (!req.url?.startsWith('/api')) {
      next();
      return;
    }

    const proxyReq = http.request(
      {
        hostname: '127.0.0.1',
        port: apiPort,
        path: req.url,
        method: req.method,
        headers: {
          ...req.headers,
          host: `127.0.0.1:${apiPort}`,
        },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      },
    );

    proxyReq.on('error', () => {
      if (res.writableEnded) return;
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'API server unavailable. Start backend separately.' }));
    });

    req.pipe(proxyReq, { end: true });
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, '');
  const apiPort = Number(env.VITE_API_PORT || 4000);
  const devPort = Number(env.VITE_PORT || 3001);
  const previewPort = Number(env.VITE_PREVIEW_PORT || 5002);

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'silent-api-proxy',
        configureServer(server) {
          server.middlewares.use(createSilentApiProxy(apiPort));
        },
        configurePreviewServer(server) {
          server.middlewares.use(createSilentApiProxy(apiPort));
        },
      },
    ],
    build: {
      target: 'esnext',
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'esnext',
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      host: 'localhost',
      port: devPort,
      strictPort: true,
    },
    preview: {
      host: 'localhost',
      port: previewPort,
      strictPort: true,
    },
  };
});
