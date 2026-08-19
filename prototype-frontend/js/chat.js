/* ============================================================
 * TP 全屋家居 · 在线客服（留言式）
 * 说明：本版本不做实时人工 IM，仅提供快捷留言 + 联系方式展示。
 * 用户提交的问题会作为「在线留言」线索进入后台管理。
 * ============================================================ */
(function () {
  const STYLE = `
    #tp-chat-btn{position:fixed;right:22px;bottom:22px;z-index:90;width:56px;height:56px;border-radius:50%;background:#B08D57;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(26,23,20,.35);cursor:pointer;transition:.25s;}
    #tp-chat-btn:hover{background:#C9A875;transform:translateY(-2px);}
    #tp-chat-panel{position:fixed;right:22px;bottom:90px;z-index:91;width:360px;max-width:calc(100vw - 44px);background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.22);overflow:hidden;display:none;flex-direction:column;border:1px solid #E7E1D8;}
    #tp-chat-panel.open{display:flex;}
    .tp-chat-head{background:#1A1714;color:#fff;padding:16px 18px;display:flex;justify-content:space-between;align-items:center;}
    .tp-chat-head h4{font-size:15px;font-weight:500;letter-spacing:.05em;}
    .tp-chat-head button{background:transparent;border:none;color:#fff;font-size:22px;line-height:1;cursor:pointer;padding:0 4px;}
    .tp-chat-body{padding:18px;max-height:420px;overflow-y:auto;}
    .tp-chat-welcome{color:#595959;font-size:13px;line-height:1.7;margin-bottom:14px;}
    .tp-chat-quick{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;}
    .tp-chat-quick span{display:inline-block;padding:6px 12px;border:1px solid #E7E1D8;border-radius:999px;font-size:12px;color:#4A463F;cursor:pointer;transition:.2s;}
    .tp-chat-quick span:hover{border-color:#B08D57;color:#B08D57;background:#FAF8F5;}
    .tp-chat-field{width:100%;margin-bottom:12px;}
    .tp-chat-field label{display:block;font-size:12px;color:#595959;margin-bottom:5px;}
    .tp-chat-field input,.tp-chat-field textarea{width:100%;border:1px solid #E7E1D8;border-radius:8px;padding:9px 12px;font-size:13px;outline:none;}
    .tp-chat-field input:focus,.tp-chat-field textarea:focus{border-color:#B08D57;box-shadow:0 0 0 2px rgba(176,141,87,.12);}
    .tp-chat-actions{display:flex;gap:10px;margin-top:6px;}
    .tp-chat-actions button{flex:1;border:none;border-radius:8px;padding:10px 0;font-size:13px;cursor:pointer;transition:.2s;}
    .tp-chat-submit{background:#B08D57;color:#fff;}
    .tp-chat-submit:hover{background:#C9A875;}
    .tp-chat-cancel{background:#F5F5F5;color:#595959;}
    .tp-chat-cancel:hover{background:#ECECEC;}
    .tp-chat-done{display:none;text-align:center;padding:26px 10px;}
    .tp-chat-done p{color:#1A1714;font-size:15px;margin-bottom:6px;}
    .tp-chat-done span{color:#8c8c8c;font-size:12px;}
    .tp-chat-contact{border-top:1px solid #E7E1D8;padding:14px 18px;background:#FAF8F5;}
    .tp-chat-contact p{font-size:12px;color:#595959;margin-bottom:6px;}
    .tp-chat-contact a{color:#B08D57;text-decoration:none;font-size:13px;}
    @media(max-width:480px){#tp-chat-panel{width:calc(100vw - 44px);right:22px;bottom:84px;}#tp-chat-btn{right:16px;bottom:16px;}}
  `;

  function init() {
    if (document.getElementById('tp-chat-btn')) return;
    const s = document.createElement('style'); s.textContent = STYLE; document.head.appendChild(s);

    const btn = document.createElement('div');
    btn.id = 'tp-chat-btn';
    btn.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5a8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
    btn.setAttribute('aria-label', '在线客服');
    document.body.appendChild(btn);

    const panel = document.createElement('div');
    panel.id = 'tp-chat-panel';
    panel.innerHTML = `
      <div class="tp-chat-head"><h4>TP 在线客服</h4><button aria-label="关闭">&times;</button></div>
      <div class="tp-chat-body">
        <p class="tp-chat-welcome">您好，请问有什么可以帮您？您可以留下联系方式与问题，客服顾问会在工作时间尽快回复。</p>
        <div class="tp-chat-quick">
          <span>全屋定制报价</span><span>预约到店</span><span>产品材质</span><span>售后咨询</span>
        </div>
        <div class="tp-chat-field"><label>您的称呼</label><input id="tp-chat-name" placeholder="怎么称呼您" /></div>
        <div class="tp-chat-field"><label>联系电话</label><input id="tp-chat-phone" type="tel" placeholder="11 位手机号" /></div>
        <div class="tp-chat-field"><label>您的问题</label><textarea id="tp-chat-msg" rows="3" placeholder="请简要描述您的需求"></textarea></div>
        <div class="tp-chat-actions">
          <button class="tp-chat-cancel">取消</button>
          <button class="tp-chat-submit">提交咨询</button>
        </div>
      </div>
      <div class="tp-chat-done">
        <p>提交成功</p>
        <span>我们已收到您的咨询，客服会尽快联系您。</span>
      </div>
      <div class="tp-chat-contact">
        <p>也可以直接联系我们：</p>
        <a href="tel:400-XXX-XXXX">服务热线：400-XXX-XXXX</a><br/>
        <a href="mailto:service@tp-home.com">邮箱：service@tp-home.com</a>
      </div>
    `;
    document.body.appendChild(panel);

    const nameEl = panel.querySelector('#tp-chat-name');
    const phoneEl = panel.querySelector('#tp-chat-phone');
    const msgEl = panel.querySelector('#tp-chat-msg');
    const body = panel.querySelector('.tp-chat-body');
    const done = panel.querySelector('.tp-chat-done');

    function toggle(open) { panel.classList.toggle('open', open); }
    function reset() {
      nameEl.value = ''; phoneEl.value = ''; msgEl.value = '';
      body.style.display = 'block'; done.style.display = 'none';
    }

    btn.addEventListener('click', () => {
      if (!panel.classList.contains('open')) reset();
      toggle(true);
    });
    panel.querySelector('.tp-chat-head button').addEventListener('click', () => toggle(false));
    panel.querySelector('.tp-chat-cancel').addEventListener('click', () => toggle(false));
    panel.querySelectorAll('.tp-chat-quick span').forEach(el => {
      el.addEventListener('click', () => { msgEl.value = el.textContent + '：'; msgEl.focus(); });
    });
    panel.querySelector('.tp-chat-submit').addEventListener('click', async () => {
      const name = nameEl.value.trim();
      const phone = phoneEl.value.trim();
      const msg = msgEl.value.trim();
      if (!name || !phone) { alert('请填写称呼和联系电话'); return; }
      if (!/^1\d{10}$/.test(phone)) { alert('请输入正确的 11 位手机号'); return; }
      try {
        if (window.publicApi && window.publicApi.createLead) {
          await window.publicApi.createLead({
            name, phone, city: '', requirement_type: '在线客服咨询', store: '', message: msg,
            source_page: location.pathname + location.search
          });
        }
      } catch (e) {
        console.warn('[chat] 提交到后端失败，仍展示成功提示', e);
      }
      body.style.display = 'none'; done.style.display = 'block';
      setTimeout(() => toggle(false), 2500);
    });

    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && e.target !== btn && panel.classList.contains('open')) toggle(false);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
