import { useEffect, useMemo, useState } from "react";
import { api } from "@tp/api-client";

interface Job {
  id: number;
  title: string;
  job_type?: string | null;
  department?: string | null;
  location?: string | null;
  employment_type?: string | null;
  responsibilities?: string | null;
  requirements?: string | null;
  benefits?: string | null;
}

const JOB_TYPE_LABEL: Record<string, string> = { social: "社会招聘", campus: "校园招聘" };

function splitLines(s?: string | null): string[] {
  if (!s) return [];
  return s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function Recruitment() {
  const [list, setList] = useState<Job[]>([]);
  const [err, setErr] = useState("");

  // JD 弹窗
  const [jd, setJd] = useState<Job | null>(null);

  // 投递表单
  const [form, setForm] = useState({ name: "", phone: "", job_id: "", email: "", msg: "" });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api
      .get<{ list: Job[]; total: number }>("/api/jobs", { page: 1, page_size: 50 })
      .then((d) => setList(d.list || []))
      .catch((e: any) => setErr(e?.message || "加载失败"));
  }, []);

  const social = useMemo(() => list.filter((j) => j.job_type !== "campus"), [list]);
  const campus = useMemo(() => list.filter((j) => j.job_type === "campus"), [list]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.job_id) return;
    setSending(true);
    try {
      const job = list.find((j) => String(j.id) === form.job_id);
      await api.post("/api/job-applications", {
        job_id: Number(form.job_id),
        name: form.name,
        phone: form.phone,
        intended_position: job?.title || undefined,
        message: form.msg || undefined,
      });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 2500);
      setForm({ name: "", phone: "", job_id: "", email: "", msg: "" });
    } catch {
      /* 保持可重试 */
    } finally {
      setSending(false);
    }
  }

  const jdTags = (j: Job) => [j.location, j.employment_type || JOB_TYPE_LABEL[j.job_type || ""], j.department].filter(Boolean).slice(0, 3);

  return (
    <div>
      {/* 子页头图 */}
      <section className="relative h-[34vh] min-h-[260px] bg-ink flex items-center overflow-hidden">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: `url(${assetUrl("/uploads/placeholder.svg")})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-white">
          <p className="eyebrow text-gold-soft mb-3">JOIN US</p>
          <h1 className="font-serif text-4xl md:text-5xl font-semibold">招聘入口</h1>
          <p className="mt-3 text-white/70">与 TP 一同，定义理想人居的下一程</p>
        </div>
      </section>

      {err && <p className="text-center text-red-500 py-4">{err}</p>}

      {/* 社会招聘 */}
      <section id="social" className="max-w-7xl mx-auto px-6 py-16 scroll-mt-24">
        <div className="flex items-center gap-3 mb-8"><span className="w-8 h-px bg-gold"></span><h2 className="font-serif text-2xl font-semibold">社会招聘</h2></div>
        <div className="space-y-4" id="social-list">
          {social.map((j) => (
            <JobCard key={j.id} j={j} onClick={() => setJd(j)} />
          ))}
          {social.length === 0 && <p className="text-ink/40 text-sm">暂无社会招聘职位</p>}
        </div>
      </section>

      {/* 校园招聘 */}
      <section id="campus" className="bg-white border-y border-line">
        <div className="max-w-7xl mx-auto px-6 py-16 scroll-mt-24">
          <div className="flex items-center gap-3 mb-8"><span className="w-8 h-px bg-gold"></span><h2 className="font-serif text-2xl font-semibold">校园招聘</h2></div>
          <div className="space-y-4" id="campus-list">
            {campus.map((j) => (
              <JobCard key={j.id} j={j} onClick={() => setJd(j)} />
            ))}
            {campus.length === 0 && <p className="text-ink/40 text-sm">暂无校园招聘职位</p>}
          </div>
        </div>
      </section>

      {/* 在线投递 */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-8">
          <p className="eyebrow mb-3">APPLY</p>
          <h2 className="font-serif text-3xl font-semibold">在线投递</h2>
          <p className="mt-2 text-ink/60 text-sm">填写以下信息并提交，我们将在 5 个工作日内与你联系。</p>
        </div>
        {submitted ? (
          <div className="bg-sand border border-line rounded-sm p-8 text-center text-gold text-sm" id="apply-ok">
            已收到你的投递，感谢关注 TP！
          </div>
        ) : (
          <form onSubmit={submit} id="apply-form" className="space-y-4 bg-sand border border-line rounded-sm p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1.5" htmlFor="a-name">姓名 *</label>
                <input id="a-name" required className="input" placeholder="你的姓名" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm mb-1.5" htmlFor="a-phone">手机号 *</label>
                <input id="a-phone" required type="tel" className="input" placeholder="11 位手机号" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1.5" htmlFor="a-job">应聘职位 *</label>
              <select id="a-job" required className="input" value={form.job_id} onChange={(e) => setForm({ ...form, job_id: e.target.value })}>
                <option value="">请选择职位</option>
                {list.map((j) => (
                  <option key={j.id} value={j.id}>{j.title}{j.job_type === "campus" ? "（校招）" : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1.5" htmlFor="a-email">简历链接 / 邮箱</label>
              <input id="a-email" className="input" placeholder="个人作品集或简历邮箱" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm mb-1.5" htmlFor="a-msg">自我介绍</label>
              <textarea id="a-msg" rows={4} className="input" placeholder="简单介绍一下你的经历与意愿" value={form.msg} onChange={(e) => setForm({ ...form, msg: e.target.value })} />
            </div>
            <button type="submit" disabled={sending} className="btn-gold w-full disabled:opacity-50">{sending ? "提交中…" : "提交投递"}</button>
          </form>
        )}
      </section>

      {/* JD 弹窗 */}
      {jd && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={(e) => e.target === e.currentTarget && setJd(null)}>
          <div className="bg-white w-full max-w-2xl rounded-sm overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-7 py-4 border-b border-line">
              <h3 className="font-serif text-xl text-ink">{jd.title}</h3>
              <button onClick={() => setJd(null)} className="text-ink/60 hover:text-gold cursor-pointer text-2xl leading-none focus:outline-none focus:ring-2 focus:ring-gold rounded-sm" aria-label="关闭">&times;</button>
            </div>
            <div className="p-7 space-y-5 text-sm text-ink/60 leading-relaxed">
              <div className="flex flex-wrap gap-2 text-xs">
                {jdTags(jd).map((t, i) => (
                  <span key={i} className="bg-sand px-3 py-1 rounded-sm">{t}</span>
                ))}
              </div>
              <div>
                <p className="text-gold text-xs tracking-widest mb-2">岗位职责</p>
                <ul className="list-disc pl-5 space-y-1">
                  {splitLines(jd.responsibilities).map((x, i) => <li key={i}>{x}</li>)}
                  {!jd.responsibilities && <li>见岗位详情</li>}
                </ul>
              </div>
              <div>
                <p className="text-gold text-xs tracking-widest mb-2">任职要求</p>
                <ul className="list-disc pl-5 space-y-1">
                  {splitLines(jd.requirements).map((x, i) => <li key={i}>{x}</li>)}
                  {!jd.requirements && <li>见岗位详情</li>}
                </ul>
              </div>
              {jd.benefits && (
                <div>
                  <p className="text-gold text-xs tracking-widest mb-2">福利待遇</p>
                  <p>{jd.benefits}</p>
                </div>
              )}
              <div className="pt-2">
                <button
                  className="btn-gold w-full"
                  onClick={() => {
                    setJd(null);
                    setForm((f) => ({ ...f, job_id: String(jd.id) }));
                    setTimeout(() => document.getElementById("apply-form")?.scrollIntoView({ behavior: "smooth" }), 50);
                  }}
                >
                  立即投递
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function assetUrl(u?: string | null): string {
  if (!u) return "";
  if (u.startsWith("http")) return u;
  const base = (import.meta as any).env?.VITE_API_BASE || "http://127.0.0.1:8000";
  return `${base}${u}`;
}

function JobCard({ j, onClick }: { j: Job; onClick: () => void }) {
  const meta = [j.location, j.employment_type, j.department].filter(Boolean).join(" · ") || JOB_TYPE_LABEL[j.job_type || ""];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      className="card-hover cursor-pointer group bg-white border border-line rounded-sm p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
    >
      <div>
        <h3 className="font-serif text-lg group-hover:text-gold transition-colors">{j.title}</h3>
        <p className="text-sm text-ink/60 mt-1">{meta}</p>
      </div>
      <span className="text-gold text-sm inline-flex items-center gap-1">
        查看 JD <span aria-hidden>→</span>
      </span>
    </div>
  );
}
