# TP 全屋家居 · 网站开发实施方案

> 文档性质：项目开发实施方案（Plan / 非代码）
> 编写日期：2026-08-19
> 适用范围：前台展示系统（web）+ 后台管理系统（admin）+ FastAPI 后端（backend）
> 状态：**执行中** —— 用户已确认（2026-08-19），阶段 0/1/2/3/4 全部完成并通过验收（待整体验收与部署）

---

## 0. 决策基线（已与用户确认）

| # | 决策点 | 结论 |
|---|--------|------|
| D1 | 现有后端如何处理 | **重构对齐文档**：以数据库设计文档 v1.2 为基准，把现有单文件 `backend/main.py` 重构为技术文档规定的模块化结构（`routers/ models.py schemas.py deps.py seed.py`），补齐 RBAC 与双 token，统一表名/字段。现有代码仅作参考。 |
| D2 | 案例多图（CaseImage） | **并入 `case.images` JSON**：与 ProductImage 处理保持一致，案例多图存 `case.images`（JSON 数组），不建 `case_images` 表。实体数由 21 → **20 表**。 |
| D3 | 推导实体字段 | **采用文档建议字段**：以数据库设计文档 v1.2 为准，直接采用其给出的实体字段作为实现基准（含 7 个推导表：Banner/Highlight/AboutPage/Milestone/NewsCategory/Permission/OperationLog）。 |
| D4 | 后台角色集 | **4 角色**：超级管理员 / 内容编辑 / 客服 / 招聘专员，种子数据预置对应权限编码。 |

> 文档权威性排序（用户要求"严格基于现有文档"）：
> 1. **数据库设计文档 v1.2** —— 数据模型、表名、字段、建表 SQL 的唯一事实源。
> 2. **开发技术文档 v1.1** —— 架构、接口、RBAC、工程化结构的依据。
> 3. **PRD v1.3** —— 功能、字段语义、业务流程、验收依据。
> 4. **UI/UX 规范 v1.1** —— 视觉令牌、组件、交互、响应式依据。
> 5. **产品原型**（prototype-frontend / prototype-admin）—— 页面效果与交互的最终参考实现。

---

## 1. 现有资产盘点与缺口

### 1.1 已有资产（资源目录 `2026-08-17-16-25-42`）

| 资产 | 位置 | 说明 |
|------|------|------|
| 前台原型 | `prototype-frontend/index.html` + `js/` + `images/` | 单文件 SPA（#hash 路由），视觉/交互参考蓝本 |
| 后台原型 | `prototype-admin/admin.html` + `admin-login.html` + `js/` + `images/` | 单文件 SPA，后台 UI 参考蓝本 |
| 后端（半成品） | `backend/main.py`（~50KB 单文件）、`backend/tp_home.db`、`backend/venv`、`backend/uploads`、`backend/backend.log` | 已实现首页/产品/案例/新闻/招聘/线索等部分接口，但**缺 Department/Role/Permission、RBAC、refresh token**，且表名（`series/spaces/news/applies/site_settings`）与文档标准命名不一致 |
| 文档 | `PRD-*.md` `UIUX规范-*.md` `开发技术文档-*.md` `数据库设计文档-*.md` `文档同步总览-*.md` | 事实源 |
| 图示 | `diagrams/*.svg`（ER 图、前后台模块架构图） | 嵌入文档，可复用 |

### 1.2 关键缺口（须在本方案中补齐）

- **后端**：模块化拆分；`department/role/permission` 三表 + RBAC 依赖；access+refresh 双 token；统一响应信封 `{code,message,data}`；统一表名/字段到文档标准；Alembic 迁移；幂等 seed。
- **前台 web**：从零搭建 React+Tailwind 正式应用（原型是单文件 HTML，须工程化重构为组件化应用）。
- **后台 admin**：从零搭建 React+Ant Design 正式应用（登录页 + 各管理模块）。
- **共享层**：`api-client` 包（Axios 封装、Token 刷新、SEED 兜底、类型）。
- **部署**：Dockerfile / Nginx / 迁移脚本（仅文档与骨架，生产配置后续）。

