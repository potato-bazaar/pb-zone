// vite.config.ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "file:///C:/Users/admin/Desktop/pb-zone/admin/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/admin/Desktop/pb-zone/admin/node_modules/@vitejs/plugin-react/dist/index.js";
var __vite_injected_original_import_meta_url = "file:///C:/Users/admin/Desktop/pb-zone/admin/vite.config.ts";
var adminDir = path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var repoRoot = path.resolve(adminDir, "..");
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, "");
  const apiBase = (env.QUIZ_API_BASE_URL || env.NEXT_PUBLIC_QUIZ_API_BASE_URL || "https://pbzone-api.potatobazaar.com").replace(/\/$/, "");
  return {
    plugins: [react()],
    appType: "spa",
    base: "/admin/",
    define: {
      "import.meta.env.VITE_QUIZ_API_BASE_URL": JSON.stringify(apiBase)
    },
    build: {
      outDir: "../public/admin",
      emptyOutDir: true
    },
    server: {
      port: 5173,
      strictPort: true,
      open: false,
      host: true,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:3000",
          changeOrigin: true
        }
      },
      hmr: {
        protocol: "ws",
        host: "localhost",
        port: 5173,
        clientPort: 5173
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxhZG1pblxcXFxEZXNrdG9wXFxcXHBiLXpvbmVcXFxcYWRtaW5cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGFkbWluXFxcXERlc2t0b3BcXFxccGItem9uZVxcXFxhZG1pblxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvYWRtaW4vRGVza3RvcC9wYi16b25lL2FkbWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJztcclxuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ25vZGU6dXJsJztcclxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcblxyXG5jb25zdCBhZG1pbkRpciA9IHBhdGguZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpO1xyXG5jb25zdCByZXBvUm9vdCA9IHBhdGgucmVzb2x2ZShhZG1pbkRpciwgJy4uJyk7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XHJcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCByZXBvUm9vdCwgJycpO1xyXG4gIGNvbnN0IGFwaUJhc2UgPSAoXHJcbiAgICBlbnYuUVVJWl9BUElfQkFTRV9VUkwgfHxcclxuICAgIGVudi5ORVhUX1BVQkxJQ19RVUlaX0FQSV9CQVNFX1VSTCB8fFxyXG4gICAgJ2h0dHBzOi8vcGJ6b25lLWFwaS5wb3RhdG9iYXphYXIuY29tJ1xyXG4gICkucmVwbGFjZSgvXFwvJC8sICcnKTtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHBsdWdpbnM6IFtyZWFjdCgpXSxcclxuICAgIGFwcFR5cGU6ICdzcGEnLFxyXG4gICAgYmFzZTogJy9hZG1pbi8nLFxyXG4gICAgZGVmaW5lOiB7XHJcbiAgICAgIFwiaW1wb3J0Lm1ldGEuZW52LlZJVEVfUVVJWl9BUElfQkFTRV9VUkxcIjogSlNPTi5zdHJpbmdpZnkoYXBpQmFzZSksXHJcbiAgICB9LFxyXG4gICAgYnVpbGQ6IHtcclxuICAgICAgb3V0RGlyOiAnLi4vcHVibGljL2FkbWluJyxcclxuICAgICAgZW1wdHlPdXREaXI6IHRydWUsXHJcbiAgICB9LFxyXG4gICAgc2VydmVyOiB7XHJcbiAgICAgIHBvcnQ6IDUxNzMsXHJcbiAgICAgIHN0cmljdFBvcnQ6IHRydWUsXHJcbiAgICAgIG9wZW46IGZhbHNlLFxyXG4gICAgICBob3N0OiB0cnVlLFxyXG4gICAgICBwcm94eToge1xyXG4gICAgICAgICcvYXBpJzoge1xyXG4gICAgICAgICAgdGFyZ2V0OiAnaHR0cDovLzEyNy4wLjAuMTozMDAwJyxcclxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgICBobXI6IHtcclxuICAgICAgICBwcm90b2NvbDogJ3dzJyxcclxuICAgICAgICBob3N0OiAnbG9jYWxob3N0JyxcclxuICAgICAgICBwb3J0OiA1MTczLFxyXG4gICAgICAgIGNsaWVudFBvcnQ6IDUxNzMsXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH07XHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTBTLE9BQU8sVUFBVTtBQUMzVCxTQUFTLHFCQUFxQjtBQUM5QixTQUFTLGNBQWMsZUFBZTtBQUN0QyxPQUFPLFdBQVc7QUFIeUssSUFBTSwyQ0FBMkM7QUFLNU8sSUFBTSxXQUFXLEtBQUssUUFBUSxjQUFjLHdDQUFlLENBQUM7QUFDNUQsSUFBTSxXQUFXLEtBQUssUUFBUSxVQUFVLElBQUk7QUFFNUMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDeEMsUUFBTSxNQUFNLFFBQVEsTUFBTSxVQUFVLEVBQUU7QUFDdEMsUUFBTSxXQUNKLElBQUkscUJBQ0osSUFBSSxpQ0FDSix1Q0FDQSxRQUFRLE9BQU8sRUFBRTtBQUVuQixTQUFPO0FBQUEsSUFDTCxTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsSUFDakIsU0FBUztBQUFBLElBQ1QsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sMENBQTBDLEtBQUssVUFBVSxPQUFPO0FBQUEsSUFDbEU7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxNQUNSLGFBQWE7QUFBQSxJQUNmO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixZQUFZO0FBQUEsTUFDWixNQUFNO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsUUFDTCxRQUFRO0FBQUEsVUFDTixRQUFRO0FBQUEsVUFDUixjQUFjO0FBQUEsUUFDaEI7QUFBQSxNQUNGO0FBQUEsTUFDQSxLQUFLO0FBQUEsUUFDSCxVQUFVO0FBQUEsUUFDVixNQUFNO0FBQUEsUUFDTixNQUFNO0FBQUEsUUFDTixZQUFZO0FBQUEsTUFDZDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
