# UI/UX 设计规范 · TP 全屋家居企业官网与后台管理系统

> 文档版本：v1.1（与 PRD v1.2 对应；同步原型 2026-08-18 的 Hero 建筑索引条与首页提亮改动）
> 适用范围：前台展示原型（用户侧）+ 后台管理原型（管理者侧）
> 事实来源：本文档所有视觉与交互规范均**忠实抽取自高保真原型代码**，不另行设计风格，以确保文档与实现零漂移。
> - 前台原型：`prototype-frontend/index.html`（单文件 SPA，#hash 路由）
> - 后台原型：`prototype-admin/admin.html`（单文件 SPA）
> - 后台登录页 `prototype-admin/admin-login.html` 本次**不纳入**本文档（按确认保留不动）。
> 配套需求文档：PRD-TP全屋家居企业官网与后台管理系统.md（v1.2）

---

## 第 1 章 文档信息与与 PRD 的关系

### 1.1 文档定位
本文件是 TP 全屋家居「官网 + 后台」高保真原型的 **UI/UX 设计规范（Design Spec）**，作为设计师、前端工程师、测试工程师的统一视觉与交互基准。

### 1.2 与 PRD 的边界（避免重复、明确分工）
| 维度 | PRD（v1.2） | 本 UI/UX 规范 |
|------|-------------|---------------|
| 管什么 | 做什么 / 为什么（功能、字段、流程、验收） | 长什么样 / 怎么交互（视觉令牌、组件、布局、状态、响应式、无障碍） |
| 读者 | 产品、研发、测试 | 设计师、前端、测试（视觉对齐） |
| 来源 | 业务需求推导 | 原型代码抽取（已落地的事实） |

> 凡 PRD 已定义的字段、状态枚举、流程，本文档不再复述，仅在「页面规范」中引用其编号（如 FE-PROD-01、BE-CASE-02）。

### 1.3 原型结构一览
| 端 | 入口文件 | 形态 | 路由 |
|----|----------|------|------|
| 前台（用户） | `prototype-frontend/index.html` | 单文件 SPA，6 大 section | URL #hash（可分享、刷新定位） |
| 后台（管理者） | `prototype-admin/admin.html` | 单文件 SPA，左侧菜单切模块 | 纯 JS 显隐（模块状态不入地址栏） |
| 后台登录 | `prototype-admin/admin-login.html` | 独立登录页（本文档不纳入） | — |

---

## 第 2 章 设计概览

### 2.1 设计原则
1. **高端克制**：以墨黑为底、砂白为纸、金线点睛，避免大色块与高饱和，传递「东方人居美学 + 全屋定制高级感」。
2. **双端气质统一但角色分明**：
   - 前台偏「品牌叙事」——衬线标题（Noto Serif SC）、舒展留白、大量图片与滚动叙事。
   - 后台偏「效率工具」——无衬线（Noto Sans SC）、信息密度高、Ant Design 风格的标准化组件。
3. **一致的设计语言**：两端共用同一套品牌色（金 #B08D57 / 墨 #1A1714 / 砂 #FAF8F5），确保从官网到后台的品牌延续性。

### 2.2 双端风格对照
| 维度 | 前台（官网） | 后台（管理） |
|------|--------------|--------------|
| 主字体 | Noto Serif SC（标题）+ Noto Sans SC（正文） | Noto Sans SC（全局） |
| 基底色 | 砂白 #FAF8F5 / 墨黑 #1A1714 | 中性灰底 #F0F2F5 + 墨黑侧栏 #1A1714 |
| 强调色 | 金 #B08D57 | 金 #B08D57（主操作）+ 状态色 |
| 圆角 | 小圆角 `rounded-sm`（2px 级） | 中圆角 6–10px |
| 阴影 | 轻投影 `shadow-xl` 用于悬浮卡片 | 极淡投影 `0 1px 3px rgba(0,0,0,.04)` |
| 密度 | 宽松（section `py-20`） | 紧凑（卡片/表格高信息密度） |

---

## 第 3 章 设计系统（Design Tokens）

> 本章所有值均直接来自原型 CSS。前端使用 Tailwind 扩展配置（`tailwind.config`），后台使用 `:root` CSS 变量。同一语义在两端的取值保持一致。

### 3.1 色彩令牌

#### 3.1.1 品牌色（前后台共用）
| 令牌 | 值 | 用途 | 原型位置 |
|------|-----|------|----------|
| `gold` / `--gold` / `--primary` | `#B08D57` | 主强调色：主按钮、激活态、品牌点缀、图表线 | 前台 `tailwind.config`；后台 `:root` |
| `gold-soft` / `--gold-2` / `--primary-hover` | `#C9A875` | 金色的 hover / 浅一档 | 同上 |
| `ink` / `--ink` | `#1A1714` | 墨黑：深色底、标题、侧栏背景 | 同上 |
| `ink-soft` / `--ink-2` | `#4A463F` / `#2b2620` | 次级墨色：正文弱化、侧栏次级 | 同上 |
| `sand` / `--sand` | `#FAF8F5` | 砂白：页面主背景、浅色卡片 | 同上 |
| `line` / `--border` / `--border-2` | `#E7E1D8` / `#f0f0f0` / `#e8e8e8` | 描边/分隔线 | 前台 `line`；后台 `--border` `#f0f0f0`、表单边框 `--border-2` `#e8e8e8` |

