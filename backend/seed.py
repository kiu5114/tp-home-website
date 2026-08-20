"""幂等种子数据（开发技术文档 §5.3；数据库设计文档 §6）。

- 先查后插，可重复执行。
- 权限字典（Permission）→ 4 角色（超级管理员含全部 / 内容编辑 / 客服 / 招聘专员）→ 超管账号 admin/admin123。
- 示例数据：部门、产品系列、空间分类、产品（置顶）、案例、新闻分类、新闻、招聘职位、门店、站点配置、轮播、亮点、关于页、历程。
- 保证 /api/home 有数据。

运行：python seed.py
"""
from __future__ import annotations

import json
from pathlib import Path

from database import Base, SessionLocal, engine
from models import (
    AboutPage,
    Admin,
    Banner,
    Case,
    Department,
    DictData,
    DictType,
    Highlight,
    Job,
    Menu,
    Milestone,
    NewsArticle,
    NewsCategory,
    Notice,
    Permission,
    Post,
    Product,
    ProductSeries,
    Role,
    SiteConfig,
    SpaceCategory,
    Store,
)
from security import hash_password

# ---------------- 权限目录 ----------------

# group -> [(code, name), ...]
PERMISSION_CATALOG: dict[str, list[tuple[str, str]]] = {
    "内容": [
        ("home:edit", "首页配置"),
        ("home:view", "首页配置查看"),
        ("banner:view", "轮播查看"),
        ("banner:edit", "轮播编辑"),
        ("banner:delete", "轮播删除"),
        ("highlight:view", "亮点查看"),
        ("highlight:edit", "亮点编辑"),
        ("highlight:delete", "亮点删除"),
        ("series:view", "产品系列查看"),
        ("series:edit", "产品系列编辑"),
        ("series:delete", "产品系列删除"),
        ("space:view", "空间分类查看"),
        ("space:edit", "空间分类编辑"),
        ("space:delete", "空间分类删除"),
        ("product:view", "产品查看"),
        ("product:edit", "产品编辑"),
        ("product:delete", "产品删除"),
        ("case:view", "案例查看"),
        ("case:edit", "案例编辑"),
        ("case:delete", "案例删除"),
        ("news:view", "新闻查看"),
        ("news:edit", "新闻编辑"),
        ("news:delete", "新闻删除"),
        ("about:view", "关于页查看"),
        ("about:edit", "关于页编辑"),
        ("about:delete", "关于页删除"),
        ("store:view", "门店查看"),
        ("store:edit", "门店编辑"),
        ("store:delete", "门店删除"),
    ],
    "业务": [
        ("lead:view", "线索查看"),
        ("lead:update", "线索流转"),
        ("lead:export", "线索导出"),
        ("lead:delete", "线索删除"),
        ("job:view", "招聘查看"),
        ("job:edit", "招聘编辑"),
        ("job:delete", "招聘删除"),
        ("job_application:view", "投递查看"),
        ("job_application:update", "投递流转"),
    ],
    "系统": [
        ("admin:view", "管理员查看"),
        ("admin:edit", "管理员编辑"),
        ("admin:delete", "管理员删除"),
        ("role:view", "角色查看"),
        ("role:edit", "角色编辑"),
        ("role:delete", "角色删除"),
        ("permission:view", "权限字典查看"),
        ("department:view", "部门查看"),
        ("department:edit", "部门编辑"),
        ("department:delete", "部门删除"),
        ("menu:view", "菜单查看"),
        ("menu:edit", "菜单编辑"),
        ("menu:delete", "菜单删除"),
        ("post:view", "岗位查看"),
        ("post:edit", "岗位编辑"),
        ("post:delete", "岗位删除"),
        ("dict:view", "字典查看"),
        ("dict:edit", "字典编辑"),
        ("dict:delete", "字典删除"),
        ("notice:view", "通知公告查看"),
        ("notice:edit", "通知公告编辑"),
        ("notice:delete", "通知公告删除"),
        ("log:view", "操作日志查看"),
        ("loginlog:view", "登录日志查看"),
        ("online:view", "在线用户查看"),
        ("site:view", "站点配置查看"),
        ("site:edit", "站点配置编辑"),
        ("dashboard:view", "看板查看"),
        ("upload:edit", "上传文件"),
    ],
}

