import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// 127.0.0.1, not localhost: on Windows "localhost" tries IPv6 (::1) first, and
// another local project listening on [::1]:4000 would swallow the requests.
export default defineConfig({ plugins: [react(), tailwindcss()], server: { proxy: { '/api': 'http://127.0.0.1:4000', '/health': 'http://127.0.0.1:4000' } } });
