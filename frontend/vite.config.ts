import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  cacheDir: "/tmp/vite-shelter-cache",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "https://shelter-connect.onrender.com"
    }
  }
});

