/**
 * 建设中占位页（后台）
 * ------------------------------------------------------------------
 * 用于尚未在阶段二实装的菜单项：先保证左侧菜单结构完整、点击不报错，
 * 后续阶段用真实功能页面替换路由即可。
 */
import { Result } from "antd";

export default function ComingSoon({ title = "该模块" }: { title?: string }) {
  return (
    <div style={{ padding: 64 }}>
      <Result status="info" title={`${title}（建设中）`} subTitle="该模块将在后续阶段上线，敬请期待。" />
    </div>
  );
}
