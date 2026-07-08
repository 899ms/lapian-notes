import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { subtitleFinderPlugin } from './subtitle-server-plugin'
import { transcodeServerPlugin } from './transcode-server-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), subtitleFinderPlugin(), transcodeServerPlugin()],
})
