import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Served from https://gefenrose.github.io/WhatsappAlbumMaker/ via GitHub
  // Pages, so asset URLs need this subpath prefix instead of the domain root.
  base: '/WhatsappAlbumMaker/',
})
