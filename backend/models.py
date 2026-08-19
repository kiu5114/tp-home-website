"""SQLAlchemy 模型：20 张表（依据数据库设计文档 v1.2 §4 / §5）。

说明（决策基线 D2）：
- 案例多图并入 `case.images`（JSON），不建 `case_images` 表；实体共 20 张。
- 全表统一通用列：is_activate / created_at(创建人ID) / created_date(创建时间)
  / updated_at(修改人ID) / updated_date(修改时间)。注意 created_at 语义为创建人ID，非时间。
- JSON 列（role.permissions / product.specs / product.images / case.images）使用 SQLAlchemy JSON 类型，
  自动在 SQLite 存 TEXT、PostgreSQL 存 JSONB（数据库设计文档 §2.2）。
- `case` 为保留字表名、`group` 为保留字列名，已分别处理。
"""
from __future__ import annotations

from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from database import Base


class AuditMixin:
    """全表通用列（数据库设计文档 §2.1 / §2.3）。"""

    is_activate = Column(SmallInteger, nullable=False, default=1, server_default="1")
    created_at = Column(Integer)  # 创建人（用户ID）
    created_date = Column(DateTime, nullable=False, default=func.now(), server_default=func.now())
    updated_at = Column(Integer)  # 修改人（用户ID）
    updated_date = Column(DateTime, nullable=False, default=func.now(), server_default=func.now())


class Admin(Base, AuditMixin):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(64), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(64))
    nickname = Column(String(64))
    phone = Column(String(32))
    email = Column(String(128))
    gender = Column(SmallInteger, nullable=False, default=0, server_default="0")
    position = Column(String(64))
    dept_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"))
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False)
    last_login_at = Column(DateTime)

    role = relationship("Role", lazy="joined")


class Department(Base, AuditMixin):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128), nullable=False, unique=True)
    parent_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"))
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")


class Role(Base, AuditMixin):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), nullable=False)
    permissions = Column(JSON, nullable=False, default=list)
    description = Column(String(255))


class ProductSeries(Base, AuditMixin):
    __tablename__ = "product_series"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128), nullable=False)
    description = Column(Text)
    cover_image = Column(String(255))
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")
    status = Column(SmallInteger, nullable=False, default=0, server_default="0")
    published_at = Column(DateTime)
    valid_until = Column(DateTime)


class SpaceCategory(Base, AuditMixin):
    __tablename__ = "space_categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), nullable=False)
    scope = Column(String(32), nullable=False, default="all", server_default="all")
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")
    status = Column(SmallInteger, nullable=False, default=1, server_default="1")


class Product(Base, AuditMixin):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey("space_categories.id", ondelete="SET NULL"))
    series_id = Column(Integer, ForeignKey("product_series.id", ondelete="SET NULL"))
    code = Column(String(64), nullable=False, unique=True)
    description = Column(Text)
    specs = Column(JSON)
    cover_image = Column(String(255))
    images = Column(JSON)
    status = Column(SmallInteger, nullable=False, default=0, server_default="0")
    is_top = Column(SmallInteger, nullable=False, default=0, server_default="0")
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")


class Case(Base, AuditMixin):
    __tablename__ = "case"  # 保留字表名

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(128), nullable=False)
    space_id = Column(Integer, ForeignKey("space_categories.id", ondelete="SET NULL"))
    area = Column(String(64))
    style = Column(String(64))
    customer = Column(String(64))
    house_type = Column(String(64))
    series = Column(String(256))
    description = Column(Text)
    images = Column(JSON)
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")
    status = Column(SmallInteger, nullable=False, default=0, server_default="0")
    is_recommended = Column(SmallInteger, nullable=False, default=0, server_default="0")


class NewsArticle(Base, AuditMixin):
    __tablename__ = "news_articles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(128), nullable=False)
    category_id = Column(Integer, ForeignKey("news_categories.id", ondelete="SET NULL"))
    cover_image = Column(String(255))
    summary = Column(String(500))
    content = Column(Text)
    source = Column(String(255))
    is_published = Column(SmallInteger, nullable=False, default=0, server_default="0")
    is_top = Column(SmallInteger, nullable=False, default=0, server_default="0")
    published_at = Column(DateTime)
    expired_at = Column(DateTime)


