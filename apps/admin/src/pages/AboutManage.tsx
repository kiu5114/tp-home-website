import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Table, Tabs, Tag, message } from "antd";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { api, API_BASE } from "@tp/api-client";

interface Row {
  id: number;
  [k: string]: any;
}

/** 关于页（AboutPage，slug 唯一，内容富文本占位） */
function AboutPagesPanel() {
  const [list, setList] = useState<Row[]>([]);

  const quillModules = useMemo(() => {
    function uploadImage(this: any) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/jpeg,image/png,image/webp";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          const res: any = await api.upload("/api/admin/upload", file);
          const quill = this.quill;
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, "image", API_BASE + res.url);
          quill.setSelection(range.index + 1);
        } catch (e: any) {
          message.error(e?.message || "图片上传失败");
        }
      };
      input.click();
    }

    return {
      toolbar: {
        container: [
          [{ header: [1, 2, 3, 4, 5, 6, false] }],
          [{ size: ["small", false, "large", "huge"] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }, { background: [] }],
          [{ align: [] }],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "image"],
          ["clean"],
        ],
        handlers: {
          image: uploadImage,
        },
      },
    };
  }, []);

  const quillFormats = [
    "header",
    "size",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "align",
    "list",
    "bullet",
    "link",
    "image",
  ];

  // 数据库存相对路径，编辑器预览需要完整 URL
  const relToAbs = (html?: string | null) =>
    html ? html.replace(/src="\/uploads\//g, `src="${API_BASE}/uploads/`) : "";
  const absToRel = (html?: string | null) => {
    if (!html) return "";
    const escaped = API_BASE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return html.replace(new RegExp(`${escaped}/uploads/`, "g"), "/uploads/");
  };
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ list: Row[] }>("/api/admin/about-pages", { page_size: 100 });
      setList(d.list || []);
    } catch (e: any) {
      message.error(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }
  function openEdit(r: Row) {
    setEditing(r);
    form.setFieldsValue({ ...r, content: relToAbs(r.content) });
    setModalOpen(true);
  }
  async function save() {
    const v = await form.validateFields();
    try {
      v.content = absToRel(v.content);
      if (editing) await api.put(`/api/admin/about-pages/${editing.id}`, v);
      else await api.post("/api/admin/about-pages", v);
      message.success("保存成功");
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    }
  }
  async function remove(id: number) {
    try {
      await api.del(`/api/admin/about-pages/${id}`);
      message.success("已删除");
      load();
    } catch (e: any) {
      message.error(e?.message || "删除失败");
    }
  }

  const columns = [
    { title: "标识 slug", dataIndex: "slug" },
    { title: "标题", dataIndex: "title" },
    { title: "内容", dataIndex: "content", render: (v: string) => (v || "").slice(0, 60) },
    {
      title: "操作",
      render: (_: any, r: Row) => (
        <span>
          <a onClick={() => openEdit(r)} style={{ marginRight: 12 }}>编辑</a>
          <Popconfirm title="确认删除？" onConfirm={() => remove(r.id)}>
            <a style={{ color: "#cf1322" }}>删除</a>
          </Popconfirm>
        </span>
      ),
    },
  ];

  return (
    <Card title="关于页内容（about_tp / brand / history）" extra={<Button type="primary" onClick={openCreate}>新增页面</Button>}>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={list} pagination={false} size="small" />
      <Modal
        title={editing ? "编辑关于页" : "新增关于页"}
        open={modalOpen}
        onOk={save}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
        width={720}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="slug" label="标识（如 about_tp）" rules={[{ required: true, message: "请输入 slug" }]}><Input /></Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入标题" }]}><Input /></Form.Item>
          <Form.Item
            name="content"
            label="内容（富文本）"
            getValueFromEvent={(value) => value}
            getValueProps={(value) => ({ value: value || "" })}
          >
            <ReactQuill theme="snow" modules={quillModules} formats={quillFormats} style={{ height: 320 }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

/** 发展历程 Milestone */
function MilestonesPanel() {
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ list: Row[] }>("/api/admin/milestones", { page_size: 100 });
      setList(d.list || []);
    } catch (e: any) {
      message.error(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    form.resetFields();
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
      if (editing) await api.put(`/api/admin/milestones/${editing.id}`, v);
      else await api.post("/api/admin/milestones", v);
      message.success("保存成功");
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    }
  }
  async function remove(id: number) {
    try {
      await api.del(`/api/admin/milestones/${id}`);
      message.success("已删除");
      load();
    } catch (e: any) {
      message.error(e?.message || "删除失败");
    }
  }

  const columns = [
    { title: "年份", dataIndex: "year" },
    { title: "标题", dataIndex: "title" },
    { title: "描述", dataIndex: "desc", render: (v: string) => v || "—" },
    { title: "排序", dataIndex: "sort_order" },
    { title: "状态", dataIndex: "status", render: (v: number) => (v === 1 ? <Tag color="green">显示</Tag> : <Tag>隐藏</Tag>) },
    {
      title: "操作",
      render: (_: any, r: Row) => (
        <span>
          <a onClick={() => openEdit(r)} style={{ marginRight: 12 }}>编辑</a>
          <Popconfirm title="确认删除？" onConfirm={() => remove(r.id)}>
            <a style={{ color: "#cf1322" }}>删除</a>
          </Popconfirm>
        </span>
      ),
    },
  ];

  return (
    <Card title="发展历程" extra={<Button type="primary" onClick={openCreate}>新增节点</Button>}>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={list} pagination={false} size="small" />
      <Modal title={editing ? "编辑节点" : "新增节点"} open={modalOpen} onOk={save} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical" initialValues={{ status: 1, sort_order: 1 }}>
          <Form.Item name="year" label="年份" rules={[{ required: true, message: "请输入年份" }]}><Input /></Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入标题" }]}><Input /></Form.Item>
          <Form.Item name="desc" label="描述"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="sort_order" label="排序"><InputNumber style={{ width: "100%" }} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

export default function AboutManage() {
  return (
    <Tabs
      defaultActiveKey="pages"
      items={[
        { key: "pages", label: "关于页内容", children: <AboutPagesPanel /> },
        { key: "milestones", label: "发展历程", children: <MilestonesPanel /> },
      ]}
    />
  );
}
