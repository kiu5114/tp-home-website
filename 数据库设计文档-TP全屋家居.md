# 数据库设计文档 · TP 全屋家居（企业官网与后台管理系统）

> 文档版本：v1.2（与 PRD v1.2、开发技术文档 v1.0 对应）
> 生成日期：2026-08-18
> 唯一事实源：PRD §9（数据模型，统一 SQLite）+ 开发技术文档 §4（22 实体字段表、双类型映射、ER 图）
> 图示：ER 图由「架构图与流程图绘制专家」技能生成 SVG 并嵌入

---

## 第 1 章 说明与范围

### 1.1 文档目标与读者

- **目标**：将 PRD 与开发技术文档中关于数据模型的约定，落实为可执行的**数据库专项设计**——包括 ER 图、数据字典、建表 SQL（SQLite 与 PostgreSQL 双形态）。
- **读者**：后端工程师、DBA、架构师、测试。
- **边界**：本文档只描述「库表如何落地」，不重新设计产品/视觉；接口、流程、RBAC 见《开发技术文档-TP全屋家居.md》。

### 1.2 与事实源的对应关系

| 来源 | 在本文档的落点 |
|------|----------------|
| PRD §9 数据模型（13 实体详述字段） | 第 4 章数据字典（13 个 PRD 详述实体，字段一致） |
| PRD §9 实体清单（8 个仅列名） | 第 4 章数据字典（8 个推导实体，标 **⚠ 待确认**） |
| 开发技术文档 §4.3 字段表 | 第 4 章数据字典（权威集中呈现） |
| 开发技术文档 §4.2 ER 图 | 第 3 章 ER 图（复用同一对 SVG） |
| 开发技术文档 ADR-003 | 第 2 章类型映射、第 5 章双形态建表、第 7 章迁移 |

### 1.3 ⚠ 推导实体清单（待确认）

PRD §9.2 仅列出实体名、未给字段的 8 个，由架构师依据功能 + UI/UX 推导，字段以 **⚠** 标注，需在需求确认阶段拍板：

`Banner`（首页轮播）、`Highlight`（品牌工艺亮点）、`AboutPage`（关于我们富文本页）、`Milestone`（发展历程节点）、`CaseImage`（案例多图）、`NewsCategory`（新闻分类）、`Permission`（权限项）、`OperationLog`（操作日志）。

> v1.2 变更：`ProductImage`（产品多图）不再作为独立表——产品多图改为 `product.images`（JSON 串）存储，对应实体已从推导清单移除，故推导实体由 9 → 8。

> 说明：`Admin`（用户表）、`Department`、`Role` 已由需求方在 v1.1 明确字段（见 §4.1–§4.3），不再标 ⚠。

### 1.4 v1.1 变更摘要

- **用户表（admin）**：按需求方口径重写——`real_name` 改名 `name`（姓名），新增 `nickname`（昵称）/ `phone`（手机号）/ `email`（邮箱）；保留登录必需 `password_hash`、`last_login_at`。
- **部门表（department）**：新增 `parent_id`（上级部门，自引用 1:N）。
- **角色表（role）**：新增 `is_activate` 与审计列；保留 `permissions`/`description`（RBAC 必需）。
- **全表通用列**：所有 22 张表统一追加 `is_activate`（激活/禁用）、`created_at`（创建人）、`created_date`（创建时间）、`updated_at`（修改人）、`updated_date`（修改时间）；原 `created_by`/`updated_by`/`created_at(时间)` 统一按新约定重命名。
- **状态字段策略（已确认）**：`is_activate` 与原有业务 `status` **共存**——`is_activate` 为通用生命周期标志（激活/禁用），业务工作流 `status`（如新闻草稿/发布、线索处理状态、投递状态）原样保留。
- **ER 图**：系统域新增 `department → department`（上级部门）自引用环。

### 1.5 v1.2 变更摘要

> 依据需求方对「产品表」「新闻表」的字段口径重定义（本轮未重新生成架构图 / ER 图，图示维持 v1.1）。

- **产品表 `product` 字段重定义（严格只保留需求方列出的 10 个字段 + 通用列）**：
  - `space_category_id` 改名为 `category_id`（需求方命名）；保留 `series_id`、`code`、`description`、`cover_image`、`sort_order`。
  - 新增 `specs`（规格参数，JSON 串，取代原 `material`/`dimensions`）、`images`（其它图片 URL，JSON 串数组）、`is_top`（是否置顶 0/1）。
  - `status` 由 0 下线/1 上线 改为 **三态**：`0 草稿 / 1 上架 / 2 下架`，默认 0（草稿）。
  - 删除 `name`、`material`、`dimensions`、`view_count`、`is_recommended`。
- **新闻表 `news_article` 字段重定义（只保留需求方列出的 10 个字段 + 通用列）**：
  - 保留 `title`、`category_id`、`cover_image`、`summary`、`content`、`published_at`。
  - 新增 `source`（来源/转载标注，取代 `author`）、`is_published`（是否发布 0/1，取代 `status`）、`is_top`（是否置顶/推荐 0/1）、`expired_at`（截止时间）。
  - 删除 `author`、`view_count`、`status`。
- **`ProductImage` 表移除**：产品多图改用 `product.images`（JSON）存储；推导实体由 9 → 8，全表数量由 **22 → 21**（SQLite / PostgreSQL 各 21 张）。
- **索引/FK 同步**：`idx_product_space` 改名 `idx_product_category`（列 `category_id`）；删除 `idx_productimage_product`；新增 `idx_product_is_top`、`idx_news_is_published`；FK 级联 `product.category_id → space_category` 等同步更新。

> 注意：开发技术文档 §4 仍记 22 实体（含 ProductImage），如需零漂移请同步更新开发技术文档；本文档以本版 21 实体为准。

---

## 第 2 章 设计原则与约定

### 2.1 命名约定

| 约定 | 规则 | 示例 |
|------|------|------|
| 表名 | snake_case 复数（或实体语义名），与 PRD 实体对应 | `admin`、`product_series`、`news_article`、`case` |
| 主键 | 统一 `id`，整型自增 | `id INTEGER / SERIAL` |
| 外键 | `<实体>_id` | `series_id`、`space_id`、`handler_id`、`parent_id`、`dept_id`、`role_id` |
| 通用状态 | `is_activate` TINYINT/SMALLINT（0 禁用 / 1 激活），**所有表统一附加** | 启用/停用记录 |
| 业务状态 | `status` 仅保留于业务工作流表（与 `is_activate` 共存） | 新闻 草稿/发布、线索 未处理/已联系… |
| 审计列 | `created_at`(创建人/用户ID)、`created_date`(创建时间)、`updated_at`(修改人/用户ID)、`updated_date`(修改时间)，**所有表统一附加** | 追溯创建/修改 |
| 软删除 | 本期不设 `deleted_at`，以 `is_activate` 表达启禁用 | — |
| 字符集 | UTF-8（SQLite 默认；PG 用 `UTF8`） | — |

> 命名注意：`created_at` 在本文中语义为「创建人（用户ID）」、`created_date` 为「创建时间」；`updated_at` 为「修改人（用户ID）」、`updated_date` 为「修改时间」。此为需求方确认约定，与原「created_at=时间」习惯不同，请后端严格按此落地。

### 2.2 SQLite ↔ PostgreSQL 类型映射

| 抽象语义 | SQLite（建表用） | PostgreSQL（建表用） | 存储说明 |
|----------|------------------|----------------------|----------|
| 主键自增 | `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` | — |
| 整数 | `INTEGER` | `INT` / `BIGINT` | — |
| 短字符串 | `VARCHAR(n)` | `VARCHAR(n)` | n 见字段表 |
| 长文本 | `TEXT` | `TEXT` | 富文本/描述 |
| 布尔/枚举 | `TINYINT`（0/1） | `SMALLINT`（0/1） | `is_activate` / `status` / `gender` 等 |
| 通用状态 | `TINYINT`（0/1） | `SMALLINT`（0/1） | `is_activate` |
| 审计-创建人/修改人 | `INTEGER`（用户ID） | `INT`（用户ID） | `created_at`/`updated_at`，FK→Admin |
| 审计-创建/修改时间 | `DATETIME`（亲和为 TEXT，存 ISO8601） | `TIMESTAMPTZ` | `created_date`/`updated_date` |
| JSON | `TEXT`（存 JSON 串） | `JSONB` | Role.permissions 等 |
| 图片/附件 | 仅存路径或 URL（`VARCHAR`） | 同左 | 文件不入表（PRD §8.4） |

> 说明：SQLite 仅做类型亲和（affinity），`VARCHAR`/`DATETIME`/`TINYINT` 在建表中可直接书写，实际按 `TEXT`/`INTEGER` 亲和存储；本文建表语句与开发文档 §4.3「SQLite 列」保持一致，零漂移。

### 2.3 通用默认值约定

