import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,   // expose on LAN → mobile access via http://<your-ip>:5173
    allowedHosts: true, // allow public tunnel domains like localtunnel/ngrok
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        secure: false,
        configure: (proxy, _options) => {
          // Suppress all expected network reset errors from mobile disconnects
          const silenceErr = (err: Error) => {
            if (err.message.includes('ECONNABORTED') || err.message.includes('ECONNRESET') || err.message.includes('ECONNREFUSED')) return;
            console.log('[ws proxy]', err.message);
          };
          proxy.on('error', (err) => silenceErr(err));
          proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
            socket.on('error', (err: Error) => silenceErr(err));
          });
        }
      },
    },
  },
})
