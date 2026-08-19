import os
OUT = 'D:/app/存储路径/WorkBuddy/2026-08-17-16-25-42/diagrams'
os.makedirs(OUT, exist_ok=True)
GOLD = '#B08D57'; INK = '#1A1714'; MUTE = '#6B6B6B'; WHITE = '#FFFFFF'
def esc(s): return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

def defs():
    return ('<defs>'
      '<marker id="mk" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto">'
      '<path d="M1 2L8 5L1 8" fill="none" stroke="'+GOLD+'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker>'
      '<marker id="mk2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto">'
      '<path d="M1 2L8 5L1 8" fill="none" stroke="#888888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker>'
      '</defs>')

def ebox(x, y, name, derived=False, sub=''):
    w = 190; h = 58
    extra = ' stroke-dasharray="5 3"' if derived else ''
    s = '<g>'
    s += '<rect x="%d" y="%d" width="%d" height="%d" rx="8" fill="%s" stroke="%s" stroke-width="1.5"%s/>' % (x, y, w, h, WHITE, GOLD, extra)
    s += '<rect x="%d" y="%d" width="%d" height="24" rx="8" fill="%s"/>' % (x, y, w, GOLD)
    s += '<rect x="%d" y="%d" width="%d" height="8" fill="%s"/>' % (x, y + 16, w, GOLD)
    s += '<text x="%d" y="%d" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="500" fill="#fff">%s</text>' % (x + w // 2, y + 17, esc(name))
    if sub:
        s += '<text x="%d" y="%d" text-anchor="middle" font-family="sans-serif" font-size="11" fill="%s">%s</text>' % (x + w // 2, y + 44, MUTE, esc(sub))
    s += '</g>'
    return s

def rel_layer(boxes, rels):
    out = ''
    for (sname, dname, label) in rels:
        sx, sy, sw, sh = boxes[sname]; dx, dy, dw, dh = boxes[dname]
        scx = sx + sw // 2; scy = sy + sh // 2; dcx = dx + dw // 2; dcy = dy + dh // 2
        if abs(sx - dx) < 1:
            x1 = scx; y1 = sy + sh; x2 = dcx; y2 = dy
            out += '<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="1.4" marker-end="url(#mk)"/>' % (x1, y1, x2, y2, GOLD)
            mx = (x1 + x2) // 2; my = (y1 + y2) // 2
            out += '<rect x="%d" y="%d" width="76" height="18" fill="%s"/>' % (mx - 38, my - 9, WHITE)
            out += '<text x="%d" y="%d" text-anchor="middle" font-family="sans-serif" font-size="10" fill="%s">%s</text>' % (mx, my + 4, INK, esc(label))
            out += '<text x="%d" y="%d" font-family="sans-serif" font-size="9" fill="%s">1</text>' % (x1 + 5, y1 - 3, MUTE)
            out += '<text x="%d" y="%d" font-family="sans-serif" font-size="9" fill="%s">N</text>' % (x2 + 5, y2 + 10, MUTE)
        else:
            if sx < dx:
                x1 = sx + sw; y1 = scy; x2 = dx; y2 = dcy
            else:
                x1 = sx; y1 = scy; x2 = dx + dw; y2 = dcy
            out += '<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="1.4" marker-end="url(#mk)"/>' % (x1, y1, x2, y2, GOLD)
            mx = (x1 + x2) // 2; my = (y1 + y2) // 2
            out += '<rect x="%d" y="%d" width="76" height="18" fill="%s"/>' % (mx - 38, my - 9, WHITE)
            out += '<text x="%d" y="%d" text-anchor="middle" font-family="sans-serif" font-size="10" fill="%s">%s</text>' % (mx, my + 4, INK, esc(label))
    return out

def er_svg(title, boxes, rels, selfrels=None, H=640):
    selfrels = selfrels or []
    s = '<svg viewBox="0 0 680 %d" xmlns="http://www.w3.org/2000/svg" width="100%%">' % H
    s += '<title>%s</title>' % esc(title)
    s += defs()
    s += '<text x="340" y="26" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="500" fill="%s">%s</text>' % (INK, esc(title))
    s += rel_layer(boxes, rels)
    for (sname, label) in selfrels:
        bx, byh, bw, bh = boxes[sname]
        cx = bx + bw // 2; top = byh
        s += '<path d="M%d %d q0 -22 22 -22 q22 0 22 22" fill="none" stroke="%s" stroke-width="1.4" marker-end="url(#mk)"/>' % (cx, top, GOLD)
        s += '<rect x="%d" y="%d" width="76" height="16" fill="%s"/>' % (cx + 8, top - 30, WHITE)
        s += '<text x="%d" y="%d" text-anchor="middle" font-family="sans-serif" font-size="10" fill="%s">%s</text>' % (cx + 46, top - 18, INK, esc(label))
    for name, (x, y, w, h) in boxes.items():
        sb = ''
        if name in ('BANNER', 'HIGHLIGHT', 'ABOUT_PAGE', 'MILESTONE'):
            sb = '⚠ 推导'
        s += ebox(x, y, name, derived=(sb != ''), sub=sb)
    s += '<text x="40" y="%d" font-family="sans-serif" font-size="10" fill="%s">图例：实线=PRD 详述实体；虚线=⚠ 推导实体；1=一方，N=多方</text>' % (H - 12, MUTE)
    s += '</svg>'
    return s

# ---- Business domain ----
LX = 40; RX = 450; W = 190
by = {'PRODUCT_SERIES': (LX, 60), 'PRODUCT': (LX, 140), 'PRODUCT_IMAGE': (LX, 220),
      'NEWS_CATEGORY': (LX, 300), 'NEWS_ARTICLE': (LX, 380), 'JOB': (LX, 460), 'JOB_APPLICATION': (LX, 540),
      'SPACE_CATEGORY': (RX, 60), 'CASE': (RX, 140), 'CASE_IMAGE': (RX, 220), 'STORE': (RX, 300), 'LEAD': (RX, 380), 'ADMIN': (RX, 540)}
bb = {k: (v[0], v[1], W, 58) for k, v in by.items()}
brels = [('PRODUCT_SERIES', 'PRODUCT', '包含单品'), ('SPACE_CATEGORY', 'PRODUCT', '归类空间'),
         ('SPACE_CATEGORY', 'CASE', '归类空间'), ('PRODUCT_SERIES', 'CASE', '案例所用系列'),
         ('PRODUCT', 'PRODUCT_IMAGE', '多图'), ('CASE', 'CASE_IMAGE', '多图'),
         ('NEWS_CATEGORY', 'NEWS_ARTICLE', '所属分类'), ('JOB', 'JOB_APPLICATION', '收到投递'),
         ('STORE', 'LEAD', '预约到店'), ('ADMIN', 'LEAD', '处理人')]
open(OUT + '/er-business.svg', 'w', encoding='utf-8').write(er_svg('业务领域 ER 图', bb, brels, H=640))

# ---- System / config domain ----
sy = {'DEPARTMENT': (LX, 60), 'ROLE': (LX, 140), 'PERMISSION': (LX, 220),
      'BANNER': (LX, 300), 'HIGHLIGHT': (LX, 380), 'ABOUT_PAGE': (LX, 460),
      'ADMIN': (RX, 60), 'OPERATION_LOG': (RX, 140), 'SITE_CONFIG': (RX, 300), 'MILESTONE': (RX, 420)}
sb = {k: (v[0], v[1], W, 58) for k, v in sy.items()}
srels = [('DEPARTMENT', 'ADMIN', '归属部门'), ('ROLE', 'ADMIN', '拥有角色'),
         ('ROLE', 'PERMISSION', '授予权限'), ('ADMIN', 'OPERATION_LOG', '产生日志')]
open(OUT + '/er-system.svg', 'w', encoding='utf-8').write(er_svg('系统/配置领域 ER 图', sb, srels, selfrels=[('SITE_CONFIG', '单行配置'), ('DEPARTMENT', '上级部门')], H=560))
print('ER svgs written')

# ---------- Module diagrams ----------
def container(x, y, w, h, title, lines, fill='#FBFAF7'):
    s = '<g>'
    s += '<rect x="%d" y="%d" width="%d" height="%d" rx="10" fill="%s" stroke="%s" stroke-width="1.5"/>' % (x, y, w, h, fill, GOLD)
    s += '<rect x="%d" y="%d" width="%d" height="26" rx="10" fill="%s"/>' % (x, y, w, GOLD)
    s += '<rect x="%d" y="%d" width="%d" height="12" fill="%s"/>' % (x, y + 14, w, GOLD)
    s += '<text x="%d" y="%d" font-family="sans-serif" font-size="13" font-weight="500" fill="#fff">%s</text>' % (x + 12, y + 18, esc(title))
    ly = y + 44
    for ln in lines:
        s += '<circle cx="%d" cy="%d" r="3" fill="%s"/>' % (x + 16, ly - 4, GOLD)
        s += '<text x="%d" y="%d" font-family="sans-serif" font-size="11" fill="%s">%s</text>' % (x + 26, ly, INK, esc(ln))
        ly += 19
    s += '</g>'
    return s

def arrow(x1, y1, x2, y2):
    return '<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#888888" stroke-width="1.6" marker-end="url(#mk2)"/>' % (x1, y1, x2, y2)

# Frontend module
H = 520
s = '<svg viewBox="0 0 680 %d" xmlns="http://www.w3.org/2000/svg" width="100%%">' % H
s += '<title>前台系统模块架构图</title>' + defs()
s += '<text x="340" y="26" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="500" fill="%s">前台系统模块架构图（monorepo · web + admin + api-client）</text>' % INK
s += container(30, 60, 300, 300, '前台 web · React + Tailwind', [
    '页面：Home / Products / Cases / News / About / Recruitment',
    '公共组件：导航 / 页脚 / 卡片 / 筛选 chip / 弹窗 / 在线客服',
    '设计令牌：Tailwind 扩展 gold/ink/sand/line（UI/UX §3）',
    '路由：React Router（hash 或 History）',
    '状态：Zustand',
    '动效：Hero Ken Burns + 建筑索引条'])
s += container(350, 60, 300, 300, '后台 admin · React + Ant Design', [
    '视图：首页配置 / 产品 / 案例 / 新闻 / 招聘 / 线索 / 系统',
    '组件库：Ant Design 5（表格/表单/弹窗/分页）',
    '看板：ECharts（留言/预约/投递趋势）',
    '富文本：WangEditor（图片走统一上传）',
    '权限：usePerm 指令（菜单级 + 按钮级）',
    '状态：轻量 Context'])
s += container(30, 390, 620, 110, '共享 api-client（前后台共用）', [
    'Axios 封装：基址 127.0.0.1:8000，统一拦截',
    'Token 刷新：access 过期用 refresh 换发，401 跳登录',
    'SEED 兜底：后端不可达返回本地静态数据',
    '类型共享：前后台共用 TS 类型定义'])
s += arrow(180, 360, 180, 390)
s += arrow(500, 360, 500, 390)
s += '<rect x="150" y="366" width="64" height="16" fill="%s"/>' % WHITE + '<text x="182" y="378" text-anchor="middle" font-family="sans-serif" font-size="10" fill="%s">HTTPS /api</text>' % INK
s += '<rect x="470" y="366" width="64" height="16" fill="%s"/>' % WHITE + '<text x="502" y="378" text-anchor="middle" font-family="sans-serif" font-size="10" fill="%s">HTTPS /api</text>' % INK
s += '</svg>'
open(OUT + '/frontend-module.svg', 'w', encoding='utf-8').write(s)

# Backend module
H = 600
s = '<svg viewBox="0 0 680 %d" xmlns="http://www.w3.org/2000/svg" width="100%%">' % H
s += '<title>后台系统模块架构图</title>' + defs()
s += '<text x="340" y="26" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="500" fill="%s">后台系统模块架构图（FastAPI 模块化单体）</text>' % INK
s += container(215, 48, 250, 46, '应用入口 main.py', ['CORS · 挂载 /uploads · 注册路由'])
s += container(30, 120, 620, 150, '路由层 routers/', [
    '公共：home / products / cases / news / jobs / stores / about',
    '后台鉴权：auth（login / refresh / me / change-password / logout）',
    '后台资源：series / products / space-categories / cases',
    '后台资源：news / news-categories / jobs / job-applications',
    '后台资源：stores / leads / admins / roles / permissions',
    '后台资源：banners / highlights / milestones / about-pages',
    '后台资源：operation-logs / site-config / upload'])
s += container(30, 300, 190, 70, '依赖 deps', ['get_db', 'get_current_admin（JWT）'])
s += container(245, 300, 190, 70, '模型 / 校验', ['models.py（SQLAlchemy）', 'schemas.py（Pydantic v2）'])
s += container(460, 300, 190, 70, '中间件', ['响应信封包装', '异常处理'])
s += container(30, 400, 620, 160, '数据层 / 基建', [
    'database：engine / SessionLocal / Base',
    'Alembic：schema 迁移（SQLite → PostgreSQL）',
    'seed：超管 / 默认角色 / 示例数据',
    '存储抽象：本地 /uploads 或 对象存储（OSS/S3）'])
s += arrow(340, 94, 340, 120)
s += arrow(125, 270, 125, 300)
s += arrow(340, 270, 340, 300)
s += arrow(555, 270, 555, 300)
s += arrow(125, 370, 125, 400)
s += arrow(340, 370, 340, 400)
s += arrow(555, 370, 555, 400)
s += '</svg>'
open(OUT + '/backend-module.svg', 'w', encoding='utf-8').write(s)
print('Module svgs written')
print('files:', sorted(os.listdir(OUT)))
