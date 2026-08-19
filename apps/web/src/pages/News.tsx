import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@tp/api-client";

interface NewsCategory {
  id: number;
  name: string;
}
interface NewsItem {
  id: number;
  title: string;
  summary?: string | null;
  content?: string | null;
  cover_image?: string | null;
  category_id?: number | null;
  category_name?: string | null;
  source?: string | null;
  published_at?: string | null;
}
interface NewsDetailResp {
  detail: NewsItem;
  prev?: { id: number; title: string } | null;
  next?: { id: number; title: string } | null;
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

export default function News() {
  const [params, setParams] = useSearchParams();
  const [cats, setCats] = useState<NewsCategory[]>([]);
  const [list, setList] = useState<NewsItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const curCat = params.get("cat") || "all";

  // 详情 modal
  const detailId = params.get("detail");
  const [detail, setDetail] = useState<NewsItem | null>(null);
  const [prevNext, setPrevNext] = useState<{ prev?: any; next?: any }>({});
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    api
      .get<NewsCategory[]>("/api/news-categories")
      .then(setCats)
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const q: Record<string, any> = { page: 1, page_size: 12 };
      if (curCat !== "all") q.category_id = Number(curCat);
      const d = await api.get<{ list: NewsItem[]; total: number }>("/api/news", q);
      setList(d.list || []);
      setTotal(d.total || 0);
    } catch (e: any) {
      setErr(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, [curCat]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (detailId) {
      api
        .get<NewsDetailResp>(`/api/news/${detailId}`)
        .then((d) => {
          setDetail(d.detail);
          setPrevNext({ prev: d.prev, next: d.next });
          setModalOpen(true);
        })
        .catch(() => {});
    }
  }, [detailId]);

  function setCat(v: string) {
    const p: Record<string, string> = {};
    if (v !== "all") p.cat = v;
    setParams(p, { replace: true });
  }

  function openDetail(n: NewsItem) {
    setDetail(n);
    setPrevNext({});
    setModalOpen(true);
    setParams({ detail: String(n.id) }, { replace: true });
  }
  function closeModal() {
    setModalOpen(false);
    const p: Record<string, string> = {};
    if (curCat !== "all") p.cat = curCat;
    setParams(p, { replace: true });
  }
  function goDetail(id: number) {
    api
      .get<NewsDetailResp>(`/api/news/${id}`)
      .then((d) => {
        setDetail(d.detail);
        setPrevNext({ prev: d.prev, next: d.next });
        setModalOpen(true);
        setParams({ detail: String(id) }, { replace: true });
      })
      .catch(() => {});
  }

  const activeCatName = useMemo(() => {
    if (curCat === "all") return "";
    return cats.find((c) => String(c.id) === curCat)?.name || "";
  }, [curCat, cats]);

  const bodyText = useMemo(() => (detail ? stripHtml(detail.content) : ""), [detail]);

  return (
    <div>
      {/* 子页头图 */}
      <section className="relative h-[34vh] min-h-[260px] bg-ink flex items-center overflow-hidden">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: `url(${assetUrl("/uploads/placeholder.svg")})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-white">
          <p className="eyebrow text-gold-soft mb-3">NEWS</p>
          <h1 className="font-serif text-4xl md:text-5xl font-semibold">新闻中心</h1>
          <p className="mt-3 text-white/70">品牌动态与行业洞察，与你同步每一次成长</p>
        </div>
      </section>

      {/* 分类 Tab */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-wrap gap-2 mb-8">
          <button className={`chip ${curCat === "all" ? "chip-active" : ""}`} onClick={() => setCat("all")}>全部</button>
          {cats.map((c) => (
            <button key={c.id} className={`chip ${curCat === String(c.id) ? "chip-active" : ""}`} onClick={() => setCat(String(c.id))}>
              {c.name}
            </button>
          ))}
        </div>

        {err && <p className="text-center text-red-500 py-4">{err}</p>}

        {loading && list.length === 0 ? (
          <div className="text-center text-ink/40 py-12">正在加载…</div>
        ) : list.length === 0 ? (
          <div className="text-center py-16 text-ink/60">
            <p className="font-serif text-xl">暂无资讯</p>
            <p className="text-sm mt-2">{activeCatName ? `“${activeCatName}”下暂无内容` : "敬请期待更多品牌动态"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {list.map((n) => {
              const cover = assetUrl(n.cover_image);
              return (
                <article
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openDetail(n)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openDetail(n)}
                  className="news-card cursor-pointer card-hover group rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gold bg-white border border-line"
                >
                  <div className="aspect-[16/9] bg-ink/10 overflow-hidden rounded-t-sm">
                    {cover && <img src={cover} alt={n.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                  </div>
                  <div className="p-5">
                    <p className="text-xs text-ink/50">{n.category_name || "资讯"} · {(n.published_at || "").slice(0, 10)}</p>
                    <h3 className="font-serif text-lg mt-1 text-ink group-hover:text-gold transition-colors">{n.title}</h3>
                    <p className="text-sm text-ink/60 mt-1 line-clamp-2">{n.summary || ""}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {total > 12 && <p className="text-center text-ink/40 text-sm mt-8">共 {total} 条资讯</p>}
      </section>

      {/* 新闻详情弹层 */}
      {modalOpen && detail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="bg-white w-full max-w-3xl rounded-sm overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-7 py-4 border-b border-line">
              <h3 className="font-serif text-xl text-ink">{detail.title}</h3>
              <button onClick={closeModal} className="text-ink/60 hover:text-gold cursor-pointer text-2xl leading-none focus:outline-none focus:ring-2 focus:ring-gold rounded-sm" aria-label="关闭">&times;</button>
            </div>
            <div className="p-7">
              <div className="aspect-[16/9] bg-ink/10 rounded-sm mb-6 overflow-hidden">
                {assetUrl(detail.cover_image) && <img src={assetUrl(detail.cover_image)} alt={detail.title} className="w-full h-full object-cover" />}
              </div>
              <p className="text-xs text-ink/50 mb-4">{detail.category_name || "资讯"} · {(detail.published_at || "").slice(0, 10)} {detail.source ? `· ${detail.source}` : ""}</p>
              <p className="text-ink/60 leading-relaxed text-sm whitespace-pre-line">{bodyText}</p>
              {/* 上一篇 / 下一篇 */}
              <div className="mt-8 pt-5 border-t border-line flex flex-col sm:flex-row justify-between gap-2 text-sm">
                {prevNext.prev ? (
                  <button onClick={() => goDetail(prevNext.prev.id)} className="text-left text-ink/70 hover:text-gold transition-colors">
                    ← 上一篇：{prevNext.prev.title}
                  </button>
                ) : <span />}
                {prevNext.next ? (
                  <button onClick={() => goDetail(prevNext.next.id)} className="text-right text-ink/70 hover:text-gold transition-colors">
                    下一篇：{prevNext.next.title} →
                  </button>
                ) : <span />}
              </div>
              <div className="mt-7">
                <Link to="/about#appointment" className="btn-gold" onClick={() => closeModal()}>预约到店了解详情</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