class Job(Base, AuditMixin):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(128), nullable=False)
    job_type = Column(String(32), nullable=False, default="social", server_default="social")
    department = Column(String(128))
    location = Column(String(128))
    employment_type = Column(String(32))
    responsibilities = Column(Text)
    requirements = Column(Text)
    benefits = Column(Text)
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")
    status = Column(SmallInteger, nullable=False, default=1, server_default="1")


class JobApplication(Base, AuditMixin):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(64), nullable=False)
    phone = Column(String(32), nullable=False)
    intended_position = Column(String(128))
    message = Column(Text)
    status = Column(String(32), nullable=False, default="未处理", server_default="未处理")
    remark = Column(Text)


class Lead(Base, AuditMixin):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, autoincrement=True)
    type = Column(String(32), nullable=False, default="online_message", server_default="online_message")
    name = Column(String(64), nullable=False)
    phone = Column(String(32), nullable=False)
    city = Column(String(64))
    requirement_type = Column(String(64), nullable=False)
    store = Column(String(128))
    message = Column(Text)
    source_page = Column(String(128), default="在线预约", server_default="在线预约")
    status = Column(String(32), nullable=False, default="未处理", server_default="未处理")
    remark = Column(Text)
    handler_id = Column(Integer, ForeignKey("admins.id", ondelete="SET NULL"))


class Store(Base, AuditMixin):
    __tablename__ = "stores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128), nullable=False)
    address = Column(String(255))
    phone = Column(String(32))
    business_hours = Column(String(128))
    map_url = Column(String(500))
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")
    status = Column(SmallInteger, nullable=False, default=1, server_default="1")


class SiteConfig(Base, AuditMixin):
    __tablename__ = "site_config"

    id = Column(Integer, primary_key=True, autoincrement=True)  # 单行，应用层保证 id=1
    site_name = Column(String(128))
    logo = Column(String(255))
    contact_phone = Column(String(32))
    contact_email = Column(String(128))
    company_address = Column(String(255))
    icp = Column(String(128))
    copyright = Column(String(255))


class Banner(Base, AuditMixin):
    __tablename__ = "banners"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(128))
    subtitle = Column(String(255))
    img_url = Column(String(500), nullable=False)
    link = Column(String(500))
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")
    status = Column(SmallInteger, nullable=False, default=1, server_default="1")


class Highlight(Base, AuditMixin):
    __tablename__ = "highlights"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(128), nullable=False)
    desc = Column(String(255))
    icon = Column(String(255))
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")
    status = Column(SmallInteger, nullable=False, default=1, server_default="1")


class AboutPage(Base, AuditMixin):
    __tablename__ = "about_pages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    slug = Column(String(64), nullable=False)
    title = Column(String(128))
    content = Column(Text)


class Milestone(Base, AuditMixin):
    __tablename__ = "milestones"

    id = Column(Integer, primary_key=True, autoincrement=True)
    year = Column(String(16), nullable=False)
    title = Column(String(128), nullable=False)
    desc = Column(Text)
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")


class NewsCategory(Base, AuditMixin):
    __tablename__ = "news_categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")
    status = Column(SmallInteger, nullable=False, default=1, server_default="1")


class Permission(Base, AuditMixin):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(64), nullable=False)
    name = Column(String(64), nullable=False)
    group_ = Column("group", String(64), nullable=False)  # 保留字列名
    remark = Column(String(255))


class OperationLog(Base, AuditMixin):
    __tablename__ = "operation_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(Integer, nullable=False)  # 操作人（覆盖 mixin 默认值）
    action = Column(String(64), nullable=False)
    target = Column(String(128))
    ip = Column(String(64))


# 导出全部模型，供 Alembic / seed 引用
__all__ = [
    "Admin",
    "Department",
    "Role",
    "ProductSeries",
    "SpaceCategory",
    "Product",
    "Case",
    "NewsArticle",
    "Job",
    "JobApplication",
    "Lead",
    "Store",
    "SiteConfig",
    "Banner",
    "Highlight",
    "AboutPage",
    "Milestone",
    "NewsCategory",
    "Permission",
    "OperationLog",
]