| 默认值语义 | SQLite 写法 | PostgreSQL 写法 |
|------------|-------------|-----------------|
| 当前时间 | `CURRENT_TIMESTAMP` | `now()` 或 `CURRENT_TIMESTAMP` |
| 字符串默认 | `'social'`、`'未处理'`、`'[]'` 等 | 同左 |
| `is_activate` 默认激活 | `1` | `1` |
| 业务 `status` 默认 | 见各表（上线/启用/`未处理` 等） | 同左 |
| 排序默认 | `0` | `0` |
| `sort_order` 排序约定 | 升序，数字小在前；**同值按 id 兜底**（如 `ORDER BY sort_order, id`）；建议新增时取当前最大值 +1，避免多条记录同值导致顺序依赖 id | 同左 |
| `created_date`/`updated_date` 默认 | `CURRENT_TIMESTAMP` | `now()` |
| `created_at`/`updated_at` 默认 | `NULL`（由应用写入用户ID） | `NULL` |

---

## 第 3 章 ER 图（diagram-builder 生成）

> 图例：实线框 = PRD 详述实体；虚线框 = ⚠ 推导实体（含字段待确认）；连线 1:N 指向，标注关系语义。**通用列（id / is_activate / created_at / created_date / updated_at / updated_date）为所有表统一附加，ER 图省略以避免拥挤。**

### 3.1 业务领域 ER

![业务领域 ER 图](diagrams/er-business.svg)

### 3.2 系统 / 配置领域 ER

![系统/配置领域 ER 图](diagrams/er-system.svg)

### 3.3 关系摘要

| 主体 | 关系 | 客体 | 基数 |
|------|------|------|------|
| product_series | 包含单品 | product | 1 : N |
| space_category | 归类空间 | product | 1 : N |
| space_category | 归类空间 | case | 1 : N |
| product_series | 案例所用系列 | case | 1 : N |
| case | 多图 | case_image | 1 : N |
| news_category | 所属分类 | news_article | 1 : N |
| job | 收到投递 | job_application | 1 : N |
| store | 预约到店 | lead | 1 : N |
| admin | 处理人 | lead | 1 : N |
| department | 归属部门 | admin | 1 : N |
| role | 拥有角色 | admin | 1 : N |
| role | 授予权限 | permission | 1 : N |
| admin | 产生日志 | operation_log | 1 : N |
| department | 上级部门（自引用） | department | 1 : N（父→子） |
| site_config | 单行配置 | site_config | 1 : 1（自环） |

---

## 第 4 章 数据字典（22 实体）

> 字段类型并排 SQLite / PostgreSQL；「默认」以开发文档 §4.3 为准；⚠ 标记为推导字段待确认。
> **通用列约定**：以下每张表均含 `id`(PK) + `is_activate` + `created_at` + `created_date` + `updated_at` + `updated_date`，字段表中以「（通用列）」标注，避免逐表重复但落地时务必包含。

#### 4.1 Admin（用户表 / 后台管理员）— 需求方明确字段

| 字段 | SQLite | PostgreSQL | 键 | 可空 | 默认 | 说明 |
|------|--------|-----------|----|------|------|------|
| id | INTEGER | INT | PK | 否 | 自增 | 主键 |
| username | VARCHAR(64) | VARCHAR(64) | — | 否 | — | 用户名（登录名），唯一 |
| password_hash | VARCHAR(255) | VARCHAR(255) | — | 否 | — | bcrypt 哈希（登录必需，保留） |
| name | VARCHAR(64) | VARCHAR(64) | — | 是 | NULL | 姓名（由 v1.0 `real_name` 改名） |
| nickname | VARCHAR(64) | VARCHAR(64) | — | 是 | NULL | 昵称 |
| phone | VARCHAR(32) | VARCHAR(32) | — | 是 | NULL | 手机号 |
| email | VARCHAR(128) | VARCHAR(128) | — | 是 | NULL | 邮箱 |
| gender | TINYINT | SMALLINT | — | 否 | 0 | 0 未知/1 男/2 女 |
| position | VARCHAR(64) | VARCHAR(64) | — | 是 | NULL | 岗位 |
| dept_id | INTEGER | INT | FK→Department | 是 | NULL | 部门编号 |
| role_id | INTEGER | INT | FK→Role | 否 | — | 角色编号 |
| last_login_at | DATETIME | TIMESTAMPTZ | — | 是 | NULL | 最后登录时间（保留） |
| is_activate | TINYINT | SMALLINT | — | 否 | 1 | （通用列）0 禁用/1 激活 |
| created_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）创建人（用户ID） |
| created_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）创建时间 |
| updated_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）修改人（用户ID） |
| updated_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）修改时间 |

#### 4.2 Department（部门表）— 需求方明确字段

| 字段 | SQLite | PostgreSQL | 键 | 可空 | 默认 | 说明 |
|------|--------|-----------|----|------|------|------|
| id | INTEGER | INT | PK | 否 | 自增 | 主键 |
| name | VARCHAR(128) | VARCHAR(128) | — | 否 | — | 部门名称，唯一 |
| parent_id | INTEGER | INT | FK→Department | 是 | NULL | 上级部门（自引用，父→子） |
| sort_order | INTEGER | INT | — | 否 | 0 | 排序（树形展示，保留） |
| is_activate | TINYINT | SMALLINT | — | 否 | 1 | （通用列）0 禁用/1 激活 |
| created_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）创建人（用户ID） |
| created_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）创建时间 |
| updated_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）修改人（用户ID） |
| updated_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）修改时间 |

#### 4.3 Role（角色表）— 需求方明确字段

| 字段 | SQLite | PostgreSQL | 键 | 可空 | 默认 | 说明 |
|------|--------|-----------|----|------|------|------|
| id | INTEGER | INT | PK | 否 | 自增 | 主键 |
| name | VARCHAR(64) | VARCHAR(64) | — | 否 | — | 角色名称 |
| permissions | TEXT | JSONB | — | 否 | '[]' | 权限编码列表（RBAC 必需，见 Permission.code） |
| description | VARCHAR(255) | VARCHAR(255) | — | 是 | NULL | 描述 |
| is_activate | TINYINT | SMALLINT | — | 否 | 1 | （通用列）0 禁用/1 激活 |
| created_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）创建人（用户ID） |
| created_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）创建时间 |
| updated_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）修改人（用户ID） |
| updated_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）修改时间 |

#### 4.4 ProductSeries（产品系列）— PRD 详述

| 字段 | SQLite | PostgreSQL | 键 | 可空 | 默认 | 说明 |
|------|--------|-----------|----|------|------|------|
| id | INTEGER | INT | PK | 否 | 自增 | 主键 |
| name | VARCHAR(128) | VARCHAR(128) | — | 否 | — | 系列名 |
| description | TEXT | TEXT | — | 是 | NULL | 描述 |
| cover_image | VARCHAR(255) | VARCHAR(255) | — | 是 | NULL | 封面 URL |
| sort_order | INTEGER | INT | — | 否 | 0 | 排序 |
| status | TINYINT | SMALLINT | — | 否 | 0 | 业务状态：0 下线/1 上线（与 is_activate 共存） |
| published_at | DATETIME | TIMESTAMPTZ | — | 是 | NULL | 最新发布时间 |
| valid_until | DATETIME | TIMESTAMPTZ | — | 是 | NULL | 有效期（到期自动下线） |
| is_activate | TINYINT | SMALLINT | — | 否 | 1 | （通用列）0 禁用/1 激活 |
| created_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）创建人（原 created_by） |
| created_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）创建时间（原 created_at） |
| updated_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）修改人（原 updated_by） |
| updated_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）修改时间（原 updated_at） |

#### 4.5 SpaceCategory（空间场景分类）— PRD 详述

| 字段 | SQLite | PostgreSQL | 键 | 可空 | 默认 | 说明 |
|------|--------|-----------|----|------|------|------|
| id | INTEGER | INT | PK | 否 | 自增 | 主键 |
| name | VARCHAR(64) | VARCHAR(64) | — | 否 | — | 如 客厅/卧室/整屋 |
| scope | VARCHAR(32) | VARCHAR(32) | — | 否 | 'all' | product/case/all |
| sort_order | INTEGER | INT | — | 否 | 0 | 排序 |
| status | TINYINT | SMALLINT | — | 否 | 1 | 业务状态：0 下线/1 上线（与 is_activate 共存） |
| is_activate | TINYINT | SMALLINT | — | 否 | 1 | （通用列）0 禁用/1 激活 |
| created_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）创建人 |
| created_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）创建时间 |
| updated_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）修改人 |
| updated_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）修改时间 |

#### 4.6 Product（产品单品）— 需求方重定义字段（v1.2）

