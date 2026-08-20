/**
 * 用户管理页面（后台·系统管理）
 * ------------------------------------------------------------------
 * 功能：管理员列表（用户名/姓名/角色/状态）+ 新增/编辑 Modal（角色下拉、密码、启用）
 * 权限码：admin:view / admin:edit / admin:delete
 * 数据来源：/api/admin/admins（需登录 + 对应权限码）
 * ------------------------------------------------------------------
 */
import { useCallback, useEffect, useState } from "react";
import {
  Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Switch, Table, Tag, message,
} from "antd";
import { api } from "@tp/api-client";

/** 通用行数据类型 */
interface Row {
  id: number;
  [k: string]: any;
}

export default function AdminsManage() {
  const [list, setList] = useState<Row[]>([]);
  const [roles, setRoles] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm();

  // 加载管理员列表（默认只显示启用项）
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ list: Row[] }>("/api/admin/admins", { page_size: 100 });
      setList(d.list || []);
    } catch (e: any) {
      message.error(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);
  // 组件挂载时：加载列表 + 角色下拉选项
  useEffect(() => {
    load();
    api.get<{ list: Row[] }>("/api/admin/roles", { page_size: 100 }).then((d) => setRoles(d.list || [])).catch(() => {});
  }, [load]);

  // 新增：清空表单并打开弹窗（默认启用状态）
  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ gender: 0 });
    setModalOpen(true);
  }
  // 编辑：回填当前行数据
  function openEdit(r: Row) {
    setEditing(r);
    form.setFieldsValue({ ...r, password: undefined });
    setModalOpen(true);
  }
  // 保存：有 editing 走 PUT 更新，否则 POST 新增
  async function save() {
    const v = await form.validateFields();
    try {
      if (editing) await api.put(`/api/admin/admins/${editing.id}`, v);
      else await api.post("/api/admin/admins", v);
      message.success("保存成功");
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    }
  }
  // 删除：软删除（后端 is_activate=0）
  async function remove(id: number) {
    try {
      await api.del(`/api/admin/admins/${id}`);
      message.success("已删除");
      load();
    } catch (e: any) {
      message.error(e?.message || "删除失败");
    }
  }

  // 表格列定义
  const columns = [
    { title: "ID", dataIndex: "id", width: 60 },
    { title: "用户名", dataIndex: "username" },
    { title: "姓名", dataIndex: "name", render: (v: string) => v || "—" },
    { title: "角色", dataIndex: "role_id", render: (v: number) => roles.find((r) => r.id === v)?.name || "—" },
    { title: "手机号", dataIndex: "phone", render: (v: string) => v || "—" },
    {
      title: "状态",
      dataIndex: "is_activate",
      render: (v: number) => (v === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>),
    },
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
    <Card title="用户管理" extra={<Button type="primary" onClick={openCreate}>新增管理员</Button>}>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={list} pagination={false} size="small" />
      <Modal title={editing ? "编辑管理员" : "新增管理员"} open={modalOpen} onOk={save} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          {/* 用户名：新增必填；编辑时可改但建议唯一 */}
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: "请输入用户名" }]}><Input /></Form.Item>
          {/* 密码：新增必填；编辑留空表示不修改 */}
          <Form.Item
            name="password"
            label="密码"
            rules={editing ? [] : [{ required: true, message: "请输入初始密码" }]}
            extra={editing ? "留空表示不修改密码" : undefined}
          >
            <Input.Password placeholder={editing ? "留空不修改" : "初始密码"} />
          </Form.Item>
          {/* 姓名与昵称 */}
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="name" label="姓名"><Input /></Form.Item>
            <Form.Item name="nickname" label="昵称"><Input /></Form.Item>
          </div>
          {/* 手机号与邮箱 */}
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="phone" label="手机号"><Input /></Form.Item>
            <Form.Item name="email" label="邮箱"><Input /></Form.Item>
          </div>
          {/* 角色下拉：options 来自角色接口 */}
          <Form.Item name="role_id" label="角色" rules={[{ required: true, message: "请选择角色" }]}>
            <Select options={roles.map((r) => ({ value: r.id, label: r.name }))} placeholder="选择角色" />
          </Form.Item>
          <Form.Item name="gender" label="性别" hidden><Input /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