#### 3.1.2 文本色（后台语义化）
| 令牌 | 值 | 用途 |
|------|-----|------|
| `--text` | `#262626` | 主文本 |
| `--text-2` | `#595959` | 次级文本、表头 |
| `--text-3` | `#8c8c8c` | 占位/辅助说明、图表轴标 |

#### 3.1.3 状态色（后台为主，前端客服复用金）
| 令牌 | 值 | 用途 |
|------|-----|------|
| `--success` | `#52c41a` | 成功/上线标签（green 变体） |
| `--warning` | `#faad14` | 警告 |
| `--error` | `#ff4d4f` | 错误/危险操作/删除徽标 |
| `--blue` | `#1677ff` | 信息/链接、图表「在线留言」线 |

> 前台状态标签（产品上线/下线）使用金/灰双色：上线 `tag('上线','green')`、下线 `tag('下线','gray')`（见后台 tag 体系 3.4）。

#### 3.1.4 标签（Tag）配色体系（后台）
| 变体 | 文字 / 背景 / 边框 | 语义 |
|------|-------------------|------|
| `green` | `#389e0d` / `#f6ffed` / `#b7eb8f` | 成功、上线 |
| `gold` | `#ad6800` / `#fffbe6` / `#ffe58f` | 推荐、品牌 |
| `blue` | `#0958d9` / `#e6f4ff` / `#91caff` | 信息、产品+案例 |
| `red` | `#cf1322` / `#fff1f0` / `#ffa39e` | 删除、危险 |
| `gray` | `#595959` / `#fafafa` / `#d9d9d9` | 中性、下线 |
| `orange` | `#d46b08` / `#fff7e6` / `#ffd591` | 待处理、警告 |

### 3.2 字体与字阶
#### 3.2.1 字体族
| 角色 | 字体 | 字重加载 |
|------|------|----------|
| 前台标题（衬线） | `"Noto Serif SC", serif` | 400 / 500 / 600 / 700 |
| 前台正文（无衬线） | `"Noto Sans SC", sans-serif` | 300 / 400 / 500 / 700 |
| 后台全局 | `"Noto Sans SC", -apple-system, "PingFang SC", sans-serif` | 300 / 400 / 500 / 700（标题另用 Serif 600/700） |

#### 3.2.2 字阶（Font Scale）
| 层级 | 前台 | 后台 |
|------|------|------|
| 超大标题（Hero） | `text-5xl`~`text-6xl`（衬线，字间距 `tracking-[0.05em]`） | — |
| 区块标题（Section H2） | `text-3xl` + `eyebrow` 小标 | 页面标题 `font-size:20px`、模块标题 `16px` |
| 卡片标题 | `text-lg`~`text-xl` | 表格/卡片标题 `14px/600` |
| 正文 | `text-base`/`text-sm` | `14px`（body 基准） |
| 辅助文字 | `text-xs`（`tracking-widest` 金色彩标） | `12px`/`13px` |

> `eyebrow` 样式（前台小标签）：`text-gold text-xs tracking-[0.35em] uppercase font-medium`——用于区块上方「TP 全屋家居 · 一站式全屋定制」这类点睛短句。

### 3.3 间距与栅格
| 体系 | 前台 | 后台 |
|------|------|------|
| 基准 | 8px 体系（Tailwind 默认） | 8px 体系（padding 多用 10/12/14/18/20px） |
| 内容容器 | `max-w-7xl`（1280px）居中，`px-6` 左右留白 | 内容区 `padding:24px`，卡片内 `padding:18–20px` |
| 区块垂直节奏 | `section py-20`（80px） | 卡片 `margin-bottom:18px` |
| 栅格 | 产品 `grid-cols-1 sm:2 lg:4 gap-6`；案例 `md:3 gap-8` | 统计卡 `grid` 自适应；表格整行 |

### 3.4 圆角 / 阴影 / 描边
| 元素 | 前台 | 后台 |
|------|------|------|
| 按钮/输入/卡片 | `rounded-sm`（2px 级） | 输入/按钮 `6px`，卡片/弹窗 `10px`，分页 `5px` |
| 卡片阴影 | `hover:shadow-xl`（悬浮抬升） | `0 1px 3px rgba(0,0,0,.04)`（静止极淡） |
| 弹窗阴影 | 全局 modal（前台产品/案例详情） `shadow-xl` | `.ant-modal` `0 12px 40px rgba(0,0,0,.25)` |
| 描边 | `border-line`（#E7E1D8） | `1px solid #e8e8e8`（输入）/ `#f0f0f0`（表格） |