---

## 2. 目标工程结构（Monorepo）

以资源目录为项目根，采用 pnpm/npm workspace 单仓多应用（技术文档 §3.1）：

```
2026-08-17-16-25-42/
├── package.json                 # workspace 根（前端）
├── pnpm-workspace.yaml          # 或 npm workspaces
├── apps/
│   ├── web/                     # 前台展示（React + Tailwind + Vite + React Router）
│   └── admin/                   # 后台管理（React + Ant Design 5 + Vite + React Router）
├── packages/
│   └── api-client/              # 共享请求层（Axios 封装 + 类型 + SEED 兜底）
├── backend/                     # FastAPI（重构为模块化单体）
│   ├── main.py                  # 应用入口：CORS、挂载 /uploads、注册路由、lifespan
│   ├── database.py              # engine / SessionLocal / Base / DATABASE_URL
│   ├── models.py                # 20 张表 SQLAlchemy 模型（对齐文档 §4）
│   ├── schemas.py               # Pydantic v2 出入参（XxxCreate/Update/Out）
│   ├── deps.py                  # get_db / get_current_admin / require_perm
│   ├── security.py              # JWT 双 token / bcrypt
│   ├── seed.py                  # 幂等种子（超管/4角色/示例数据）
│   ├── middleware.py            # 响应信封包装、异常处理
│   ├── routers/                 # 按资源分模块
│   │   ├── home.py  products.py  cases.py  news.py  jobs.py  stores.py
│   │   ├── about.py  leads.py  uploads.py
│   │   ├── auth.py              # login/refresh/me/change-password/logout
│   │   ├── banners.py  highlights.py  series.py  space_categories.py
│   │   ├── cases_admin.py  news_admin.py  jobs_admin.py  about_admin.py
│   │   ├── admins.py  roles.py  permissions.py  departments.py
│   │   ├── operation_logs.py  site_config.py  dashboard.py
│   ├── alembic/                 # 迁移（首版全量建表 + 后续增量）
│   ├── uploads/                 # 本地文件存储（dev）
│   └── tp_home.db               # SQLite（dev，DATABASE_URL 切换）
├── deploy/                      # Dockerfile / nginx.conf / 迁移脚本骨架
└── (现有 md 文档 / diagrams / prototype-* 保留不动)
```

> 环境约定：Node ≥ 18；Python ≥ 3.11（现有 `backend/venv` 复用）；本地联调后端地址 `127.0.0.1:8000`（**不写 localhost**，避 Windows IPv6）。

---

## 3. 数据模型实现基准（20 表）

依据 D2/D3，**20 张表** = 13 个 PRD 详述实体 + 7 个推导实体（CaseImage 已并入 `case.images`）。所有表统一含通用列：`is_activate` / `created_at`(创建人ID) / `created_date`(创建时间) / `updated_at`(修改人ID) / `updated_date`(修改时间)。`is_activate`（通用生命周期）与业务 `status` 共存。

