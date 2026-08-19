/**
 * 看板页面（后台首页）
 * ------------------------------------------------------------------
 * 功能：展示运营概览数据
 *  - 顶部 6 张统计卡：产品数、案例数、已发布新闻数、门店数、待处理线索、待处理投递
 *  - 中部 ECharts 折线趋势图：近 7 天 在线留言 / 预约到店 / 招聘投递 三条折线
 *    （颜色遵循 UI/UX §3.7：在线留言蓝、预约到店金、招聘投递绿）
 *  - 底部待处理入口卡：点击跳转到留言预约 / 投递管理页
 * ------------------------------------------------------------------
 * 数据来源：GET /api/admin/dashboard（后台路由，需登录）
 * ------------------------------------------------------------------
 * 【按需引入说明（生产优化）】
 * - 不再 `import echarts` 全量包，而是用 `echarts/core` 仅注册折线图
 *   所需的 LineChart、Tooltip、Legend、Grid 组件与 Canvas 渲染器，
 *   使 echarts 体积从 ~1MB 降到 ~400KB，且随本页 chunk 懒加载。
 * - echarts-for-react 提供 `lib/core` 入口，可传入自定义 echarts 实例。
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Statistic, Spin } from "antd";
// echarts/core：按需注册，避免全量引入（生产优化）
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";           // 仅折线图
import { TooltipComponent, LegendComponent, GridComponent } from "echarts/components"; // 提示/图例/网格
import { CanvasRenderer } from "echarts/renderers";    // Canvas 渲染
import ReactEChartsCore from "echarts-for-react/lib/core"; // core 版封装（可传自定义实例）
import { api } from "@tp/api-client";

// 注册折线图所需模块（只此一次）
echarts.use([LineChart, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer]);

/** 看板接口返回的数据结构（与后端 /api/admin/dashboard 对齐） */
interface DashboardData {
  stats: {
    products: number;       // 产品总数（上架）
    cases: number;          // 案例总数
    news: number;           // 已发布新闻数
    stores: number;         // 门店数
    leads_pending: number;  // 待处理线索数
    apps_pending: number;   // 待处理投递数
  };
  trend: Array<{
    date: string;                      // 日期 MM-DD
    online_message: number;            // 在线留言数
    appointment_to_store: number;      // 预约到店数
    job_application: number;           // 招聘投递数
  }>;
  pending: { leads: number; applications: number };
}