### 3.5 图标与图形
- **图标来源**：内联 SVG（线性 `stroke-width:1.8`），**不使用 emoji** 作为功能图标（客服浮动按钮、hero 箭头均为 SVG）。
- **品牌标记**：后台 logo 用衬线字标 `TP`（Noto Serif SC 24px / 700 / `letter-spacing:.15em`，色 `#fff`），右侧小字 `全屋家居`（`#B08D57`，`letter-spacing:.18em`）。

### 3.6 动效（Motion）
| 场景 | 时长 | 曲线/属性 | 原型位置 |
|------|------|-----------|----------|
| 导航/链接 hover 变色 | 200ms | `transition-colors duration-200` | 前台 `.nav-link`、下拉项 |
| 卡片悬浮抬升 | 300ms | `transition-all hover:-translate-y-1 hover:shadow-xl` | 前台 `.card-hover` |
| Hero 背景 Ken Burns 推进 | 7s | `transform scale(1)→scale(1.06)`，`transition:transform 7s ease-out` | 前台 `#hero-bg`（`#hero` 切图） |
| 控制条金色标高线滑移 | 500ms | `transition:[left] duration-500 ease-out` | 前台 `#hero-idx .idx-marker` |
| 侧栏收起/展开 | 200ms | `transition:width .2s` / `margin .2s` | 后台 `.sider`/`.main` |
| 菜单项 hover/激活 | 150ms | `transition:all .15s` | 后台 `.m-item` |
| 开关切换 | 200ms | `transition:.2s` | 后台 `.switch .slider` |
| 客服按钮 hover | 250ms | `transition:.25s` + `translateY(-2px)` | `js/chat.js` |

> 无障碍要求：所有动效应可被 `prefers-reduced-motion` 关闭（见第 8 章）。

### 3.7 图表令牌（后台看板，ECharts）
| 系列 | 颜色 | 含义 |
|------|------|------|
| 在线留言 | `#1677ff` | 留言式客服线索趋势 |
| 预约到店 | `#B08D57` | 预约线索趋势 |
| 招聘投递 | `#52c41a` | 招聘投递趋势 |
| 坐标轴文字 | `#8c8c8c` | `axisLabel` |
| 分隔线 | `#f0f0f0` | `splitLine` |

---

## 第 4 章 通用组件库

### 4.1 前台组件
| 组件 | 规范 | 原型引用 |
|------|------|----------|
| 顶部导航 | `sticky top-0 z-50`，`bg-sand/95 backdrop-blur`，`border-b border-line`，高 `h-20`；含 logo、主导航（hover 下拉二级）、「在线预约」金按钮、移动端汉堡菜单 | `index.html` `<header>` |
| 下拉菜单 | 白色卡片 `bg-white border border-line shadow-xl rounded-sm`；项 `px-6 py-2.5 text-[15px]`，hover `bg-sand text-gold`；`group-hover` 200ms 展开 | `index.html` 导航下拉 |
| 页脚 | `bg-[#14110E] text-white/70 py-16`，多列链接 + 版权 | `index.html` `<footer>` |
| 主按钮 `.btn-gold` | `bg-gold text-white`，`px-7 py-3`，`rounded-sm`，`tracking-[0.15em]`，hover `bg-gold-soft` | `index.html` `.btn-gold` |
| 幽灵按钮 `.btn-ghost` | `border border-ink/30 text-ink`，hover `border-gold text-gold`；深色底上用 `border-white/40 text-white` | `index.html` `.btn-ghost` |
| 筛选 chip | `px-4 py-2 rounded-sm border border-line text-ink/70`，hover/激活 `border-gold text-gold`；激活态 `.chip-active` `bg-ink text-white` | `index.html` `.chip`/`.chip-active` |
| 输入框 `.input` | `w-full px-4 py-3 rounded-sm border border-line bg-white`，聚焦 `ring-2 ring-gold` | `index.html` `.input` |
| 卡片（悬浮） | 图片/内容卡，`card-hover` 抬升 + 阴影 | `index.html` `.card-hover` |
| 弹窗（详情） | 产品/案例详情改为页内 modal，半透明遮罩 + 居中白卡 | `index.html` `#product-modal`/`#case-modal` |
| 在线客服 `chat.js` | 右下浮动金圆钮（56px，`#B08D57`，`shadow 0 8px 24px`）；面板 360px 宽，头 `#1A1714`，快捷短语 chip（圆角 999px），提交金按钮，聚焦 `ring rgba(176,141,87,.12)`；提交成功显示「提交成功」态 | `js/chat.js` |
| 地图占位 | `about` 页嵌入 `images/map-screenshot.png`（按 PRD Q3 先截图占位，不决定地图供应商） | `index.html` `#about/contact` |

