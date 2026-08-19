# =====================================================================
# TP 全屋家居 · 后端 Dockerfile
# ---------------------------------------------------------------------
# 功能：把 FastAPI 后端打包为可运行的容器镜像
# 说明：
#  - 基础镜像：python:3.13-slim（轻量）
#  - 安装 requirements.txt 全部依赖
#  - 复制后端代码 + 启动 uvicorn（监听 0.0.0.0:8000）
#  - 数据卷挂载 /app/uploads（上传文件）与 /app/tp_home.db（SQLite）
#    由 docker-compose.yml 声明；生产环境建议换 PostgreSQL（见部署文档）
# =====================================================================
FROM python:3.13-slim

# 设置工作目录（容器内代码路径）
WORKDIR /app

# 先复制依赖清单并安装（利用 Docker 层缓存，依赖不变时加速构建）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端全部源码（main.py / models / routers / seed 等）
COPY . .

# 创建上传目录（与数据库设计文档/uploads 对齐）
RUN mkdir -p /app/uploads

# 容器对外暴露端口 8000（uvicorn 监听地址）
EXPOSE 8000

# 启动命令：lifespan 会自动建表 + 幂等 seed
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
