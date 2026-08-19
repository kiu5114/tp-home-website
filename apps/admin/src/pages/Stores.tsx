import { useCallback, useEffect, useState } from "react";
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Switch, Table, Tag, message } from "antd";
import { api } from "@tp/api-client";

interface Row {
  id: number;
  [k: string]: any;
}

export default function Stores() {
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ list: Row[] }>("/api/admin/stores", { page_size: 100 });
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
      if (editing) await api.put(`/api/admin/stores/${editing.id}`, v);
      else await api.post("/api/admin/stores", v);
      message.success("保存成功");
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    }
  }
  async function remove(id: number) {
    try {
      await api.del(`/api/admin/stores/${id}`);
      message.success("已删除");
      load();
    } catch (e: any) {
      message.error(e?.message || "删除失败");
    }
  }

  const columns = [
    { title: "门店名", dataIndex: "name" },
    { title: "地址", dataIndex: "address", render: (v: string) => v || "—" },
    { title: "电话", dataIndex: "phone", render: (v: string) => v || "—" },
    { title: "营业时间", dataIndex: "business_hours", render: (v: string) => v || "—" },
    { title: "排序", dataIndex: "sort_order" },
    { title: "状态", dataIndex: "status", render: (v: number) => (v === 1 ? <Tag color="green">营业中</Tag> : <Tag>停业</Tag>) },
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
    <Card title="门店管理" extra={<Button type="primary" onClick={openCreate}>新增门店</Button>}>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={list} pagination={false} size="small" />
      <Modal title={editing ? "编辑门店" : "新增门店"} open={modalOpen} onOk={save} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical" initialValues={{ status: 1, sort_order: 1 }}>
          <Form.Item name="name" label="门店名" rules={[{ required: true, message: "请输入门店名" }]}><Input /></Form.Item>
          <Form.Item name="address" label="地址"><Input /></Form.Item>
          <Form.Item name="phone" label="电话"><Input /></Form.Item>
          <Form.Item name="business_hours" label="营业时间"><Input placeholder="10:00-22:00" /></Form.Item>
          <Form.Item name="map_url" label="地图链接（预留）"><Input /></Form.Item>
          <Form.Item name="sort_order" label="排序"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="status" label="状态" valuePropName="checked" getValueFromEvent={(e) => (e ? 1 : 0)} getValueProps={(v) => ({ checked: v === 1 })}>
            <Switch checkedChildren="营业中" unCheckedChildren="停业" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