### 4.2 后台组件（Ant Design 风格，手写 CSS）
| 组件 | 规范 | 原型引用 |
|------|------|----------|
| 侧边栏 `.sider` | 固定 `width:224px`，`bg-ink` 墨黑，文字 `#FAF8F5`；可收起（`transition width .2s`）；分组标题 `rgba(250,248,245,.55)` 13px | `admin.html` `.sider` |
| 菜单项 `.m-item` | `padding:10px 20px 10px 34px`，14px，`rgba(250,248,245,.78)`；hover `#fff` + `rgba(255,255,255,.06)`；active `rgba(176,141,87,.16)` + `#fff` | `admin.html` `.m-item` |
| 顶栏 | 面包屑 + 收起按钮（32×32，`radius 6px`）+ 消息徽标（`.badge` error 红，圆角 8px）+ 用户头像（32×32 圆，金底白字）+ 用户菜单（白卡 `radius 8px` `shadow 0 6px 20px`） | `admin.html` `.topbar`/`.user-menu` |
| 内容卡片 `.card` | `bg #fff radius 10px shadow 0 1px 3px`，`margin-bottom:18px` | `admin.html` `.card` |
| 统计卡 `.stat` | 白卡 + 左侧 `3px solid gold` 金边，内嵌数字与环比 | `admin.html` `.stat` |
| 表格 `.ant` | 表头 `bg #fafafa`，`padding 12px 14px`，600；行 hover `bg #fcfaf6`；整行 `white-space:nowrap` | `admin.html` `table.ant` |
| 标签 `.tag` | 见 3.1.4 六变体 | `admin.html` `.tag.*` |
| 输入框/下拉 `.ipt` | `height:34px`，`border 1px #e8e8e8`，`radius 6px`，`padding 0 10px`，13px | `admin.html` `input.ipt/select.ipt` |
| 按钮 `.btn` | `height:34px`，`padding 0 16px`，`radius 6px`，13px，描边灰；`.primary` 金底白字；`.danger` 红字红边 hover `#fff1f0` | `admin.html` `.btn*` |
| 分页 `.pager` | 项 `padding 4px 10px`，`border 1px #e8e8e8`，`radius 5px` | `admin.html` `.pager` |
| 筛选条 `.filter-bar` | `bg #fafafa`，`border 1px #f0f0f0`，`radius 8px`，`padding 14px`，`gap 10px`，`margin-bottom:16px` | `admin.html` `.filter-bar` |
| 弹窗 `.ant-modal` | 遮罩 `rgba(0,0,0,.45)` `z-100`；卡片 `bg #fff radius 10px width 520px max-width 94vw max-height 90vh shadow 0 12px 40px` | `admin.html` `.modal-root`/`.ant-modal` |
| 表单行 `.form-row` | `label` + 控件（输入/下拉/文本域）`width 100% border 1px #e8e8e8 radius 6px padding 8px 10px 13px` | `admin.html` `.form-row` |
| 开关 `.switch` | 轨道 `bg #ccc radius 24px`；圆钮 18×18 白；开启变金 | `admin.html` `.switch` |
| 上传区 `.upload` | 虚线框 `1px dashed #e8e8e8 radius 8px padding 18px bg #fafafa min-h 80px`；有图时实线金边 `.has-img` | `admin.html` `.upload` |
| 时间轴 `.tl-item` | 圆点 `10×10 radius 50% bg gold border 2px #fff shadow 0 0 0 2px gold` | `admin.html` `.tl-item` |
| 角色标签 `.role-tag` | `font 11px padding 1px 8px radius 10px bg rgba(176,141,87,.15) color gold` | `admin.html` `.role-tag` |
| 推荐选择器 `.rec-picker` | `max-height 52vh overflow auto border 1px #f0f0f0 radius 8px` | `admin.html` `.rec-picker` |

---

## 第 5 章 前台页面 UI 规范

> 路由：单文件 SPA，地址栏 `#hash`。导航高亮当前 section。页面切换为显隐（无整页刷新）。

### 5.1 路由与页面清单
| Hash | 页面 | 对应 PRD |
|------|------|----------|
| `#home` | 首页 | FE-HOME-* |
| `#products` | 产品中心 | FE-PROD-01/02 |
| `#cases` | 新案例展示 | FE-CASE-01/03 |
| `#news` / `#news/enterprise` / `#news/industry` | 新闻中心（企业/行业） | FE-NEWS-* |
| `#about` / `#about/about-tp` / `#about/history` / `#about/brand` / `#about/appointment` / `#about/contact` | 关于我们（含在线预约、联系我们） | FE-ABOUT-* |
| `#recruitment` / `#recruitment/social` / `#recruitment/campus` | 加入我们（社招/校招） | FE-RECRUIT-* |

