/**
 * 岗位管理页面（后台·系统管理）
 * ------------------------------------------------------------------
 * 功能：组织岗位列表 + 新增/编辑 Modal（归属部门、排序、状态、备注）
 * 权限码：post:view / post:edit / post:delete（区别于招聘职位 jobs）
 * 数据来源：/api/admin/posts、/api/admin/departments（需登录 + 对应权限码）
 */
import { useCallback, useEffect, useState } from "react";
import {
  Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Table, Tag, message,
} from "antd";
import { api } from "@tp/api-client";

interface Row { id: number; [k: string]: any; }

export default function PostsManage() {
  const [list, setList] = useState<Row[]>([]);
  const [depts, setDepts] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ list: Row[] }>("/api/admin/posts", { page_size: 200 });
      setList(d.list || []);
    } catch (e: any) {
      message.error(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    api.get<{ list: Row[] }>("/api/admin/departments", { page_size: 200 }).then((d) => setDepts(d.list || [])).catch(() => {});
  }, [load]);

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
      if (editing) await api.put(`/api/admin/posts/${editing.id}`, v);
      else await api.post("/api/admin/posts", v);
      message.success("保存成功");
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    }
  }
  async function remove(id: number) {
    try {
      await api.del(`/api/admin/posts/${id}`);
      message.success("已删除");
      load();
    } catch (e: any) {
      message.error(e?.message || "删除失败");
    }
  }

  const columns = [
    { title: "ID", dataIndex: "id", width: 60 },
    { title: "岗位名", dataIndex: "name" },
    { title: "归属部门", dataIndex: "dept_id", render: (v: number) => (v ? depts.find((d) => d.id === v)?.name || `#${v}` : "—") },
    { title: "排序", dataIndex: "sort_order", width: 70 },
    { title: "状态", dataIndex: "status", render: (v: number) => (v === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag>) },
    { title: "备注", dataIndex: "remark", render: (v: string) => v || "—" },
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
    <Card title="岗位管理" extra={<Button type="primary" onClick={openCreate}>新增岗位</Button>}>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={list} pagination={{ pageSize: 50 }} size="small" />
      <Modal title={editing ? "编辑岗位" : "新增岗位"} open={modalOpen} onOk={save} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="岗位名称" rules={[{ required: true, message: "请输入岗位名称" }]}><Input /></Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="dept_id" label="归属部门">
              <Select allowClear placeholder="可不填" options={depts.map((d) => ({ value: d.id, label: d.name }))} />
            </Form.Item>
            <Form.Item name="sort_order" label="排序"><InputNumber style={{ width: "100%" }} /></Form.Item>
          </div>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="status" label="状态" initialValue={1}>
            <Select options={[{ value: 1, label: "启用" }, { value: 0, label: "停用" }]} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