export default function Dashboard() {
  // ---------- 状态定义 ----------
  // data：后端返回的看板数据；loading：加载中标记
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); // 路由跳转（待处理入口卡片点击跳转用）

  // ---------- 数据加载 ----------
  // 组件挂载时拉取一次看板数据；失败时静默（保留空态），最终关闭 loading
  useEffect(() => {
    api
      .get<DashboardData>("/api/admin/dashboard")
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ---------- 加载态 ----------
  // 数据未返回前显示居中加载动画
  if (loading) return <Spin style={{ display: "block", margin: "80px auto" }} />;

  // ---------- 数据解构 ----------
  // 显式类型标注，避免 data 为空时 TS 推断为 {} 导致属性访问报错
  const stats: DashboardData["stats"] = data?.stats || { products: 0, cases: 0, news: 0, stores: 0, leads_pending: 0, apps_pending: 0 };
  const trend = data?.trend || [];
  const pending = data?.pending || { leads: 0, applications: 0 };

  // ---------- ECharts 趋势图配置 ----------
  // 说明：x 轴为 7 个日期点；三条折线分别对应三种来源的当日数量。
  // 颜色：蓝 #1677ff（在线留言）、金 #B08D57（预约到店）、绿 #52c41a（招聘投递），
  // 坐标轴文字 #8c8c8c（对齐 UI/UX §3.7）。
  const chartOption = {
    tooltip: { trigger: "axis" }, // 悬浮显示所有系列数值
    legend: { data: ["在线留言", "预约到店", "招聘投递"] }, // 图例
    grid: { left: 40, right: 24, top: 40, bottom: 30 }, // 图表内边距
    xAxis: {
      type: "category", // 类目轴（日期）
      data: trend.map((t) => t.date), // x 轴数据：近 7 天日期
      axisLine: { lineStyle: { color: "#8c8c8c" } },
      axisLabel: { color: "#8c8c8c" },
    },
    yAxis: {
      type: "value", // 数值轴
      minInterval: 1, // 最少按 1 步进（保证整数刻度）
      axisLine: { lineStyle: { color: "#8c8c8c" } },
      axisLabel: { color: "#8c8c8c" },
      splitLine: { lineStyle: { color: "#f0f0f0" } }, // 浅灰横向网格线
    },
    series: [
      // 系列 1：在线留言（蓝）
      {
        name: "在线留言",
        type: "line",
        smooth: true, // 平滑曲线
        data: trend.map((t) => t.online_message),
        itemStyle: { color: "#1677ff" }, // 折线颜色：蓝
      },
      // 系列 2：预约到店（金）
      {
        name: "预约到店",
        type: "line",
        smooth: true,
        data: trend.map((t) => t.appointment_to_store),
        itemStyle: { color: "#B08D57" }, // 折线颜色：品牌金
      },
      // 系列 3：招聘投递（绿）
      {
        name: "招聘投递",
        type: "line",
        smooth: true,
        data: trend.map((t) => t.job_application),
        itemStyle: { color: "#52c41a" }, // 折线颜色：绿
      },
    ],
  };

  return (
    <div>
      {/* ===== 顶部统计卡（6 张，2 行 × 3 列） ===== */}
      <Row gutter={[16, 16]}>
        {/* 产品总数：统计卡 */}
        <Col xs={12} md={8} lg={4}>
          <Card><Statistic title="产品" value={stats.products || 0} /></Card>
        </Col>
        {/* 案例总数：统计卡 */}
        <Col xs={12} md={8} lg={4}>
          <Card><Statistic title="案例" value={stats.cases || 0} /></Card>
        </Col>
        {/* 已发布新闻数：统计卡 */}
        <Col xs={12} md={8} lg={4}>
          <Card><Statistic title="已发布新闻" value={stats.news || 0} /></Card>
        </Col>
        {/* 门店数：统计卡 */}
        <Col xs={12} md={8} lg={4}>
          <Card><Statistic title="门店" value={stats.stores || 0} /></Card>
        </Col>
        {/* 待处理线索：统计卡（蓝色高亮） */}
        <Col xs={12} md={8} lg={4}>
          <Card><Statistic title="待处理线索" value={stats.leads_pending || 0} valueStyle={{ color: "#1677ff" }} /></Card>
        </Col>
        {/* 待处理投递：统计卡（绿色高亮） */}
        <Col xs={12} md={8} lg={4}>
          <Card><Statistic title="待处理投递" value={stats.apps_pending || 0} valueStyle={{ color: "#52c41a" }} /></Card>
        </Col>
      </Row>

      {/* ===== ECharts 近 7 天趋势图 ===== */}
      <Card title="近 7 天趋势（在线留言 / 预约到店 / 招聘投递）" style={{ marginTop: 16 }}>
        {/* ReactEChartsCore：core 版封装；传入按需注册的 echarts 实例；option 为图表配置 */}
        <ReactEChartsCore echarts={echarts} option={chartOption} style={{ height: 320 }} notMerge />
      </Card>

      {/* ===== 待处理入口卡 ===== */}
      <Row gutter={16} style={{ marginTop: 16 }}>
        {/* 待处理线索入口：点击跳转留言预约管理页 */}
        <Col xs={24} md={12}>
          <Card hoverable onClick={() => navigate("/leads")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>待处理线索</span>
              <span style={{ fontSize: 22, fontWeight: 600, color: "#1677ff" }}>{pending.leads || 0}</span>
            </div>
          </Card>
        </Col>
        {/* 待处理投递入口：点击跳转招聘管理（投递）页 */}
        <Col xs={24} md={12}>
          <Card hoverable onClick={() => navigate("/jobs")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>待处理投递</span>
              <span style={{ fontSize: 22, fontWeight: 600, color: "#52c41a" }}>{pending.applications || 0}</span>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
