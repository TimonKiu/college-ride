import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    /** 在终端执行 npm run dev 时自动打开系统浏览器（Cursor 右侧预览无法替代 Vite，请用本地址） */
    open: true,
    headers: {
      "Cache-Control": "no-store",
    },
  },
});
