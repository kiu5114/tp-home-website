/**
 * 后台应用入口 + 整体布局（含 RBAC 菜单级过滤 + 路由懒加载分包）
 * ------------------------------------------------------------------
 * 功能：
 *  1. 登录态守卫：无 token 一律跳转 /login
 *  2. 侧栏菜单：多级分组结构，根据当前登录用户的权限编码（permissions）
 *     动态过滤——无对应"查看"权限的菜单不显示（菜单级 RBAC，开发技术文档 §8）。
 *  3. 顶部用户区：显示当前用户名 + 退出登录
 *  4. 内容区：注册全部后台页面路由（React.lazy 按路由分包）
 * ------------------------------------------------------------------
 * 数据来源：登录时后端返回 admin（含 permissions 数组），存于 localStorage("tp_admin")
 * ------------------------------------------------------------------
 * 【中文注释说明】
 * - MENU：菜单树（分组 + 叶子），叶子含所需权限码 perm；分组无 perm（按子项可见性决定显示）。
 * - hasPerm()：判断当前用户是否拥有某权限码（* 通配放行）。
 * - 菜单项渲染前先递归过滤，实现"低权限角色看不到无权菜单"。
 * - 官网入口为外链，点击在新标签页打开前台。
 * - 【生产优化】所有页面组件用 React.lazy 按路由分包，降低主包体积。
 */
import { lazy, Suspense, useState, type ReactNode } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Layout, Menu, Avatar, Dropdown, Drawer, Spin } from "antd";
import { getAccessToken, clearTokens } from "@tp/api-client";
import Login from "./Login";

// ---------- 路由懒加载（按页面分包，生产优化） ----------
const Dashboard = lazy(() => import("./Dashboard"));
const HomeConfig = lazy(() => import("./pages/HomeConfig"));
const AboutManage = lazy(() => import("./pages/AboutManage"));
const Stores = lazy(() => import("./pages/Stores"));
const SiteConfig = lazy(() => import("./pages/SiteConfig"));
const ProductManage = lazy(() => import("./pages/ProductManage"));
const CaseManage = lazy(() => import("./pages/CaseManage"));
const NewsManage = lazy(() => import("./pages/NewsManage"));
const JobManage = lazy(() => import("./pages/JobManage"));
const LeadsManage = lazy(() => import("./pages/LeadsManage"));
const OperationLogs = lazy(() => import("./pages/OperationLogs"));
// 系统管理（从原合并页拆出）
const AdminsManage = lazy(() => import("./pages/AdminsManage"));
const RolesManage = lazy(() => import("./pages/RolesManage"));
const DepartmentsManage = lazy(() => import("./pages/DepartmentsManage"));
// 阶段二新增模块（当前为占位，后续替换为真实页面）
const MenusManage = lazy(() => import("./pages/ComingSoon"));
const PostsManage = lazy(() => import("./pages/ComingSoon"));
const DictsManage = lazy(() => import("./pages/ComingSoon"));
const NoticesManage = lazy(() => import("./pages/ComingSoon"));
const LoginLogs = lazy(() => import("./pages/ComingSoon"));
const OnlineUsers = lazy(() => import("./pages/ComingSoon"));

const { Sider, Header, Content } = Layout;

/** 当前登录用户信息（登录时写入 localStorage，键名 tp_admin） */
interface AdminInfo {
  id?: number;
  username?: string;
  name?: string;
  role_name?: string;
  permissions?: string[];
}