| 字段 | SQLite | PostgreSQL | 键 | 可空 | 默认 | 说明 |
|------|--------|-----------|----|------|------|------|
| id | INTEGER | INT | PK | 否 | 自增 | 主键 |
| category_id | INTEGER | INT | FK→SpaceCategory | 是 | NULL | 所属空间分类 id（需求方命名，原 space_category_id） |
| series_id | INTEGER | INT | FK→ProductSeries | 是 | NULL | 所属系列（如胡桃禮） |
| code | VARCHAR(64) | VARCHAR(64) | — | 否 | — | 产品编号，唯一 |
| description | TEXT | TEXT | — | 是 | NULL | 产品描述（富文本） |
| specs | TEXT | JSONB | — | 是 | NULL | 规格参数（JSON 串，建议键：材质/尺寸/工艺/颜色等） |
| cover_image | VARCHAR(255) | VARCHAR(255) | — | 是 | NULL | 封面图片 URL |
| images | TEXT | JSONB | — | 是 | NULL | 其它图片 URL（JSON 串数组） |
| status | TINYINT | SMALLINT | — | 否 | 0 | 发布状态：0 草稿/1 上架/2 下架（与 is_activate 共存） |
| is_top | TINYINT | SMALLINT | — | 否 | 0 | 是否置顶（0/1） |
| sort_order | INTEGER | INT | — | 否 | 0 | 排序值（升序、数字小在前；同值按 id 兜底，建议新增取当前最大+1） |
| is_activate | TINYINT | SMALLINT | — | 否 | 1 | （通用列）0 禁用/1 激活 |
| created_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）创建人 |
| created_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）创建时间 |
| updated_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）修改人 |
| updated_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）修改时间 |

#### 4.7 Case（实景案例）— PRD 详述

| 字段 | SQLite | PostgreSQL | 键 | 可空 | 默认 | 说明 |
|------|--------|-----------|----|------|------|------|
| id | INTEGER | INT | PK | 否 | 自增 | 主键 |
| title | VARCHAR(128) | VARCHAR(128) | — | 否 | — | 标题 |
| space_id | INTEGER | INT | FK→SpaceCategory | 是 | NULL | 空间场景 |
| area | VARCHAR(64) | VARCHAR(64) | — | 是 | NULL | 面积 |
| style | VARCHAR(64) | VARCHAR(64) | — | 是 | NULL | 风格 |
| customer | VARCHAR(64) | VARCHAR(64) | — | 是 | NULL | 客户称呼 |
| house_type | VARCHAR(64) | VARCHAR(64) | — | 是 | NULL | 户型 |
| series | VARCHAR(256) | VARCHAR(256) | — | 是 | NULL | 所用系列（逗号分隔） |
| description | TEXT | TEXT | — | 是 | NULL | 描述（富文本） |
| images | TEXT | TEXT | — | 是 | NULL | 多图（JSON/逗号分隔） |
| sort_order | INTEGER | INT | — | 否 | 0 | 排序 |
| status | TINYINT | SMALLINT | — | 否 | 0 | 业务状态：0 下线/1 上线（与 is_activate 共存） |
| is_recommended | TINYINT | SMALLINT | — | 否 | 0 | 是否首页推荐 |
| is_activate | TINYINT | SMALLINT | — | 否 | 1 | （通用列）0 禁用/1 激活 |
| created_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）创建人 |
| created_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）创建时间 |
| updated_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）修改人 |
| updated_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）修改时间 |

#### 4.8 NewsArticle（新闻文章）— 需求方重定义字段（v1.2）

| 字段 | SQLite | PostgreSQL | 键 | 可空 | 默认 | 说明 |
|------|--------|-----------|----|------|------|------|
| id | INTEGER | INT | PK | 否 | 自增 | 主键 |
| title | VARCHAR(128) | VARCHAR(128) | — | 否 | — | 标题 |
| category_id | INTEGER | INT | FK→NewsCategory | 是 | NULL | 分类（企业新闻/行业资讯） |
| cover_image | VARCHAR(255) | VARCHAR(255) | — | 是 | NULL | 封面图 URL |
| summary | VARCHAR(500) | VARCHAR(500) | — | 是 | NULL | 摘要 |
| content | TEXT | TEXT | — | 是 | NULL | 正文（富文本 HTML） |
| source | VARCHAR(255) | VARCHAR(255) | — | 是 | NULL | 来源（转载标注，如「转载自 XX」；原创留空或填「原创」），取代原 author |
| is_published | TINYINT | SMALLINT | — | 否 | 0 | 是否发布：0 未发布/1 已发布（取代原 status；草稿=未发布） |
| is_top | TINYINT | SMALLINT | — | 否 | 0 | 是否置顶/推荐（0/1） |
| published_at | DATETIME | TIMESTAMPTZ | — | 是 | NULL | 发布时间 |
| expired_at | DATETIME | TIMESTAMPTZ | — | 是 | NULL | 截止时间（置顶/推荐到期自动取消用） |
| is_activate | TINYINT | SMALLINT | — | 否 | 1 | （通用列）0 禁用/1 激活 |
| created_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）创建人 |
| created_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）创建时间 |
| updated_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）修改人 |
| updated_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）修改时间 |

#### 4.9 Job（招聘职位）— PRD 详述

| 字段 | SQLite | PostgreSQL | 键 | 可空 | 默认 | 说明 |
|------|--------|-----------|----|------|------|------|
| id | INTEGER | INT | PK | 否 | 自增 | 主键 |
| title | VARCHAR(128) | VARCHAR(128) | — | 否 | — | 职位名 |
| job_type | VARCHAR(32) | VARCHAR(32) | — | 否 | 'social' | social/campus |
| department | VARCHAR(128) | VARCHAR(128) | — | 是 | NULL | 部门 |
| location | VARCHAR(128) | VARCHAR(128) | — | 是 | NULL | 地点 |
| employment_type | VARCHAR(32) | VARCHAR(32) | — | 是 | NULL | 全职/兼职/实习 |
| responsibilities | TEXT | TEXT | — | 是 | NULL | 职责（富文本） |
| requirements | TEXT | TEXT | — | 是 | NULL | 要求（富文本） |
| benefits | TEXT | TEXT | — | 是 | NULL | 待遇（富文本） |
| sort_order | INTEGER | INT | — | 否 | 0 | 排序 |
| status | TINYINT | SMALLINT | — | 否 | 1 | 业务状态：0 下架/1 招聘中（与 is_activate 共存） |
| is_activate | TINYINT | SMALLINT | — | 否 | 1 | （通用列）0 禁用/1 激活 |
| created_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）创建人 |
| created_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）创建时间 |
| updated_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）修改人 |
| updated_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）修改时间 |

#### 4.10 JobApplication（招聘投递）— PRD 详述

| 字段 | SQLite | PostgreSQL | 键 | 可空 | 默认 | 说明 |
|------|--------|-----------|----|------|------|------|
| id | INTEGER | INT | PK | 否 | 自增 | 主键 |
| job_id | INTEGER | INT | FK→Job | 否 | — | 应聘职位 |
| name | VARCHAR(64) | VARCHAR(64) | — | 否 | — | 姓名 |
| phone | VARCHAR(32) | VARCHAR(32) | — | 否 | — | 电话 |
| intended_position | VARCHAR(128) | VARCHAR(128) | — | 是 | NULL | 意向岗位 |
| message | TEXT | TEXT | — | 是 | NULL | 留言 |
| status | VARCHAR(32) | VARCHAR(32) | — | 否 | '未处理' | 业务状态：未处理/已查看/已联系/不合适/已录用（与 is_activate 共存） |
| remark | TEXT | TEXT | — | 是 | NULL | 备注 |
| is_activate | TINYINT | SMALLINT | — | 否 | 1 | （通用列）0 禁用/1 激活 |
| created_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）创建人（公众投递为 NULL） |
| created_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）创建时间（原 created_at） |
| updated_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）修改人 |
| updated_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）修改时间 |

#### 4.11 Lead（线索）— PRD 详述

| 字段 | SQLite | PostgreSQL | 键 | 可空 | 默认 | 说明 |
|------|--------|-----------|----|------|------|------|
| id | INTEGER | INT | PK | 否 | 自增 | 主键 |
| type | VARCHAR(32) | VARCHAR(32) | — | 否 | 'online_message' | appointment_to_store / online_message |
| name | VARCHAR(64) | VARCHAR(64) | — | 否 | — | 姓名 |
| phone | VARCHAR(32) | VARCHAR(32) | — | 否 | — | 电话 |
| city | VARCHAR(64) | VARCHAR(64) | — | 是 | NULL | 城市 |
| requirement_type | VARCHAR(64) | VARCHAR(64) | — | 否 | — | 设计咨询/预约到店/上门量房/招商咨询/在线客服咨询 |
| store | VARCHAR(128) | VARCHAR(128) | — | 是 | NULL | 预约门店（仅预约到店填） |
| message | TEXT | TEXT | — | 是 | NULL | 留言 |
| source_page | VARCHAR(128) | VARCHAR(128) | — | 是 | '在线预约' | 来源页 |
| status | VARCHAR(32) | VARCHAR(32) | — | 否 | '未处理' | 业务状态：未处理/已联系/跟进中/已成交/无效（与 is_activate 共存） |
| remark | TEXT | TEXT | — | 是 | NULL | 备注 |
| handler_id | INTEGER | INT | FK→Admin | 是 | NULL | 处理人 |
| is_activate | TINYINT | SMALLINT | — | 否 | 1 | （通用列）0 禁用/1 激活 |
| created_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）创建人（公众提交为 NULL） |
| created_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）创建时间（原 created_at） |
| updated_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）修改人 |
| updated_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）修改时间 |

