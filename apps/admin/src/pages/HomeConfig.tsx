import { useCallback, useEffect, useState } from "react";
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Switch, Table, Tabs, Tag, Upload, message } from "antd";
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

/** 通用列表 + 新增/编辑 Modal + 软删除 */
function useCrud(resource: string) {
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ list: Row[] }>(`/api/admin/${resource}`, { page_size: 100 });
      setList(d.list || []);
    } catch (e: any) {
      message.error(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, [resource]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }
  function openEdit(row: Row) {
    setEditing(row);
    form.setFieldsValue({ ...row });
    setModalOpen(true);
  }
  async function save() {
    const v = await form.validateFields();
    try {
      if (editing) {
        await api.put(`/api/admin/${resource}/${editing.id}`, v);
      } else {
        await api.post(`/api/admin/${resource}`, v);
      }
      message.success("保存成功");
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    }
  }
  async function remove(id: number) {
    try {
      await api.del(`/api/admin/${resource}/${id}`);
      message.success("已删除");
      load();
    } catch (e: any) {
      message.error(e?.message || "删除失败");
    }
  }

  return { list, loading, modalOpen, editing, form, load, openCreate, openEdit, save, remove, setModalOpen };
}

/** 上传控件：返回相对路径 /uploads/xxx */
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
      {value && (
        <img
          src={assetUrl(value)}
          alt="preview"
          style={{ width: height * 1.4, height, objectFit: "cover", borderRadius: 4, border: "1px solid #eee" }}
        />
      )}
      <Upload
        accept="image/*"
        showUploadList={false}
        beforeUpload={(f) => {
          doUpload(f);
          return false;
        }}
      >
        <Button icon={<UploadOutlined />} loading={up}>{value ? "更换图片" : "上传图片"}</Button>
      </Upload>
    </div>
  );
}

/* ---------------- 轮播 Banner ---------------- */
function BannerPanel() {
  const c = useCrud("banners");
  const columns = [
    { title: "标题", dataIndex: "title" },
    {
      title: "图片",
      dataIndex: "img_url",
      render: (v: string) =>
        v ? <img src={assetUrl(v)} alt="" style={{ width: 56, height: 40, objectFit: "cover", borderRadius: 4 }} /> : "—",
    },
    { title: "副标题", dataIndex: "subtitle", render: (v: string) => v || "—" },
    { title: "链接", dataIndex: "link", render: (v: string) => v || "—" },
    { title: "排序", dataIndex: "sort_order" },
    {
      title: "状态",
      dataIndex: "status",
      render: (v: number) => (v === 1 ? <Tag color="green">上线</Tag> : <Tag>下线</Tag>),
    },
    {
      title: "操作",
      render: (_: any, r: Row) => (
        <span>
          <a onClick={() => c.openEdit(r)} style={{ marginRight: 12 }}>编辑</a>
          <Popconfirm title="确认删除？" onConfirm={() => c.remove(r.id)}>
            <a style={{ color: "#cf1322" }}>删除</a>
          </Popconfirm>
        </span>
      ),
    },
  ];
  return (
    <Card
      title="轮播 Banner"
      extra={<Button type="primary" onClick={c.openCreate}>新增 Banner</Button>}
    >
      <Table rowKey="id" loading={c.loading} columns={columns} dataSource={c.list} pagination={false} size="small" />
      <Modal title={c.editing ? "编辑 Banner" : "新增 Banner"} open={c.modalOpen} onOk={c.save} onCancel={() => c.setModalOpen(false)} destroyOnClose>
        <Form form={c.form} layout="vertical" initialValues={{ status: 1, sort_order: 1 }}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入标题" }]}><Input /></Form.Item>
          <Form.Item name="subtitle" label="副标题"><Input /></Form.Item>
          <Form.Item name="img_url" label="图片"><ImageUpload /></Form.Item>
          <Form.Item name="link" label="跳转链接（如 /products）"><Input /></Form.Item>
          <Form.Item name="sort_order" label="排序（越小越前）"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="status" label="状态" valuePropName="checked" getValueFromEvent={(e) => (e ? 1 : 0)} getValueProps={(v) => ({ checked: v === 1 })}>
            <Switch checkedChildren="上线" unCheckedChildren="下线" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

/* ---------------- 品牌亮点 ---------------- */
function HighlightPanel() {
  const c = useCrud("highlights");
  const columns = [
    { title: "标题", dataIndex: "title" },
    { title: "描述", dataIndex: "desc", render: (v: string) => v || "—" },
    { title: "图标", dataIndex: "icon", render: (v: string) => v || "—" },
    { title: "排序", dataIndex: "sort_order" },
    {
      title: "状态",
      dataIndex: "status",
      render: (v: number) => (v === 1 ? <Tag color="green">上线</Tag> : <Tag>下线</Tag>),
    },
    {
      title: "操作",
      render: (_: any, r: Row) => (
        <span>
          <a onClick={() => c.openEdit(r)} style={{ marginRight: 12 }}>编辑</a>
          <Popconfirm title="确认删除？" onConfirm={() => c.remove(r.id)}>
            <a style={{ color: "#cf1322" }}>删除</a>
          </Popconfirm>
        </span>
      ),
    },
  ];
  return (
    <Card
      title="品牌亮点"
      extra={<Button type="primary" onClick={c.openCreate}>新增亮点</Button>}
    >
      <Table rowKey="id" loading={c.loading} columns={columns} dataSource={c.list} pagination={false} size="small" />
      <Modal title={c.editing ? "编辑亮点" : "新增亮点"} open={c.modalOpen} onOk={c.save} onCancel={() => c.setModalOpen(false)} destroyOnClose>
        <Form form={c.form} layout="vertical" initialValues={{ status: 1, sort_order: 1, icon: "star" }}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入标题" }]}><Input /></Form.Item>
          <Form.Item name="desc" label="描述"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="icon" label="图标（占位）"><Input /></Form.Item>
          <Form.Item name="sort_order" label="排序"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="status" label="状态" valuePropName="checked" getValueFromEvent={(e) => (e ? 1 : 0)} getValueProps={(v) => ({ checked: v === 1 })}>
            <Switch checkedChildren="上线" unCheckedChildren="下线" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

export default function HomeConfig() {
  return (
    <Tabs
      defaultActiveKey="banners"
      items={[
        { key: "banners", label: "轮播 Banner", children: <BannerPanel /> },
        { key: "highlights", label: "品牌亮点", children: <HighlightPanel /> },
      ]}
    />
  );
}