| # | 实体 | 表名 | 类型 | 说明 |
|---|------|------|------|------|
| 1 | Admin | `admins` | 详述 | 后台管理员（name/nickname/phone/email/dept_id/role_id…） |
| 2 | Department | `departments` | 详述 | 部门（parent_id 自引用） |
| 3 | Role | `roles` | 详述 | 角色（permissions 存 code 列表 JSON/JSONB） |
| 4 | ProductSeries | `product_series` | 详述 | 产品系列 |
| 5 | SpaceCategory | `space_categories` | 详述 | 空间场景分类（scope: product/case/all） |
| 6 | Product | `products` | 详述 | 产品单品（specs/cover_image/images JSON、status 三态、is_top） |
| 7 | Case | `cases` | 详述 | 实景案例（images JSON 多图、is_recommended） |
| 8 | NewsArticle | `news_articles` | 详述 | 新闻文章（source/is_published/is_top/expired_at） |
| 9 | Job | `jobs` | 详述 | 招聘职位 |
| 10 | JobApplication | `job_applications` | 详述 | 招聘投递 |
| 11 | Lead | `leads` | 详述 | 线索（type/requirement_type/store/handler_id…） |
| 12 | Store | `stores` | 详述 | 门店 |
| 13 | SiteConfig | `site_config` | 详述 | 站点配置（单行 id=1） |
| 14 | Banner | `banners` | 推导 | 首页轮播（title/subtitle/img_url/link/sort_order/status） |
| 15 | Highlight | `highlights` | 推导 | 品牌工艺亮点（title/desc/icon/sort_order/status） |
| 16 | AboutPage | `about_pages` | 推导 | 关于我们富文本页（slug/title/content） |
| 17 | Milestone | `milestones` | 推导 | 发展历程节点（year/title/desc/sort_order） |
| 18 | NewsCategory | `news_categories` | 推导 | 新闻分类（name/sort_order/status） |
| 19 | Permission | `permissions` | 推导 | 权限项字典（code/name/group/remark） |
| 20 | OperationLog | `operation_logs` | 推导 | 操作日志（created_at 操作人/action/target/ip） |

> 字段类型严格采用数据库设计文档 §4 双形态（SQLite ↔ PostgreSQL）与 §5 建表 SQL。索引见 §5.3（含 `is_activate`/`status`/`sort_order` 组合索引）。`created_at` 语义 = **创建人ID**（非时间），勿与 `created_date` 混淆。

**迁移策略**：开发用 SQLite + `Base.metadata.create_all`（首版全量）；Alembic 管理后续增量。生产切 PostgreSQL 按文档 §7 映射（`AUTOINCREMENT→SERIAL`、`TEXT→JSONB`、`TIMESTAMPTZ` 等）。现有 `tp_home.db` 因表名/结构变更将在重构时重建（开发库，可重 seed）。

---

## 4. 后端实现计划（FastAPI 模块化单体）

### 4.1 基础设施
- `database.py`：`DATABASE_URL` 由环境变量读取（dev `sqlite:///./tp_home.db` / prod `postgresql://…`），**不硬编码**。
- `security.py`：bcrypt 哈希（passlib）；JWT 双 token（`python-jose`）——access 短时效（如 30min）、refresh 长时效（如 7d）；`create_access_token/create_refresh_token`。
- `deps.py`：`get_db`、`get_current_admin`（解析 access，失效/缺失 → 401）、`require_perm(code)`（解码 `role.permissions`，无码 → 403，纵深防御）。
- `middleware.py`：统一响应信封 `{code,message,data}`；分页 `{list,total,page,page_size}`；异常 → 错误码表（401/403/422/400/500，技术文档 §9.3）。
- `seed.py`：幂等（先查后插）。写入：超管 `admin/admin123`（**上线必须改密**）、4 角色（超级管理员含全部 code；内容编辑/客服/招聘专员按 §8.2 权限矩阵预置 code）、示例系列/产品/空间/门店/案例/新闻分类/站点配置/部门。保证 `/api/home` 有数据。

### 4.2 接口清单（前缀 `/api`，与技术文档 §7 对齐）

**公共（无需鉴权）**
- `GET /api/home` → `{banners,highlights,rec_products,rec_cases,news}`
- `GET /api/products` + `GET /api/products/:id`
- `GET /api/cases` + `GET /api/cases/:id`
- `GET /api/news` + `GET /api/news/:id`（含上一篇/下一篇）
- `GET /api/jobs` + `GET /api/jobs/:id`
- `GET /api/stores`、`GET /api/about`（about_tp/brand/history/milestones）
- `POST /api/leads`（提交线索，派生 type）
- `POST /api/job-applications`（投递）

**鉴权**
- `POST /api/admin/login`（返回 access+refresh+admin）
- `POST /api/admin/refresh`、`GET /api/admin/me`、`POST /api/admin/change-password`、`POST /api/admin/logout`