### 5.2 首页 `#home`
- **Hero**：`h-[88vh] min-h-[560px] bg-ink`；背景家居大图 `images/hero-living-hd.png`（`opacity-85` 叠加，较初版提亮）+ 90° 渐变遮罩 `linear-gradient(90deg,rgba(26,23,20,.46) 0%,.18 45%,.04 100%)`（左暗托字、右透出图）；`eyebrow` 金彩标 + 衬线大标题 + 副文案 + 双按钮（`.btn-gold` 探索产品 / `.btn-ghost` 预约设计）。
- **轮播控制条（建筑索引条）**：位于 Hero 底部、对齐 `max-w-7xl` 内容列（`bottom-8`），由「索引基线 + 刻度 + 金色标高线 + 右侧箭头/空间名」构成，取代初版的居中磨砂胶囊：
  - **索引基线**：1px 水平线 `bg-white/30`，像建筑标高基准线。
  - **刻度**：每个轮播为线上一个刻度（`.tick`，`w-px h-2 bg-white/45`，hover `bg-white/90 h-3`），当前刻度 `aria-selected="true"` 变金；刻度 `role="tab"` + `aria-label`（空间名=轮播 `title`）。
  - **金色标高线**：当前刻度自基线向上延伸一根金色竖线（`.idx-marker`，`w-[2px] h-6 bg-gold` + 柔光 `0 0 10px rgba(176,141,87,.6)`），随切换以 `transition left 500ms ease-out` 平滑滑移；hover 某刻度时标高线预滑到该刻度、移开回弹。
  - **右侧控制**：极简线条箭头 `‹` `›`（`text-2xl`，hover `text-gold`）+ 常驻当前空间名（`#hero-space`，衬线 `text-sm tracking-[.18em] text-white/85`）；索引条 `role="tablist" aria-label="首页轮播"`。
  - **交互**：点击刻度 / 键盘 ← →（仅 `#sec-home` 可见时生效）/ 触摸左右滑动（`|dx|>40`）切换；自动播放 `setInterval 7000`，hover 整块暂停；手动切换重置计时。
  - **切换动效**：背景图 Ken Burns 缓慢推进（`scale(1)→scale(1.06)`，`transition transform 7s ease-out`），营造空间纵深感；页面原有标题/副文/按钮文字保持不变。
- **品牌亮点**：`grid-cols-1 sm:2 lg:4 gap-6`，卡片由 `/api/home` 的 `highlights` 渲染，悬浮 `card-hover` 抬升。
- **推荐产品 / 推荐案例**：各取 `is_recommended` 优先，产品 4 列、案例 3 列。
- **CTA 带（加入我们）**：`bg-white border border-line text-ink rounded-sm p-12`，左文右金按钮「查看职位」（初版的 `bg-ink text-white` 深色块已改为浅色卡片，首页整体收尾不再压暗）。
- **加载态**：数据未到时区块显示「加载中…」（`text-ink-soft`）。

### 5.3 产品中心 `#products`
- **筛选区**：系列下拉、空间场景下拉、状态（上线/下线）、「首页推荐」chip、关键词输入；`.chip`/`.chip-active` 切换；「查询」「重置」按钮。
- **卡片网格**：`grid-cols-1 sm:2 lg:4 gap-6`；封面图 + 名称 + 系列标签 + 空间标签 + 材质/尺寸；首页推荐项左上角金角标（`tag gold`）；hover `card-hover`。
- **详情**：点击卡片打开页内 modal，展示多图、系列、空间、材质、尺寸、说明。
- **空状态**：筛选无结果或某系列暂无产品时，显示「『XX』系列暂无产品，前往后台添加后即可在前台展示」。

### 5.4 案例展示 `#cases`
- **卡片网格**：`md:3 gap-8`；封面 + 标题 + 空间 + 风格。
- **详情 modal**：多图、项目面积、风格、空间、客户（`customer`）、户型（`house_type`）、所用系列（`series`）；按 PRD v1.2 不再展示「关联产品跳转」。

### 5.5 新闻中心 `#news`
- 顶部标签切换「企业新闻 / 行业资讯」（`#news/enterprise`、`#news/industry`）；列表卡片（封面 + 标题 + 日期 + 摘要）；点击打开新闻详情 modal。

### 5.6 关于我们 `#about`
- 左侧二级导航（关于TP / 发展历程 / 品牌介绍 / 在线预约 / 联系我们），各自独立锚点。
- **在线预约**：表单（姓名、电话、城市、意向门店、需求类型、留言），提交生成「预约到店」线索（见 FE-NAV-05 关联）。
- **联系我们**：门店信息 + `images/map-screenshot.png` 地图截图占位（PRD Q3）。

