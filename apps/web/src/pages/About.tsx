import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@tp/api-client";

interface Milestone {
  id: number;
  year: string;
  title: string;
  desc?: string | null;
}
interface Store {
  id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
  business_hours?: string | null;
  map_url?: string | null;
}
interface AboutData {
  about_tp?: { slug: string; title: string; content?: string | null };
  brand?: { slug: string; title: string; content?: string | null };
  history?: { slug: string; title: string; content?: string | null };
  milestones: Milestone[];
}

function assetUrl(u?: string | null): string {
  if (!u) return "";
  if (u.startsWith("http")) return u;
  const base = (import.meta as any).env?.VITE_API_BASE || "http://127.0.0.1:8000";
  return `${base}${u}`;
}

function stripHtml(html?: string | null): string {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

export default function About() {
  const location = useLocation();
  const [data, setData] = useState<AboutData | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [err, setErr] = useState("");

  // 预约表单
  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    type: "设计咨询",
    store: "",
    msg: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api
      .get<AboutData>("/api/about")
      .then((d) => setData(d))
      .catch((e: any) => setErr(e?.message || "加载失败"));
    api
      .get<Store[]>("/api/stores")
      .then((s) => {
        setStores(s);
        setForm((f) => ({ ...f, store: s[0]?.name || "" }));
      })
      .catch(() => {});
  }, []);

  // 锚点滚动（/about#xxx）
  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (hash) {
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }
  }, [location.hash]);

  const isAppointment = useMemo(() => form.type === "预约到店", [form.type]);

  async function submitAppt(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await api.post("/api/leads", {
        name: form.name,
        phone: form.phone,
        city: form.city,
        requirement_type: form.type,
        store: isAppointment ? form.store : undefined,
        message: form.msg || undefined,
        source_page: "在线预约",
      });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 2500);
      setForm({ name: "", phone: "", city: "", type: "设计咨询", store: stores[0]?.name || "", msg: "" });
    } catch {
      /* 表单保持可重试 */
    } finally {
      setSending(false);
    }
  }

  const aboutTpText = stripHtml(data?.about_tp?.content) || "TP 全屋家居，专注于一站式全屋定制，集原创设计、智能制造与全国服务网络于一体。";
  const brandText = stripHtml(data?.brand?.content) || "以「东方人居美学」为内核，将人体工程学、原创设计与智能制造融为一体。";

  return (
    <div>
      {/* 子页头图 */}
      <section className="relative h-[34vh] min-h-[260px] bg-ink flex items-center overflow-hidden">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: `url(${assetUrl("/uploads/placeholder.svg")})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-white">
          <p className="eyebrow text-gold-soft mb-3">ABOUT TP</p>
          <h1 className="font-serif text-4xl md:text-5xl font-semibold">关于我们</h1>
          <p className="mt-3 text-white/70">以匠心筑就理想栖居，让每一个家都被认真对待</p>
        </div>
      </section>

      {err && <p className="text-center text-red-500 py-4">{err}</p>}

      {/* 关于TP */}
      <section id="about-tp" className="max-w-7xl mx-auto px-6 py-16 scroll-mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="eyebrow mb-3">ABOUT TP</p>
            <h2 className="font-serif text-3xl font-semibold mb-5">企业实力</h2>
            <p className="text-ink/60 leading-relaxed mb-4">{aboutTpText}</p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[
              ["300+", "全国门店"],
              ["18年", "品牌沉淀"],
              ["6大", "产品系列"],
              ["10年", "质保承诺"],
            ].map(([num, label]) => (
              <div key={label} className="bg-white border border-line rounded-sm p-8 text-center">
                <p className="font-serif text-4xl text-gold">{num}</p>
                <p className="text-sm text-ink/60 mt-2">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 发展历程 */}
      <section id="history" className="bg-white border-y border-line">
        <div className="max-w-7xl mx-auto px-6 py-16 scroll-mt-24">
          <p className="eyebrow mb-3">HISTORY</p>
          <h2 className="font-serif text-3xl font-semibold mb-10">发展历程</h2>
          <div className="relative border-l border-line pl-8 space-y-10">
            {(data?.milestones || []).map((m) => (
              <div key={m.id} className="relative">
                <span className="absolute -left-[37px] top-1 w-3 h-3 rounded-full bg-gold"></span>
                <p className="text-gold text-sm">{m.year}</p>
                <h3 className="font-serif text-xl mt-1">{m.title}</h3>
                <p className="text-ink/60 text-sm mt-1">{m.desc || ""}</p>
              </div>
            ))}
            {(data?.milestones || []).length === 0 && (
              <div className="text-ink/40 text-sm">历程内容待后台配置</div>
            )}
          </div>
        </div>
      </section>

      {/* 品牌介绍 */}
      <section id="brand" className="max-w-7xl mx-auto px-6 py-16 scroll-mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="aspect-[4/3] bg-ink/10 rounded-sm overflow-hidden border border-line">
            <img src={assetUrl("/uploads/placeholder.svg")} alt="品牌形象" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="eyebrow mb-3">BRAND</p>
            <h2 className="font-serif text-3xl font-semibold mb-5">品牌介绍</h2>
            <p className="text-ink/60 leading-relaxed">{brandText}</p>
          </div>
        </div>
      </section>

      {/* 在线预约 */}
      <section id="appointment" className="bg-white border-y border-line">
        <div className="max-w-3xl mx-auto px-6 py-16 scroll-mt-24">
          <div className="text-center mb-8">
            <p className="eyebrow mb-3">APPOINTMENT</p>
            <h2 className="font-serif text-3xl font-semibold">在线预约设计</h2>
            <p className="mt-2 text-ink/60 text-sm">留下联系方式，专属设计师将与你预约到店或上门量房。</p>
          </div>
          {submitted ? (
            <div className="bg-sand border border-line rounded-sm p-8 text-center text-gold text-sm" id="appt-ok">
              预约已提交，我们会尽快与你联系！
            </div>
          ) : (
            <form onSubmit={submitAppt} id="appt-form" className="space-y-4 bg-sand border border-line rounded-sm p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1.5" htmlFor="p-name">姓名 *</label>
                  <input id="p-name" required className="input" placeholder="你的姓名"
                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm mb-1.5" htmlFor="p-phone">手机号 *</label>
                  <input id="p-phone" required type="tel" className="input" placeholder="11 位手机号"
                    value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1.5" htmlFor="p-city">城市 *</label>
                <input id="p-city" required className="input" placeholder="所在城市"
                  value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm mb-1.5" htmlFor="p-type">预约类型</label>
                <select id="p-type" className="input"
                  value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option>设计咨询</option>
                  <option>预约到店</option>
                  <option>上门量房</option>
                  <option>招商咨询</option>
                </select>
              </div>
              {isAppointment && (
                <div id="p-store-wrap">
                  <label className="block text-sm mb-1.5" htmlFor="p-store">选择门店</label>
                  <select id="p-store" className="input"
                    value={form.store} onChange={(e) => setForm({ ...form, store: e.target.value })}>
                    <option value="">请选择门店</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm mb-1.5" htmlFor="p-msg">留言</label>
                <textarea id="p-msg" rows={4} className="input" placeholder="告诉我们你的需求"
                  value={form.msg} onChange={(e) => setForm({ ...form, msg: e.target.value })} />
              </div>
              <button type="submit" disabled={sending} className="btn-gold w-full disabled:opacity-50">
                {sending ? "提交中…" : "提交预约"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* 联系我们 / 门店 */}
      <section id="contact" className="max-w-7xl mx-auto px-6 py-16 scroll-mt-24">
        <p className="eyebrow mb-3">CONTACT</p>
        <h2 className="font-serif text-3xl font-semibold mb-10">联系我们 / 门店</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-4" id="store-list">
            {stores.length === 0 && <p className="text-ink/40 text-sm">门店信息待后台配置</p>}
            {stores.map((s) => (
              <div key={s.id} className="card-hover bg-white border border-line rounded-sm p-6">
                <h3 className="font-serif text-lg">{s.name}</h3>
                <p className="text-sm text-ink/60 mt-2">地址：{s.address || "—"}</p>
                <p className="text-sm text-ink/60 mt-1">电话：{s.phone || "—"}</p>
                <p className="text-sm text-ink/60 mt-1">营业时间：{s.business_hours || "—"}</p>
              </div>
            ))}
          </div>
          <div>
            <div className="aspect-[4/3] bg-ink/10 border border-line rounded-sm overflow-hidden flex items-center justify-center text-ink/30">
              <div className="text-center p-6">
                <p className="text-4xl mb-2">🗺️</p>
                <p className="text-sm">门店位置地图（地图供应商待确认后接入）</p>
              </div>
            </div>
            <p className="text-xs text-ink/40 mt-2">* 地图供应商（腾讯地图 / 高德地图）待业务方确认后替换为正式地图组件</p>
            <div className="mt-6 bg-white border border-line rounded-sm p-6 text-center">
              <p className="font-serif text-lg mb-2">想预约到店？</p>
              <p className="text-sm text-ink/60 mb-5">在上方选择门店、填写信息，我们的设计顾问将为你安排专属到店体验。</p>
              <a href="#appointment" className="btn-gold w-full">前往在线预约 →</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
