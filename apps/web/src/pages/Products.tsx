import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@tp/api-client";

interface Series {
  id: number;
  name: string;
}
interface Space {
  id: number;
  name: string;
  scope?: string;
}
interface Product {
  id: number;
  code: string;
  description?: string | null;
  cover_image?: string | null;
  images?: any;
  specs?: any;
  series_id?: number | null;
  category_id?: number | null;
  series_name?: string | null;
  space_name?: string | null;
  is_top?: number;
  status?: number;
}

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
function parseSpecs(v: any): Record<string, string> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const o = JSON.parse(v);
      if (o && typeof o === "object") return o;
    } catch {
      /* ignore */
    }
  }
  return {};
}

export default function Products() {
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [spaceList, setSpaceList] = useState<Space[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [curSeries, setCurSeries] = useState<string>(params.get("series") || "all");
  const [curSpace, setCurSpace] = useState<string>(params.get("space") || "all");
  const [curReco, setCurReco] = useState<string>(params.get("reco") || "all");
  const [keyword, setKeyword] = useState(params.get("q") || "");

  // 详情 modal
  const detailId = params.get("detail");
  const [detail, setDetail] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImg, setModalImg] = useState(0);

  // 加载分类字典
  useEffect(() => {
    api
      .get<{ series: Series[]; spaces: Space[] }>("/api/categories")
      .then((d) => {
        setSeriesList(d.series || []);
        setSpaceList((d.spaces || []).filter((s) => s.scope === "all" || s.scope === "product"));
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const q: Record<string, any> = { page: 1, page_size: 12 };
      if (curSeries !== "all") q.series_id = Number(curSeries);
      if (curSpace !== "all") q.space_id = Number(curSpace);
      if (curReco === "1") q.reco = 1;
      if (keyword) q.keyword = keyword;
      const d = await api.get<{ list: Product[]; total: number }>("/api/products", q);
      setList(d.list || []);
      setTotal(d.total || 0);
    } catch (e: any) {
      setErr(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, [curSeries, curSpace, curReco, keyword]);

  useEffect(() => {
    load();
  }, [load]);

  // ?detail=id 直达详情
  useEffect(() => {
    if (detailId) {
      api
        .get<{ detail: Product }>(`/api/products/${detailId}`)
        .then((d) => {
          setDetail(d.detail);
          setModalImg(0);
          setModalOpen(true);
        })
        .catch(() => {});
    }
  }, [detailId]);

  function applyFilters(series: string, space: string, reco: string, kw: string) {
    setCurSeries(series);
    setCurSpace(space);
    setCurReco(reco);
    setKeyword(kw);
    const p: Record<string, string> = {};
    if (series !== "all") p.series = series;
    if (space !== "all") p.space = space;
    if (reco === "1") p.reco = "1";
    if (kw) p.q = kw;
    setParams(p, { replace: true });
  }

  function openDetail(p: Product) {
    setDetail(p);
    setModalImg(0);
    setModalOpen(true);
    setParams({ detail: String(p.id) }, { replace: true });
  }
  function closeModal() {
    setModalOpen(false);
    const p: Record<string, string> = {};
    if (curSeries !== "all") p.series = curSeries;
    if (curSpace !== "all") p.space = curSpace;
    if (curReco === "1") p.reco = "1";
    if (keyword) p.q = keyword;
    setParams(p, { replace: true });
  }

  const specs = useMemo(() => (detail ? parseSpecs(detail.specs) : {}), [detail]);
  const detailImgs = useMemo(() => (detail ? parseImages(detail.images) : []), [detail]);
  const detailCover = detail?.cover_image || detailImgs[modalImg];

  const emptyText = useMemo(() => {
    if (curSeries !== "all") {
      const sName = seriesList.find((s) => String(s.id) === curSeries)?.name || "";
      return `“${sName}”系列暂无产品，可前往后台添加。`;
    }
    if (curSpace !== "all") {
      const spName = spaceList.find((s) => String(s.id) === curSpace)?.name || "";
      return `“${spName}”空间场景暂无产品，请调整筛选条件。`;
    }
    return "未找到匹配的产品，请调整筛选条件。";
  }, [curSeries, curSpace, seriesList, spaceList]);

  return (
    <div>
      {/* 子页头图 */}
      <section className="relative h-[34vh] min-h-[260px] bg-ink flex items-center overflow-hidden">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: `url("/placeholder.svg")`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-white">
          <p className="eyebrow text-gold-soft mb-3">PRODUCTS</p>
          <h1 className="font-serif text-4xl md:text-5xl font-semibold">产品中心</h1>
          <p className="mt-3 text-white/70">按系列与空间场景，找到属于你的那一抹生活美学</p>
        </div>
      </section>

      {/* 筛选 + 搜索 */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between mb-6">
          <div className="flex flex-wrap gap-2" id="series-filter">
            <button className={`chip ${curSeries === "all" ? "chip-active" : ""}`} onClick={() => applyFilters("all", curSpace, curReco, keyword)}>全部系列</button>
            {seriesList.map((s) => (
              <button key={s.id} className={`chip ${curSeries === String(s.id) ? "chip-active" : ""}`} onClick={() => applyFilters(String(s.id), curSpace, curReco, keyword)}>
                {s.name}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-80">
            <svg className="w-5 h-5 text-ink/40 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
            <input
              type="text"
              placeholder="搜索产品名称 / 系列"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters(curSeries, curSpace, curReco, keyword)}
              className="w-full pl-10 pr-4 py-2.5 rounded-sm border border-line bg-white focus:outline-none focus:ring-2 focus:ring-gold text-sm"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-4" id="space-filter">
          <button className={`chip ${curSpace === "all" ? "chip-active" : ""}`} onClick={() => applyFilters(curSeries, "all", curReco, keyword)}>全部空间</button>
          {spaceList.map((s) => (
            <button key={s.id} className={`chip ${curSpace === String(s.id) ? "chip-active" : ""}`} onClick={() => applyFilters(curSeries, String(s.id), curReco, keyword)}>
              {s.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-8" id="reco-filter">
          <button className={`chip ${curReco === "all" ? "chip-active" : ""}`} onClick={() => applyFilters(curSeries, curSpace, "all", keyword)}>全部</button>
          <button className={`chip ${curReco === "1" ? "chip-active" : ""}`} onClick={() => applyFilters(curSeries, curSpace, "1", keyword)}>首页推荐</button>
        </div>

        {err && <p className="text-center text-red-500 py-4">{err}</p>}

        {loading && list.length === 0 ? (
          <div className="text-center text-ink/40 py-16">加载中…</div>
        ) : list.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-ink/60" id="empty-text">{emptyText}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8" id="product-grid">
            {list.map((p) => {
              const cover = assetUrl(p.cover_image || parseImages(p.images)[0]);
              const label = [p.series_name, p.space_name].filter(Boolean).join(" · ");
              return (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openDetail(p)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openDetail(p)}
                  className="product-card cursor-pointer card-hover group rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gold bg-white border border-line"
                >
                  <div className="relative aspect-[4/3] bg-ink overflow-hidden rounded-t-sm">
                    {p.is_top ? (
                      <span className="absolute top-3 left-3 z-10 text-[11px] tracking-wider px-2 py-1 bg-gold text-white rounded-sm">首页推荐</span>
                    ) : null}
                    {cover && (
                      <img src={cover} alt={p.code} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-ink/50">{label || "TP 产品"}</p>
                    <h3 className="font-serif text-lg mt-1 text-ink group-hover:text-gold transition-colors">{p.code}</h3>
                    <p className="text-sm text-ink/60 mt-1 line-clamp-2">{p.description || ""}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {total > 12 && (
          <p className="text-center text-ink/40 text-sm mt-8">共 {total} 件产品，更多内容请使用筛选条件查询</p>
        )}
      </section>

      {/* 产品详情弹层 */}
      {modalOpen && detail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="bg-white w-full max-w-3xl rounded-sm overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-7 py-4 border-b border-line">
              <h3 className="font-serif text-xl text-ink">{detail.code}</h3>
              <button onClick={closeModal} className="text-ink/60 hover:text-gold cursor-pointer text-2xl leading-none focus:outline-none focus:ring-2 focus:ring-gold rounded-sm" aria-label="关闭">&times;</button>
            </div>
            <div className="p-7">
              <div className="aspect-[16/9] bg-ink rounded-sm mb-6 overflow-hidden">
                {detailCover && <img src={assetUrl(detailCover)} alt={detail.code} className="w-full h-full object-cover" />}
              </div>
              {detailImgs.length > 1 && (
                <div className="flex gap-2 mb-6">
                  {detailImgs.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setModalImg(i)}
                      className={`w-16 h-12 rounded-sm overflow-hidden border-2 ${i === modalImg ? "border-gold" : "border-transparent opacity-70 hover:opacity-100"}`}
                    >
                      <img src={assetUrl(img)} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-center">
                <div className="bg-sand rounded-sm py-3"><p className="text-xs text-ink/50">系列</p><p className="font-medium mt-1">{detail.series_name || "—"}</p></div>
                <div className="bg-sand rounded-sm py-3"><p className="text-xs text-ink/50">空间</p><p className="font-medium mt-1">{detail.space_name || "—"}</p></div>
                <div className="bg-sand rounded-sm py-3"><p className="text-xs text-ink/50">材质</p><p className="font-medium mt-1">{specs["材质"] || "—"}</p></div>
                <div className="bg-sand rounded-sm py-3"><p className="text-xs text-ink/50">尺寸</p><p className="font-medium mt-1">{specs["尺寸"] || "—"}</p></div>
              </div>
              <p className="text-xs text-gold tracking-widest mb-2">产品说明</p>
              <p className="text-ink/60 leading-relaxed text-sm">{detail.description || "暂无说明"}</p>
              <div className="mt-7">
                <Link to="/about#appointment" className="btn-gold" onClick={() => closeModal()}>预约同款设计</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