### 5.7 加入我们 `#recruitment`
- 社招/校招切换（`#recruitment/social`、`#recruitment/campus`）；职位卡片列表；点击 JD 打开 modal（职位详情 + 投递表单，生成「招聘投递」线索）。
- 头图使用本地 `images/hero-dining.png`（原型已统一换成本地图，离线不裂）。

### 5.8 在线客服（全局）
- 全站右下浮动（见 4.1 `chat.js`）；提交 `requirement_type:'在线客服咨询'`，落入后台「在线留言」。

### 5.9 前台状态/反馈
| 状态 | 表现 |
|------|------|
| 加载 | 区块内「加载中…」 |
| 空 | 卡片网格区提示文案（如系列暂无产品） |
| 错误 | 数据拉取失败用 `api.js` SEED 兜底渲染（离线可用） |

---

## 第 6 章 后台页面 UI 规范

> 后台为单文件 SPA，左侧 `.sider` 菜单切换模块（纯 JS 显隐）。以下列出主要模块及其 UI 要点。登录页（`admin-login.html`）按确认不纳入。

### 6.1 整体布局
- 固定墨黑侧栏（224px）+ 右侧顶栏（面包屑 + 收起 + 消息徽标 + 用户菜单）+ 内容区（`padding 24px`，浅灰底 `#F0F2F5`）。
- 顶栏高度约 56–64px，与侧栏 logo 区齐平。

### 6.2 看板（首页 / Dashboard）
- 顶部 4 张统计卡 `.stat`（金左边框），含总数/今日新增/待处理等。
- ECharts 趋势图：三条折线（在线留言蓝、预约到店金、招聘投递绿），坐标轴 `#8c8c8c`。
- 待处理列表（时间轴 `.tl-item`）：点击「去处理」打开对应详情（lead/apply）。

### 6.3 首页配置
- Banner 轮播管理：上传区 `.upload` + 列表（封面缩略 56×40 + 标题 + 排序 + 状态 tag）；新增/编辑走 `.ant-modal`。
- 品牌亮点管理：新增/编辑弹窗 `editHighlight/saveHighlight`（图标、标题、描述、排序、上线）。
- 推荐产品管理（BE 相关）：`.rec-picker` 勾选上线产品并设 `sort`，仅变化项调 API；同步前台产品中心（见 PRD 优化项）。

### 6.4 产品管理
- **产品系列**：CRUD 表格（封面/名称/描述/排序/产品数/状态）；新增/编辑 `editSeries/saveSeries` 支持封面 `.upload` 与上线开关；产品数为可点击链接跳单品筛选。
- **单品管理**：筛选条（系列/空间/状态/关键词）+ 查询/重置；表格（编码/名称/系列/空间/材质/尺寸/状态/操作）；新增/编辑 `editProduct/saveProduct` 下拉选系列 `series_id`、空间 `space_id`、上传封面、上线与首页推荐开关。
- **空间场景分类**：CRUD（名称/应用范围 scope/排序/产品数/状态）；与案例空间分类共用 `spaces` 表。

### 6.5 案例管理
- 案例列表：封面/标题/空间/客户/户型/状态；新增/编辑 `editCase/saveCase`（标题、空间、面积、风格、客户、户型、所用系列、多图上传、描述富文本、上线）。
- 案例空间场景分类：复用 `SpaceCategory`（scope 区分 all/product/case），见 PRD BE-CASE-02。

### 6.6 内容管理（新闻 / 招聘 / 门店 / 关于）
- 新闻：分类（企业/行业）、标题、封面、摘要、正文（富文本）、状态。
- 招聘：职位（社招/校招）、部门、工作地点、JD、状态；投递记录查看。
- 门店：门店名、地址、电话、地图截图（与官网一致占位）。
- 关于我们：品牌介绍、发展历程、联系方式、在线预约配置。

### 6.7 互动与线索
- 在线留言（含在线客服咨询）、预约到店、招聘投递：列表 + 详情 drawer/modal；状态流转（待处理→已跟进）。

### 6.8 系统管理
- 管理员（Admin）：列表含真实姓名、角色、性别、岗位、部门（`dept_id`，对应 PRD 新增 Department 实体）、状态；新增/编辑含密码、角色、部门、岗位。
- 角色与权限：角色标签 `.role-tag`，权限项 `.perm-item` 勾选。
- 操作日志：时间轴展示。

---

## 第 7 章 交互与状态规范

### 7.1 前台
| 场景 | 规范 |
|------|------|
| 路由切换 | 点击导航 `location.hash` 变化，监听 `hashchange` 显隐对应 section；刷新可定位；浏览器前进/后退可用 |
| 导航高亮 | 当前 section 对应菜单项高亮金色 |
| 下拉菜单 | hover 展开（桌面），移动端折叠进汉堡菜单 |
| 详情 | 页内 modal，遮罩点击/关闭按钮关闭 |
| 客服提交 | 校验称呼+11 位手机号；成功后显示「提交成功」2.5s 自动收起；后端失败仍展示成功（离线友好） |
| 离线兜底 | `api.js` SEED 本地数据，后端不可达时仍可渲染 |