ALL_CODES = [code for codes in PERMISSION_CATALOG.values() for code, _ in codes]

# 角色 → 权限编码
ROLE_PERMISSIONS = {
    "超级管理员": list(ALL_CODES),
    "内容编辑": [
        "home:view", "home:edit",
        "banner:view", "banner:edit", "banner:delete",
        "highlight:view", "highlight:edit", "highlight:delete",
        "series:view", "series:edit", "series:delete",
        "space:view", "space:edit", "space:delete",
        "product:view", "product:edit", "product:delete",
        "case:view", "case:edit", "case:delete",
        "news:view", "news:edit", "news:delete",
        "about:view", "about:edit", "about:delete",
        "store:view", "store:edit", "store:delete",
        "upload:edit", "dashboard:view",
    ],
    "客服": [
        "lead:view", "lead:update", "lead:export", "lead:delete",
        "store:view", "dashboard:view",
        "about:view", "job:view", "job_application:view",
    ],
    "招聘专员": [
        "job:view", "job:edit", "job:delete",
        "job_application:view", "job_application:update",
        "store:view", "dashboard:view",
    ],
}


def _placeholder_svg() -> str:
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">'
        '<rect width="100%" height="100%" fill="#E7E1D8"/>'
        '<text x="50%" y="50%" font-family="sans-serif" font-size="28" fill="#B08D57" '
        'text-anchor="middle" dominant-baseline="middle">TP 全屋家居</text></svg>'
    )