#### 4.12 Store（门店）— PRD 详述

| 字段 | SQLite | PostgreSQL | 键 | 可空 | 默认 | 说明 |
|------|--------|-----------|----|------|------|------|
| id | INTEGER | INT | PK | 否 | 自增 | 主键 |
| name | VARCHAR(128) | VARCHAR(128) | — | 否 | — | 门店名 |
| address | VARCHAR(255) | VARCHAR(255) | — | 是 | NULL | 地址 |
| phone | VARCHAR(32) | VARCHAR(32) | — | 是 | NULL | 电话 |
| business_hours | VARCHAR(128) | VARCHAR(128) | — | 是 | NULL | 营业时间 |
| map_url | VARCHAR(500) | VARCHAR(500) | — | 是 | NULL | 第三方地图链接 |
| sort_order | INTEGER | INT | — | 否 | 0 | 排序 |
| status | TINYINT | SMALLINT | — | 否 | 1 | 业务状态：0 下线/1 上线（与 is_activate 共存） |
| is_activate | TINYINT | SMALLINT | — | 否 | 1 | （通用列）0 禁用/1 激活 |
| created_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）创建人 |
| created_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）创建时间 |
| updated_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）修改人 |
| updated_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）修改时间 |

#### 4.13 SiteConfig（站点配置）— PRD 详述

| 字段 | SQLite | PostgreSQL | 键 | 可空 | 默认 | 说明 |
|------|--------|-----------|----|------|------|------|
| id | INTEGER | INT | PK | 否 | 1 | 主键（单行，应用层保证 id=1） |
| site_name | VARCHAR(128) | VARCHAR(128) | — | 是 | NULL | 站点名 |
| logo | VARCHAR(255) | VARCHAR(255) | — | 是 | NULL | Logo URL |
| contact_phone | VARCHAR(32) | VARCHAR(32) | — | 是 | NULL | 联系电话 |
| contact_email | VARCHAR(128) | VARCHAR(128) | — | 是 | NULL | 邮箱 |
| company_address | VARCHAR(255) | VARCHAR(255) | — | 是 | NULL | 公司地址 |
| icp | VARCHAR(128) | VARCHAR(128) | — | 是 | NULL | 备案号 |
| copyright | VARCHAR(255) | VARCHAR(255) | — | 是 | NULL | 版权 |
| is_activate | TINYINT | SMALLINT | — | 否 | 1 | （通用列）恒为 1 |
| created_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）创建人 |
| created_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）创建时间 |
| updated_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）修改人 |
| updated_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）修改时间 |

#### 4.14 Banner（首页轮播）⚠ 推导字段，待确认

| 字段 | SQLite | PostgreSQL | 键 | 可空 | 默认 | 说明 |
|------|--------|-----------|----|------|------|------|
| id | INTEGER | INT | PK | 否 | 自增 | 主键 |
| title | VARCHAR(128) | VARCHAR(128) | — | 是 | NULL | 轮播标题（对应 `/api/home` banners.title） |
| subtitle | VARCHAR(255) | VARCHAR(255) | — | 是 | NULL | 副标题 |
| img_url | VARCHAR(500) | VARCHAR(500) | — | 否 | — | 图片路径/URL |
| link | VARCHAR(500) | VARCHAR(500) | — | 是 | NULL | 跳转链接 |
| sort_order | INTEGER | INT | — | 否 | 0 | 排序 |
| status | TINYINT | SMALLINT | — | 否 | 1 | 业务状态：0 下线/1 上线（与 is_activate 共存） |
| is_activate | TINYINT | SMALLINT | — | 否 | 1 | （通用列）0 禁用/1 激活 |
| created_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）创建人 |
| created_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）创建时间 |
| updated_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）修改人 |
| updated_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）修改时间 |

> 推导依据：PRD §5.2 FE-HOME-01 轮播 Banner（多图/标题/副标题/跳转）、`/api/home` banners 数据结构（UI/UX §5.2）。

#### 4.15 Highlight（品牌工艺亮点）⚠ 推导字段，待确认

| 字段 | SQLite | PostgreSQL | 键 | 可空 | 默认 | 说明 |
|------|--------|-----------|----|------|------|------|
| id | INTEGER | INT | PK | 否 | 自增 | 主键 |
| title | VARCHAR(128) | VARCHAR(128) | — | 否 | — | 亮点标题 |
| desc | VARCHAR(255) | VARCHAR(255) | — | 是 | NULL | 描述 |
| icon | VARCHAR(255) | VARCHAR(255) | — | 是 | NULL | 图标（内联 SVG 名或 URL） |
| sort_order | INTEGER | INT | — | 否 | 0 | 排序 |
| status | TINYINT | SMALLINT | — | 否 | 1 | 业务状态：0 下线/1 上线（与 is_activate 共存） |
| is_activate | TINYINT | SMALLINT | — | 否 | 1 | （通用列）0 禁用/1 激活 |
| created_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）创建人 |
| created_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）创建时间 |
| updated_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）修改人 |
| updated_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）修改时间 |

> 推导依据：PRD §5.2 FE-HOME-02 品牌工艺亮点（图标+标题+描述，最多 4 个）、UI/UX §4.1/§6.3。

#### 4.16 AboutPage（关于我们富文本页）⚠ 推导字段，待确认

| 字段 | SQLite | PostgreSQL | 键 | 可空 | 默认 | 说明 |
|------|--------|-----------|----|------|------|------|
| id | INTEGER | INT | PK | 否 | 自增 | 主键 |
| slug | VARCHAR(64) | VARCHAR(64) | — | 否 | — | 页面键：about_tp/brand/history |
| title | VARCHAR(128) | VARCHAR(128) | — | 是 | NULL | 标题 |
| content | TEXT | TEXT | — | 是 | NULL | 富文本正文 |
| is_activate | TINYINT | SMALLINT | — | 否 | 1 | （通用列）0 禁用/1 激活 |
| created_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）创建人 |
| created_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）创建时间 |
| updated_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）修改人（原 updated_at 时间字段改名 updated_date） |
| updated_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）修改时间 |

> 推导依据：PRD §5.7 关于我们（关于TP/品牌介绍/发展历程）、UI/UX §5.6、§6.6。

#### 4.17 Milestone（发展历程节点）⚠ 推导字段，待确认

| 字段 | SQLite | PostgreSQL | 键 | 可空 | 默认 | 说明 |
|------|--------|-----------|----|------|------|------|
| id | INTEGER | INT | PK | 否 | 自增 | 主键 |
| year | VARCHAR(16) | VARCHAR(16) | — | 否 | — | 年份 |
| title | VARCHAR(128) | VARCHAR(128) | — | 否 | — | 事件标题 |
| desc | TEXT | TEXT | — | 是 | NULL | 事件描述 |
| sort_order | INTEGER | INT | — | 否 | 0 | 排序 |
| is_activate | TINYINT | SMALLINT | — | 否 | 1 | （通用列）0 禁用/1 激活 |
| created_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）创建人 |
| created_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）创建时间 |
| updated_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）修改人 |
| updated_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）修改时间 |

> 推导依据：PRD §5.7 FE-ABOUT-02 发展历程时间轴、UI/UX §4.2 时间轴、§6.6。

#### 4.18 CaseImage（案例多图）⚠ 推导字段，待确认

| 字段 | SQLite | PostgreSQL | 键 | 可空 | 默认 | 说明 |
|------|--------|-----------|----|------|------|------|
| id | INTEGER | INT | PK | 否 | 自增 | 主键 |
| case_id | INTEGER | INT | FK→Case | 否 | — | 所属案例 |
| url | VARCHAR(500) | VARCHAR(500) | — | 否 | — | 图片路径/URL |
| sort_order | INTEGER | INT | — | 否 | 0 | 排序 |
| is_cover | TINYINT | SMALLINT | — | 否 | 0 | 是否封面 |
| is_activate | TINYINT | SMALLINT | — | 否 | 1 | （通用列）0 禁用/1 激活 |
| created_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）创建人 |
| created_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）创建时间 |
| updated_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）修改人 |
| updated_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）修改时间 |

> 推导依据：PRD §6.5 BE-CASE-01 案例多图、UI/UX §5.4 案例详情多图。

#### 4.19 NewsCategory（新闻分类）⚠ 推导字段，待确认