### 7.2 后台
| 场景 | 规范 |
|------|------|
| 模块切换 | 左侧菜单点击，纯 JS 显隐当前视图（`showView`） |
| 保存反馈 | 成功 `closeModal + reload`；失败 `alert('保存失败：'+e.message)` |
| 401 处理 | `api.js` 遇 401 清除 token 并跳登录页 |
| 删除确认 | `delRow` 走确认后调 DELETE API |
| 上传 | 透明 `file input` 覆盖 `.upload`，选图即传 `/api/admin/upload`，返回 `/uploads/...` 回显 |
| Toast/提示 | 当前以 `alert` 承载轻提示；建议在正式版统一为非阻塞 Toast（见 8.4 建议） |

### 7.3 空 / 加载 / 错误态
| 端 | 空态 | 加载 | 错误 |
|----|------|------|------|
| 前台 | 文案提示（如系列暂无产品） | 「加载中…」 | SEED 兜底 |
| 后台 | 表格「暂无数据」 | 视实现 | `alert` 错误信息 |

---

## 第 8 章 无障碍与可用性审计

> 本章对原型现状做审计（基于 ui-ux-pro-max 可用性/无障碍视角），并给出「现状 / 建议」。原型已较好地遵循品牌一致性，以下为上线前需补强的点。

### 8.1 对比度（WCAG AA 4.5:1）
| 文本组合 | 对比度 | 结论 |
|----------|--------|------|
| 金 `#B08D57` 文字 on 白 | ≈ 3.0:1 | ⚠ 低于 4.5:1，**仅用于大号/非正文**（如 eyebrow、激活态点缀）；正文文字应避免纯金 |
| 墨 `#1A1714` on 砂 `#FAF8F5` | ≈ 14:1 | ✅ 优秀 |
| 白 on 墨 `#1A1714`（侧栏/footer/Hero） | ✅ | ✅ 优秀 |
| `--text-3 #8c8c8c` on 白 | ≈ 3.5:1 | ⚠ 仅作辅助说明；关键文字用 `--text-2` |
| 状态 tag 文字 on 浅底（如 `#ad6800` on `#fffbe6`） | ✅ | ✅ 达标 |

**建议**：金仅用于强调/装饰与大字；正文与表单标签用墨/灰；图表中的金色线已达标（背景白）。

### 8.2 焦点与键盘可达
- **现状**：链接/按钮为可聚焦元素；Hero 轮播控制条刻度已用 `role="tab"` + `aria-label`（空间名）、索引条 `role="tablist"`、左右箭头 `aria-label`（上一张/下一张）；`menu-btn`、客服按钮已设 `aria-label`；键盘 ← → 可在首页切换轮播。
- **建议**：
  - 为所有交互控件（含 Hero 刻度 `.tick`、chip、下拉项、弹窗关闭、上传区）显式提供 `:focus-visible` 焦点环（金 `outline` 或 `ring`），键盘 Tab 可见。
  - 弹窗打开时聚焦首个输入/关闭按钮，并支持 `Esc` 关闭、`focus trap`。
  - 后台侧栏菜单项补充 `role`/`aria-current` 表达激活态。

### 8.3 触控目标与响应式
- **触控尺寸**：前台按钮 `px-7 py-3`、客服钮 56px 均 ≥ 44px，达标；**Hero 线条箭头 `text-2xl`（≈24px）与刻度（2px 宽）小于 44px 触控建议**，建议为箭头加 `padding`/`min-w` 扩大可点区；后台菜单项 `10px 20px` 高度约 40px，建议 ≥ 44px（尤其触屏后台场景）。
- **`prefers-reduced-motion`**：建议所有 `transition/animation` 在 `reduced-motion` 下降级为瞬时；**重点**：Hero 的 7s Ken Burns 推进（`transform 7s`）与 7s 自动播放应在 `reduced-motion` 下禁用（改为瞬时切换/暂停），当前原型未显式处理，作为上线前补强项。

### 8.4 其他可用性建议
| 项 | 现状 | 建议 |
|----|------|------|
| 轻提示 | 后台多用 `alert` | 正式版统一为页面内 Toast（非阻塞、可自动消失），与品牌金一致 |
| 图片 `alt` | Hero/卡片多为装饰图，部分缺 `alt` | 为内容图（产品/案例封面）补 `alt` 描述 |
| 表单错误 | 行内 `alert` | 字段下方红字提示 + 红边框，符合 Ant Design 反馈规范 |
| 语言 | 界面中文为主 | 保持；占位文本避免「XXX」未替换（如客服热线 `400-XXX-XXXX`） |

---

## 第 9 章 响应式断点与适配矩阵

