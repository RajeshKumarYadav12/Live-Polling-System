import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — changes rarely, cache-friendly
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Redux toolkit
          "vendor-redux": ["@reduxjs/toolkit", "react-redux"],
          // Charting library — largest third-party dep
          "vendor-recharts": ["recharts"],
          // Socket.io client
          "vendor-socket": ["socket.io-client"],
          // Toast notifications
          "vendor-toast": ["react-toastify"],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
