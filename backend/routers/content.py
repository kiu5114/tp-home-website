"""内容路由：后台内容 CRUD（通用工厂）+ 前台公共只读接口 + 首页聚合 + 公共提交。

后台内容 CRUD（权限码见各资源）：
- banner / highlight / series / space / product / case / news(+news-categories) / job / job-application / store / about-pages / milestones

前台公共接口（无需鉴权，开发技术文档 §7.2）：
- GET /api/home、/api/products(+:id)、/api/cases(+:id)、/api/news(+:id)、/api/jobs(+:id)、/api/stores、/api/about
- POST /api/leads、POST /api/job-applications
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select

from crud_utils import make_crud_router, paginate
from deps import DbSession
from errors import BizError, ok
from models import (
    AboutPage,
    Banner,
    Case,
    Highlight,
    Job,
    JobApplication,
    Lead,
    Milestone,
    NewsArticle,
    NewsCategory,
    Product,
    ProductSeries,
    SiteConfig,
    SpaceCategory,
    Store,
)
from schemas import build_schemas

# ---------------- 后台内容 CRUD（通用工厂） ----------------

router = APIRouter()

router.include_router(
    make_crud_router(Banner, prefix="/api/admin/banners", perm="banner", tags=["内容-轮播"], search_fields=("title",))
)
router.include_router(
    make_crud_router(Highlight, prefix="/api/admin/highlights", perm="highlight", tags=["内容-亮点"])
)
router.include_router(
    make_crud_router(ProductSeries, prefix="/api/admin/series", perm="series", tags=["内容-产品系列"], search_fields=("name",))
)
router.include_router(
    make_crud_router(SpaceCategory, prefix="/api/admin/space-categories", perm="space", tags=["内容-空间分类"], search_fields=("name",))
)
router.include_router(
    make_crud_router(Product, prefix="/api/admin/products", perm="product", tags=["内容-产品"], search_fields=("code", "description"))
)
router.include_router(
    make_crud_router(Case, prefix="/api/admin/cases", perm="case", tags=["内容-案例"], search_fields=("title",))
)
router.include_router(
    make_crud_router(NewsArticle, prefix="/api/admin/news", perm="news", tags=["内容-新闻"], search_fields=("title",))
)
router.include_router(
    make_crud_router(NewsCategory, prefix="/api/admin/news-categories", perm="news", tags=["内容-新闻分类"], search_fields=("name",))
)
router.include_router(
    make_crud_router(Job, prefix="/api/admin/jobs", perm="job", tags=["内容-招聘"], search_fields=("title",))
)
# 投递（JobApplication）不在此处注册通用 CRUD：由 routers/job_applications_admin.py
# 提供列表与状态流转（权限码 job_application:view / job_application:update），
# 避免与通用工厂生成的 job_application:edit/:delete 冲突。
router.include_router(
    make_crud_router(Store, prefix="/api/admin/stores", perm="store", tags=["内容-门店"], search_fields=("name",))
)
router.include_router(
    make_crud_router(AboutPage, prefix="/api/admin/about-pages", perm="about", tags=["内容-关于页"], search_fields=("slug", "title"))
)
router.include_router(
    make_crud_router(Milestone, prefix="/api/admin/milestones", perm="about", tags=["内容-历程"], search_fields=("title",))
)


# ---------------- 前台公共只读接口（无需鉴权） ----------------

public = APIRouter()


def _series_name(db, series_id):
    if series_id is None:
        return None
    row = db.get(ProductSeries, series_id)
    return row.name if row else None


def _space_name(db, space_id):
    if space_id is None:
        return None
    row = db.get(SpaceCategory, space_id)
    return row.name if row else None


@public.get("/api/categories")
def categories_public(db: DbSession):
    """分类字典：产品系列 + 空间分类（产品页筛选与卡片标签用）。"""
    series = db.scalars(select(ProductSeries).where(ProductSeries.is_activate == 1, ProductSeries.status == 1).order_by(ProductSeries.sort_order, ProductSeries.id)).all()
    spaces = db.scalars(select(SpaceCategory).where(SpaceCategory.is_activate == 1, SpaceCategory.status == 1).order_by(SpaceCategory.sort_order, SpaceCategory.id)).all()
    SeriesOut = build_schemas(ProductSeries)[0]
    SpaceOut = build_schemas(SpaceCategory)[0]
    return ok(
        {
            "series": [SeriesOut.model_validate(s) for s in series],
            "spaces": [SpaceOut.model_validate(sp) for sp in spaces],
        }
    )


@public.get("/api/site-config")
def site_config_public(db: DbSession):
    """站点配置（前台页脚/联系方式）。单行 id=1，未配置返回 null。"""
    row = db.scalars(select(SiteConfig).where(SiteConfig.id == 1, SiteConfig.is_activate == 1)).first()
    if row is None:
        return ok(None)
    SiteConfigOut = build_schemas(SiteConfig)[0]
    return ok(SiteConfigOut.model_validate(row))


@public.get("/api/products")
def products_public(
    db: DbSession,
    series_id: Optional[int] = None,
    space_id: Optional[int] = None,
    status: int = Query(1, description="公开仅显示上架(status=1)"),
    reco: Optional[int] = None,
    keyword: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
):
    ProductOut = build_schemas(Product)[0]
    wheres = [Product.is_activate == 1, Product.status == status]
    if series_id is not None:
        wheres.append(Product.series_id == series_id)
    if space_id is not None:
        wheres.append(Product.category_id == space_id)
    if reco is not None:
        wheres.append(Product.is_top == reco)
    if keyword:
        wheres.append(Product.code.like(f"%{keyword}%"))
    total = db.scalar(select(func.count()).select_from(Product).where(*wheres)) or 0
    rows = db.scalars(
        select(Product).where(*wheres).order_by(Product.sort_order, Product.id).offset((page - 1) * page_size).limit(page_size)
    ).all()
    data = {
        "list": [
            {
                **ProductOut.model_validate(p).model_dump(),
                "series_name": _series_name(db, p.series_id),
                "space_name": _space_name(db, p.category_id),
            }
            for p in rows
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }
    return ok(data)


@public.get("/api/products/{item_id}")
def product_detail(item_id: int, db: DbSession):
    ProductOut = build_schemas(Product)[0]
    row = db.get(Product, item_id)
    if row is None or row.is_activate != 1 or row.status != 1:
        raise BizError("产品不存在")
    related = (
        db.scalars(
            select(Product)
            .where(Product.series_id == row.series_id, Product.id != row.id, Product.is_activate == 1, Product.status == 1)
            .limit(4)
        ).all()
    )
    return ok(
        {
            "detail": {
                **ProductOut.model_validate(row).model_dump(),
                "series_name": _series_name(db, row.series_id),
                "space_name": _space_name(db, row.category_id),
            },
            "related": [
                {
                    **ProductOut.model_validate(r).model_dump(),
                    "series_name": _series_name(db, r.series_id),
                    "space_name": _space_name(db, r.category_id),
                }
                for r in related
            ],
        }
    )


@public.get("/api/cases")
def cases_public(
    db: DbSession,
    space_id: Optional[int] = None,
    keyword: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(9, ge=1, le=100),
):
    CaseOut = build_schemas(Case)[0]
    wheres = [Case.is_activate == 1, Case.status == 1]
    if space_id is not None:
        wheres.append(Case.space_id == space_id)
    if keyword:
        wheres.append(Case.title.like(f"%{keyword}%"))
    total = db.scalar(select(func.count()).select_from(Case).where(*wheres)) or 0
    rows = db.scalars(
        select(Case).where(*wheres).order_by(Case.sort_order, Case.id).offset((page - 1) * page_size).limit(page_size)
    ).all()
    data = {
        "list": [
            {**CaseOut.model_validate(c).model_dump(), "space_name": _space_name(db, c.space_id)}
            for c in rows
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }
    return ok(data)


@public.get("/api/cases/{item_id}")
def case_detail(item_id: int, db: DbSession):
    CaseOut = build_schemas(Case)[0]
    row = db.get(Case, item_id)
    if row is None or row.is_activate != 1 or row.status != 1:
        raise BizError("案例不存在")
    return ok({**CaseOut.model_validate(row).model_dump(), "space_name": _space_name(db, row.space_id)})


@public.get("/api/news-categories")
def news_categories_public(db: DbSession):
    """新闻分类字典（前台 Tab 用）。"""
    rows = db.scalars(select(NewsCategory).where(NewsCategory.is_activate == 1, NewsCategory.status == 1).order_by(NewsCategory.sort_order, NewsCategory.id)).all()
    NewsCatOut = build_schemas(NewsCategory)[0]
    return ok([NewsCatOut.model_validate(c) for c in rows])


def _category_name(db, category_id):
    if category_id is None:
        return None
    row = db.get(NewsCategory, category_id)
    return row.name if row else None


@public.get("/api/news")
def news_public(
    db: DbSession,
    category_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
):
    NewsOut = build_schemas(NewsArticle)[0]
    wheres = [NewsArticle.is_activate == 1, NewsArticle.is_published == 1]
    if category_id is not None:
        wheres.append(NewsArticle.category_id == category_id)
    total = db.scalar(select(func.count()).select_from(NewsArticle).where(*wheres)) or 0
    rows = db.scalars(
        select(NewsArticle).where(*wheres).order_by(NewsArticle.published_at.desc(), NewsArticle.id.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    data = {
        "list": [{**NewsOut.model_validate(n).model_dump(), "category_name": _category_name(db, n.category_id)} for n in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }
    return ok(data)


@public.get("/api/news/{item_id}")
def news_detail(item_id: int, db: DbSession):
    NewsOut = build_schemas(NewsArticle)[0]
    row = db.get(NewsArticle, item_id)
    if row is None or row.is_activate != 1 or row.is_published != 1:
        raise BizError("新闻不存在")
    prev_row = db.scalars(
        select(NewsArticle).where(NewsArticle.is_published == 1, NewsArticle.is_activate == 1, NewsArticle.id < item_id).order_by(NewsArticle.id.desc()).limit(1)
    ).first()
    next_row = db.scalars(
        select(NewsArticle).where(NewsArticle.is_published == 1, NewsArticle.is_activate == 1, NewsArticle.id > item_id).order_by(NewsArticle.id).limit(1)
    ).first()
    return ok(
        {
            "detail": {**NewsOut.model_validate(row).model_dump(), "category_name": _category_name(db, row.category_id)},
            "prev": {"id": prev_row.id, "title": prev_row.title} if prev_row else None,
            "next": {"id": next_row.id, "title": next_row.title} if next_row else None,
        }
    )


@public.get("/api/jobs")
def jobs_public(
    db: DbSession,
    job_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    JobOut = build_schemas(Job)[0]
    wheres = [Job.status == 1]
    if job_type:
        wheres.append(Job.job_type == job_type)
    data = paginate(db, Job, JobOut, is_activate=1, page=page, page_size=page_size, extra_wheres=wheres)
    return ok(data)


@public.get("/api/jobs/{item_id}")
def job_detail(item_id: int, db: DbSession):
    JobOut = build_schemas(Job)[0]
    row = db.get(Job, item_id)
    if row is None or row.is_activate != 1 or row.status != 1:
        raise BizError("职位不存在")
    return ok(JobOut.model_validate(row))


@public.get("/api/stores")
def stores_public(db: DbSession):
    StoreOut = build_schemas(Store)[0]
    rows = db.scalars(select(Store).where(Store.is_activate == 1, Store.status == 1).order_by(Store.sort_order, Store.id)).all()
    return ok([StoreOut.model_validate(r) for r in rows])


@public.get("/api/about")
def about_public(db: DbSession):
    pages = db.scalars(select(AboutPage).where(AboutPage.is_activate == 1)).all()
    milestones = db.scalars(select(Milestone).where(Milestone.is_activate == 1).order_by(Milestone.sort_order, Milestone.year)).all()
    MilestoneOut = build_schemas(Milestone)[0]
    result = {}
    for p in pages:
        result[p.slug] = {"slug": p.slug, "title": p.title, "content": p.content}
    result["milestones"] = [MilestoneOut.model_validate(m) for m in milestones]
    return ok(result)


# ---------------- 首页聚合 ----------------

@public.get("/api/home")
def home(db: DbSession):
    BannerOut = build_schemas(Banner)[0]
    HighlightOut = build_schemas(Highlight)[0]
    ProductOut = build_schemas(Product)[0]
    CaseOut = build_schemas(Case)[0]
    NewsOut = build_schemas(NewsArticle)[0]

    banners = db.scalars(
        select(Banner).where(Banner.is_activate == 1, Banner.status == 1).order_by(Banner.sort_order, Banner.id)
    ).all()
    highlights = db.scalars(
        select(Highlight).where(Highlight.is_activate == 1, Highlight.status == 1).order_by(Highlight.sort_order, Highlight.id)
    ).all()
    rec_products = db.scalars(
        select(Product).where(Product.is_activate == 1, Product.status == 1, Product.is_top == 1).order_by(Product.sort_order, Product.id).limit(8)
    ).all()
    rec_cases = db.scalars(
        select(Case).where(Case.is_activate == 1, Case.status == 1, Case.is_recommended == 1).order_by(Case.sort_order, Case.id).limit(6)
    ).all()
    news = db.scalars(
        select(NewsArticle).where(NewsArticle.is_activate == 1, NewsArticle.is_published == 1).order_by(NewsArticle.published_at.desc(), NewsArticle.id.desc()).limit(5)
    ).all()

    def _prod_ext(p: Product) -> dict:
        d = ProductOut.model_validate(p).model_dump()
        d["series_name"] = _series_name(db, p.series_id)
        d["space_name"] = _space_name(db, p.category_id)
        return d

    def _case_ext(c: Case) -> dict:
        d = CaseOut.model_validate(c).model_dump()
        d["space_name"] = _space_name(db, c.space_id)
        return d

    return ok(
        {
            "banners": [BannerOut.model_validate(b) for b in banners],
            "highlights": [HighlightOut.model_validate(h) for h in highlights],
            "rec_products": [_prod_ext(p) for p in rec_products],
            "rec_cases": [_case_ext(c) for c in rec_cases],
            "news": [NewsOut.model_validate(n) for n in news],
        }
    )


# ---------------- 公共提交：线索 / 投递 ----------------

class LeadCreate(BaseModel):
    name: str
    phone: str
    requirement_type: str
    city: Optional[str] = None
    store: Optional[str] = None
    message: Optional[str] = None
    source_page: str = "在线预约"


@public.post("/api/leads")
def create_lead(payload: LeadCreate, db: DbSession):
    if not payload.phone or len(payload.phone) < 5:
        raise BizError("手机号格式不正确")
    lead_type = "appointment_to_store" if payload.requirement_type == "预约到店" else "online_message"
    row = Lead(
        type=lead_type,
        name=payload.name,
        phone=payload.phone,
        city=payload.city,
        requirement_type=payload.requirement_type,
        store=payload.store if lead_type == "appointment_to_store" else None,
        message=payload.message,
        source_page=payload.source_page,
        status="未处理",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return ok({"id": row.id})


class JobAppCreate(BaseModel):
    job_id: int
    name: str
    phone: str
    intended_position: Optional[str] = None
    message: Optional[str] = None


@public.post("/api/job-applications")
def create_job_application(payload: JobAppCreate, db: DbSession):
    job = db.get(Job, payload.job_id)
    if job is None or job.is_activate != 1:
        raise BizError("职位不存在")
    row = JobApplication(
        job_id=payload.job_id,
        name=payload.name,
        phone=payload.phone,
        intended_position=payload.intended_position,
        message=payload.message,
        status="未处理",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return ok({"id": row.id})