### 9.1 断点定义（Tailwind 默认 + 后台弹性）
| 断点 | 范围 | 前台策略 | 后台策略 |
|------|------|----------|----------|
| 移动 `<768px` | 手机 | 汉堡菜单（`lg:hidden` 以下）；栅格 1 列；Hero 高度保持 `min-h-[560px]` | 侧栏建议抽屉化/可收起；表格横向滚动 |
| 平板 `768–1279px` | 平板 | `sm:grid-cols-2`；导航仍桌面展开（≥`lg` 1024 才显完整） | 内容区自适应；统计卡 2 列 |
| 桌面 `≥1280px` | 桌面 | `max-w-7xl`（1280）居中；产品 4 列、案例 3 列 | 侧栏固定 224px；多列统计/表格完整 |

### 9.2 前台适配要点
- 导航：`lg:hidden` 汉堡 + `#mobile-menu` 折叠（≥1024 显桌面导航）。
- Hero 控制条在移动端对齐 `max-w-7xl` 内容列居中（与桌面一致），箭头尺寸不变。
- 客服面板：`<480px` 时 `width:calc(100vw - 44px)`，按钮 `right:16px bottom:16px`（见 `chat.js` 媒体查询）。
- 栅格：产品 `lg:4 / sm:2 / 1`；案例 `md:3 / 1`；统计 `sm:2 / 1`。

### 9.3 后台适配要点
- 侧栏 `224px` 固定；内容区 `margin-left:224px`，收起时过渡 `margin .2s`。
- 表格在窄屏 `overflow-x:auto`，保持 `white-space:nowrap` 不被挤压。
- 弹窗 `max-width:94vw` / `max-height:90vh` 已防溢出。
- 建议（未实现）：≤768px 时侧栏转为顶部抽屉或图标栏，提升移动管理可用性。

---

## 第 10 章 附录

### 10.1 设计令牌速查（前后台对照）
| 语义 | 前台令牌 | 后台令牌 | 值 |
|------|----------|----------|-----|
| 品牌金 | `gold` | `--gold` / `--primary` | `#B08D57` |
| 金 hover | `gold-soft` | `--gold-2` / `--primary-hover` | `#C9A875` |
| 墨黑 | `ink` | `--ink` | `#1A1714` |
| 砂白 | `sand` | `--sand` | `#FAF8F5` |
| 描边 | `line` | `--border`/`--border-2` | `#E7E1D8`/`#f0f0f0`/`#e8e8e8` |
| 成功 | — | `--success` | `#52c41a` |
| 错误 | — | `--error` | `#ff4d4f` |
| 信息蓝 | — | `--blue` | `#1677ff` |

### 10.2 组件清单（按端）
- **前台**：导航 / 下拉 / 页脚 / 主按钮 / 幽灵按钮 / chip / 输入 / 卡片 / 详情 modal / 在线客服 / 地图占位。
- **后台**：侧栏 / 菜单项 / 顶栏 / 统计卡 / 表格 / 标签 / 输入 / 按钮 / 分页 / 筛选条 / 弹窗 / 表单行 / 开关 / 上传 / 时间轴 / 角色标签 / 推荐选择器。

### 10.3 与 PRD 待确认项（§15）的对齐
| PRD §15 项 | 原型/文档现状 |
|------------|---------------|
| Q1 图片尺寸 | 已采纳建议，原型统一本地图（`hero-living-hd`/`hero-dining`/`case-living`/`map-screenshot`） |
| Q2 富文本 | 案例/新闻描述使用富文本（WangEditor 路线已确认） |
| Q3 地图 | 官网/后台均嵌入 `map-screenshot.png` 截图占位，未绑定地图供应商 |
| Q4 某待定问题 | 保留至后续版本 |
| Q5 某项 | 本期不做 |
| 在线客服 | FE-NAV-05 已实现留言式客服（`chat.js`），提交类型为「在线客服咨询」 |

### 10.4 未纳入说明
- 后台登录页 `prototype-admin/admin-login.html` 按用户确认**保留不动且不纳入**本文档；其 UI 若需规范，可在后续版本单独补充。
- 根目录早期单文件原型 `tp-website-prototype.html` 为历史版本，不在本规范范围。

### 10.5 引用原型路径索引
- 前台单文件：`prototype-frontend/index.html`（#home / #products / #cases / #news / #about / #recruitment）
- 前台脚本：`prototype-frontend/js/api.js`、`prototype-frontend/js/chat.js`
- 前台图片：`prototype-frontend/images/`（hero-living-hd / hero-dining / case-living / map-screenshot）
- 后台单文件：`prototype-admin/admin.html`
- 后台图片：`prototype-admin/images/`（hero-living-hd / hero-dining / case-living）

---

*本文档为原型代码的忠实抽取与规范化，作为 UI/UX 评审、前端实现与测试验收的统一基准。任何视觉/交互改动应先在此文档同步，再落地代码。*
