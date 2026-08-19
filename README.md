# TP 全屋家居 · 企业官网与后台管理系统

这是一个开放环境的项目。TP 全屋家居品牌展示站：前台展示系统（web）+ 后台管理系统（admin）+ FastAPI 后端（backend）。

## 技术栈

| 模块 | 技术 |
|---|---|
| 前端前台（web） | React 18 + Tailwind CSS + Vite |
| 前端后台（admin） | React 18 + Ant Design 5 + Vite |
| 共享请求层 | packages/api-client（Axios + 统一响应信封 + 双 token 刷新） |
| 后端 | FastAPI + SQLAlchemy 2 + SQLite（生产可切 PostgreSQL） |
| 鉴权 | JWT 双 token（access/refresh）+ RBAC 角色权限 |

## 目录结构

```
backend/                  # FastAPI 后端（模块化：models/schemas/routers/seed）
apps/web/                 # 前台官网（React + Tailwind）
apps/admin/               # 后台管理（React + AntD5）
packages/api-client/      # 共享 API 请求层
deploy/                   # Docker / Nginx 部署骨架
prototype-*/              # 产品原型（页面效果参考）
*.md                      # PRD / UI/UX / 开发技术 / 数据库设计 / 实施方案文档
```

## 快速开始

### 后端
```bash
cd backend
python -m venv venv && source venv/Scripts/activate
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```
- 接口文档：http://127.0.0.1:8000/docs
- 默认账号：`admin / admin123`（上线前务必修改）

### 前端
```bash
npm install
npm run dev:web     # 前台 http://127.0.0.1:5173
npm run dev:admin   # 后台 http://127.0.0.1:5174
```

### Docker 部署
见 [`deploy/部署文档.md`](deploy/部署文档.md)。

## 说明
- 数据库设计以《数据库设计文档 v1.2》为准（20 张表，案例多图并入 `case.images` JSON）。
- 开发阶段使用 SQLite；生产建议切换 PostgreSQL 并使用 Alembic 迁移。
- 安全：JWT 密钥从环境变量 `JWT_SECRET` 读取（生产必须替换默认值）。
