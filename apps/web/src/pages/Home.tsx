import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@tp/api-client";

interface Banner {
  id: number;
  title: string;
  subtitle?: string | null;
  img_url: string;
  link?: string | null;
  sort_order?: number;
}
interface Highlight {
  id: number;
  title: string;
  desc?: string | null;
  icon?: string | null;
}
interface Product {
  id: number;
  code: string;
  description?: string | null;
  cover_image?: string | null;
  images?: any;
  series_id?: number | null;
  category_id?: number | null;
  series_name?: string | null;
  space_name?: string | null;
  is_top?: number;
  specs?: any;
}
interface CaseItem {
  id: number;
  title: string;
  cover_image?: string | null;
  images?: any;
  space_id?: number | null;
  space_name?: string | null;
  area?: string | null;
  style?: string | null;
}
interface NewsItem {
  id: number;
  title: string;
  summary?: string | null;
  cover_image?: string | null;
  published_at?: string | null;
}
interface HomeData {
  banners: Banner[];
  highlights: Highlight[];
  rec_products: Product[];
  rec_cases: CaseItem[];
  news: NewsItem[];
}

/** 后端返回 /uploads/xxx 相对路径，拼 API_BASE 访问 */
function assetUrl(u?: string | null): string {
  if (!u) return "";
  if (u.startsWith("http")) return u;
  const base = (import.meta as any).env?.VITE_API_BASE || "http://127.0.0.1:8000";
  return `${base}${u}`;
}

function parseImages(v: any): string[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const a = JSON.parse(v);
      if (Array.isArray(a)) return a;
    } catch {
      return [v];
    }
    return [v];
  }
  return [];
}