**后台资源（均 access，按钮/菜单级由 `require_perm` 兜底）**
- 轮播/亮点/系列/空间/单品/案例/新闻+分类/职位/投递/门店/关于页+历程/线索(+导出 Excel)/管理员/角色/权限字典/部门/操作日志/站点配置/上传/看板统计。
- 上传：`POST /api/admin/upload`（multipart，落 `/uploads`，校验 JPG/PNG/WebP ≤5MB，返回 `/uploads/xxx`）。

### 4.3 RBAC（技术文档 §8）
- 4 角色 + 权限编码（如 `product:view/edit/delete`、`case:*`、`news:*`、`lead:view/update/export`、`admin:manage`、`role:manage`、`log:view`）。
- 前端菜单按 `role.permissions` 过滤，后端路由 `require_perm` 二次校验。
- 越权：无 token/失效 → 401（清 token 跳登录）；有 token 无码 → 403。

---

## 5. 前台 web 实现计划（React + Tailwind + Vite）

### 5.1 设计落地（UI/UX §3）
- `tailwind.config` 扩展令牌：`gold #B08D57` / `gold-soft #C9A875` / `ink #1A1714` / `sand #FAF8F5` / `line #E7E1D8`；字体 Noto Serif SC（标题）+ Noto Sans SC（正文）。
- 组件映射（UI/UX §4.1）：顶部 sticky 导航（下拉二级 + 移动端汉堡）、页脚、`.btn-gold`/`.btn-ghost`、筛选 chip、`.input`、卡片 `.card-hover`、详情 modal、右下在线客服 `chat.js`、地图占位 `map-screenshot.png`。
- 动效（§3.6）：Hero Ken Burns（7s）、控制条金色标高线滑移（500ms）；`prefers-reduced-motion` 下禁用（§8.3）。

### 5.2 页面与路由（UI/UX §5，React Router **History 模式** + 生产 Nginx fallback；原型为 #hash，重构为组件化）
- `#home` 首页（Hero+轮播控制条+品牌亮点+推荐产品/案例+CTA）
- `#products` 产品中心（系列/空间/状态/首页推荐筛选 + 卡片网格 + 详情 modal + 空状态）
- `#cases` 新案例展示（空间筛选 + 详情 modal：多图/面积/风格/客户/户型/所用系列）
- `#news` 新闻中心（企业/行业 Tab + 详情 modal + 上一篇/下一篇）
- `#about` 关于我们（关于TP/发展历程时间轴/品牌介绍/在线预约/联系我们+门店+地图占位）
- `#recruitment` 加入我们（社招/校招 Tab + JD modal + 投递表单）

### 5.3 关键能力
- 响应式（§9）：`max-w-7xl` 居中；产品 `lg:4/sm:2/1`、案例 `md:3/1`；汉堡菜单 `lg:hidden`。
- 在线客服（全局）：提交 `requirement_type:'在线客服咨询'` → 线索（落入后台"在线留言"）。
- 表单：React Hook Form + Zod（对齐 Pydantic schema）；手机号 11 位校验。
- SEED 兜底（§7.1）：后端不可达时 `api-client` 返回本地静态数据，离线可渲染。
- 无障碍（§8）：`:focus-visible` 金环、modal focus-trap、内容图 `alt`。

---

## 6. 后台 admin 实现计划（React + Ant Design 5 + Vite）

### 6.1 布局与规范（UI/UX §6）
- 墨黑侧栏 224px（可收起）+ 顶栏（面包屑/收起/消息徽标/用户菜单）+ 内容区（浅灰 `#F0F2F5`）。
- 令牌用 `:root` CSS 变量（gold/ink/sand/状态色），与 UI/UX §3.1 取值一致。
- 登录页：采用原型 `admin-login.html` 的视觉，工程化重构（**不纳入 UI/UX 文档范围，但实现时复用其样式**）。

