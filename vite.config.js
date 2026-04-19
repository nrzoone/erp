import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    base: '/',
    plugins: [react()],
    server: {
        host: "0.0.0.0",
        port: 3333,
        open: true
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        chunkSizeWarningLimit: 1200,
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom'],
                    'ui-vendor': ['lucide-react', 'recharts'],
                    'firebase-vendor': ['firebase/app', 'firebase/storage']
                }
            }
        }
    }
})