| 字段 | SQLite | PostgreSQL | 键 | 可空 | 默认 | 说明 |
|------|--------|-----------|----|------|------|------|
| id | INTEGER | INT | PK | 否 | 自增 | 主键 |
| name | VARCHAR(64) | VARCHAR(64) | — | 否 | — | 分类名（默认：企业新闻/行业资讯） |
| sort_order | INTEGER | INT | — | 否 | 0 | 排序 |
| status | TINYINT | SMALLINT | — | 否 | 1 | 业务状态：0 下线/1 上线（与 is_activate 共存） |
| is_activate | TINYINT | SMALLINT | — | 否 | 1 | （通用列）0 禁用/1 激活 |
| created_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）创建人 |
| created_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）创建时间 |
| updated_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）修改人 |
| updated_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）修改时间 |

> 推导依据：PRD §6.6 BE-NEWS-01 新闻分类（企业新闻/行业资讯，可维护）、UI/UX §5.5。

#### 4.20 Permission（权限项）⚠ 推导字段，待确认

| 字段 | SQLite | PostgreSQL | 键 | 可空 | 默认 | 说明 |
|------|--------|-----------|----|------|------|------|
| id | INTEGER | INT | PK | 否 | 自增 | 主键 |
| code | VARCHAR(64) | VARCHAR(64) | — | 否 | — | 权限编码（如 `product:edit`） |
| name | VARCHAR(64) | VARCHAR(64) | — | 否 | — | 权限名 |
| "group" | VARCHAR(64) | VARCHAR(64) | — | 否 | — | 分组（产品/案例/系统…） |
| remark | VARCHAR(255) | VARCHAR(255) | — | 是 | NULL | 备注 |
| is_activate | TINYINT | SMALLINT | — | 否 | 1 | （通用列）0 禁用/1 激活 |
| created_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）创建人 |
| created_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）创建时间 |
| updated_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）修改人 |
| updated_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）修改时间 |

> 推导依据：PRD §6.11 BE-SYS-02 角色绑定权限（菜单级+按钮级）、ADR-004 RBAC。Role.permissions 存 code 列表，本表为 code 字典。

#### 4.21 OperationLog（操作日志）⚠ 推导字段，待确认

| 字段 | SQLite | PostgreSQL | 键 | 可空 | 默认 | 说明 |
|------|--------|-----------|----|------|------|------|
| id | INTEGER | INT | PK | 否 | 自增 | 主键 |
| created_at | INTEGER | INT | FK→Admin | 否 | — | （通用列）操作人（由 v1.0 `admin_id` 改名，即创建人） |
| action | VARCHAR(64) | VARCHAR(64) | — | 否 | — | 操作类型（login/content_create…） |
| target | VARCHAR(128) | VARCHAR(128) | — | 是 | NULL | 操作对象 |
| ip | VARCHAR(64) | VARCHAR(64) | — | 是 | NULL | IP |
| is_activate | TINYINT | SMALLINT | — | 否 | 1 | （通用列）恒为 1（日志追加，名义状态） |
| created_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）操作时间（原 created_at 时间字段改名） |
| updated_at | INTEGER | INT | FK→Admin | 是 | NULL | （通用列）修改人（通常为 NULL） |
| updated_date | DATETIME | TIMESTAMPTZ | — | 否 | now | （通用列）修改时间 |

> 推导依据：PRD §6.11 BE-SYS-03 操作日志（登录/增删改/状态变更）、UI/UX §6.8。

---

## 第 5 章 建表 SQL

### 5.1 SQLite 建表语句（开发环境）

> 以开发文档 §4.3「SQLite 列」类型为准；时间默认用 `CURRENT_TIMESTAMP` 实现字段表的 `now`；外键级联策略见 §5.3。**所有表均含通用列 `is_activate` / `created_at` / `created_date` / `updated_at` / `updated_date`。**

```sql
PRAGMA foreign_keys = ON;

-- 系统 / 配置域
CREATE TABLE IF NOT EXISTS admin (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  username        VARCHAR(64)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  name            VARCHAR(64),
  nickname        VARCHAR(64),
  phone           VARCHAR(32),
  email           VARCHAR(128),
  gender          TINYINT      NOT NULL DEFAULT 0,
  position        VARCHAR(64),
  dept_id         INTEGER,
  role_id         INTEGER      NOT NULL,
  last_login_at   DATETIME,
  is_activate     TINYINT      NOT NULL DEFAULT 1,
  created_at      INTEGER,
  created_date    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      INTEGER,
  updated_date    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dept_id)     REFERENCES department(id) ON DELETE SET NULL,
  FOREIGN KEY (role_id)      REFERENCES role(id)      ON DELETE RESTRICT,
  FOREIGN KEY (created_at)   REFERENCES admin(id)     ON DELETE SET NULL,
  FOREIGN KEY (updated_at)   REFERENCES admin(id)     ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS department (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       VARCHAR(128) NOT NULL UNIQUE,
  parent_id  INTEGER,
  sort_order INTEGER       NOT NULL DEFAULT 0,
  is_activate TINYINT      NOT NULL DEFAULT 1,
  created_at  INTEGER,
  created_date DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  INTEGER,
  updated_date DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id)   REFERENCES department(id) ON DELETE SET NULL,
  FOREIGN KEY (created_at)  REFERENCES admin(id)     ON DELETE SET NULL,
  FOREIGN KEY (updated_at)  REFERENCES admin(id)     ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS role (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        VARCHAR(64)  NOT NULL,
  permissions TEXT         NOT NULL DEFAULT '[]',
  description VARCHAR(255),
  is_activate TINYINT      NOT NULL DEFAULT 1,
  created_at  INTEGER,
  created_date DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  INTEGER,
  updated_date DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS site_config (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  site_name       VARCHAR(128),
  logo            VARCHAR(255),
  contact_phone   VARCHAR(32),
  contact_email   VARCHAR(128),
  company_address VARCHAR(255),
  icp             VARCHAR(128),
  copyright       VARCHAR(255),
  is_activate     TINYINT      NOT NULL DEFAULT 1,
  created_at      INTEGER,
  created_date    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      INTEGER,
  updated_date    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS banner (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      VARCHAR(128),
  subtitle   VARCHAR(255),
  img_url    VARCHAR(500) NOT NULL,
  link       VARCHAR(500),
  sort_order INTEGER      NOT NULL DEFAULT 0,
  status     TINYINT      NOT NULL DEFAULT 1,
  is_activate TINYINT     NOT NULL DEFAULT 1,
  created_at  INTEGER,
  created_date DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  INTEGER,
  updated_date DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS highlight (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      VARCHAR(128) NOT NULL,
  desc       VARCHAR(255),
  icon       VARCHAR(255),
  sort_order INTEGER      NOT NULL DEFAULT 0,
  status     TINYINT      NOT NULL DEFAULT 1,
  is_activate TINYINT     NOT NULL DEFAULT 1,
  created_at  INTEGER,
  created_date DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  INTEGER,
  updated_date DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS about_page (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       VARCHAR(64)  NOT NULL,
  title      VARCHAR(128),
  content    TEXT,
  is_activate TINYINT     NOT NULL DEFAULT 1,
  created_at  INTEGER,
  created_date DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  INTEGER,
  updated_date DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS milestone (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  year       VARCHAR(16)  NOT NULL,
  title      VARCHAR(128) NOT NULL,
  desc       TEXT,
  sort_order INTEGER      NOT NULL DEFAULT 0,
  is_activate TINYINT     NOT NULL DEFAULT 1,
  created_at  INTEGER,
  created_date DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  INTEGER,
  updated_date DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS news_category (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       VARCHAR(64)  NOT NULL,
  sort_order INTEGER      NOT NULL DEFAULT 0,
  status     TINYINT      NOT NULL DEFAULT 1,
  is_activate TINYINT     NOT NULL DEFAULT 1,
  created_at  INTEGER,
  created_date DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  INTEGER,
  updated_date DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS permission (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  code   VARCHAR(64)  NOT NULL,
  name   VARCHAR(64)  NOT NULL,
  "group" VARCHAR(64) NOT NULL,
  remark VARCHAR(255),
  is_activate TINYINT  NOT NULL DEFAULT 1,
  created_at  INTEGER,
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  INTEGER,
  updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS operation_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER      NOT NULL,
  action     VARCHAR(64)  NOT NULL,
  target     VARCHAR(128),
  ip         VARCHAR(64),
  is_activate TINYINT     NOT NULL DEFAULT 1,
  created_date DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  INTEGER,
  updated_date DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

-- 业务域
CREATE TABLE IF NOT EXISTS product_series (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         VARCHAR(128) NOT NULL,
  description  TEXT,
  cover_image  VARCHAR(255),
  sort_order   INTEGER       NOT NULL DEFAULT 0,
  status       TINYINT       NOT NULL DEFAULT 0,
  published_at DATETIME,
  valid_until  DATETIME,
  is_activate  TINYINT       NOT NULL DEFAULT 1,
  created_at   INTEGER,
  created_date DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   INTEGER,
  updated_date DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS space_category (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       VARCHAR(64)  NOT NULL,
  scope      VARCHAR(32)  NOT NULL DEFAULT 'all',
  sort_order INTEGER      NOT NULL DEFAULT 0,
  status     TINYINT      NOT NULL DEFAULT 1,
  is_activate TINYINT     NOT NULL DEFAULT 1,
  created_at  INTEGER,
  created_date DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  INTEGER,
  updated_date DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS product (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id       INTEGER,
  series_id         INTEGER,
  code              VARCHAR(64)  NOT NULL UNIQUE,
  description       TEXT,
  specs             TEXT,
  cover_image       VARCHAR(255),
  images            TEXT,
  status            TINYINT      NOT NULL DEFAULT 0,
  is_top            TINYINT      NOT NULL DEFAULT 0,
  sort_order        INTEGER      NOT NULL DEFAULT 0,
  is_activate       TINYINT      NOT NULL DEFAULT 1,
  created_at        INTEGER,
  created_date      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        INTEGER,
  updated_date      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id)       REFERENCES space_category(id) ON DELETE SET NULL,
  FOREIGN KEY (series_id)         REFERENCES product_series(id) ON DELETE SET NULL,
  FOREIGN KEY (created_at)        REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at)        REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS case (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         VARCHAR(128) NOT NULL,
  space_id      INTEGER,
  area          VARCHAR(64),
  style         VARCHAR(64),
  customer      VARCHAR(64),
  house_type    VARCHAR(64),
  series        VARCHAR(256),
  description   TEXT,
  images        TEXT,
  sort_order    INTEGER       NOT NULL DEFAULT 0,
  status        TINYINT       NOT NULL DEFAULT 0,
  is_recommended TINYINT      NOT NULL DEFAULT 0,
  is_activate   TINYINT       NOT NULL DEFAULT 1,
  created_at    INTEGER,
  created_date  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    INTEGER,
  updated_date  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (space_id)   REFERENCES space_category(id) ON DELETE SET NULL,
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS news_article (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         VARCHAR(128) NOT NULL,
  category_id   INTEGER,
  cover_image   VARCHAR(255),
  summary       VARCHAR(500),
  content       TEXT,
  source        VARCHAR(255),
  is_published  TINYINT       NOT NULL DEFAULT 0,
  is_top        TINYINT       NOT NULL DEFAULT 0,
  published_at  DATETIME,
  expired_at    DATETIME,
  is_activate   TINYINT       NOT NULL DEFAULT 1,
  created_at    INTEGER,
  created_date  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    INTEGER,
  updated_date  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES news_category(id) ON DELETE SET NULL,
  FOREIGN KEY (created_at)   REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at)   REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS job (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           VARCHAR(128) NOT NULL,
  job_type        VARCHAR(32)  NOT NULL DEFAULT 'social',
  department      VARCHAR(128),
  location        VARCHAR(128),
  employment_type VARCHAR(32),
  responsibilities TEXT,
  requirements    TEXT,
  benefits        TEXT,
  sort_order      INTEGER       NOT NULL DEFAULT 0,
  status          TINYINT       NOT NULL DEFAULT 1,
  is_activate     TINYINT       NOT NULL DEFAULT 1,
  created_at      INTEGER,
  created_date    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      INTEGER,
  updated_date    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS job_application (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id           INTEGER      NOT NULL,
  name             VARCHAR(64)  NOT NULL,
  phone            VARCHAR(32)  NOT NULL,
  intended_position VARCHAR(128),
  message          TEXT,
  status           VARCHAR(32)  NOT NULL DEFAULT '未处理',
  remark           TEXT,
  is_activate      TINYINT      NOT NULL DEFAULT 1,
  created_at       INTEGER,
  created_date     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       INTEGER,
  updated_date     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id)     REFERENCES job(id) ON DELETE CASCADE,
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lead (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  type            VARCHAR(32)  NOT NULL DEFAULT 'online_message',
  name            VARCHAR(64)  NOT NULL,
  phone           VARCHAR(32)  NOT NULL,
  city            VARCHAR(64),
  requirement_type VARCHAR(64) NOT NULL,
  store           VARCHAR(128),
  message         TEXT,
  source_page     VARCHAR(128) DEFAULT '在线预约',
  status          VARCHAR(32)  NOT NULL DEFAULT '未处理',
  remark          TEXT,
  handler_id      INTEGER,
  is_activate     TINYINT      NOT NULL DEFAULT 1,
  created_at      INTEGER,
  created_date    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      INTEGER,
  updated_date    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (handler_id)  REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (created_at)  REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at)  REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS store (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           VARCHAR(128) NOT NULL,
  address        VARCHAR(255),
  phone          VARCHAR(32),
  business_hours VARCHAR(128),
  map_url        VARCHAR(500),
  sort_order     INTEGER       NOT NULL DEFAULT 0,
  status         TINYINT       NOT NULL DEFAULT 1,
  is_activate    TINYINT       NOT NULL DEFAULT 1,
  created_at     INTEGER,
  created_date   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     INTEGER,
  updated_date   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS case_image (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id    INTEGER      NOT NULL,
  url        VARCHAR(500) NOT NULL,
  sort_order INTEGER      NOT NULL DEFAULT 0,
  is_cover   TINYINT      NOT NULL DEFAULT 0,
  is_activate TINYINT     NOT NULL DEFAULT 1,
  created_at  INTEGER,
  created_date DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  INTEGER,
  updated_date DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id)    REFERENCES case(id) ON DELETE CASCADE,
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);
```

