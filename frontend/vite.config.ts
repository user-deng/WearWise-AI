import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // 本地开发：把后端 API / 图片 代理到统一后端（aidress_api :8100）
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:8100', changeOrigin: true },
      '/img': { target: 'http://127.0.0.1:8100', changeOrigin: true },
      '/avatar': { target: 'http://127.0.0.1:8100', changeOrigin: true },
      '/looks': { target: 'http://127.0.0.1:8100', changeOrigin: true },
      '/ootd': { target: 'http://127.0.0.1:8100', changeOrigin: true },
      '/music': { target: 'http://127.0.0.1:8100', changeOrigin: true },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
