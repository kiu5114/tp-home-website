import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@tp/api-client";

interface Space {
  id: number;
  name: string;
  scope?: string;
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
  customer?: string | null;
  house_type?: string | null;
  series?: string | null;
  description?: string | null;
  is_recommended?: number;
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

export default function Cases() {
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState<CaseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [spaceList, setSpaceList] = useState<Space[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const curSpace = params.get("space") || "all";

  // 详情 modal
  const detailId = params.get("detail");
  const [detail, setDetail] = useState<CaseItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImg, setModalImg] = useState(0);

  // 空间字典（case 相关：all / case 范围）
  useEffect(() => {
    api
      .get<{ spaces: Space[] }>("/api/categories")
      .then((d) => setSpaceList((d.spaces || []).filter((s) => s.scope === "all" || s.scope === "case")))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const q: Record<string, any> = { page: 1, page_size: 9 };
      if (curSpace !== "all") q.space_id = Number(curSpace);
      const d = await api.get<{ list: CaseItem[]; total: number }>("/api/cases", q);
      setList(d.list || []);
      setTotal(d.total || 0);
    } catch (e: any) {
      setErr(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, [curSpace]);

  useEffect(() => {
    load();
  }, [load]);

  // ?detail=id 直达
  useEffect(() => {
    if (detailId) {
      api
        .get<CaseItem>(`/api/cases/${detailId}`)
        .then((d) => {
          setDetail(d);
          setModalImg(0);
          setModalOpen(true);
        })
        .catch(() => {});
    }
  }, [detailId]);

  function setSpace(v: string) {
    const p: Record<string, string> = {};
    if (v !== "all") p.space = v;
    setParams(p, { replace: true });
  }

  function openDetail(c: CaseItem) {
    setDetail(c);
    setModalImg(0);
    setModalOpen(true);
    setParams({ detail: String(c.id) }, { replace: true });
  }
  function closeModal() {
    setModalOpen(false);
    const p: Record<string, string> = {};
    if (curSpace !== "all") p.space = curSpace;
    setParams(p, { replace: true });
  }

  const detailImgs = useMemo(() => (detail ? parseImages(detail.images) : []), [detail]);
  const detailCover = detail?.cover_image || detailImgs[modalImg];

  return (
    <div>
      {/* 子页头图 */}
      <section className="relative h-[38vh] min-h-[300px] bg-ink flex items-center overflow-hidden">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: `url(${assetUrl("/uploads/placeholder.svg")})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-white">
          <p className="eyebrow text-gold-soft mb-3">CASES</p>
          <h1 className="font-serif text-4xl md:text-5xl font-semibold">新案例展示</h1>
          <p className="mt-3 text-white/70">真实客户的全屋落地实景，看见生活的样子</p>
        </div>
      </section>

      {/* 空间筛选 */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-wrap gap-2 mb-8">
          <button className={`chip ${curSpace === "all" ? "chip-active" : ""}`} onClick={() => setSpace("all")}>全部空间</button>
          {spaceList.map((s) => (
            <button key={s.id} className={`chip ${curSpace === String(s.id) ? "chip-active" : ""}`} onClick={() => setSpace(String(s.id))}>
              {s.name}
            </button>
          ))}
        </div>

        {err && <p className="text-center text-red-500 py-4">{err}</p>}

        {loading && list.length === 0 ? (
          <div className="text-center text-ink/40 py-12" id="case-loading">正在加载案例…</div>
        ) : list.length === 0 ? (
          <div className="text-center py-16 text-ink/60" id="case-empty">
            <p className="font-serif text-xl">暂无案例</p>
            <p className="text-sm mt-2">敬请期待更多精彩实景落地</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" id="case-grid">
            {list.map((c) => {
              const cover = assetUrl(c.cover_image || parseImages(c.images)[0]);
              return (
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openDetail(c)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openDetail(c)}
                  className="case-card cursor-pointer card-hover group rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gold bg-white border border-line"
                >
                  <div className="relative aspect-[16/10] bg-ink overflow-hidden rounded-t-sm">
                    {c.is_recommended ? (
                      <span className="absolute top-3 left-3 z-10 text-[11px] tracking-wider px-2 py-1 bg-gold text-white rounded-sm">推荐案例</span>
                    ) : null}
                    {cover && (
                      <img src={cover} alt={c.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-xs text-ink/50">{c.space_name || "案例"} {c.area ? `· ${c.area}` : ""}</p>
                    <h3 className="font-serif text-lg mt-1 text-ink group-hover:text-gold transition-colors">{c.title}</h3>
                    {c.style && <p className="text-sm text-ink/60 mt-1">{c.style}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {total > 9 && (
          <p className="text-center text-ink/40 text-sm mt-8">共 {total} 个案例</p>
        )}
      </section>

      {/* 案例详情弹层 */}
      {modalOpen && detail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="bg-white w-full max-w-3xl rounded-sm overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-7 py-4 border-b border-line">
              <h3 className="font-serif text-xl text-ink">{detail.title}</h3>
              <button onClick={closeModal} className="text-ink/60 hover:text-gold cursor-pointer text-2xl leading-none focus:outline-none focus:ring-2 focus:ring-gold rounded-sm" aria-label="关闭">&times;</button>
            </div>
            <div className="p-7">
              <div className="aspect-[16/9] bg-ink rounded-sm mb-6 overflow-hidden">
                {detailCover && <img src={assetUrl(detailCover)} alt={detail.title} className="w-full h-full object-cover" />}
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
                <div className="bg-sand rounded-sm py-3"><p className="text-xs text-ink/50">客户</p><p className="font-medium mt-1">{detail.customer || "—"}</p></div>
                <div className="bg-sand rounded-sm py-3"><p className="text-xs text-ink/50">户型</p><p className="font-medium mt-1">{detail.house_type || "—"}</p></div>
                <div className="bg-sand rounded-sm py-3"><p className="text-xs text-ink/50">风格</p><p className="font-medium mt-1">{detail.style || "—"}</p></div>
                <div className="bg-sand rounded-sm py-3"><p className="text-xs text-ink/50">面积</p><p className="font-medium mt-1">{detail.area || "—"}</p></div>
              </div>
              <p className="text-xs text-gold tracking-widest mb-2">所用系列</p>
              <p className="text-ink font-medium mb-5">{detail.series || "—"}</p>
              <p className="text-xs text-gold tracking-widest mb-2">方案说明</p>
              <p className="text-ink/60 leading-relaxed text-sm">{detail.description || "暂无说明"}</p>
              <div className="mt-7">
                <Link to="/about#appointment" className="btn-gold" onClick={() => closeModal()}>同款方案预约设计</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