def run_seed(db=None) -> None:
    own = db is None
    if own:
        db = SessionLocal()
    try:
        # 占位图
        uploads_dir = Path(__file__).resolve().parent / "uploads"
        uploads_dir.mkdir(parents=True, exist_ok=True)
        placeholder = uploads_dir / "placeholder.svg"
        if not placeholder.exists():
            placeholder.write_text(_placeholder_svg(), encoding="utf-8")
        ph = "/uploads/placeholder.svg"

        # 1) 权限字典
        existing = {p.code for p in db.query(Permission.code).all()}
        for group, items in PERMISSION_CATALOG.items():
            for code, name in items:
                if code not in existing:
                    db.add(Permission(code=code, name=name, group_=group, remark="", created_at=1, updated_at=1))
        db.commit()

        # 2) 角色
        role_ids: dict[str, int] = {}
        for name, perms in ROLE_PERMISSIONS.items():
            role = db.query(Role).filter(Role.name == name).first()
            if role is None:
                role = Role(name=name, permissions=perms, description=f"{name}（种子）", created_at=1, updated_at=1)
                db.add(role)
                db.commit()
            elif name == "超级管理员":
                # 超级管理员始终保持与权限目录同步（含后续新增模块的权限码）
                synced = list(ALL_CODES)
                if role.permissions != synced:
                    role.permissions = synced
                    db.commit()
            role_ids[name] = role.id

        # 3) 超级管理员
        if not db.query(Admin).filter(Admin.username == "admin").first():
            admin = Admin(
                username="admin",
                password_hash=hash_password("admin123"),
                name="超级管理员",
                nickname="admin",
                gender=0,
                role_id=role_ids["超级管理员"],
                created_at=1,
                updated_at=1,
            )
            db.add(admin)
            db.commit()

        # 4) 部门
        if not db.query(Department).filter(Department.name == "总部").first():
            hq = Department(name="总部", parent_id=None, sort_order=0, created_at=1, updated_at=1)
            db.add(hq)
            db.commit()
            db.add(Department(name="销售部", parent_id=hq.id, sort_order=1, created_at=1, updated_at=1))
            db.commit()

        # 5) 产品系列
        if not db.query(ProductSeries).filter(ProductSeries.name == "柏悦系列").first():
            db.add(ProductSeries(name="柏悦系列", description="胡桃木轻奢系列", cover_image=ph, status=1, sort_order=1, created_at=1, updated_at=1))
            db.commit()
        series = db.query(ProductSeries).filter(ProductSeries.name == "柏悦系列").first()

        # 6) 空间分类
        for name, scope in [("客厅", "product"), ("卧室", "case"), ("整屋", "all")]:
            if not db.query(SpaceCategory).filter(SpaceCategory.name == name).first():
                db.add(SpaceCategory(name=name, scope=scope, status=1, sort_order=1, created_at=1, updated_at=1))
        db.commit()
        living = db.query(SpaceCategory).filter(SpaceCategory.name == "客厅").first()
        bedroom = db.query(SpaceCategory).filter(SpaceCategory.name == "卧室").first()

        # 7) 产品（置顶）
        if not db.query(Product).filter(Product.code == "BY-001").first():
            db.add(
                Product(
                    category_id=living.id if living else None,
                    series_id=series.id if series else None,
                    code="BY-001",
                    description="柏悦主卧衣柜，胡桃木框架，极简线条。",
                    specs=json.dumps({"材质": "胡桃木", "尺寸": "2400×600×2200mm", "工艺": "榫卯结构"}, ensure_ascii=False),
                    cover_image=ph,
                    images=json.dumps([ph, ph], ensure_ascii=False),
                    status=1,
                    is_top=1,
                    sort_order=1,
                    created_at=1,
                    updated_at=1,
                )
            )
            db.commit()

        # 8) 案例
        if db.query(Case).filter(Case.title == "柏悦样板间").count() == 0:
            db.add(
                Case(
                    title="柏悦样板间",
                    space_id=bedroom.id if bedroom else None,
                    area="98㎡",
                    style="现代轻奢",
                    customer="王先生",
                    house_type="三室两厅",
                    series="柏悦系列",
                    description="以胡桃木为主调的整屋定制方案。",
                    images=json.dumps([ph, ph, ph], ensure_ascii=False),
                    sort_order=1,
                    status=1,
                    is_recommended=1,
                    created_at=1,
                    updated_at=1,
                )
            )
            db.commit()

        # 9) 新闻分类 + 新闻
        if not db.query(NewsCategory).filter(NewsCategory.name == "企业新闻").first():
            db.add(NewsCategory(name="企业新闻", sort_order=1, status=1, created_at=1, updated_at=1))
            db.add(NewsCategory(name="行业资讯", sort_order=2, status=1, created_at=1, updated_at=1))
            db.commit()
        cat = db.query(NewsCategory).filter(NewsCategory.name == "企业新闻").first()
        if not db.query(NewsArticle).filter(NewsArticle.title == "TP 全屋家居品牌升级").first():
            from datetime import datetime, timezone

            db.add(
                NewsArticle(
                    title="TP 全屋家居品牌升级",
                    category_id=cat.id if cat else None,
                    cover_image=ph,
                    summary="TP 全屋家居焕新品牌视觉，秉持匠心工艺。",
                    content="<p>TP 全屋家居于近日完成品牌视觉升级……</p>",
                    source="原创",
                    is_published=1,
                    is_top=1,
                    published_at=datetime.now(timezone.utc),
                    created_at=1,
                    updated_at=1,
                )
            )
            db.commit()

        # 9.5) 招聘职位
        if db.query(Job).count() == 0:
            for i, (t, resp, dept, loc, emp) in enumerate(
                [
                    ("全屋定制设计师", "负责客户全屋定制方案设计，与客户沟通需求并跟进落地。", "设计部", "北京", "全职"),
                    ("安装工程师", "负责定制家具现场安装、调试与售后维护。", "工程部", "上海", "全职"),
                    ("门店销售顾问", "负责门店客户接待、产品讲解与订单跟进。", "销售部", "深圳", "全职"),
                ]
            ):
                db.add(
                    Job(
                        title=t,
                        job_type="social",
                        department=dept,
                        location=loc,
                        employment_type=emp,
                        responsibilities=resp,
                        requirements="大专及以上学历，相关经验者优先。",
                        benefits="五险一金、带薪年假、员工培训",
                        status=1,
                        sort_order=i + 1,
                        created_at=1,
                        updated_at=1,
                    )
                )
            db.commit()

        # 10) 门店
        if not db.query(Store).filter(Store.name == "北京旗舰店").first():
            db.add(
                Store(
                    name="北京旗舰店",
                    address="北京市朝阳区某某路 1 号",
                    phone="010-88888888",
                    business_hours="10:00-22:00",
                    map_url="",
                    sort_order=1,
                    status=1,
                    created_at=1,
                    updated_at=1,
                )
            )
            db.commit()

        # 11) 站点配置（单行 id=1）
        if not db.query(SiteConfig).filter(SiteConfig.id == 1).first():
            db.add(
                SiteConfig(
                    id=1,
                    site_name="TP 全屋家居",
                    logo=ph,
                    contact_phone="400-888-8888",
                    contact_email="service@tp-home.com",
                    company_address="北京市朝阳区",
                    icp="京ICP备00000000号",
                    copyright="© 2026 TP 全屋家居",
                    created_at=1,
                    updated_at=1,
                )
            )
            db.commit()

        # 12) 轮播
        if db.query(Banner).count() == 0:
            db.add(Banner(title="匠心定制 全屋一体", subtitle="为家而生", img_url=ph, link="/products", sort_order=1, status=1, created_at=1, updated_at=1))
            db.commit()

        # 13) 亮点
        if db.query(Highlight).count() == 0:
            for i, (t, d) in enumerate([("环保板材", "E0 级环保基材"), ("匠心工艺", "45 年木作经验"), ("全屋一体", "设计-生产-安装一体"), ("终身维护", "专属管家服务")]):
                db.add(Highlight(title=t, desc=d, icon="star", sort_order=i + 1, status=1, created_at=1, updated_at=1))
            db.commit()

        # 14) 关于页 + 历程
        for slug, title, content in [
            ("about_tp", "关于 TP", "<p>TP 全屋家居成立于……</p>"),
            ("brand", "品牌介绍", "<p>秉持匠心，定制理想之家。</p>"),
            ("history", "发展历程", "<p>详见下方时间轴。</p>"),
        ]:
            if not db.query(AboutPage).filter(AboutPage.slug == slug).first():
                db.add(AboutPage(slug=slug, title=title, content=content, created_at=1, updated_at=1))
        db.commit()
        if db.query(Milestone).count() == 0:
            for i, (y, t, d) in enumerate([("2010", "品牌创立", "TP 全屋家居成立"), ("2016", "智能工厂", "建成工业 4.0 工厂"), ("2022", "全国布局", "门店覆盖 200+ 城市")]):
                db.add(Milestone(year=y, title=t, desc=d, sort_order=i + 1, created_at=1, updated_at=1))
            db.commit()

        # 15) 菜单（镜像前端侧栏结构，供菜单管理页统一管理）
        if db.query(Menu).count() == 0:
            groups = {
                "dashboard": Menu(name="仪表盘", parent_id=None, sort_order=1, perm="", status=1, created_at=1, updated_at=1),
                "content": Menu(name="内容管理", parent_id=None, sort_order=2, perm="", status=1, created_at=1, updated_at=1),
                "product": Menu(name="产品与案例", parent_id=None, sort_order=3, perm="", status=1, created_at=1, updated_at=1),
                "lead": Menu(name="留言与招聘", parent_id=None, sort_order=4, perm="", status=1, created_at=1, updated_at=1),
                "system": Menu(name="系统管理", parent_id=None, sort_order=5, perm="", status=1, created_at=1, updated_at=1),
                "monitor": Menu(name="系统监控", parent_id=None, sort_order=6, perm="", status=1, created_at=1, updated_at=1),
            }
            for g in groups.values():
                db.add(g)
            db.commit()
            for g in groups.values():
                db.refresh(g)
            menu_leaves = [
                ("dashboard", "运营看板（核心数据总览）", "/dashboard", "dashboard:view"),
                ("content", "首页配置", "/home", "home:view"),
                ("content", "关于我们", "/about", "about:view"),
                ("content", "门店管理", "/stores", "store:view"),
                ("content", "站点配置", "/site-config", "site:view"),
                ("content", "新闻动态", "/news", "news:view"),
                ("product", "产品管理", "/products", "product:view"),
                ("product", "案例管理", "/cases", "case:view"),
                ("lead", "留言预约", "/leads", "lead:view"),
                ("lead", "招聘管理", "/jobs", "job:view"),
                ("system", "用户管理", "/admins", "admin:view"),
                ("system", "角色管理", "/roles", "role:view"),
                ("system", "菜单管理", "/menus", "menu:view"),
                ("system", "部门管理", "/departments", "department:view"),
                ("system", "岗位管理", "/posts", "post:view"),
                ("system", "字典管理", "/dicts", "dict:view"),
                ("system", "通知公告", "/notices", "notice:view"),
                ("monitor", "操作日志", "/logs", "log:view"),
                ("monitor", "登录日志", "/login-logs", "loginlog:view"),
                ("monitor", "在线用户", "/online", "online:view"),
            ]
            for i, (grp, name, path, perm) in enumerate(menu_leaves):
                db.add(Menu(name=name, path=path, parent_id=groups[grp].id, sort_order=i + 1, perm=perm, status=1, created_at=1, updated_at=1))
            db.commit()

        # 15b) 官网入口（顶级外链，幂等补充：即使菜单表已有数据也会补上）
        if not db.query(Menu).filter(Menu.name == "TP 全屋家居官网", Menu.parent_id.is_(None)).first():
            db.add(Menu(name="TP 全屋家居官网", path="http://127.0.0.1:5173", parent_id=None, sort_order=7, perm="", status=1, created_at=1, updated_at=1))
            db.commit()

        # 16) 字典类型 + 字典数据
        if not db.query(DictType).filter(DictType.type_code == "notice_type").first():
            dt = DictType(name="通知公告类型", type_code="notice_type", status=1, remark="通知公告的分类", created_at=1, updated_at=1)
            db.add(dt)
            db.commit()
            db.refresh(dt)
            for i, (label, value) in enumerate([("通知", "notice"), ("公告", "announcement")]):
                db.add(DictData(type_id=dt.id, label=label, value=value, sort_order=i + 1, status=1, created_at=1, updated_at=1))
            db.commit()

        # 17) 通知公告
        if db.query(Notice).count() == 0:
            db.add(Notice(title="系统升级维护通知", content="<p>系统将于本周末进行升级维护，请提前保存数据。</p>", type="notice", status=1, created_at=1, updated_at=1))
            db.commit()

        # 18) 岗位（组织岗位，区别于招聘职位）
        if db.query(Post).count() == 0:
            hq = db.query(Department).filter(Department.name == "总部").first()
            for i, name in enumerate(["总经理", "部门经理", "专员"]):
                db.add(Post(name=name, dept_id=hq.id if hq else None, sort_order=i + 1, status=1, remark="", created_at=1, updated_at=1))
            db.commit()

        db.commit()
    finally:
        if own:
            db.close()


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    run_seed()
    print("Seed 完成。")
