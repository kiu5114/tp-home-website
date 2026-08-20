import { useCallback, useEffect, useState } from "react";
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Switch, Table, Tabs, Tag, Upload, message } from "antd";
import { UploadOutlined, ScissorOutlined } from "@ant-design/icons";
import { api } from "@tp/api-client";
import ImageCropper, { fileToObjectURL } from "../components/ImageCropper";

const API_BASE = (import.meta as any).env?.VITE_API_BASE || "http://127.0.0.1:8000";
function assetUrl(u?: string | null): string {
  if (!u) return "";
  if (u.startsWith("http")) return u;
  return `${API_BASE}${u}`;
}
interface Row {
  id: number;
  [k: string]: any;
}

/* ===== 通用图片上传控件（单图，支持上传后裁剪） ===== */
function ImageUpload({ value, onChange, height = 96, aspect, crop = true }: { value?: string; onChange?: (v: string) => void; height?: number; aspect?: number; crop?: boolean }) {
  const [up, setUp] = useState(false);
  // 裁剪 modal 状态
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string>("");

  async function uploadBlob(blob: Blob, fileName: string) {
    setUp(true);
    try {
      const fd = new FormData();
      // 统一改为 png（裁剪后输出）
      fd.append("file", new File([blob], fileName.replace(/\.\w+$/, ".png"), { type: "image/png" }));
      const d = await api.post<{ url: string }>("/api/admin/upload", fd);
      onChange?.(d.url);
      message.success("上传成功");
    } catch (e: any) {
      message.error(e?.message || "上传失败");
    } finally {
      setUp(false);
    }
  }

  async function handleFile(file: File) {
    if (!crop) {
      // 不裁剪：直接上传原图
      await uploadBlob(file, file.name);
      return;
    }
    // 进入裁剪流程
    const url = fileToObjectURL(file);
    setPendingFileName(file.name);
    setCropSrc(url);
  }

  async function handleCropConfirm(blob: Blob) {
    const src = cropSrc!;
    const name = pendingFileName || "image.png";
    if (src) URL.revokeObjectURL(src);
    setCropSrc(null);
    setPendingFileName("");
    await uploadBlob(blob, name);
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setPendingFileName("");
  }

  return (
    <div className="flex items-start gap-3 flex-wrap">
      {value && (
        <img src={assetUrl(value)} alt="preview" style={{ width: height * 1.4, height, objectFit: "cover", borderRadius: 4, border: "1px solid #eee" }} />
      )}
      <Upload accept="image/*" showUploadList={false} beforeUpload={(f) => { handleFile(f); return false; }}>
        <Button icon={<UploadOutlined />} loading={up}>{value ? "更换图片" : "上传图片"}</Button>
      </Upload>
      {crop && (
        <Button
          type="link"
          icon={<ScissorOutlined />}
          disabled={!value}
          title="对当前图片重新裁剪（基于已上传的 URL 重新载入裁剪器）"
          onClick={async () => {
            // 从当前 URL 抓回 Blob → 走裁剪流程
            try {
              const resp = await fetch(assetUrl(value!));
              const blob = await resp.blob();
              const file = new File([blob], "current.png", { type: blob.type });
              handleFile(file);
            } catch (e: any) {
              message.error(e?.message || "无法载入当前图片");
            }
          }}
        >
          重新裁剪
        </Button>
      )}
      {cropSrc && (
        <ImageCropper
          src={cropSrc}
          initialAspect={aspect}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}

/* ===== 多图上传（images JSON 数组，存字符串；支持上传后裁剪） ===== */
function MultiImageUpload({ value, onChange, crop = true }: { value?: string; onChange?: (v: string) => void; crop?: boolean }) {
  const [up, setUp] = useState(false);
  // 裁剪 modal 状态
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string>("");
  const urls: string[] = (() => {
    if (!value) return [];
    try {
      const a = JSON.parse(value);
      return Array.isArray(a) ? a : [];
    } catch {
      return [];
    }
  })();

  async function uploadBlob(blob: Blob, fileName: string) {
    setUp(true);
    try {
      const fd = new FormData();
      fd.append("file", new File([blob], fileName.replace(/\.\w+$/, ".png"), { type: "image/png" }));
      const d = await api.post<{ url: string }>("/api/admin/upload", fd);
      onChange?.(JSON.stringify([...urls, d.url]));
      message.success("上传成功");
    } catch (e: any) {
      message.error(e?.message || "上传失败");
    } finally {
      setUp(false);
    }
  }

  async function handleFile(file: File) {
    if (!crop) {
      await uploadBlob(file, file.name);
      return;
    }
    const url = fileToObjectURL(file);
    setPendingFileName(file.name);
    setCropSrc(url);
  }

  async function handleCropConfirm(blob: Blob) {
    const src = cropSrc!;
    const name = pendingFileName || "image.png";
    if (src) URL.revokeObjectURL(src);
    setCropSrc(null);
    setPendingFileName("");
    await uploadBlob(blob, name);
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setPendingFileName("");
  }

  function remove(i: number) {
    onChange?.(JSON.stringify(urls.filter((_, idx) => idx !== i)));
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {urls.map((u, i) => (
          <div key={i} style={{ position: "relative" }}>
            <img src={assetUrl(u)} alt="" style={{ width: 72, height: 56, objectFit: "cover", borderRadius: 4, border: "1px solid #eee" }} />
            <button
              type="button"
              onClick={() => remove(i)}
              style={{ position: "absolute", top: -8, right: -8, width: 20, height: 20, borderRadius: "50%", border: "none", background: "#cf1322", color: "#fff", fontSize: 12, cursor: "pointer", lineHeight: "20px", padding: 0 }}
              aria-label="删除图片"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <Upload accept="image/*" showUploadList={false} beforeUpload={(f) => { handleFile(f); return false; }}>
        <Button icon={<UploadOutlined />} loading={up} size="small">添加图片</Button>
      </Upload>
      {cropSrc && (
        <ImageCropper
          src={cropSrc}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}

/* ===== 系列管理 ===== */
function SeriesPanel() {
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ list: Row[] }>("/api/admin/series", { page_size: 100 });
      setList(d.list || []);
    } catch (e: any) {
      message.error(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    const v = await form.validateFields();
    try {
      if (editing) await api.put(`/api/admin/series/${editing.id}`, v);
      else await api.post("/api/admin/series", v);
      message.success("保存成功");
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    }
  }
  async function remove(id: number) {
    try {
      await api.del(`/api/admin/series/${id}`);
      message.success("已删除");
      load();
    } catch (e: any) {
      message.error(e?.message || "删除失败");
    }
  }
  return (
    <Card title="产品系列" extra={<Button type="primary" onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>新增系列</Button>}>
      <Table
        rowKey="id" loading={loading} size="small" pagination={false}
        dataSource={list}
        columns={[
          { title: "名称", dataIndex: "name" },
          { title: "描述", dataIndex: "description", render: (v: string) => v || "—" },
          { title: "封面", dataIndex: "cover_image", render: (v: string) => (v ? <img src={assetUrl(v)} alt="" style={{ width: 56, height: 40, objectFit: "cover", borderRadius: 4 }} /> : "—") },
          { title: "排序", dataIndex: "sort_order" },
          { title: "状态", dataIndex: "status", render: (v: number) => (v === 1 ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>) },
          {
            title: "操作",
            render: (_: any, r: Row) => (
              <span>
                <a onClick={() => { setEditing(r); form.setFieldsValue({ ...r }); setModalOpen(true); }} style={{ marginRight: 12 }}>编辑</a>
                <Popconfirm title="确认删除？" onConfirm={() => remove(r.id)}><a style={{ color: "#cf1322" }}>删除</a></Popconfirm>
              </span>
            ),
          },
        ]}
      />
      <Modal title={editing ? "编辑系列" : "新增系列"} open={modalOpen} onOk={save} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical" initialValues={{ status: 1, sort_order: 1 }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: "请输入名称" }]}><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="cover_image" label="封面图"><ImageUpload aspect={16 / 9} /></Form.Item>
          <Form.Item name="sort_order" label="排序"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="status" label="状态" valuePropName="checked" getValueFromEvent={(e) => (e ? 1 : 0)} getValueProps={(v) => ({ checked: v === 1 })}>
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

/* ===== 空间分类管理 ===== */
function SpacePanel() {
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ list: Row[] }>("/api/admin/space-categories", { page_size: 100 });
      setList(d.list || []);
    } catch (e: any) {
      message.error(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    const v = await form.validateFields();
    try {
      if (editing) await api.put(`/api/admin/space-categories/${editing.id}`, v);
      else await api.post("/api/admin/space-categories", v);
      message.success("保存成功");
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    }
  }
  async function remove(id: number) {
    try {
      await api.del(`/api/admin/space-categories/${id}`);
      message.success("已删除");
      load();
    } catch (e: any) {
      message.error(e?.message || "删除失败");
    }
  }
  return (
    <Card title="空间分类（scope: product 产品 / case 案例 / all 通用）" extra={<Button type="primary" onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>新增空间</Button>}>
      <Table
        rowKey="id" loading={loading} size="small" pagination={false}
        dataSource={list}
        columns={[
          { title: "名称", dataIndex: "name" },
          { title: "适用范围", dataIndex: "scope", render: (v: string) => v || "all" },
          { title: "排序", dataIndex: "sort_order" },
          { title: "状态", dataIndex: "status", render: (v: number) => (v === 1 ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>) },
          {
            title: "操作",
            render: (_: any, r: Row) => (
              <span>
                <a onClick={() => { setEditing(r); form.setFieldsValue({ ...r }); setModalOpen(true); }} style={{ marginRight: 12 }}>编辑</a>
                <Popconfirm title="确认删除？" onConfirm={() => remove(r.id)}><a style={{ color: "#cf1322" }}>删除</a></Popconfirm>
              </span>
            ),
          },
        ]}
      />
      <Modal title={editing ? "编辑空间" : "新增空间"} open={modalOpen} onOk={save} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical" initialValues={{ scope: "product", status: 1, sort_order: 1 }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: "请输入名称" }]}><Input /></Form.Item>
          <Form.Item name="scope" label="适用范围">
            <Select options={[{ value: "product", label: "产品" }, { value: "case", label: "案例" }, { value: "all", label: "通用" }]} />
          </Form.Item>
          <Form.Item name="sort_order" label="排序"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="status" label="状态" valuePropName="checked" getValueFromEvent={(e) => (e ? 1 : 0)} getValueProps={(v) => ({ checked: v === 1 })}>
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

/* ===== 单品管理 ===== */
function ProductPanel() {
  const [list, setList] = useState<Row[]>([]);
  const [seriesList, setSeriesList] = useState<Row[]>([]);
  const [spaceList, setSpaceList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ list: Row[] }>("/api/admin/products", { page_size: 100, show_disabled: 1 });
      setList(d.list || []);
    } catch (e: any) {
      message.error(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);
  const loadCats = useCallback(async () => {
    try {
      const [s, sp] = await Promise.all([
        api.get<{ list: Row[] }>("/api/admin/series", { page_size: 100 }),
        api.get<{ list: Row[] }>("/api/admin/space-categories", { page_size: 100 }),
      ]);
      setSeriesList(s.list || []);
      setSpaceList(sp.list || []);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { load(); loadCats(); }, [load, loadCats]);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 1, is_top: 0, sort_order: 1 });
    setModalOpen(true);
  }
  function openEdit(r: Row) {
    setEditing(r);
    form.setFieldsValue({
      ...r,
      specs: typeof r.specs === "string" ? r.specs : JSON.stringify(r.specs || {}, null, 2),
      images: typeof r.images === "string" ? r.images : JSON.stringify(r.images || [], null, 2),
    });
    setModalOpen(true);
  }
  async function save() {
    const v = await form.validateFields();
    try {
      const payload = { ...v };
      if (editing) await api.put(`/api/admin/products/${editing.id}`, payload);
      else await api.post("/api/admin/products", payload);
      message.success("保存成功");
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    }
  }
  async function remove(id: number) {
    try {
      await api.del(`/api/admin/products/${id}`);
      message.success("已删除");
      load();
    } catch (e: any) {
      message.error(e?.message || "删除失败");
    }
  }
  return (
    <Card title="产品单品" extra={<Button type="primary" onClick={openCreate}>新增产品</Button>}>
      <Table
        rowKey="id" loading={loading} size="small" pagination={false}
        dataSource={list}
        columns={[
          { title: "编码", dataIndex: "code" },
          {
            title: "封面",
            dataIndex: "cover_image",
            render: (v: string, r: Row) => {
              let imgs: string[] = [];
              if (typeof r.images === "string") { try { imgs = JSON.parse(r.images); } catch { /* */ } }
              const url = v || imgs[0];
              return url ? <img src={assetUrl(url)} alt="" style={{ width: 56, height: 40, objectFit: "cover", borderRadius: 4 }} /> : "—";
            },
          },
          { title: "系列", dataIndex: "series_id", render: (v: number) => seriesList.find((s) => s.id === v)?.name || "—" },
          { title: "空间", dataIndex: "category_id", render: (v: number) => spaceList.find((s) => s.id === v)?.name || "—" },
          { title: "描述", dataIndex: "description", render: (v: string) => (v || "").slice(0, 30) },
          { title: "排序", dataIndex: "sort_order" },
          {
            title: "状态",
            render: (_: any, r: Row) => (
              <span>
                {r.is_top === 1 && <Tag color="gold">首页推荐</Tag>}
                {r.status === 1 ? <Tag color="green">上架</Tag> : <Tag>下架</Tag>}
              </span>
            ),
          },
          {
            title: "操作",
            render: (_: any, r: Row) => (
              <span>
                <a onClick={() => openEdit(r)} style={{ marginRight: 12 }}>编辑</a>
                <Popconfirm title="确认删除？" onConfirm={() => remove(r.id)}><a style={{ color: "#cf1322" }}>删除</a></Popconfirm>
              </span>
            ),
          },
        ]}
      />
      <Modal title={editing ? "编辑产品" : "新增产品"} open={modalOpen} onOk={save} onCancel={() => setModalOpen(false)} width={640} destroyOnClose>
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="code" label="产品编码" rules={[{ required: true, message: "请输入编码" }]}><Input /></Form.Item>
            <Form.Item name="sort_order" label="排序"><InputNumber style={{ width: "100%" }} /></Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="series_id" label="所属系列">
              <Select allowClear options={seriesList.map((s) => ({ value: s.id, label: s.name }))} />
            </Form.Item>
            <Form.Item name="category_id" label="空间场景">
              <Select allowClear options={spaceList.map((s) => ({ value: s.id, label: `${s.name}（${s.scope || "all"}）` }))} />
            </Form.Item>
          </div>
          <Form.Item name="description" label="产品说明"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="specs" label="规格参数（JSON）" extra="示例：{&quot;材质&quot;:&quot;胡桃木&quot;,&quot;尺寸&quot;:&quot;2400×600×2200mm&quot;} —— 材质/尺寸会展示在前台详情">
            <Input.TextArea rows={3} />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="cover_image" label="封面图"><ImageUpload aspect={16 / 9} /></Form.Item>
            <Form.Item name="images" label="多图（JSON 数组）"><MultiImageUpload /></Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="status" label="上架" valuePropName="checked" getValueFromEvent={(e) => (e ? 1 : 0)} getValueProps={(v) => ({ checked: v === 1 })}>
              <Switch checkedChildren="上架" unCheckedChildren="下架" />
            </Form.Item>
            <Form.Item name="is_top" label="首页推荐" valuePropName="checked" getValueFromEvent={(e) => (e ? 1 : 0)} getValueProps={(v) => ({ checked: v === 1 })}>
              <Switch checkedChildren="推荐" unCheckedChildren="否" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </Card>
  );
}

export default function ProductManage() {
  return (
    <Tabs
      defaultActiveKey="products"
      items={[
        { key: "products", label: "产品单品", children: <ProductPanel /> },
        { key: "series", label: "产品系列", children: <SeriesPanel /> },
        { key: "spaces", label: "空间分类", children: <SpacePanel /> },
      ]}
    />
  );
}