### 5.2 PostgreSQL 建表语句（生产环境）

> 与 §5.1 字段一一对应；主键用 `SERIAL`，时间用 `TIMESTAMPTZ`，JSON 用 `JSONB`，外键策略一致。

```sql
-- 系统 / 配置域
CREATE TABLE IF NOT EXISTS admin (
  id              SERIAL PRIMARY KEY,
  username        VARCHAR(64)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  name            VARCHAR(64),
  nickname        VARCHAR(64),
  phone           VARCHAR(32),
  email           VARCHAR(128),
  gender          SMALLINT      NOT NULL DEFAULT 0,
  position        VARCHAR(64),
  dept_id         INTEGER,
  role_id         INTEGER       NOT NULL,
  last_login_at   TIMESTAMPTZ,
  is_activate     SMALLINT      NOT NULL DEFAULT 1,
  created_at      INTEGER,
  created_date    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      INTEGER,
  updated_date    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  FOREIGN KEY (dept_id)     REFERENCES department(id) ON DELETE SET NULL,
  FOREIGN KEY (role_id)      REFERENCES role(id)      ON DELETE RESTRICT,
  FOREIGN KEY (created_at)   REFERENCES admin(id)     ON DELETE SET NULL,
  FOREIGN KEY (updated_at)   REFERENCES admin(id)     ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS department (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(128) NOT NULL UNIQUE,
  parent_id  INTEGER,
  sort_order INTEGER       NOT NULL DEFAULT 0,
  is_activate SMALLINT     NOT NULL DEFAULT 1,
  created_at  INTEGER,
  created_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  INTEGER,
  updated_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (parent_id)  REFERENCES department(id) ON DELETE SET NULL,
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS role (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(64)  NOT NULL,
  permissions JSONB        NOT NULL DEFAULT '[]'::jsonb,
  description VARCHAR(255),
  is_activate SMALLINT     NOT NULL DEFAULT 1,
  created_at  INTEGER,
  created_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  INTEGER,
  updated_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS site_config (
  id              SERIAL PRIMARY KEY,
  site_name       VARCHAR(128),
  logo            VARCHAR(255),
  contact_phone   VARCHAR(32),
  contact_email   VARCHAR(128),
  company_address VARCHAR(255),
  icp             VARCHAR(128),
  copyright       VARCHAR(255),
  is_activate     SMALLINT      NOT NULL DEFAULT 1,
  created_at      INTEGER,
  created_date    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      INTEGER,
  updated_date    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS banner (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(128),
  subtitle   VARCHAR(255),
  img_url    VARCHAR(500) NOT NULL,
  link       VARCHAR(500),
  sort_order INTEGER      NOT NULL DEFAULT 0,
  status     SMALLINT     NOT NULL DEFAULT 1,
  is_activate SMALLINT     NOT NULL DEFAULT 1,
  created_at  INTEGER,
  created_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  INTEGER,
  updated_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS highlight (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(128) NOT NULL,
  desc       VARCHAR(255),
  icon       VARCHAR(255),
  sort_order INTEGER      NOT NULL DEFAULT 0,
  status     SMALLINT     NOT NULL DEFAULT 1,
  is_activate SMALLINT     NOT NULL DEFAULT 1,
  created_at  INTEGER,
  created_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  INTEGER,
  updated_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS about_page (
  id         SERIAL PRIMARY KEY,
  slug       VARCHAR(64)  NOT NULL,
  title      VARCHAR(128),
  content    TEXT,
  is_activate SMALLINT     NOT NULL DEFAULT 1,
  created_at  INTEGER,
  created_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  INTEGER,
  updated_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS milestone (
  id         SERIAL PRIMARY KEY,
  year       VARCHAR(16)  NOT NULL,
  title      VARCHAR(128) NOT NULL,
  desc       TEXT,
  sort_order INTEGER      NOT NULL DEFAULT 0,
  is_activate SMALLINT     NOT NULL DEFAULT 1,
  created_at  INTEGER,
  created_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  INTEGER,
  updated_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS news_category (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(64)  NOT NULL,
  sort_order INTEGER      NOT NULL DEFAULT 0,
  status     SMALLINT     NOT NULL DEFAULT 1,
  is_activate SMALLINT     NOT NULL DEFAULT 1,
  created_at  INTEGER,
  created_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  INTEGER,
  updated_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS permission (
  id     SERIAL PRIMARY KEY,
  code   VARCHAR(64)  NOT NULL,
  name   VARCHAR(64)  NOT NULL,
  "group" VARCHAR(64) NOT NULL,
  remark VARCHAR(255),
  is_activate SMALLINT  NOT NULL DEFAULT 1,
  created_at  INTEGER,
  created_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  INTEGER,
  updated_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS operation_log (
  id         SERIAL PRIMARY KEY,
  created_at INTEGER      NOT NULL,
  action     VARCHAR(64)  NOT NULL,
  target     VARCHAR(128),
  ip         VARCHAR(64),
  is_activate SMALLINT     NOT NULL DEFAULT 1,
  created_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  INTEGER,
  updated_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

-- 业务域
CREATE TABLE IF NOT EXISTS product_series (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(128) NOT NULL,
  description  TEXT,
  cover_image  VARCHAR(255),
  sort_order   INTEGER       NOT NULL DEFAULT 0,
  status       SMALLINT      NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  valid_until  TIMESTAMPTZ,
  is_activate  SMALLINT      NOT NULL DEFAULT 1,
  created_at   INTEGER,
  created_date TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   INTEGER,
  updated_date TIMESTAMPTZ   NOT NULL DEFAULT now(),
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS space_category (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(64)  NOT NULL,
  scope      VARCHAR(32)  NOT NULL DEFAULT 'all',
  sort_order INTEGER      NOT NULL DEFAULT 0,
  status     SMALLINT     NOT NULL DEFAULT 1,
  is_activate SMALLINT     NOT NULL DEFAULT 1,
  created_at  INTEGER,
  created_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  INTEGER,
  updated_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS product (
  id                SERIAL PRIMARY KEY,
  category_id       INTEGER,
  series_id         INTEGER,
  code              VARCHAR(64)  NOT NULL UNIQUE,
  description       TEXT,
  specs             JSONB,
  cover_image       VARCHAR(255),
  images            JSONB,
  status            SMALLINT     NOT NULL DEFAULT 0,
  is_top            SMALLINT     NOT NULL DEFAULT 0,
  sort_order        INTEGER      NOT NULL DEFAULT 0,
  is_activate       SMALLINT     NOT NULL DEFAULT 1,
  created_at        INTEGER,
  created_date      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        INTEGER,
  updated_date      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  FOREIGN KEY (category_id)       REFERENCES space_category(id) ON DELETE SET NULL,
  FOREIGN KEY (series_id)         REFERENCES product_series(id) ON DELETE SET NULL,
  FOREIGN KEY (created_at)        REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at)        REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS case (
  id             SERIAL PRIMARY KEY,
  title          VARCHAR(128) NOT NULL,
  space_id       INTEGER,
  area           VARCHAR(64),
  style          VARCHAR(64),
  customer       VARCHAR(64),
  house_type     VARCHAR(64),
  series         VARCHAR(256),
  description    TEXT,
  images         TEXT,
  sort_order     INTEGER       NOT NULL DEFAULT 0,
  status         SMALLINT      NOT NULL DEFAULT 0,
  is_recommended SMALLINT      NOT NULL DEFAULT 0,
  is_activate    SMALLINT      NOT NULL DEFAULT 1,
  created_at     INTEGER,
  created_date   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     INTEGER,
  updated_date   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  FOREIGN KEY (space_id)   REFERENCES space_category(id) ON DELETE SET NULL,
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS news_article (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(128) NOT NULL,
  category_id   INTEGER,
  cover_image   VARCHAR(255),
  summary       VARCHAR(500),
  content       TEXT,
  source        VARCHAR(255),
  is_published  SMALLINT      NOT NULL DEFAULT 0,
  is_top        SMALLINT      NOT NULL DEFAULT 0,
  published_at  TIMESTAMPTZ,
  expired_at    TIMESTAMPTZ,
  is_activate   SMALLINT      NOT NULL DEFAULT 1,
  created_at    INTEGER,
  created_date  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    INTEGER,
  updated_date  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  FOREIGN KEY (category_id) REFERENCES news_category(id) ON DELETE SET NULL,
  FOREIGN KEY (created_at)   REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at)   REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS job (
  id              SERIAL PRIMARY KEY,
  title           VARCHAR(128) NOT NULL,
  job_type        VARCHAR(32)  NOT NULL DEFAULT 'social',
  department      VARCHAR(128),
  location        VARCHAR(128),
  employment_type VARCHAR(32),
  responsibilities TEXT,
  requirements    TEXT,
  benefits        TEXT,
  sort_order      INTEGER       NOT NULL DEFAULT 0,
  status          SMALLINT      NOT NULL DEFAULT 1,
  is_activate     SMALLINT      NOT NULL DEFAULT 1,
  created_at      INTEGER,
  created_date    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      INTEGER,
  updated_date    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS job_application (
  id               SERIAL PRIMARY KEY,
  job_id           INTEGER      NOT NULL,
  name             VARCHAR(64)  NOT NULL,
  phone            VARCHAR(32)  NOT NULL,
  intended_position VARCHAR(128),
  message          TEXT,
  status           VARCHAR(32)  NOT NULL DEFAULT '未处理',
  remark           TEXT,
  is_activate      SMALLINT     NOT NULL DEFAULT 1,
  created_at       INTEGER,
  created_date     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       INTEGER,
  updated_date     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  FOREIGN KEY (job_id)     REFERENCES job(id) ON DELETE CASCADE,
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lead (
  id              SERIAL PRIMARY KEY,
  type            VARCHAR(32)  NOT NULL DEFAULT 'online_message',
  name            VARCHAR(64)  NOT NULL,
  phone           VARCHAR(32)  NOT NULL,
  city            VARCHAR(64),
  requirement_type VARCHAR(64) NOT NULL,
  store           VARCHAR(128),
  message         TEXT,
  source_page     VARCHAR(128) DEFAULT '在线预约',
  status          VARCHAR(32)  NOT NULL DEFAULT '未处理',
  remark          TEXT,
  handler_id      INTEGER,
  is_activate     SMALLINT      NOT NULL DEFAULT 1,
  created_at      INTEGER,
  created_date    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      INTEGER,
  updated_date    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  FOREIGN KEY (handler_id)  REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (created_at)  REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at)  REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS store (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(128) NOT NULL,
  address        VARCHAR(255),
  phone          VARCHAR(32),
  business_hours VARCHAR(128),
  map_url        VARCHAR(500),
  sort_order     INTEGER       NOT NULL DEFAULT 0,
  status         SMALLINT      NOT NULL DEFAULT 1,
  is_activate    SMALLINT      NOT NULL DEFAULT 1,
  created_at     INTEGER,
  created_date   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     INTEGER,
  updated_date   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS case_image (
  id         SERIAL PRIMARY KEY,
  case_id    INTEGER      NOT NULL,
  url        VARCHAR(500) NOT NULL,
  sort_order INTEGER      NOT NULL DEFAULT 0,
  is_cover   SMALLINT     NOT NULL DEFAULT 0,
  is_activate SMALLINT     NOT NULL DEFAULT 1,
  created_at  INTEGER,
  created_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  INTEGER,
  updated_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (case_id)    REFERENCES case(id) ON DELETE CASCADE,
  FOREIGN KEY (created_at) REFERENCES admin(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_at) REFERENCES admin(id) ON DELETE SET NULL
);
```

