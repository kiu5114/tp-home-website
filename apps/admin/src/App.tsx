/**
 * 后台应用入口 + 整体布局（动态菜单 + RBAC 菜单级过滤 + 路由懒加载分包）
 * ------------------------------------------------------------------
 * 功能：
 *  1. 登录态守卫：无 token 一律跳转 /login
 *  2. 侧栏菜单：**由后端菜单表驱动**（GET /api/admin/menus/tree，含多级分组），
 *     登录后按当前用户的权限编码（permissions）动态过滤——
 *     无对应"查看"权限的菜单不显示（菜单级 RBAC，开发技术文档 §8）。
 *     后端不可用/接口失败时回退到内置静态菜单（FALLBACK_MENU），保证可访问性。
 *  3. 顶部用户区：显示当前用户名 + 退出登录
 *  4. 内容区：注册全部后台页面路由（React.lazy 按路由分包）
 * ------------------------------------------------------------------
 * 数据来源：
 *  - 菜单树：GET /api/admin/menus/tree（登录即可；叶子 perm 字段用于前端过滤）
 *  - 当前用户：登录时后端返回 admin（含 permissions 数组），存于 localStorage("tp_admin")
 * ------------------------------------------------------------------
 * 【中文注释说明】
 * - 动态菜单节点：分组(parent_id 为空且有 children) / 叶子(有 path) / 外链(path 以 http 开头)。
 * - hasPerm()：判断当前用户是否拥有某权限码（* 通配放行）。
 * - 官网入口为外链，点击在新标签页打开前台。
 * - 【生产优化】所有页面组件用 React.lazy 按路由分包，降低主包体积。
 */
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Layout, Menu, Avatar, Dropdown, Drawer, Spin } from "antd";
import { api, getAccessToken, clearTokens } from "@tp/api-client";
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
// 阶段二新增模块
const MenusManage = lazy(() => import("./pages/MenusManage"));
const PostsManage = lazy(() => import("./pages/PostsManage"));
const DictsManage = lazy(() => import("./pages/DictsManage"));
const NoticesManage = lazy(() => import("./pages/NoticesManage"));
const LoginLogs = lazy(() => import("./pages/LoginLogs"));
const OnlineUsers = lazy(() => import("./pages/OnlineUsers"));

const { Sider, Header, Content } = Layout;

/** 当前登录用户信息（登录时写入 localStorage，键名 tp_admin） */
interface AdminInfo {
  id?: number;
  username?: string;
  name?: string;
  role_name?: string;
  permissions?: string[];
}

/** 后端菜单树节点（GET /api/admin/menus/tree 返回结构） */
interface MenuNode {
  id: number;
  name: string;
  path?: string | null;
  icon?: string | null;
  parent_id?: number | null;
  sort_order?: number;
  perm?: string | null;
  status?: number;
  children?: MenuNode[];
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

/** 内置静态菜单兜底（后端不可用时使用；结构与后端种子菜单一致） */
interface MenuNode2 {
  key: string;
  label: string;
  perm?: string;
  icon?: ReactNode;
  children?: MenuNode2[];
  external?: string;
}

const FALLBACK_MENU: MenuNode2[] = [
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

/** 菜单 key → 路由路径（静态兜底用） */
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

/** 将后端菜单树（MenuNode）递归转换为 AntD Menu items，并按权限过滤 */
function buildDynamicItems(nodes: MenuNode[], admin: AdminInfo | null): any[] {
  const items: any[] = [];
  for (const n of nodes) {
    const children = n.children && n.children.length ? buildDynamicItems(n.children, admin) : [];
    const path = n.path || "";
    if (children.length) {
      // 分组：有可见子项才显示
      items.push({ key: `g-${n.id}`, label: n.name, icon: undefined, children });
    } else if (path.startsWith("http")) {
      // 外链（如官网入口）：新标签页打开
      items.push({
        key: `ext-${n.id}`,
        label: (
          <a
            onClick={(e) => {
              e.preventDefault();
              window.open(path, "_blank");
            }}
          >
            {n.name}
          </a>
        ),
      });
    } else {
      // 叶子：无权限不显示
      if (n.perm && !hasPerm(admin, n.perm)) continue;
      items.push({ key: path || `m-${n.id}`, label: n.name, icon: undefined });
    }
  }
  return items;
}

/** 将静态兜底菜单树转换为 AntD Menu items，并按权限过滤 */
function toAntdItems(nodes: MenuNode2[], admin: AdminInfo | null): any[] {
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
  const location = useLocation();
  const admin = getAdminInfo();
  // 移动端抽屉开合状态：小屏用 Drawer 代替固定 Sider
  const [drawerOpen, setDrawerOpen] = useState(false);
  // 动态菜单：null=未加载（先用静态兜底）；[]=接口失败（回退静态）；非空=后端菜单树
  const [dynamicItems, setDynamicItems] = useState<any[] | null>(null);

  // 登录后拉取后端菜单树，驱动真实侧栏（菜单管理页的增删改/停用即时生效）
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await api.get<{ list: MenuNode[] }>("/api/admin/menus/tree");
        if (!alive) return;
        setDynamicItems(d.list && d.list.length ? buildDynamicItems(d.list, admin) : []);
      } catch {
        if (alive) setDynamicItems([]); // 接口失败 → 静态兜底
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 菜单来源：优先后端动态；未加载或失败时用静态兜底
  const visibleMenuItems =
    dynamicItems && dynamicItems.length ? dynamicItems : toAntdItems(FALLBACK_MENU, admin);

  // 当前路由对应高亮项（动态菜单 key 即路由路径）
  const selectedKeys = [location.pathname];

  // 展示用户名：优先 name，其次 username，兜底"管理员"
  const displayName = admin?.name || admin?.username || "管理员";

  // 菜单点击后的统一跳转处理（关闭抽屉并导航）
  const onMenuClick = ({ key }: { key: string }) => {
    setDrawerOpen(false);
    if (key.startsWith("g-") || key.startsWith("ext-")) return; // 分组/外链不导航
    if (key.startsWith("/")) {
      navigate(key); // 动态菜单：key 即路由路径
    } else {
      navigate(pathMap[key] || "/dashboard"); // 静态兜底：key → pathMap
    }
  };

  const menuEl = (onClick: (info: any) => void) => (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={selectedKeys}
      items={visibleMenuItems}
      onClick={onClick}
    />
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* ===== 左侧导航栏（桌面端固定 Sider，隐藏于小屏） ===== */}
      <Sider width={224} theme="dark" collapsible breakpoint="lg" collapsedWidth={0} onBreakpoint={(broken) => !broken && setDrawerOpen(false)}>
        {/* 品牌区 */}
        <div style={{ color: "#C9A875", fontWeight: 700, padding: 16 }}>TP 全屋家居 · 后台</div>
        {/* 菜单：后端菜单表驱动（按权限过滤，多级分组） */}
        {menuEl(onMenuClick)}
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
        {menuEl(onMenuClick)}
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
            {/* 系统管理 - 阶段二新增 */}
            <Route path="/menus" element={<MenusManage />} />
            <Route path="/posts" element={<PostsManage />} />
            <Route path="/dicts" element={<DictsManage />} />
            <Route path="/notices" element={<NoticesManage />} />
            <Route path="/login-logs" element={<LoginLogs />} />
            <Route path="/online" element={<OnlineUsers />} />
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
