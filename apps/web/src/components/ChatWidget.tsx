import { useState } from "react";
import { api } from "@tp/api-client";

/** 在线客服（UI/UX §5.8）：右下浮动金圆钮 + 面板；提交生成「在线客服咨询」线索。 */
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || phone.length < 5) return;
    setSending(true);
    try {
      await api.post("/api/leads", {
        type: "online_message",
        name: phone, // 客服咨询未留名时以手机号代称
        phone,
        requirement_type: "在线客服咨询",
        message: msg || "在线客服咨询",
        source_page: "在线客服",
      });
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setOpen(false);
        setMsg("");
        setPhone("");
      }, 1500);
    } catch {
      /* 忽略错误，保持面板打开 */
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="在线客服"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gold text-white shadow-[0_8px_24px_rgba(0,0,0,.18)] hover:bg-gold-soft transition-colors flex items-center justify-center text-2xl"
      >
        {open ? "✕" : "💬"}
      </button>
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] rounded-lg overflow-hidden shadow-2xl border border-line bg-white flex flex-col">
          <div className="bg-ink text-white px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-serif text-base">TP 在线客服</p>
              <p className="text-xs text-white/60 mt-0.5">工作时间 9:00-21:00，留言必复</p>
            </div>
          </div>
          {done ? (
            <div className="p-10 text-center text-gold text-sm">提交成功，我们会尽快联系你！</div>
          ) : (
            <form onSubmit={submit} className="p-5 space-y-3">
              <div>
                <label className="block text-sm mb-1.5">手机号 *</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  required
                  placeholder="11 位手机号"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm mb-1.5">留言</label>
                <textarea
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  rows={3}
                  placeholder="告诉我们你的需求"
                  className="input resize-none"
                />
              </div>
              <button type="submit" disabled={sending} className="btn-gold w-full disabled:opacity-50">
                {sending ? "提交中…" : "提交"}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
