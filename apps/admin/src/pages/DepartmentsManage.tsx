/**
 * 部门管理页面（后台·系统管理）
 * ------------------------------------------------------------------
 * 功能：部门列表 + 新增/编辑 Modal（parent_id 自引用树形）
 * 权限码：department:view / department:edit / department:delete
 * 数据来源：/api/admin/departments（需登录 + 对应权限码）
 */
import { useCallback, useEffect, useState } from "react";
import {
  Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Table, message,
} from "antd";
import { api } from "@tp/api-client";

/** 通用行数据类型 */
interface Row {
  id: number;
  [k: string]: any;
}

export default function DepartmentsManage() {
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm();

  // 加载部门列表
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ list: Row[] }>("/api/admin/departments", { page_size: 100 });
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
      if (editing) await api.put(`/api/admin/departments/${editing.id}`, v);
      else await api.post("/api/admin/departments", v);
      message.success("保存成功");
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    }
  }
  async function remove(id: number) {
    try {
      await api.del(`/api/admin/departments/${id}`);
      message.success("已删除");
      load();
    } catch (e: any) {
      message.error(e?.message || "删除失败");
    }
  }

  const columns = [
    { title: "ID", dataIndex: "id", width: 60 },
    { title: "部门名", dataIndex: "name" },
    { title: "上级", dataIndex: "parent_id", render: (v: number) => (v ? `#${v}` : "—") },
    { title: "排序", dataIndex: "sort_order" },
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
    <Card title="部门管理" extra={<Button type="primary" onClick={openCreate}>新增部门</Button>}>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={list} pagination={false} size="small" />
      <Modal title={editing ? "编辑部门" : "新增部门"} open={modalOpen} onOk={save} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical" initialValues={{ sort_order: 0 }}>
          <Form.Item name="name" label="部门名称" rules={[{ required: true, message: "请输入部门名称" }]}><Input /></Form.Item>
          <Form.Item name="parent_id" label="上级部门 ID（可为空）"><InputNumber style={{ width: "100%" }} placeholder="留空为顶级" /></Form.Item>
          <Form.Item name="sort_order" label="排序"><InputNumber style={{ width: "100%" }} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
