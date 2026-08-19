import { useCallback, useEffect, useState } from "react";
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Switch, Table, Tag, Upload, message } from "antd";
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

function MultiImageUpload({ value, onChange }: { value?: string; onChange?: (v: string) => void }) {
  const [up, setUp] = useState(false);
  const urls: string[] = (() => {
    if (!value) return [];
    try {
      const a = JSON.parse(value);
      return Array.isArray(a) ? a : [];
    } catch {
      return [];
    }
  })();
  async function doUpload(file: File) {
    setUp(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const d = await api.post<{ url: string }>("/api/admin/upload", fd);
      onChange?.(JSON.stringify([...urls, d.url]));
      message.success("上传成功");
    } catch (e: any) {
      message.error(e?.message || "上传失败");
    } finally {
      setUp(false);
    }
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
            <button type="button" onClick={() => remove(i)} aria-label="删除图片"
              style={{ position: "absolute", top: -8, right: -8, width: 20, height: 20, borderRadius: "50%", border: "none", background: "#cf1322", color: "#fff", fontSize: 12, cursor: "pointer", lineHeight: "20px", padding: 0 }}>
              ×
            </button>
          </div>
        ))}
      </div>
      <Upload accept="image/*" showUploadList={false} beforeUpload={(f) => { doUpload(f); return false; }}>
        <Button icon={<UploadOutlined />} loading={up} size="small">添加图片</Button>
      </Upload>
    </div>
  );
}

export default function CaseManage() {
  const [list, setList] = useState<Row[]>([]);
  const [spaceList, setSpaceList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ list: Row[] }>("/api/admin/cases", { page_size: 100, show_disabled: 1 });
      setList(d.list || []);
    } catch (e: any) {
      message.error(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    api.get<{ list: Row[] }>("/api/admin/space-categories", { page_size: 100 }).then((d) => setSpaceList(d.list || [])).catch(() => {});
  }, [load]);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 1, is_recommended: 0, sort_order: 1 });
    setModalOpen(true);
  }
  function openEdit(r: Row) {
    setEditing(r);
    form.setFieldsValue({
      ...r,
      images: typeof r.images === "string" ? r.images : JSON.stringify(r.images || [], null, 2),
    });
    setModalOpen(true);
  }
  async function save() {
    const v = await form.validateFields();
    try {
      if (editing) await api.put(`/api/admin/cases/${editing.id}`, v);
      else await api.post("/api/admin/cases", v);
      message.success("保存成功");
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    }
  }
  async function remove(id: number) {
    try {
      await api.del(`/api/admin/cases/${id}`);
      message.success("已删除");
      load();
    } catch (e: any) {
      message.error(e?.message || "删除失败");
    }
  }

  const columns = [
    {
      title: "封面",
      dataIndex: "cover_image",
      render: (v: string, r: Row) => {
        let imgs: string[] = [];
        if (typeof r.images === "string") { try { imgs = JSON.parse(r.images); } catch { /* */ } }
        const url = v || imgs[0];
        return url ? <img src={assetUrl(url)} alt="" style={{ width: 72, height: 48, objectFit: "cover", borderRadius: 4 }} /> : "—";
      },
    },
    { title: "标题", dataIndex: "title" },
    { title: "空间", dataIndex: "space_id", render: (v: number) => spaceList.find((s) => s.id === v)?.name || "—" },
    { title: "面积", dataIndex: "area", render: (v: string) => v || "—" },
    { title: "风格", dataIndex: "style", render: (v: string) => v || "—" },
    { title: "客户", dataIndex: "customer", render: (v: string) => v || "—" },
    { title: "排序", dataIndex: "sort_order" },
    {
      title: "状态",
      render: (_: any, r: Row) => (
        <span>
          {r.is_recommended === 1 && <Tag color="gold">推荐</Tag>}
          {r.status === 1 ? <Tag color="green">展示</Tag> : <Tag>隐藏</Tag>}
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
  ];

  return (
    <Card title="案例管理" extra={<Button type="primary" onClick={openCreate}>新增案例</Button>}>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={list} pagination={false} size="small" />
      <Modal title={editing ? "编辑案例" : "新增案例"} open={modalOpen} onOk={save} onCancel={() => setModalOpen(false)} width={640} destroyOnClose>
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="title" label="案例标题" rules={[{ required: true, message: "请输入标题" }]}><Input /></Form.Item>
            <Form.Item name="space_id" label="空间场景">
              <Select allowClear options={spaceList.map((s) => ({ value: s.id, label: s.name }))} />
            </Form.Item>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Form.Item name="area" label="面积"><Input placeholder="98㎡" /></Form.Item>
            <Form.Item name="style" label="风格"><Input placeholder="现代轻奢" /></Form.Item>
            <Form.Item name="customer" label="客户"><Input placeholder="王先生" /></Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="house_type" label="户型"><Input placeholder="三室两厅" /></Form.Item>
            <Form.Item name="series" label="所用系列"><Input placeholder="柏悦系列" /></Form.Item>
          </div>
          <Form.Item name="description" label="方案说明"><Input.TextArea rows={3} /></Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="cover_image" label="封面图"><ImageUpload /></Form.Item>
            <Form.Item name="images" label="多图（JSON 数组）"><MultiImageUpload /></Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="sort_order" label="排序"><InputNumber style={{ width: "100%" }} /></Form.Item>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="status" label="展示" valuePropName="checked" getValueFromEvent={(e) => (e ? 1 : 0)} getValueProps={(v) => ({ checked: v === 1 })}>
                <Switch checkedChildren="展示" unCheckedChildren="隐藏" />
              </Form.Item>
              <Form.Item name="is_recommended" label="首页推荐" valuePropName="checked" getValueFromEvent={(e) => (e ? 1 : 0)} getValueProps={(v) => ({ checked: v === 1 })}>
                <Switch checkedChildren="推荐" unCheckedChildren="否" />
              </Form.Item>
            </div>
          </div>
        </Form>
      </Modal>
    </Card>
  );
}
