import { useCallback, useEffect, useState } from "react";
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Switch, Table, Tabs, Tag, Upload, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { api } from "@tp/api-client";

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

function ImageUpload({ value, onChange, height = 96 }: { value?: string; onChange?: (v: string) => void; height?: number }) {
  const [up, setUp] = useState(false);
  async function doUpload(file: File) {
    setUp(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const d = await api.post<{ url: string }>("/api/admin/upload", fd);
      onChange?.(d.url);
      message.success("上传成功");
    } catch (e: any) {
      message.error(e?.message || "上传失败");
    } finally {
      setUp(false);
    }
  }
  return (
    <div className="flex items-start gap-3">
      {value && <img src={assetUrl(value)} alt="preview" style={{ width: height * 1.4, height, objectFit: "cover", borderRadius: 4, border: "1px solid #eee" }} />}
      <Upload accept="image/*" showUploadList={false} beforeUpload={(f) => { doUpload(f); return false; }}>
        <Button icon={<UploadOutlined />} loading={up}>{value ? "更换图片" : "上传图片"}</Button>
      </Upload>
    </div>
  );
}

/* ===== 新闻分类 ===== */
function NewsCatPanel() {
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ list: Row[] }>("/api/admin/news-categories", { page_size: 100 });
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
      if (editing) await api.put(`/api/admin/news-categories/${editing.id}`, v);
      else await api.post("/api/admin/news-categories", v);
      message.success("保存成功");
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    }
  }
  async function remove(id: number) {
    try {
      await api.del(`/api/admin/news-categories/${id}`);
      message.success("已删除");
      load();
    } catch (e: any) {
      message.error(e?.message || "删除失败");
    }
  }
  return (
    <Card title="新闻分类" extra={<Button type="primary" onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>新增分类</Button>}>
      <Table
        rowKey="id" loading={loading} size="small" pagination={false}
        dataSource={list}
        columns={[
          { title: "名称", dataIndex: "name" },
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
      <Modal title={editing ? "编辑分类" : "新增分类"} open={modalOpen} onOk={save} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical" initialValues={{ status: 1, sort_order: 1 }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: "请输入名称" }]}><Input /></Form.Item>
          <Form.Item name="sort_order" label="排序"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="status" label="状态" valuePropName="checked" getValueFromEvent={(e) => (e ? 1 : 0)} getValueProps={(v) => ({ checked: v === 1 })}>
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

/* ===== 新闻文章 ===== */
function NewsArticlePanel() {
  const [list, setList] = useState<Row[]>([]);
  const [cats, setCats] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ list: Row[] }>("/api/admin/news", { page_size: 100, show_disabled: 1 });
      setList(d.list || []);
    } catch (e: any) {
      message.error(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    api.get<{ list: Row[] }>("/api/admin/news-categories", { page_size: 100 }).then((d) => setCats(d.list || [])).catch(() => {});
  }, [load]);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 1, is_published: 1, is_top: 0, sort_order: 1 });
    setModalOpen(true);
  }
  function openEdit(r: Row) {
    setEditing(r);
    form.setFieldsValue({ ...r });
    setModalOpen(true);
  }
  async function save() {
    const v = await form.validateFields();
    try {
      if (editing) await api.put(`/api/admin/news/${editing.id}`, v);
      else await api.post("/api/admin/news", v);
      message.success("保存成功");
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    }
  }
  async function remove(id: number) {
    try {
      await api.del(`/api/admin/news/${id}`);
      message.success("已删除");
      load();
    } catch (e: any) {
      message.error(e?.message || "删除失败");
    }
  }

  return (
    <Card title="新闻文章" extra={<Button type="primary" onClick={openCreate}>新增文章</Button>}>
      <Table
        rowKey="id" loading={loading} size="small" pagination={false}
        dataSource={list}
        columns={[
          {
            title: "封面",
            dataIndex: "cover_image",
            render: (v: string) => (v ? <img src={assetUrl(v)} alt="" style={{ width: 56, height: 40, objectFit: "cover", borderRadius: 4 }} /> : "—"),
          },
          { title: "标题", dataIndex: "title" },
          { title: "分类", dataIndex: "category_id", render: (v: number) => cats.find((c) => c.id === v)?.name || "—" },
          { title: "来源", dataIndex: "source", render: (v: string) => v || "—" },
          {
            title: "状态",
            render: (_: any, r: Row) => (
              <span>
                {r.is_top === 1 && <Tag color="gold">置顶</Tag>}
                {r.is_published === 1 ? <Tag color="green">已发布</Tag> : <Tag>草稿</Tag>}
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
      <Modal title={editing ? "编辑文章" : "新增文章"} open={modalOpen} onOk={save} onCancel={() => setModalOpen(false)} width={680} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入标题" }]}><Input /></Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="category_id" label="分类">
              <Select allowClear options={cats.map((c) => ({ value: c.id, label: c.name }))} />
            </Form.Item>
            <Form.Item name="source" label="来源"><Input /></Form.Item>
          </div>
          <Form.Item name="summary" label="摘要"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="content" label="正文（支持 HTML，富文本后续接入）"><Input.TextArea rows={6} /></Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="cover_image" label="封面图"><ImageUpload /></Form.Item>
            <div className="grid grid-cols-1 gap-4">
              <Form.Item name="published_at" label="发布时间（ISO，如 2026-08-19T10:00:00）"><Input /></Form.Item>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="is_published" label="发布" valuePropName="checked" getValueFromEvent={(e) => (e ? 1 : 0)} getValueProps={(v) => ({ checked: v === 1 })}>
                  <Switch checkedChildren="发布" unCheckedChildren="草稿" />
                </Form.Item>
                <Form.Item name="is_top" label="置顶" valuePropName="checked" getValueFromEvent={(e) => (e ? 1 : 0)} getValueProps={(v) => ({ checked: v === 1 })}>
                  <Switch checkedChildren="置顶" unCheckedChildren="否" />
                </Form.Item>
              </div>
            </div>
          </div>
          <Form.Item name="sort_order" label="排序"><InputNumber style={{ width: "100%" }} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

export default function NewsManage() {
  return (
    <Tabs
      defaultActiveKey="articles"
      items={[
        { key: "articles", label: "新闻文章", children: <NewsArticlePanel /> },
        { key: "cats", label: "新闻分类", children: <NewsCatPanel /> },
      ]}
    />
  );
}