/** 读取本地存储的当前用户（可能为 null） */
function getAdminInfo(): AdminInfo | null {
  try {
    const raw = localStorage.getItem("tp_admin");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** 菜单节点：分组（含 children）或叶子（含路由/外链） */
interface MenuNode {
  key: string;
  label: string;
  perm?: string; // 叶子所需权限码（分组忽略）
  icon?: ReactNode;
  children?: MenuNode[];
  external?: string; // 外链地址（新标签页打开）
}

/**
 * 后台左侧菜单树（多级分组，依据需求菜单结构）。
 * 权限码与后端 require_perm 编码体系保持一致。
 */
const MENU: MenuNode[] = [
  {
    key: "g-dashboard",
    label: "仪表盘",
    children: [
      { key: "dashboard", label: "运营看板（核心数据总览）", perm: "dashboard:view" },
    ],
  },
  {
    key: "g-content",
    label: "内容管理",
    children: [
      { key: "home", label: "首页配置", perm: "home:view" },
      { key: "about", label: "关于我们", perm: "about:view" },
      { key: "stores", label: "门店管理", perm: "store:view" },
      { key: "site-config", label: "站点配置", perm: "site:view" },
      { key: "news", label: "新闻动态", perm: "news:view" },
    ],
  },
  {
    key: "g-product",
    label: "产品与案例",
    children: [
      { key: "products", label: "产品管理", perm: "product:view" },
      { key: "cases", label: "案例管理", perm: "case:view" },
    ],
  },
  {
    key: "g-lead",
    label: "留言与招聘",
    children: [
      { key: "leads", label: "留言预约", perm: "lead:view" },
      { key: "jobs", label: "招聘管理", perm: "job:view" },
    ],
  },
  {
    key: "g-system",
    label: "系统管理",
    children: [
      { key: "admins", label: "用户管理", perm: "admin:view" },
      { key: "roles", label: "角色管理", perm: "role:view" },
      { key: "menus", label: "菜单管理", perm: "menu:view" },
      { key: "departments", label: "部门管理", perm: "department:view" },
      { key: "posts", label: "岗位管理", perm: "post:view" },
      { key: "dicts", label: "字典管理", perm: "dict:view" },
      { key: "notices", label: "通知公告", perm: "notice:view" },
    ],
  },
  {
    key: "g-monitor",
    label: "系统监控",
    children: [
      { key: "logs", label: "操作日志", perm: "log:view" },
      { key: "login-logs", label: "登录日志", perm: "loginlog:view" },
      { key: "online", label: "在线用户", perm: "online:view" },
    ],
  },
  { key: "official", label: "TP 全屋家居官网", external: "http://127.0.0.1:5173" },
];

/** 菜单 key → 路由路径 */
const pathMap: Record<string, string> = {
  dashboard: "/dashboard",
  home: "/home",
  about: "/about",
  stores: "/stores",
  "site-config": "/site-config",
  news: "/news",
  products: "/products",
  cases: "/cases",
  leads: "/leads",
  jobs: "/jobs",
  admins: "/admins",
  roles: "/roles",
  menus: "/menus",
  departments: "/departments",
  posts: "/posts",
  dicts: "/dicts",
  notices: "/notices",
  logs: "/logs",
  "login-logs": "/login-logs",
  online: "/online",
};

/**
 * 权限判断工具函数
 * @param admin 当前登录用户
 * @param code  所需权限码
 * @returns true=有权限（含超级管理员通配 *）
 */
function hasPerm(admin: AdminInfo | null, code: string): boolean {
  if (!admin) return false;
  const perms = admin.permissions || [];
  if (perms.includes("*")) return true;
  return perms.includes(code);
}

/** 将菜单树递归转换为 AntD Menu items，并按权限过滤 */
function toAntdItems(nodes: MenuNode[], admin: AdminInfo | null): any[] {
  const items: any[] = [];
  for (const n of nodes) {
    if (n.children) {
      const children = toAntdItems(n.children, admin);
      if (children.length) {
        items.push({ key: n.key, label: n.label, icon: n.icon, children });
      }
    } else if (n.external) {
      items.push({
        key: n.key,
        label: (
          <a
            onClick={(e) => {
              e.preventDefault();
              window.open(n.external, "_blank");
            }}
          >
            {n.label}
          </a>
        ),
      });
    } else {
      if (n.perm && !hasPerm(admin, n.perm)) continue;
      items.push({ key: n.key, label: n.label, icon: n.icon });
    }
  }
  return items;
}

/** 后台整体布局组件（侧栏 + 顶栏 + 内容区） */
function AdminLayout() {
  const navigate = useNavigate();
  const admin = getAdminInfo();
  // 移动端抽屉开合状态：小屏用 Drawer 代替固定 Sider
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 根据当前用户权限过滤菜单（递归，无对应"查看"权限的菜单项不渲染）
  const visibleMenuItems = toAntdItems(MENU, admin);

  // 展示用户名：优先 name，其次 username，兜底"管理员"
  const displayName = admin?.name || admin?.username || "管理员";

  // 菜单点击后的统一跳转处理（关闭抽屉并导航）
  const onMenuClick = ({ key }: { key: string }) => {
    setDrawerOpen(false);
    if (key === "official") return; // 外链由 a 标签自行处理
    navigate(pathMap[key] || "/dashboard");
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* ===== 左侧导航栏（桌面端固定 Sider，隐藏于小屏） ===== */}
      <Sider width={224} theme="dark" collapsible breakpoint="lg" collapsedWidth={0} onBreakpoint={(broken) => !broken && setDrawerOpen(false)}>
        {/* 品牌区 */}
        <div style={{ color: "#C9A875", fontWeight: 700, padding: 16 }}>TP 全屋家居 · 后台</div>
        {/* 菜单：items 已按权限过滤（多级分组） */}
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={["dashboard"]}
          items={visibleMenuItems}
          onClick={onMenuClick}
        />
      </Sider>

      {/* ===== 移动端抽屉菜单（仅小屏出现，内容与 Sider 一致） ===== */}
      <Drawer
        placement="left"
        width={224}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        styles={{ body: { padding: 0, background: "#001529" } }}
      >
        <div style={{ color: "#C9A875", fontWeight: 700, padding: 16 }}>TP 全屋家居 · 后台</div>
        <Menu theme="dark" mode="inline" defaultSelectedKeys={["dashboard"]} items={visibleMenuItems} onClick={onMenuClick} />
      </Drawer>

      <Layout>
        {/* ===== 顶部栏：左侧汉堡按钮（小屏）+ 右侧用户信息 + 退出 ===== */}
        <Header style={{ background: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {/* 移动端汉堡按钮：lg 以下显示，打开抽屉 */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden"
            style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#333" }}
            aria-label="打开菜单"
          >
            ☰
          </button>
          <Dropdown
            menu={{
              items: [{ key: "logout", label: "退出登录" }],
              onClick: () => {
                // 退出：清 token + 用户信息 → 跳登录页
                clearTokens();
                localStorage.removeItem("tp_admin");
                navigate("/login");
              },
            }}
          >
            <span style={{ cursor: "pointer" }}>
              <Avatar style={{ background: "#B08D57" }} /> {displayName}
            </span>
          </Dropdown>
        </Header>

        {/* ===== 内容区：路由出口（懒加载 chunk 加载期间显示 Spin） ===== */}
        <Content style={{ margin: 16 }}>
          <Suspense fallback={<Spin style={{ display: "block", margin: "80px auto" }} />}>
            <Routes>
            {/* 运营看板（ECharts 趋势图 + 统计卡） */}
            <Route path="/dashboard" element={<Dashboard />} />
            {/* 首页配置：轮播 + 品牌亮点 */}
            <Route path="/home" element={<HomeConfig />} />
            {/* 关于我们：关于页内容 + 发展历程 */}
            <Route path="/about" element={<AboutManage />} />
            {/* 门店管理 */}
            <Route path="/stores" element={<Stores />} />
            {/* 站点配置 */}
            <Route path="/site-config" element={<SiteConfig />} />
            {/* 产品管理：单品 + 系列 + 空间分类 */}
            <Route path="/products" element={<ProductManage />} />
            {/* 案例管理 */}
            <Route path="/cases" element={<CaseManage />} />
            {/* 新闻动态：文章 + 分类 */}
            <Route path="/news" element={<NewsManage />} />
            {/* 招聘管理：职位 + 投递 */}
            <Route path="/jobs" element={<JobManage />} />
            {/* 留言预约：筛选 + 流转 + 导出 */}
            <Route path="/leads" element={<LeadsManage />} />
            {/* 操作日志：只读列表 */}
            <Route path="/logs" element={<OperationLogs />} />
            {/* 系统管理（从合并页拆出） */}
            <Route path="/admins" element={<AdminsManage />} />
            <Route path="/roles" element={<RolesManage />} />
            <Route path="/departments" element={<DepartmentsManage />} />
            {/* 系统管理 - 阶段二新增（当前占位） */}
            <Route path="/menus" element={<MenusManage title="菜单管理" />} />
            <Route path="/posts" element={<PostsManage title="岗位管理" />} />
            <Route path="/dicts" element={<DictsManage title="字典管理" />} />
            <Route path="/notices" element={<NoticesManage title="通知公告" />} />
            <Route path="/login-logs" element={<LoginLogs title="登录日志" />} />
            <Route path="/online" element={<OnlineUsers title="在线用户" />} />
            {/* 未匹配路由 → 回看板 */}
            <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </Suspense>
        </Content>
      </Layout>
    </Layout>
  );
}

/** 应用根组件：登录守卫 */
export default function App() {
  const token = getAccessToken();
  return (
    <Routes>
      {/* 登录页（公开） */}
      <Route path="/login" element={<Login />} />
      {/* 其余路径：有 token 进后台布局，否则跳登录 */}
      <Route path="/*" element={token ? <AdminLayout /> : <Navigate to="/login" />} />
    </Routes>
  );
}