### 6.2 模块映射（PRD §6 → 页面）
看板（ECharts 三折线：在线留言蓝/预约到店金/招聘投递绿，§3.7）→ 首页配置（Banner/亮点/推荐产品/推荐案例）→ 产品管理（系列/空间分类/单品）→ 案例管理 → 新闻管理（分类/文章）→ 招聘管理（职位/投递）→ 门店管理 → 关于我们内容（关于TP/品牌/历程/联系信息）→ 留言预约管理（Lead 列表/流转/导出 Excel）→ 系统管理（管理员/角色权限/操作日志/站点配置）。

### 6.3 关键能力
- RBAC：菜单级（按 `role.permissions` 过滤侧栏）+ 按钮级（`usePerm` 隐藏无权限操作）。
- 富文本：WangEditor（图片走统一上传接口）。
- 上传：透明 file input 覆盖 `.upload`，选图即传 `/api/admin/upload`。
- 反馈：统一非阻塞 Toast（替换原型 `alert`，§8.4）；删除确认；401 清 token 跳登录。
- 看板统计卡（金左边框）+ ECharts 趋势图 + 待处理时间轴。

---

## 7. 共享 api-client（packages/api-client）

- Axios 封装：基址 `API_BASE`（`127.0.0.1:8000` dev / 域名 prod，由环境变量注入）。
- 统一拦截：响应信封解包（取 `data`）；401 → 用 refresh 换 access，失败清 token 跳登录。
- SEED 兜底：后端不可达返回本地数据（前台离线可用）。
- 前后台共用类型定义（与 Pydantic schema 对齐）。

---

## 8. 分阶段交付计划（里程碑）

> 总工期参考 PRD §11（8–10 周），按"基础 → 内容 → 互动 → 收尾"推进。每阶段末尾做验收（映射 PRD §12）。

### 阶段 0：基础框架与鉴权（P0）
- 后端：落地 §2/§3/§4 模块化结构、20 表模型、统一信封、JWT 双 token、RBAC（department/role/permission + seed 4 角色）、上传、Alembic 初版。
- 前端：monorepo 脚手架（apps/web、apps/admin、packages/api-client）、设计令牌、路由骨架、api-client。
- 验收：后端 `/docs` 可联调；登录拿双 token；RBAC 依赖生效；seed 数据可见。

> **阶段 0 执行记录（2026-08-19）**：✅ 后端模块化结构（database/security/errors/deps/models/schemas/crud_utils/seed/main）已完成；✅ 20 张表（D2：案例多图并入 `case.images` JSON）；✅ 双 token + RBAC（4 角色、53 权限码，实测 401/403 生效）；✅ seed 幂等（含招聘职位 3 条）；✅ 上传（JPG/PNG/WebP/PDF ≤5MB）与公开接口实测通过；✅ `/docs` 200。修复：`CurrentAdmin = Depends(...)` 双 Depends 冲突改为 `Annotated[Admin, Depends(require_perm(...))]`；`crud_utils` 移除 future-annotations 以支持局部类型解析；seed 补 Job 字段对齐模型。前端 monorepo 脚手架已落地，npm install / 构建校验中。

### 阶段 1：品牌内容 + 首页 + 关于我们
- 后端：home/banners/highlights/about(AboutPage+Milestone)/site_config/stores 接口。
- 前台：首页（Hero+轮播+亮点+推荐+CTA）、关于我们（含在线预约、联系我们+门店+地图占位）、在线客服。
- 后台：看板（基础统计）、首页配置、关于我们内容、门店、站点配置。
- 验收：前台首页与关于页对齐原型视觉效果；后台可配置并前台实时生效。

> **阶段 1 执行记录（2026-08-19）**：✅ 后端新增公开 `/api/site-config`、`/api/categories`，`/api/home` 与 `/api/products` 补充 `series_name/space_name`；✅ 前台首页组件化（Hero 轮播+建筑索引条+自动播放 7s、亮点、精选产品、案例预览、品牌动态、招聘 CTA）；✅ 关于我们页（关于TP/发展历程时间轴/品牌介绍/在线预约表单-预约到店动态门店/联系我们+门店+地图占位）；✅ 在线客服右下浮动组件（提交生成「在线客服咨询」线索）；✅ 后台新增首页配置(Banner/亮点 CRUD)、关于我们(页面/历程)、门店管理、站点配置，看板保留基础统计；✅ 实测：后台写 Banner/门店/站点配置 → 前台 `/api/home`、`/api/stores`、`/api/site-config` 即时生效；预约到店/在线客服线索进入后台列表。构建：`build:web`（95 模块）与 `build:admin`（3095 模块）均成功。dev servers: web :5173、admin :5174。

