/**
 * 菜单管理页面（后台·系统管理）
 * ------------------------------------------------------------------
 * 功能：菜单（分组 + 叶子）列表 + 新增/编辑 Modal（parent_id 树形、权限码、排序、状态）
 * 权限码：menu:view / menu:edit / menu:delete
 * 数据来源：/api/admin/menus（需登录 + 对应权限码）
 */
import { useCallback, useEffect, useState } from "react";
import {
  Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Table, Tag, message,
} from "antd";
import { api } from "@tp/api-client";

interface Row { id: number; [k: string]: any; }

export default function MenusManage() {
  const [list, setList] = useState<Row[]>([]);
  const [parents, setParents] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ list: Row[] }>("/api/admin/menus", { page_size: 200, show_disabled: 1 });
      const rows = d.list || [];
      setList(rows);
      // 父级下拉：列出所有菜单（含禁用），便于选择归属分组
      setParents(rows);
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
    form.setFieldsValue({ status: 1, sort_order: 0 });
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
      if (editing) await api.put(`/api/admin/menus/${editing.id}`, v);
      else await api.post("/api/admin/menus", v);
      message.success("保存成功");
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    }
  }
  async function remove(id: number) {
    try {
      await api.del(`/api/admin/menus/${id}`);
      message.success("已删除");
      load();
    } catch (e: any) {
      message.error(e?.message || "删除失败");
    }
  }

  const columns = [
    { title: "ID", dataIndex: "id", width: 60 },
    { title: "名称", dataIndex: "name" },
    { title: "路径", dataIndex: "path", render: (v: string) => v || "—" },
    { title: "权限码", dataIndex: "perm", render: (v: string) => v || "—" },
    { title: "上级", dataIndex: "parent_id", render: (v: number) => (v ? parents.find((p) => p.id === v)?.name || `#${v}` : <Tag>顶级分组</Tag>) },
    { title: "排序", dataIndex: "sort_order", width: 70 },
    { title: "状态", dataIndex: "status", render: (v: number) => (v === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag>) },
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
    <Card title="菜单管理" extra={<Button type="primary" onClick={openCreate}>新增菜单</Button>}>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={list} pagination={{ pageSize: 50 }} size="small" />
      <Modal title={editing ? "编辑菜单" : "新增菜单"} open={modalOpen} onOk={save} onCancel={() => setModalOpen(false)} width={560} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="菜单名称" rules={[{ required: true, message: "请输入菜单名称" }]}><Input /></Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="path" label="路由路径"><Input placeholder="如 /products" /></Form.Item>
            <Form.Item name="perm" label="权限码"><Input placeholder="如 product:view" /></Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="parent_id" label="上级菜单">
              <Select allowClear placeholder="顶级分组" options={parents.map((p) => ({ value: p.id, label: p.name }))} />
            </Form.Item>
            <Form.Item name="sort_order" label="排序"><InputNumber style={{ width: "100%" }} /></Form.Item>
          </div>
          <Form.Item name="icon" label="图标名（预留）"><Input /></Form.Item>
          <Form.Item name="status" label="状态" initialValue={1}>
            <Select options={[{ value: 1, label: "启用" }, { value: 0, label: "停用" }]} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
