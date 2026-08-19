/* TP 全屋家居 · 前台与后台通用 API 客户端 */
const API_BASE = window.API_BASE || 'http://127.0.0.1:8000';

async function api(path, opts = {}) {
  const url = `${API_BASE}${path}`;
  const token = sessionStorage.getItem('tp_admin_token');
  const headers = { 'Accept': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (opts.body && !(opts.body instanceof FormData) && !(opts.body instanceof URLSearchParams)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, { ...opts, headers });
  if (res.status === 401) {
    sessionStorage.removeItem('tp_admin_token');
    sessionStorage.removeItem('tp_admin_name');
    sessionStorage.removeItem('tp_admin_role');
    if (typeof window !== 'undefined' && !window.location.pathname.includes('admin-login.html')) {
      window.location.href = 'admin-login.html';
    }
    throw new Error('Token 无效');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`请求失败 ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/* ============================================================
 * 本地兜底数据（与后端 seed_data 完全一致）
 * 作用：预览环境若未启动后端（http://127.0.0.1:8000），
 *      自动使用此处数据渲染，保证页面永远正常显示；
 *      后端运行时则用实时数据（后台修改可同步到前台）。
 * ============================================================ */
const SEED = {
  home: {
    banners: [
      { id: 1, title: '一站式全屋定制', subtitle: '为家定义专属风格', img_url: 'images/hero-living-hd.png' },
      { id: 2, title: '2026 新品系列发布', subtitle: '胡桃禮 · 如意春', img_url: 'images/hero-dining.png' },
      { id: 3, title: '到店体验空间', subtitle: '预约设计师 1v1', img_url: 'images/case-living.png' }
    ],
    highlights: [
      { icon: '人体工程学', title: '人体工程学设计', desc: '贴合生活习惯的尺度与动线' },
      { icon: '原创设计', title: '原创设计团队', desc: '意大利合作设计，专属审美' },
      { icon: '智能产线', title: '智能制造产线', desc: '德国设备，毫米级精度' },
      { icon: '售后', title: '贴心售后服务', desc: '5 年质保，终身维护' }
    ],
    rec_products: [
      { id: 1, name: '胡桃禮 沙发组合', material: '实木框架 + 真皮', images: 'images/hero-living-hd.png' },
      { id: 2, name: '如意春 餐桌', material: '橡木', images: 'images/hero-dining.png' }
    ],
    rec_cases: [
      { id: 1, title: '滨江一号 整屋定制', style: '现代轻奢', area: '138㎡', customer: '王女士', house_type: '整屋', series: '如意春 / 柏悦', images: 'images/case-living.png' },
      { id: 2, title: '云栖里 客厅改造', style: '新中式', area: '32㎡', customer: '李先生', house_type: '客厅', series: '禧YUE / 胡桃禮', images: 'images/hero-living-hd.png' }
    ],
    latest_news: [
      { id: 1, title: 'TP 全屋家居 2026 新品发布会圆满落幕', author: '品牌部', published_at: '2026-08-10', cover: '' },
      { id: 2, title: '定制家居行业上半年趋势报告', author: '研究中心', published_at: '2026-08-05', cover: '' }
    ],
    jobs: [
      { id: 1, title: '全屋定制设计师', job_type: 'social', department: '设计中心', location: '上海', employment_type: '全职' },
      { id: 2, title: '前端开发工程师', job_type: 'social', department: '信息技术部', location: '杭州', employment_type: '全职' },
      { id: 3, title: '管培生（家居设计方向）', job_type: 'campus', department: '人才发展部', location: '全国', employment_type: '实习' }
    ],
    stores: [
      { id: 1, name: 'TP 上海旗舰店', address: '上海市徐汇区漕溪北路 100 号', phone: '021-6666 8888', hours: '10:00-21:00' },
      { id: 2, name: 'TP 杭州体验馆', address: '杭州市西湖区文一西路 88 号', phone: '0571-8888 6666', hours: '10:00-20:00' }
    ],
    site: { copyright: '© 2026 TP 全屋家居 版权所有' }
  },
  categories: {
    series: [
      { id: 1, name: '胡桃禮' },
      { id: 2, name: '如意春' },
      { id: 3, name: '柏悦' }
    ],
    spaces: [
      { id: 1, name: '客厅', scope: 'all' },
      { id: 2, name: '卧室', scope: 'all' },
      { id: 3, name: '餐厅', scope: 'all' },
      { id: 4, name: '整屋', scope: 'all' }
    ],
    news_categories: [
      { id: 1, name: '企业新闻' },
      { id: 2, name: '行业资讯' }
    ]
  },
  products: [
    { id: 1, code: 'HP-001', name: '胡桃禮 沙发组合', series_id: 1, space_id: 1, material: '实木框架 + 真皮', dimensions: '320×95×85cm', images: 'images/hero-living-hd.png', description: '深木色新中式沙发组合', sort: 1, status: true, is_recommended: true },
    { id: 2, code: 'RC-014', name: '如意春 餐桌', series_id: 2, space_id: 3, material: '橡木', dimensions: '160×90×75cm', images: 'images/hero-dining.png', description: '轻奢原木暖调餐桌', sort: 2, status: true, is_recommended: true },
    { id: 3, code: 'BY-008', name: '柏悦 主卧衣柜', series_id: 3, space_id: 2, material: '多层实木', dimensions: '240×60×240cm', images: 'images/case-living.png', description: '现代极简主卧衣柜', sort: 3, status: true, is_recommended: false }
  ],
  cases: [
    { id: 1, title: '滨江一号 整屋定制', space_id: 4, area: '138㎡', style: '现代轻奢', customer: '王女士', house_type: '整屋', series: '如意春 / 柏悦', images: 'images/case-living.png', description: '全屋整装落地案例', status: true },
    { id: 2, title: '云栖里 客厅改造', space_id: 1, area: '32㎡', style: '新中式', customer: '李先生', house_type: '客厅', series: '禧YUE / 胡桃禮', images: 'images/hero-living-hd.png', description: '客厅空间改造案例', status: true },
    { id: 3, title: '栖湖苑 主卧', space_id: 2, area: '25㎡', style: '原木暖调', customer: '陈先生', house_type: '主卧', series: '蓝宝嘉 / 软体', images: 'images/hero-dining.png', description: '主卧空间定制案例', status: true }
  ],
  news: [
    { id: 1, title: 'TP 全屋家居 2026 新品发布会圆满落幕', category_id: 1, author: '品牌部', published_at: '2026-08-10', cover: '', summary: '发布胡桃禮与如意春两大系列', content: '正文内容...', status: true },
    { id: 2, title: '定制家居行业上半年趋势报告', category_id: 2, author: '研究中心', published_at: '2026-08-05', cover: '', summary: '行业洞察', content: '正文内容...', status: true }
  ],
  jobs: [
    { id: 1, title: '全屋定制设计师', job_type: 'social', department: '设计中心', location: '上海', employment_type: '全职', status: true },
    { id: 2, title: '前端开发工程师', job_type: 'social', department: '信息技术部', location: '杭州', employment_type: '全职', status: true },
    { id: 3, title: '管培生（家居设计方向）', job_type: 'campus', department: '人才发展部', location: '全国', employment_type: '实习', status: true }
  ],
  stores: [
    { id: 1, name: 'TP 上海旗舰店', address: '上海市徐汇区漕溪北路 100 号', phone: '021-6666 8888', hours: '10:00-21:00', status: true },
    { id: 2, name: 'TP 杭州体验馆', address: '杭州市西湖区文一西路 88 号', phone: '0571-8888 6666', hours: '10:00-20:00', status: true }
  ],
  about: {
    tp: { title: '关于TP', content: 'TP 全屋家居成立于 2008 年...' },
    brand: { title: '品牌介绍', content: '以匠心筑就理想栖居之境...' },
    contact: { title: '联系信息', content: '400-820-1888,service@tp-home.com,上海市徐汇区漕溪北路 100 号 TP 大厦' }
  }
};

/* ============================================================
 * 图片解析器：保证预览永远有图显示，不依赖外网
 * - 空值 → 优雅 SVG 占位（不会出现裂图）
 * - 本地相对路径（images/...）→ 直接用（离线可用）
 * - 后端上传路径（/uploads/...）→ 拼 API_BASE 由后端提供
 * - 外网地址（http/https）→ 轮播图降级为本地实拍图，避免离线裂图；
 *                          其它图片原样返回（尽量展示）。
 * ============================================================ */
const FALLBACK_HERO = 'images/hero-living-hd.png';
const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">' +
  '<rect width="100%" height="100%" fill="#1c1917"/>' +
  '<text x="50%" y="50%" fill="#a8a29e" font-family="sans-serif" font-size="30" ' +
  'text-anchor="middle" dominant-baseline="middle">TP 全屋家居</text></svg>'
);

const API_HOST = (window.API_BASE || 'http://127.0.0.1:8000').replace(/\/+$/, '');
function normalizeHost(u) {
  // 将 localhost 重写为 127.0.0.1，避免 Windows 把 localhost 解析到 IPv6 而 uvicorn 仅监听 IPv4
  return u.replace(/(https?:\/\/)localhost(:\d+)?(?=\/|$)/i, (_, proto, port) => proto + '127.0.0.1' + (port || ''));
}
function isBackendUrl(u) {
  return u.includes('/uploads/') || u.includes(API_HOST) || /https?:\/\/127\.0\.0\.1(:\d+)?\//i.test(u) || /https?:\/\/localhost(:\d+)?\//i.test(u);
}
function resolveImg(url) {
  if (url && typeof url === 'string' && url.trim()) {
    const u = url.trim();
    if (u.startsWith('http://') || u.startsWith('https://')) return normalizeHost(u);
    if (u.startsWith('/')) return API_HOST + u;
    return u;
  }
  return PLACEHOLDER_IMG;
}
function resolveHero(url) {
  if (url && typeof url === 'string' && url.trim()) {
    const u = url.trim();
    if (u.startsWith('http://') || u.startsWith('https://')) {
      // 后端返回的完整 URL 直接复用；只有真正的外网图（如 Unsplash）才降级为本地兜底
      return isBackendUrl(u) ? normalizeHost(u) : FALLBACK_HERO;
    }
    if (u.startsWith('/')) return API_HOST + u;
    return u;
  }
  return FALLBACK_HERO;
}

/* 后端不可达时回退到本地兜底数据，保证预览永远可显示 */
async function safe(fn, fallback) {
  try {
    return await fn();
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('[TP] 后端不可用，使用本地兜底数据：', e && e.message);
    return fallback;
  }
}

const publicApi = {
  home: () => safe(() => api('/api/home'), SEED.home),
  products: (params) => safe(() => api('/api/products?' + new URLSearchParams(params || {})), SEED.products),
  product: (id) => safe(() => api('/api/products/' + id), SEED.products.find(p => p.id == id) || SEED.products[0]),
  cases: (params) => safe(() => api('/api/cases?' + new URLSearchParams(params || {})), SEED.cases),
  case: (id) => safe(() => api('/api/cases/' + id), SEED.cases.find(c => c.id == id) || SEED.cases[0]),
  news: (params) => safe(() => api('/api/news?' + new URLSearchParams(params || {})), SEED.news),
  newsDetail: (id) => safe(() => api('/api/news/' + id), SEED.news.find(n => n.id == id) || SEED.news[0]),
  jobs: (params) => safe(() => api('/api/jobs?' + new URLSearchParams(params || {})), SEED.jobs),
  stores: () => safe(() => api('/api/stores'), SEED.stores),
  categories: () => safe(() => api('/api/categories'), SEED.categories),
  about: (key) => safe(() => api('/api/about/' + key), SEED.about[key] || { content: '' }),
  // 写操作不回退：后端未启动时应明确报错
  submitLead: (form) => api('/api/leads', { method: 'POST', body: new URLSearchParams(form) }),
  submitApply: (form) => api('/api/applies', { method: 'POST', body: new URLSearchParams(form) }),
};

const adminApi = {
  login: (form) => api('/api/admin/login', { method: 'POST', body: new URLSearchParams(form) }),
  upload: (file) => { const fd = new FormData(); fd.append('file', file); return api('/api/admin/upload', { method: 'POST', body: fd }); },
  // 轮播
  banners: () => api('/api/admin/banners'),
  createBanner: (d) => api('/api/admin/banners', { method: 'POST', body: JSON.stringify(d) }),
  updateBanner: (id, d) => api('/api/admin/banners/' + id, { method: 'PUT', body: JSON.stringify(d) }),
  deleteBanner: (id) => api('/api/admin/banners/' + id, { method: 'DELETE' }),
  // 亮点
  highlights: () => api('/api/admin/highlights'),
  createHighlight: (d) => api('/api/admin/highlights', { method: 'POST', body: JSON.stringify(d) }),
  updateHighlight: (id, d) => api('/api/admin/highlights/' + id, { method: 'PUT', body: JSON.stringify(d) }),
  deleteHighlight: (id) => api('/api/admin/highlights/' + id, { method: 'DELETE' }),
  // 系列
  series: () => api('/api/admin/series'),
  createSeries: (d) => api('/api/admin/series', { method: 'POST', body: JSON.stringify(d) }),
  updateSeries: (id, d) => api('/api/admin/series/' + id, { method: 'PUT', body: JSON.stringify(d) }),
  deleteSeries: (id) => api('/api/admin/series/' + id, { method: 'DELETE' }),
  // 空间
  spaces: () => api('/api/admin/spaces'),
  createSpace: (d) => api('/api/admin/spaces', { method: 'POST', body: JSON.stringify(d) }),
  updateSpace: (id, d) => api('/api/admin/spaces/' + id, { method: 'PUT', body: JSON.stringify(d) }),
  deleteSpace: (id) => api('/api/admin/spaces/' + id, { method: 'DELETE' }),
  // 产品
  products: () => api('/api/admin/products'),
  createProduct: (d) => api('/api/admin/products', { method: 'POST', body: JSON.stringify(d) }),
  updateProduct: (id, d) => api('/api/admin/products/' + id, { method: 'PUT', body: JSON.stringify(d) }),
  deleteProduct: (id) => api('/api/admin/products/' + id, { method: 'DELETE' }),
  // 案例
  cases: () => api('/api/admin/cases'),
  createCase: (d) => api('/api/admin/cases', { method: 'POST', body: JSON.stringify(d) }),
  updateCase: (id, d) => api('/api/admin/cases/' + id, { method: 'PUT', body: JSON.stringify(d) }),
  deleteCase: (id) => api('/api/admin/cases/' + id, { method: 'DELETE' }),
  // 新闻分类
  newsCats: () => api('/api/admin/news_categories'),
  createNewsCat: (d) => api('/api/admin/news_categories', { method: 'POST', body: JSON.stringify(d) }),
  updateNewsCat: (id, d) => api('/api/admin/news_categories/' + id, { method: 'PUT', body: JSON.stringify(d) }),
  deleteNewsCat: (id) => api('/api/admin/news_categories/' + id, { method: 'DELETE' }),
  // 新闻
  news: () => api('/api/admin/news'),
  createNews: (d) => api('/api/admin/news', { method: 'POST', body: JSON.stringify(d) }),
  updateNews: (id, d) => api('/api/admin/news/' + id, { method: 'PUT', body: JSON.stringify(d) }),
  deleteNews: (id) => api('/api/admin/news/' + id, { method: 'DELETE' }),
  // 关于 / 里程碑
  about: () => api('/api/admin/about'),
  updateAbout: (id, d) => api('/api/admin/about/' + id, { method: 'PUT', body: JSON.stringify(d) }),
  milestones: () => api('/api/admin/milestones'),
  createMilestone: (d) => api('/api/admin/milestones', { method: 'POST', body: JSON.stringify(d) }),
  updateMilestone: (id, d) => api('/api/admin/milestones/' + id, { method: 'PUT', body: JSON.stringify(d) }),
  deleteMilestone: (id) => api('/api/admin/milestones/' + id, { method: 'DELETE' }),
  // 门店
  stores: () => api('/api/admin/stores'),
  createStore: (d) => api('/api/admin/stores', { method: 'POST', body: JSON.stringify(d) }),
  updateStore: (id, d) => api('/api/admin/stores/' + id, { method: 'PUT', body: JSON.stringify(d) }),
  deleteStore: (id) => api('/api/admin/stores/' + id, { method: 'DELETE' }),
  // 职位
  jobs: () => api('/api/admin/jobs'),
  createJob: (d) => api('/api/admin/jobs', { method: 'POST', body: JSON.stringify(d) }),
  updateJob: (id, d) => api('/api/admin/jobs/' + id, { method: 'PUT', body: JSON.stringify(d) }),
  deleteJob: (id) => api('/api/admin/jobs/' + id, { method: 'DELETE' }),
  // 投递
  applies: () => api('/api/admin/applies'),
  updateApply: (id, d) => api('/api/admin/applies/' + id, { method: 'PUT', body: JSON.stringify(d) }),
  deleteApply: (id) => api('/api/admin/applies/' + id, { method: 'DELETE' }),
  // 线索
  leads: () => api('/api/admin/leads'),
  updateLead: (id, d) => api('/api/admin/leads/' + id, { method: 'PUT', body: JSON.stringify(d) }),
  deleteLead: (id) => api('/api/admin/leads/' + id, { method: 'DELETE' }),
  // 管理员
  admins: () => api('/api/admin/admins'),
  createAdmin: (d) => api('/api/admin/admins', { method: 'POST', body: JSON.stringify(d) }),
  updateAdmin: (id, d) => api('/api/admin/admins/' + id, { method: 'PUT', body: JSON.stringify(d) }),
  deleteAdmin: (id) => api('/api/admin/admins/' + id, { method: 'DELETE' }),
  // 设置 / 日志
  settings: () => api('/api/admin/settings'),
  updateSettings: (d) => api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(d) }),
  logs: () => api('/api/admin/logs'),
};

window.publicApi = publicApi;
window.adminApi = adminApi;
window.apiBase = API_BASE;
window.resolveImg = resolveImg;
window.resolveHero = resolveHero;