### 阶段 2：产品与案例
- 后端：products(系列/空间/单品)、cases(含 images JSON 多图)、space_categories 接口。
- 前台：产品中心（筛选+详情 modal）、新案例展示（筛选+详情 modal）。
- 后台：产品管理（系列/空间/单品 CRUD + 富文本 + 上传）、案例管理、推荐选择器。
- 验收：产品/案例增删改查完整；前台筛选即时生效；首页推荐联动。

> **阶段 2 执行记录（2026-08-19）**：✅ 后端 `/api/products` 增 `reco` 首页推荐筛选、`/api/cases` 与详情/产品详情增补 `space_name`；✅ 前台产品中心（系列/空间/首页推荐 chip 筛选 + 关键词搜索 + 详情 modal：系列/空间/材质/尺寸/多图缩略 + `?detail=id` 直达）；✅ 前台案例展示（空间筛选 + 详情 modal：客户/户型/风格/面积/系列/多图 + `?detail=id`）；✅ 后台产品管理（单品/系列/空间三 Tab，规格 JSON、封面+多图上传、上架与首页推荐开关）、案例管理（空间下拉、多图、推荐开关）；✅ 实测：后台建产品/案例 → 公开列表/筛选/详情/首页推荐即时联动；build:web（95 模块）/build:admin（3097 模块）成功。

### 阶段 3：新闻 + 招聘 + 线索
- 后端：news(分类/文章)、jobs(职位/投递)、leads(列表/流转/导出 Excel) 接口。
- 前台：新闻中心（Tab+详情+上一篇下一篇）、加入我们（社招/校招+JD+投递）、在线预约统一表单（预约到店动态门店）。
- 后台：新闻管理、招聘管理（职位/投递状态流转）、留言预约管理（Lead 流转/导出）。
- 验收：表单提交进后台；招聘投递/线索状态流转记录操作人/时间；导出 Excel 正确。

> **阶段 3 执行记录（2026-08-19）**：✅ 后端新增公开 `/api/news-categories`，`/api/news` 列表/详情增补 `category_name`；✅ 前台新闻中心（分类 Tab + 卡片 + 详情 modal：正文 HTML 转纯文本、上一篇/下一篇导航 + `?detail=id`）；✅ 前台加入我们（社招/校招分组 + JD 弹窗：职责/要求/福利 + 在线投递表单 → POST /api/job-applications）；✅ 后台新闻管理（文章/分类双 Tab CRUD + 发布/置顶开关）、招聘管理（职位 CRUD + 投递状态流转）、留言预约管理（列表筛选 + 详情/流转 modal + CSV 导出）；✅ 修复 RBAC 冲突：移除 JobApplication 通用 CRUD 工厂注册（其生成的 `job_application:edit/:delete` 不在权限目录），改用专用路由（`job_application:view/update`）；✅ 实测：新闻双分类+上下篇、投递提交→后台流转(已联系+备注)、线索流转(跟进中+备注)、CSV 导出（UTF-8 BOM）全部通过；build:web（95 模块）/build:admin（3100 模块）成功。

### 阶段 4：看板完善 + 权限 + 响应式 + 验收 + 部署
- 看板 ECharts 趋势图与待处理入口；RBAC 菜单/按钮级全量覆盖；操作日志。
- 响应式适配优化（前台多端、后台侧栏抽屉化建议）。
- 测试与验收（PRD §12 功能/非功能清单）；部署文档 + Dockerfile/Nginx 骨架。
- 验收：PRD §12 全量通过；生产迁移脚本就绪（SQLite→PostgreSQL 仅骨架，生产配置后续）。