### 5.3 索引与约束说明

**唯一约束**（建表中已声明）：`admin.username`、`department.name`、`product.code`、`site_config`（应用层约束单行 id=1）。

**外键级联策略汇总**：

| 外键 | 行为 | 理由 |
|------|------|------|
| admin.dept_id → department | SET NULL | 部门删除后管理员保留、部门置空 |
| admin.role_id → role | RESTRICT | 角色不可随意删；删除前需先迁移管理员到其他角色 |
| department.parent_id → department | SET NULL | 父部门删除后子部门置顶层（父置空） |
| product_series.created_at/updated_at → admin | SET NULL | 管理员离职后创建人/修改人置空 |
| product.series_id → product_series | SET NULL | 系列下线后单品保留 |
| product.category_id → space_category | SET NULL | 空间分类删除后单品保留 |
| case.space_id → space_category | SET NULL | 同左 |
| news_article.category_id → news_category | SET NULL | 分类删除后文章保留 |
| job_application.job_id → job | CASCADE | 职位删除则对应投递一并清理 |
| lead.handler_id → admin | SET NULL | 处理人离职后线索保留 |
| case_image.case_id → case | CASCADE | 案例删除则多图一并清理 |
| operation_log.created_at → admin | SET NULL | 操作日志保留，操作人置空 |
| 全表 created_at/updated_at → admin | SET NULL | 通用审计列：管理员离职后创建人/修改人置空，记录保留 |

