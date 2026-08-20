/**
 * 字典管理页面（后台·系统管理）
 * ------------------------------------------------------------------
 * 功能：字典类型（左）+ 字典数据（右，按所选类型过滤）的主从管理。
 * 权限码：dict:view / dict:edit / dict:delete
 * 数据来源：/api/admin/dict-types、/api/admin/dict-data（需登录 + 对应权限码）
 */
import { useCallback, useEffect, useState } from "react";
import {
  Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Table, Tag, message,
} from "antd";
import { api } from "@tp/api-client";

interface Row { id: number; [k: string]: any; }

export default function DictsManage() {
  const [types, setTypes] = useState<Row[]>([]);
  const [dataAll, setDataAll] = useState<Row[]>([]);
  const [selectedType, setSelectedType] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  // 类型弹窗
  const [typeModal, setTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<Row | null>(null);
  const [typeForm] = Form.useForm();
  // 数据弹窗
  const [dataModal, setDataModal] = useState(false);
  const [editingData, setEditingData] = useState<Row | null>(null);
  const [dataForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, d] = await Promise.all([
        api.get<{ list: Row[] }>("/api/admin/dict-types", { page_size: 200 }),
        api.get<{ list: Row[] }>("/api/admin/dict-data", { page_size: 500 }),
      ]);
      setTypes(t.list || []);
      setDataAll(d.list || []);
      setSelectedType((prev) => prev ?? (t.list && t.list[0] ? t.list[0].id : null));
    } catch (e: any) {
      message.error(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const dataRows = selectedType == null ? [] : dataAll.filter((r) => r.type_id === selectedType);

  // ---------- 类型 CRUD ----------
  function openTypeCreate() {
    setEditingType(null);
    typeForm.resetFields();
    typeForm.setFieldsValue({ status: 1 });
    setTypeModal(true);
  }
  function openTypeEdit(r: Row) {
    setEditingType(r);
    typeForm.setFieldsValue({ ...r });
    setTypeModal(true);
  }
  async function saveType() {
    const v = await typeForm.validateFields();
    try {
      if (editingType) await api.put(`/api/admin/dict-types/${editingType.id}`, v);
      else await api.post("/api/admin/dict-types", v);
      message.success("保存成功");
      setTypeModal(false);
      load();
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    }
  }
  async function removeType(id: number) {
    try {
      await api.del(`/api/admin/dict-types/${id}`);
      message.success("已删除（含其字典数据）");
      load();
    } catch (e: any) {
      message.error(e?.message || "删除失败");
    }
  }

  // ---------- 数据 CRUD ----------
  function openDataCreate() {
    if (selectedType == null) { message.warning("请先选择左侧字典类型"); return; }
    setEditingData(null);
    dataForm.resetFields();
    dataForm.setFieldsValue({ status: 1, sort_order: 0, type_id: selectedType });
    setDataModal(true);
  }
  function openDataEdit(r: Row) {
    setEditingData(r);
    dataForm.setFieldsValue({ ...r });
    setDataModal(true);
  }
  async function saveData() {
    const v = await dataForm.validateFields();
    try {
      if (editingData) await api.put(`/api/admin/dict-data/${editingData.id}`, v);
      else await api.post("/api/admin/dict-data", v);
      message.success("保存成功");
      setDataModal(false);
      load();
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    }
  }
  async function removeData(id: number) {
    try {
      await api.del(`/api/admin/dict-data/${id}`);
      message.success("已删除");
      load();
    } catch (e: any) {
      message.error(e?.message || "删除失败");
    }
  }

  const typeColumns = [
    { title: "ID", dataIndex: "id", width: 60 },
    { title: "类型名", dataIndex: "name" },
    { title: "类型编码", dataIndex: "type_code" },
    { title: "状态", dataIndex: "status", render: (v: number) => (v === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag>) },
    {
      title: "操作",
      render: (_: any, r: Row) => (
        <span>
          <a onClick={() => openTypeEdit(r)} style={{ marginRight: 12 }}>编辑</a>
          <Popconfirm title="确认删除？（将级联删除其数据）" onConfirm={() => removeType(r.id)}><a style={{ color: "#cf1322" }}>删除</a></Popconfirm>
        </span>
      ),
    },
  ];

  const dataColumns = [
    { title: "ID", dataIndex: "id", width: 60 },
    { title: "标签", dataIndex: "label" },
    { title: "值", dataIndex: "value" },
    { title: "排序", dataIndex: "sort_order", width: 70 },
    { title: "状态", dataIndex: "status", render: (v: number) => (v === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag>) },
    {
      title: "操作",
      render: (_: any, r: Row) => (
        <span>
          <a onClick={() => openDataEdit(r)} style={{ marginRight: 12 }}>编辑</a>
          <Popconfirm title="确认删除？" onConfirm={() => removeData(r.id)}><a style={{ color: "#cf1322" }}>删除</a></Popconfirm>
        </span>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="字典类型"
        extra={<Button type="primary" onClick={openTypeCreate}>新增类型</Button>}
        style={{ marginBottom: 16 }}
      >
        <Table
          rowKey="id" loading={loading} size="small" pagination={false}
          dataSource={types}
          rowClassName={(r) => (r.id === selectedType ? "ant-table-row-selected" : "")}
          onRow={(r) => ({ onClick: () => setSelectedType(r.id) })}
          columns={typeColumns}
        />
      </Card>

      <Card
        title="字典数据"
        extra={<Button type="primary" onClick={openDataCreate}>新增数据</Button>}
      >
        <Table rowKey="id" loading={loading} size="small" pagination={{ pageSize: 50 }} dataSource={dataRows} columns={dataColumns} />
      </Card>

      {/* 类型弹窗 */}
      <Modal title={editingType ? "编辑类型" : "新增类型"} open={typeModal} onOk={saveType} onCancel={() => setTypeModal(false)} destroyOnClose>
        <Form form={typeForm} layout="vertical">
          <Form.Item name="name" label="类型名称" rules={[{ required: true, message: "请输入类型名称" }]}><Input /></Form.Item>
          <Form.Item name="type_code" label="类型编码" rules={[{ required: true, message: "请输入唯一编码" }]}><Input placeholder="如 notice_type" /></Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="status" label="状态" initialValue={1}>
            <Select options={[{ value: 1, label: "启用" }, { value: 0, label: "停用" }]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 数据弹窗 */}
      <Modal title={editingData ? "编辑数据" : "新增数据"} open={dataModal} onOk={saveData} onCancel={() => setDataModal(false)} destroyOnClose>
        <Form form={dataForm} layout="vertical">
          <Form.Item name="type_id" label="所属类型" rules={[{ required: true, message: "请选择类型" }]}>
            <Select options={types.map((t) => ({ value: t.id, label: `${t.name}（${t.type_code}）` }))} disabled={!!editingData} />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="label" label="标签" rules={[{ required: true, message: "请输入标签" }]}><Input /></Form.Item>
            <Form.Item name="value" label="值" rules={[{ required: true, message: "请输入值" }]}><Input /></Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="sort_order" label="排序"><InputNumber style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="status" label="状态" initialValue={1}>
              <Select options={[{ value: 1, label: "启用" }, { value: 0, label: "停用" }]} />
            </Form.Item>
          </div>
          <Form.Item name="remark" label="备注"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
