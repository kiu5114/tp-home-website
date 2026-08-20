/**
 * 后台管理构建配置（Vite）
 * ------------------------------------------------------------------
 * 功能：
 *  - React 插件 + api-client 别名
 *  - dev server 端口 5174
 *  - 【生产优化】manualChunks 手动分包：
 *    * vendor-react   ：react / react-dom / react-router（首屏必需，体积小）
 *    * vendor-antd    ：antd 及其图标（体积大，缓存友好）
 *    * vendor-echarts ：echarts（看板页使用，独立缓存）
 *    配合路由懒加载，首屏仅加载 react+antd 骨架，页面级代码按需进入。
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@tp/api-client": path.resolve(__dirname, "../../packages/api-client/src/index.ts"),
    },
  },
  server: {
    host: true,
    port: 5174,
  },
  // 预优化声明：把 ECharts 按需引入的子模块预先在 dev 启动时打包好，
  // 避免运行时 Vite 发现"新依赖"触发的 re-optimize（清理 deps_temp 时
  // 在 Windows 下被 safe-delete 拦截会导致 dev server 崩溃）。
  // 配合 Dashboard.tsx 的 `echarts/core + LineChart + ...` 按需注册使用。
  optimizeDeps: {
    include: [
      "echarts/core",
      "echarts/charts",
      "echarts/components",
      "echarts/renderers",
      "echarts-for-react/lib/core",
    ],
  },
  build: {
    // 手动分包：把大型第三方库拆为独立 chunk（利于浏览器长缓存 + 减小首屏主包）
    rollupOptions: {
      output: {
        manualChunks: {
          // React 全家桶（首屏必需，单独打包）
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // AntD 组件库与其图标（体积最大，独立缓存）
          "vendor-antd": ["antd", "@ant-design/icons"],
          // ECharts 图表库（仅看板页使用）
          "vendor-echarts": ["echarts", "echarts-for-react"],
        },
      },
    },
    // chunk 体积告警阈值提到 800KB（避免误报，实际已按需分包）
    chunkSizeWarningLimit: 800,
  },
});
