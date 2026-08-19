"""看板统计路由（后台，开发技术文档 §7.4、UI/UX §3.7）。

- GET /api/admin/dashboard（权限码 dashboard:view）。
- 返回：概览统计卡 + 近 7 天趋势（在线留言/预约到店/招聘投递三折线）+ 待处理入口计数。
"""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select

from deps import DbSession, require_perm
from errors import ok
from models import Admin, Case, JobApplication, Lead, NewsArticle, Product, Store

router = APIRouter(prefix="/api/admin/dashboard", tags=["看板"])


@router.get("")
def dashboard(db: DbSession, _: Annotated[Admin, Depends(require_perm("dashboard:view"))]):
    total_products = db.scalar(select(func.count()).select_from(Product).where(Product.is_activate == 1)) or 0
    total_cases = db.scalar(select(func.count()).select_from(Case).where(Case.is_activate == 1)) or 0
    total_news = db.scalar(select(func.count()).select_from(NewsArticle).where(NewsArticle.is_activate == 1, NewsArticle.is_published == 1)) or 0
    total_stores = db.scalar(select(func.count()).select_from(Store).where(Store.is_activate == 1)) or 0

    leads_pending = (
        db.scalar(select(func.count()).select_from(Lead).where(Lead.is_activate == 1, Lead.status == "未处理")) or 0
    )
    apps_pending = (
        db.scalar(select(func.count()).select_from(JobApplication).where(JobApplication.is_activate == 1, JobApplication.status == "未处理")) or 0
    )

    # 近 7 天趋势
    cutoff = datetime.now() - timedelta(days=6)
    leads = db.scalars(select(Lead).where(Lead.is_activate == 1, Lead.created_date >= cutoff)).all()
    apps = db.scalars(select(JobApplication).where(JobApplication.is_activate == 1, JobApplication.created_date >= cutoff)).all()

    buckets: dict[str, dict[str, int]] = defaultdict(lambda: {"online_message": 0, "appointment_to_store": 0, "job_application": 0})
    for l in leads:
        day = l.created_date.strftime("%m-%d") if l.created_date else "?"
        key = l.type if l.type in ("online_message", "appointment_to_store") else "online_message"
        buckets[day][key] += 1
    for a in apps:
        day = a.created_date.strftime("%m-%d") if a.created_date else "?"
        buckets[day]["job_application"] += 1

    trend = []
    for i in range(6, -1, -1):
        day = (datetime.now() - timedelta(days=i)).strftime("%m-%d")
        b = buckets.get(day, {"online_message": 0, "appointment_to_store": 0, "job_application": 0})
        trend.append({"date": day, **b})

    return ok(
        {
            "stats": {
                "products": total_products,
                "cases": total_cases,
                "news": total_news,
                "stores": total_stores,
                "leads_pending": leads_pending,
                "apps_pending": apps_pending,
            },
            "trend": trend,
            "pending": {"leads": leads_pending, "applications": apps_pending},
        }
    )
