import { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { api } from "@tp/api-client";
import Home from "./pages/Home";
import Products from "./pages/Products";
import Cases from "./pages/Cases";
import News from "./pages/News";
import About from "./pages/About";
import Recruitment from "./pages/Recruitment";
import ChatWidget from "./components/ChatWidget";

interface SiteConfig {
  site_name?: string | null;
  logo?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  company_address?: string | null;
  icp?: string | null;
  copyright?: string | null;
}

const navItems = [
  { to: "/", label: "首页", end: true },
  { to: "/products", label: "产品中心" },
  { to: "/cases", label: "案例展示" },
  { to: "/news", label: "新闻中心" },
  { to: "/about", label: "关于我们", sub: [
    { to: "/about#about-tp", label: "关于TP" },
    { to: "/about#history", label: "发展历程" },
    { to: "/about#brand", label: "品牌介绍" },
    { to: "/about#appointment", label: "在线预约" },
    { to: "/about#contact", label: "联系我们" },
  ]},
  { to: "/recruitment", label: "加入我们" },
];

function assetUrl(u?: string | null): string {
  if (!u) return "";
  if (u.startsWith("http")) return u;
  const base = (import.meta as any).env?.VITE_API_BASE || "http://127.0.0.1:8000";
  return `${base}${u}`;
}

function Nav() {
  const location = useLocation();
  // 移动端菜单开合状态（对齐原型 #menu-btn / #mobile-menu）
  const [mobileOpen, setMobileOpen] = useState(false);
  // 路由变化时自动收起移动端菜单
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  return (
    <header className="sticky top-0 z-40 bg-sand/95 backdrop-blur border-b border-line h-20 flex items-center">
      <nav className="max-w-7xl mx-auto flex items-center justify-between h-full w-full px-6">
        <NavLink to="/" className="font-serif text-xl font-bold text-ink flex items-center gap-2">
          <span className="w-8 h-8 rounded-sm bg-gold text-white flex items-center justify-center text-sm">TP</span>
          <span>
            TP <span className="text-gold">全屋家居</span>
          </span>
        </NavLink>
        <ul className="hidden lg:flex items-center gap-8 text-sm">
          {navItems.map((it) =>
            it.sub ? (
              <li key={it.to} className="relative group">
                <NavLink
                  to={it.to}
                  end={it.end}
                  className={({ isActive }) =>
                    isActive || location.pathname === it.to
                      ? "nav-link font-medium text-gold flex items-center gap-1"
                      : "nav-link flex items-center gap-1"
                  }
                >
                  {it.label}
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
                </NavLink>
                <div className="absolute left-1/2 -translate-x-1/2 top-16 pt-2 w-52 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="bg-white border border-line shadow-xl rounded-sm py-2">
                    {it.sub.map((s) => (
                      <Link
                        key={s.to}
                        to={s.to}
                        className="block px-6 py-2.5 text-[15px] text-ink/80 hover:bg-sand hover:text-gold transition-colors"
                      >
                        {s.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </li>
            ) : (
              <li key={it.to}>
                <NavLink
                  to={it.to}
                  end={it.end}
                  className={({ isActive }) =>
                    isActive ? "nav-link font-medium text-gold" : "nav-link"
                  }
                >
                  {it.label}
                </NavLink>
              </li>
            )
          )}
        </ul>
        {/* 桌面端「在线预约」按钮：小屏隐藏 */}
        <div className="flex items-center gap-3">
          <Link to="/about#appointment" className="btn-gold ml-2 hidden sm:inline-flex">在线预约</Link>
          {/* 移动端汉堡按钮：仅 <lg 显示 */}
          <button
            id="menu-btn"
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden text-ink cursor-pointer p-2 -mr-2"
            aria-label="菜单"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              // 展开态：X 图标
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
            ) : (
              // 收起态：汉堡三横线
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
      </nav>

      {/* 移动端下拉菜单面板（对齐原型 #mobile-menu） */}
      {mobileOpen && (
        <div id="mobile-menu" className="lg:hidden absolute top-20 left-0 right-0 border-t border-line bg-sand px-6 py-4 space-y-1 shadow-lg max-h-[calc(100vh-5rem)] overflow-y-auto">
          {/* 主导航项（含子项展开） */}
          {navItems.map((it) =>
            it.sub ? (
              <div key={it.to}>
                {/* 有子菜单的项：显示一级标题 */}
                <NavLink to={it.to} end={it.end} className="block py-3 text-ink font-medium border-b border-line">
                  {it.label}
                </NavLink>
                {/* 子菜单项：缩进展示 */}
                {it.sub.map((s) => (
                  <Link key={s.to} to={s.to} className="block py-2 pl-3 text-ink/80">
                    {s.label}
                  </Link>
                ))}
              </div>
            ) : (
              <NavLink key={it.to} to={it.to} end={it.end} className="block py-3 text-ink font-medium border-b border-line">
                {it.label}
              </NavLink>
            )
          )}
          {/* 底部在线预约按钮 */}
          <Link to="/about#appointment" className="btn-gold w-full mt-3">在线预约</Link>
        </div>
      )}
    </header>
  );
}

function Footer() {
  const [cfg, setCfg] = useState<SiteConfig | null>(null);
  useEffect(() => {
    api.get<SiteConfig | null>("/api/site-config").then(setCfg).catch(() => {});
  }, []);
  const logo = assetUrl(cfg?.logo);
  return (
    <footer className="bg-ink text-sand/70 text-sm">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <p className="font-serif text-lg text-white flex items-center gap-2">
            {logo && <img src={logo} alt="logo" className="w-7 h-7 rounded-sm object-cover" />}
            {cfg?.site_name || "TP 全屋家居"}
          </p>
          <p className="mt-3 text-sand/50 text-xs leading-relaxed">一站式全屋定制 · 原创设计 · 智能制造 · 全国服务网络</p>
        </div>
        <div>
          <p className="text-sand/40 text-xs tracking-widest mb-3">联系我们</p>
          <p id="footer-contact" className="space-y-1.5">
            <span className="block">电话：{cfg?.contact_phone || "400-888-8888"}</span>
            <span className="block">邮箱：{cfg?.contact_email || "service@tp-home.com"}</span>
            <span className="block">地址：{cfg?.company_address || "北京市朝阳区"}</span>
          </p>
        </div>
        <div className="md:text-right">
          <p className="text-sand/40 text-xs tracking-widest mb-3">快速入口</p>
          <ul className="space-y-1.5">
            <li><Link to="/products" className="hover:text-gold transition-colors">产品中心</Link></li>
            <li><Link to="/cases" className="hover:text-gold transition-colors">新案例展示</Link></li>
            <li><Link to="/recruitment" className="hover:text-gold transition-colors">加入我们</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-sand/40">
          <span id="footer-copy">{cfg?.copyright || "© 2026 TP 全屋家居"}</span>
          <span>{cfg?.icp || ""}</span>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/cases" element={<Cases />} />
          <Route path="/news" element={<News />} />
          <Route path="/about" element={<About />} />
          <Route path="/recruitment" element={<Recruitment />} />
        </Routes>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
