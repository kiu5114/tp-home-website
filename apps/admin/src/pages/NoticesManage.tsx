/**
 * 通知公告页面（后台·系统管理）
 * ------------------------------------------------------------------
 * 功能：通知公告列表 + 新增/编辑 Modal（标题、类型、内容、状态）
 * 权限码：notice:view / notice:edit / notice:delete
 * 数据来源：/api/admin/notices（需登录 + 对应权限码）
 */
import { useCallback, useEffect, useState } from "react";
import {
  Button, Card, Form, Input, Modal, Popconfirm, Select, Table, Tag, message,
} from "antd";
import { api } from "@tp/api-client";

interface Row { id: number; [k: string]: any; }

export default function NoticesManage() {
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ list: Row[] }>("/api/admin/notices", { page_size: 100 });
      setList(d.list || []);
    } catch (e: any) {
      message.error(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ type: "notice", status: 1 });
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
      if (editing) await api.put(`/api/admin/notices/${editing.id}`, v);
      else await api.post("/api/admin/notices", v);
      message.success("保存成功");
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    }
  }
  async function remove(id: number) {
    try {
      await api.del(`/api/admin/notices/${id}`);
      message.success("已删除");
      load();
    } catch (e: any) {
      message.error(e?.message || "删除失败");
    }
  }

  const columns = [
    { title: "ID", dataIndex: "id", width: 60 },
    { title: "标题", dataIndex: "title" },
    {
      title: "类型",
      dataIndex: "type",
      render: (v: string) => (v === "announcement" ? <Tag color="blue">公告</Tag> : <Tag color="green">通知</Tag>),
    },
    { title: "状态", dataIndex: "status", render: (v: number) => (v === 1 ? <Tag color="green">发布</Tag> : <Tag color="red">草稿</Tag>) },
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
    <Card title="通知公告" extra={<Button type="primary" onClick={openCreate}>新增公告</Button>}>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={list} pagination={false} size="small" />
      <Modal title={editing ? "编辑公告" : "新增公告"} open={modalOpen} onOk={save} onCancel={() => setModalOpen(false)} width={640} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入标题" }]}><Input /></Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="type" label="类型" initialValue="notice">
              <Select options={[{ value: "notice", label: "通知" }, { value: "announcement", label: "公告" }]} />
            </Form.Item>
            <Form.Item name="status" label="状态" initialValue={1}>
              <Select options={[{ value: 1, label: "发布" }, { value: 0, label: "草稿" }]} />
            </Form.Item>
          </div>
          <Form.Item name="content" label="内容"><Input.TextArea rows={6} placeholder="支持 HTML 片段" /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