**建议索引**（SQLite/PG 通用，CREATE INDEX IF NOT EXISTS）：

```sql
CREATE INDEX IF NOT EXISTS idx_department_parent    ON department(parent_id);
CREATE INDEX IF NOT EXISTS idx_admin_is_activate    ON admin(is_activate);
CREATE INDEX IF NOT EXISTS idx_role_is_activate     ON role(is_activate);
CREATE INDEX IF NOT EXISTS idx_product_series       ON product(series_id);
CREATE INDEX IF NOT EXISTS idx_product_category      ON product(category_id);
CREATE INDEX IF NOT EXISTS idx_product_status       ON product(status);
CREATE INDEX IF NOT EXISTS idx_product_is_activate  ON product(is_activate);
CREATE INDEX IF NOT EXISTS idx_product_is_top       ON product(is_top);
CREATE INDEX IF NOT EXISTS idx_case_space           ON case(space_id);
CREATE INDEX IF NOT EXISTS idx_case_status          ON case(status);
CREATE INDEX IF NOT EXISTS idx_case_is_activate     ON case(is_activate);
CREATE INDEX IF NOT EXISTS idx_news_category        ON news_article(category_id);
CREATE INDEX IF NOT EXISTS idx_news_is_activate     ON news_article(is_activate);
CREATE INDEX IF NOT EXISTS idx_news_is_published   ON news_article(is_published);
CREATE INDEX IF NOT EXISTS idx_jobapp_job           ON job_application(job_id);
CREATE INDEX IF NOT EXISTS idx_lead_type            ON lead(type);
CREATE INDEX IF NOT EXISTS idx_lead_status          ON lead(status);
CREATE INDEX IF NOT EXISTS idx_lead_handler         ON lead(handler_id);
CREATE INDEX IF NOT EXISTS idx_caseimage_case       ON case_image(case_id);
CREATE INDEX IF NOT EXISTS idx_operationlog_admin   ON operation_log(created_at);
CREATE INDEX IF NOT EXISTS idx_permission_code      ON permission(code);
```

**查询优化建议**：前台首页聚合 `/api/home` 取 `product(is_activate=1, status=1, is_top=1)`、`case(is_activate=1, status=1)`、`banner(is_activate=1, status=1)` 按 `sort_order` 排序，依赖上述索引；后台列表分页依赖 `is_activate` + `status` + `sort_order` 组合索引（如需可补 `CREATE INDEX ... ON product(is_activate, status, sort_order)`）。

---

## 第 6 章 初始数据与种子（seed）

> 与现有原型 `backend/seed` 及开发技术文档 §5.3 对齐；用于本地开发自测。所有种子行 `is_activate=1`，并写入 `created_at`/`updated_at`（超管自身或 1）。

| 数据项 | 内容 | 备注 |
|--------|------|------|
| 超管 | `username=admin`，`password_hash=bcrypt('admin123')`，`role_id=1`，`is_activate=1`，`created_at=1`，`updated_at=1` | 登录 admin/admin123 |
| 默认角色 | `超级管理员`（permissions 含全部 code）/ `编辑`（部分 code），`is_activate=1` | Role.permissions 存 code 列表 |
| 示例系列 | 柏悦系列（id=3，status=1，is_activate=1，cover_image=示例 URL） | 与原型 seed 一致 |
| 示例产品 | 柏悦主卧衣柜（id=3，series_id=3，status=1，is_activate=1，is_top=1） | 系列下需有产品才在前台展示 |
| 示例空间 | 客厅 / 卧室 / 整屋（scope 分别 product/case/all），`is_activate=1` | 前后台分类数据源 |
| 示例门店 | 1~2 个门店（name/address/phone，status=1，is_activate=1） | 预约到店下拉 |
| 示例案例 | 1~2 条（space_id/series/status=1，is_activate=1，多图） | 前台案例页 |
| 站点配置 | site_config 单行（id=1，site_name/logo/联系方式/icp，is_activate=1） | 全站页脚/SEO |
| 新闻分类 | 企业新闻 / 行业资讯（status=1，is_activate=1） | 新闻发布下拉 |
| 部门示例 | 总部 / 销售部（parent_id 演示层级，is_activate=1） | 用户表 dept_id 下拉 |

> 种子脚本建议：`backend/seed.py` 在 `Base.metadata.create_all` 后写入；幂等（先查后插）；8 个推导实体在字段拍板后纳入种子。

---

## 第 7 章 迁移与演进（Alembic）

### 7.1 初始化

- 使用 Alembic 管理 schema 演进；`alembic.ini` 指向 `DATABASE_URL`（SQLite 开发 / PostgreSQL 生产，由环境变量切换）。
- 首个 migration = 本文 §5.1/§5.2 全量建表；后续变更生成增量 migration。

### 7.2 SQLite → PostgreSQL 迁移注意点

| 关注点 | 说明 |
|--------|------|
| 自增主键 | SQLite `AUTOINCREMENT` → PG `SERIAL`；迁移后需重置序列 `setval(pg_get_serial_sequence(...), max(id))` |
| 通用状态 | `is_activate` TINYINT(0/1) → PG `SMALLINT`(0/1) |
| 审计列 | `created_at`/`updated_at` 为用户ID（INTEGER→INT）；`created_date`/`updated_date` 为时间（SQLite ISO8601 字符串 → PG `TIMESTAMPTZ`，迁移时 `CAST(... AS TIMESTAMPTZ)`） |
| JSON | SQLite `TEXT` → PG `JSONB`，迁移时 `CAST(... AS JSONB)` |
| 外键 | 迁移前确保数据满足外键约束（孤儿记录先置 NULL 或清理）；`created_at`/`updated_at` 指向 admin 亦需满足 |
| 大小写/关键字 | `case`、`group` 为保留字；PG 建表用双引号 `"case"`、`"group"`（本文已处理 permission."group"；`case` 表名在 ORM 中配置） |
| 索引 | 迁移后复核 §5.3 索引是否随表重建（含 is_activate / parent_id 索引） |

### 7.3 环境切换

- 开发：`SQLITE_URL=sqlite:///./tp_home.db`（与原型 `backend/tp_home.db` 一致，127.0.0.1 避 IPv6）。
- 生产：`POSTGRES_URL=postgresql://user:pwd@host:5432/tp_home`。
- 应用层通过 `database.py` 的 `DATABASE_URL` 统一读取，不硬编码。

---

## 第 8 章 附录：待确认项（Open Questions）

| # | 待确认项 | 现状 | 影响范围 |
|---|----------|------|----------|
| Q1 | Banner 字段（img_url 必填、link、subtitle） | ⚠ 推导 | §4.14 / §5 建表 |
| Q2 | Highlight 字段（icon 形式、desc 长度） | ⚠ 推导 | §4.15 / §5 建表 |
| Q3 | AboutPage slug 取值集合（about_tp/brand/history） | ⚠ 推导 | §4.16 |
| Q4 | Milestone 是否需封面图字段 | ⚠ 推导 | §4.17 |
| Q5 | CaseImage 是否保留（封面已冗余于主表；ProductImage 已在 v1.2 移除，改用 product.images JSON） | ⚠ 推导 | §4.18 |
| Q6 | NewsCategory 是否需 slug/状态枚举 | ⚠ 推导 | §4.19 |
| Q7 | Permission 分组枚举、code 命名规范 | ⚠ 推导 | §4.20 / RBAC |
| Q8 | OperationLog 是否记录请求体/耗时 | ⚠ 推导 | §4.21 |
| Q9 | 登录失败锁定策略（连续 N 次锁定） | PRD 未定 | admin 表扩展 |
| Q10 | 地图供应商（map_url 第三方嵌入） | PRD 未定 | store.map_url |
| Q11 | 第三方统计接入字段 | PRD 未定 | site_config 扩展 |
| Q12 | is_activate 与 status 共存策略 | **已确认：共存**（is_activate=通用生命周期，status=业务工作流） | §2.1 / §5 |
| Q13 | 用户表字段口径（real_name→name、新增 nickname/phone/email；部门加 parent_id） | **已确认** | §4.1–§4.3 / §5 |

---

> 文档结束。本文档以 PRD v1.2 + 开发技术文档 v1.0 为唯一事实源，字段与建表严格对齐，零设计漂移；8 个推导实体字段标 ⚠ 待确认。ER 图由「架构图与流程图绘制专家」技能生成 SVG 嵌入。v1.2 起 product/news 已按需求方口径重定义（product 多图改用 images JSON、ProductImage 表移除），v1.1 起全表统一 `is_activate` + 审计列（created_at/created_date/updated_at/updated_date），状态字段 is_activate 与业务 status 共存。