export default function Home() {
  const [data, setData] = useState<HomeData | null>(null);
  const [err, setErr] = useState<string>("");
  const [heroIdx, setHeroIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [loadedImgs, setLoadedImgs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api
      .get<HomeData>("/api/home")
      .then((d) => setData(d))
      .catch((e: any) => setErr(e?.message || "加载失败"));
  }, []);

  const banners = data?.banners || [];
  const bannerCount = banners.length;

  const goNext = useCallback(() => {
    setHeroIdx((i) => (bannerCount > 1 ? (i + 1) % bannerCount : 0));
  }, [bannerCount]);
  const goPrev = useCallback(() => {
    setHeroIdx((i) => (bannerCount > 1 ? (i - 1 + bannerCount) % bannerCount : 0));
  }, [bannerCount]);

  // 自动播放：7s 切换（UI/UX §4.1）；reduced-motion 下降级
  useEffect(() => {
    if (bannerCount <= 1) return;
    const reduced =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    timerRef.current = setInterval(goNext, 7000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [bannerCount, goNext]);

  const markLoaded = useCallback((key: string) => {
    setLoadedImgs((s) => ({ ...s, [key]: true }));
  }, []);

  const activeBanner = banners[heroIdx];
  const activeBg = assetUrl(activeBanner?.img_url);
  const heroSpaceName = activeBanner?.title || "";

  return (
    <div>
      {/* ===== Hero 轮播（UI/UX §5.2） ===== */}
      <section className="relative h-[88vh] min-h-[560px] bg-ink flex items-center overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          {activeBg && (
            <img
              src={activeBg}
              alt={heroSpaceName}
              className={`absolute inset-0 w-full h-full object-cover opacity-85 transition-opacity duration-700 ${loadedImgs[activeBg] ? "opacity-85" : "opacity-0"}`}
              style={{ transform: "scale(1)", transition: "transform 7s ease-out, opacity .7s ease" }}
              onLoad={() => markLoaded(activeBg)}
            />
          )}
        </div>
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(90deg,rgba(26,23,20,.46) 0%,rgba(26,23,20,.18) 45%,rgba(26,23,20,.04) 100%)" }}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full text-white">
          <p className="eyebrow text-gold-soft mb-4">TP 全屋家居 · 一站式全屋定制</p>
          <h1 className="font-serif text-5xl md:text-6xl font-semibold leading-tight max-w-3xl">
            {activeBanner ? activeBanner.title : "以匠心筑就理想栖居之境"}
          </h1>
          <p className="mt-5 text-white/75 text-lg max-w-xl">
            {activeBanner?.subtitle || "从空间规划到软装落地，我们用原创设计与智能制造，为你呈现有温度的家。"}
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link to="/products" className="btn-gold">探索产品</Link>
            <Link to="/about#appointment" className="btn-ghost border-white/40 text-white hover:border-gold hover:text-gold">预约设计</Link>
          </div>
        </div>
        {/* 轮播控制条（建筑索引条，UI/UX §5.2） */}
        {bannerCount > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 w-full max-w-7xl px-6">
            <div className="flex items-end gap-8">
              <div className="relative h-6 flex-1 max-w-[260px]" role="tablist" aria-label="首页轮播">
                <div className="absolute bottom-0 left-0 right-0 h-px bg-white/30"></div>
                <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-1">
                  {banners.map((b, i) => (
                    <button
                      key={b.id}
                      role="tab"
                      aria-selected={i === heroIdx}
                      aria-label={b.title}
                      onClick={() => setHeroIdx(i)}
                      className={`relative z-10 w-px transition-all duration-300 cursor-pointer ${
                        i === heroIdx ? "h-4 bg-gold" : "h-2 bg-white/45 hover:h-3 hover:bg-white/90"
                      }`}
                    ></button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-5">
                <button onClick={goPrev} className="text-white/70 hover:text-gold text-2xl leading-none cursor-pointer transition-colors select-none px-2 py-1" aria-label="上一张">‹</button>
                <span className="font-serif text-sm tracking-[0.18em] text-white/85 min-w-[6rem] text-center">{heroSpaceName}</span>
                <button onClick={goNext} className="text-white/70 hover:text-gold text-2xl leading-none cursor-pointer transition-colors select-none px-2 py-1" aria-label="下一张">›</button>
              </div>
            </div>
          </div>
        )}
      </section>

      {err && <p className="text-center text-red-500 py-4">{err}</p>}

      {/* ===== 品牌工艺亮点 ===== */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="eyebrow mb-3">CRAFTSMANSHIP</p>
          <h2 className="section-title">四大核心工艺</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(data?.highlights || []).map((h) => (
            <div key={h.id} className="card-hover text-center py-10 bg-white border border-line rounded-sm">
              <div className="w-12 h-12 mx-auto rounded-full bg-gold/10 text-gold flex items-center justify-center text-xl">✦</div>
              <h3 className="font-serif text-lg mt-4 text-ink">{h.title}</h3>
              <p className="text-sm text-ink/60 mt-1">{h.desc || ""}</p>
            </div>
          ))}
          {(data?.highlights || []).length === 0 && (
            <div className="col-span-4 text-center text-ink/40 py-10">亮点内容待后台配置</div>
          )}
        </div>
      </section>

      {/* ===== 精选产品系列 ===== */}
      <section className="bg-white border-y border-line">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="eyebrow mb-3">PRODUCTS</p>
              <h2 className="section-title">精选产品系列</h2>
            </div>
            <Link to="/products" className="nav-link font-medium hidden sm:inline-flex items-center gap-1">
              查看全部 <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(data?.rec_products || []).map((p) => {
              const cover = assetUrl(p.cover_image || parseImages(p.images)[0]);
              const label = [p.series_name, p.space_name].filter(Boolean).join(" · ");
              return (
                <Link
                  key={p.id}
                  to={`/products?detail=${p.id}`}
                  className="product-card cursor-pointer card-hover group rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gold bg-white border border-line"
                >
                  <div className="relative aspect-[4/3] bg-ink overflow-hidden rounded-t-sm">
                    {p.is_top ? (
                      <span className="absolute top-3 left-3 z-10 text-[11px] tracking-wider px-2 py-1 bg-gold text-white rounded-sm">首页推荐</span>
                    ) : null}
                    {cover && (
                      <img
                        src={cover}
                        alt={p.code}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-ink/50">{label || "TP 产品"}</p>
                    <h3 className="font-serif text-lg mt-1 text-ink group-hover:text-gold transition-colors">{p.code}</h3>
                    <p className="text-sm text-ink/60 mt-1 line-clamp-2">{p.description || ""}</p>
                  </div>
                </Link>
              );
            })}
            {(data?.rec_products || []).length === 0 && (
              <div className="col-span-4 text-center text-ink/40 py-10">暂无推荐产品</div>
            )}
          </div>
        </div>
      </section>

      {/* ===== 新案例展示预览 ===== */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="eyebrow mb-3">CASES</p>
            <h2 className="section-title">真实落地实景</h2>
          </div>
          <Link to="/cases" className="nav-link font-medium hidden sm:inline-flex items-center gap-1">
            更多案例 <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {(data?.rec_cases || []).map((c) => {
            const cover = assetUrl(c.cover_image || parseImages(c.images)[0]);
            return (
              <Link
                key={c.id}
                to={`/cases?detail=${c.id}`}
                className="case-card cursor-pointer card-hover group rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gold bg-white border border-line"
              >
                <div className="relative aspect-[16/10] bg-ink overflow-hidden rounded-t-sm">
                  {cover && (
                    <img src={cover} alt={c.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  )}
                </div>
                <div className="p-5">
                  <p className="text-xs text-ink/50">{c.space_name || "案例"} {c.area ? `· ${c.area}` : ""}</p>
                  <h3 className="font-serif text-lg mt-1 text-ink group-hover:text-gold transition-colors">{c.title}</h3>
                  {c.style && <p className="text-sm text-ink/60 mt-1">{c.style}</p>}
                </div>
              </Link>
            );
          })}
          {(data?.rec_cases || []).length === 0 && (
            <div className="col-span-3 text-center text-ink/40 py-10">暂无推荐案例</div>
          )}
        </div>
      </section>

      {/* ===== 品牌动态 ===== */}
      <section className="bg-white border-y border-line">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="eyebrow mb-3">NEWS</p>
              <h2 className="section-title">品牌动态</h2>
            </div>
            <Link to="/news" className="nav-link font-medium hidden sm:inline-flex items-center gap-1">
              全部资讯 <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(data?.news || []).map((n) => {
              const cover = assetUrl(n.cover_image);
              return (
                <Link
                  key={n.id}
                  to={`/news?detail=${n.id}`}
                  className="news-card cursor-pointer card-hover group rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gold bg-sand border border-line"
                >
                  <div className="relative aspect-[16/9] bg-ink/10 overflow-hidden rounded-t-sm">
                    {cover && <img src={cover} alt={n.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                  </div>
                  <div className="p-5">
                    <p className="text-xs text-ink/50">{n.published_at ? String(n.published_at).slice(0, 10) : ""}</p>
                    <h3 className="font-serif text-lg mt-1 text-ink group-hover:text-gold transition-colors">{n.title}</h3>
                    <p className="text-sm text-ink/60 mt-1 line-clamp-2">{n.summary || ""}</p>
                  </div>
                </Link>
              );
            })}
            {(data?.news || []).length === 0 && (
              <div className="col-span-3 text-center text-ink/40 py-10">暂无品牌动态</div>
            )}
          </div>
        </div>
      </section>

      {/* ===== 招聘 CTA（UI/UX §5.2 浅色卡片） ===== */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="bg-white border border-line rounded-sm text-ink flex flex-col md:flex-row items-center justify-between gap-8 p-12">
          <div>
            <p className="eyebrow text-ink/50 mb-3">JOIN US</p>
            <h2 className="font-serif text-3xl font-semibold">与 TP 一同定义理想人居</h2>
            <p className="mt-3 text-ink/60 max-w-lg">我们正在寻找设计师、工程师与品牌伙伴。无论社招校招，都期待你的加入。</p>
          </div>
          <Link to="/recruitment" className="btn-gold whitespace-nowrap">查看职位</Link>
        </div>
      </section>
    </div>
  );
}