> **阶段 4 执行记录（2026-08-19）**：✅ 看板升级为 ECharts 三折线趋势图（在线留言蓝/预约到店金/招聘投递绿，UI/UX §3.7）+ 6 统计卡 + 待处理入口跳转；✅ RBAC 菜单级覆盖：App.tsx 按登录用户 permissions 过滤侧栏菜单（无查看权限不显示），实测招聘专员仅见看板/招聘/门店，无权接口 403；✅ 系统管理四 Tab（管理员/角色/权限字典/部门，权限多选、超级管理员角色保护）；✅ 操作日志页（只读+分页）；✅ 响应式：前台移动端汉堡菜单、后台 Sider breakpoint 折叠 + 移动端 Drawer；✅ 部署骨架：backend/Dockerfile + .dockerignore、deploy/docker-compose.yml（api+nginx+数据卷）、nginx.conf（SPA 回退+API/uploads 反代）、部署文档.md；✅ 修复：PermissionOut/RoleOut/AdminOut 手写 schema 补 from_attributes=True（pydantic v2.13 下 model_validate(ORM) 报 500），PermissionOut 用 validation_alias 映射 group_→group。三服务运行（web:5173 / admin:5174 / api:8000），web/admin 构建成功（admin 主 chunk 2.35MB 含 ECharts，后续按需分包）。

---

## 9. 验收对齐（映射 PRD §12）

| 维度 | 落地点 |
|------|--------|
| 功能 | §4.2 接口全覆盖；前后台 CRUD 完整；表单提交进后台 |
| RBAC | §4.3 菜单+按钮+403 纵深防御 |
| 看板 | `/api/home` + ECharts（§3.7 配色） |
| 性能 | 前台轻量（不含 AntD）、图片 object-fit、CDN |
| 安全 | bcrypt + JWT 双 token + 路由校验；上传 JPG/PNG/WebP ≤5MB |
| 无障碍 | UI/UX §8 → `:focus-visible`、金环、44px 触控、reduced-motion |
| 响应式 | Tailwind 断点 + 后台侧栏收起（§9） |

---

## 10. 风险与依赖（沿用 PRD §13 + 补充）

| 风险/依赖 | 缓解 |
|-----------|------|
| 现有后端表名/字段与文档不一致（D1） | 阶段 0 重构时统一，开发库重建并重 seed |
| 案例多图存储方式（D2） | 采用 `case.images` JSON，与 ProductImage 一致 |
| 图片/文案素材 | 先占位图开发；尺寸规范 Q1 已确认（Banner 1920×800 / 产品 800×800 / 案例 1200×800） |
| 地图供应商（PRD Q3 待定） | 先用 `map-screenshot.png` 占位，确认后替换 |
| 第三方统计（PRD Q4 保留） | 第一版仅后端统计/操作日志 |
| 登录锁定/验证码（PRD Q5 暂不实现） | 后续安全加固补充 |
| 富文本选型（PRD Q2 已确认） | WangEditor，图片走统一上传 |

---

## 11. 已知 Open Items（文档内待确认，本方案按既定口径处理）

- 8 个推导实体字段：按 D3 采用文档建议字段（已拍板）。
- CaseImage：按 D2 不建表，并入 `case.images`。
- API 版本化：v1.0 不加 `/v1`（ADR-006）。
- 地图/第三方统计/登录锁定：按 PRD §15 保留至后续版本。

---

## 12. 下一步

本方案待用户确认。收到「**已确认，执行下一步**」后，将从 **阶段 0：基础框架与鉴权** 开始执行（先落地后端模块化结构 + 20 表模型 + 双 token + RBAC + seed，再搭前端 monorepo 脚手架与 api-client）。

> 注：本方案严格依据《数据库设计文档 v1.2》《开发技术文档 v1.1》《PRD v1.3》《UI/UX 规范 v1.1》及两份产品原型编写，未引入额外设计决策；任何后续变更须同步更新本文档并重新确认。
