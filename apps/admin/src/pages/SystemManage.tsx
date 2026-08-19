/**
 * 系统管理页面（后台）
 * ------------------------------------------------------------------
 * 功能：后台"系统管理"菜单下的四个子页面（Tabs 切换）
 *  1. 管理员管理：列表（用户名/姓名/角色/状态）+ 新增/编辑 Modal（角色下拉、密码、启用）
 *     —— 权限码 admin:view / admin:edit / admin:delete
 *  2. 角色管理：列表 + 新增/编辑 Modal（权限编码多选下拉）
 *     —— 权限码 role:view / role:edit / role:delete；超级管理员角色（id=1）受保护
 *  3. 权限字典：只读展示全部权限项（code + name + 分组）
 *     —— 权限码 permission:view
 *  4. 部门管理：列表 + 新增/编辑 Modal
 *     —— 权限码 department:view / department:edit / department:delete
 * ------------------------------------------------------------------
 * 数据来源：/api/admin/admins、/api/admin/roles、/api/admin/permissions、
 *           /api/admin/departments（均需登录 + 对应权限码）
 * ------------------------------------------------------------------
 * 【中文注释说明】
 * - 每个子面板独立管理自己的列表/弹窗状态，互不干扰。
 * - 删除均为软删除（is_activate=0），由后端通用 CRUD 处理。
 * - 角色权限使用 Select mode="multiple"，options 来自权限字典接口。
 */
import { useCallback, useEffect, useState } from "react";
import {
  Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Switch, Table, Tabs, Tag, message,
} from "antd";
import { api } from "@tp/api-client";

/** 通用行数据类型（后端返回的任意实体行） */
interface Row {
  id: number;
  [k: string]: any;
}

/* ==================================================================
 * 管理员管理子面板
 * ================================================================== */
function AdminPanel() {
  // 列表数据 + 加载态 + 弹窗状态（editing 为空表示新增，非空表示编辑）
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
    <Card title="管理员管理" extra={<Button type="primary" onClick={openCreate}>新增管理员</Button>}>
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

/* ==================================================================
 * 角色管理子面板
 * ================================================================== */
function RolePanel() {
  // 列表 + 权限字典（供多选下拉使用）+ 弹窗状态
  const [list, setList] = useState<Row[]>([]);
  const [perms, setPerms] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm();

  // 加载角色列表（含已停用的，便于恢复）
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ list: Row[] }>("/api/admin/roles", { page_size: 100, show_disabled: 1 });
      setList(d.list || []);
    } catch (e: any) {
      message.error(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);
  // 挂载时：加载角色 + 权限字典
  useEffect(() => {
    load();
    api.get<Row[]>("/api/admin/permissions").then(setPerms).catch(() => {});
  }, [load]);

  // 权限编码列表转 AntD Select 选项（带分组标签）
  const permOptions = perms.map((p) => ({ value: p.code, label: `${p.name}（${p.code}）` }));

  // 新增/编辑入口
  function openCreate() {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }
  function openEdit(r: Row) {
    setEditing(r);
    // permissions 可能是 JSON 字符串或数组，统一转数组回填
    let p = r.permissions;
    if (typeof p === "string") { try { p = JSON.parse(p); } catch { p = []; } }
    form.setFieldsValue({ name: r.name, description: r.description, permissions: p || [] });
    setModalOpen(true);
  }
  // 保存角色
  async function save() {
    const v = await form.validateFields();
    try {
      if (editing) await api.put(`/api/admin/roles/${editing.id}`, v);
      else await api.post("/api/admin/roles", v);
      message.success("保存成功");
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    }
  }
  // 删除角色（软删除；超级管理员 id=1 后端已保护）
  async function remove(id: number) {
    try {
      await api.del(`/api/admin/roles/${id}`);
      message.success("已删除");
      load();
    } catch (e: any) {
      message.error(e?.message || "删除失败");
    }
  }

  const columns = [
    { title: "ID", dataIndex: "id", width: 60 },
    { title: "角色名", dataIndex: "name" },
    {
      title: "权限数",
      dataIndex: "permissions",
      render: (v: any) => {
        // permissions 可能是 JSON 字符串或数组，统一取长度展示
        if (Array.isArray(v)) return v.length;
        if (typeof v === "string") { try { return JSON.parse(v).length; } catch { return 0; } }
        return 0;
      },
    },
    { title: "描述", dataIndex: "description", render: (v: string) => v || "—" },
    { title: "状态", dataIndex: "is_activate", render: (v: number) => (v === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag>) },
    {
      title: "操作",
      render: (_: any, r: Row) => (
        <span>
          <a onClick={() => openEdit(r)} style={{ marginRight: 12 }}>编辑</a>
          {/* 超级管理员角色（id=1）不允许删除 */}
          {r.id === 1 ? (
            <Tag color="gold">内置角色</Tag>
          ) : (
            <Popconfirm title="确认删除？" onConfirm={() => remove(r.id)}><a style={{ color: "#cf1322" }}>删除</a></Popconfirm>
          )}
        </span>
      ),
    },
  ];

  return (
    <Card title="角色管理" extra={<Button type="primary" onClick={openCreate}>新增角色</Button>}>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={list} pagination={false} size="small" />
      <Modal title={editing ? "编辑角色" : "新增角色"} open={modalOpen} onOk={save} onCancel={() => setModalOpen(false)} width={560} destroyOnClose>
        <Form form={form} layout="vertical">
          {/* 角色名称 */}
          <Form.Item name="name" label="角色名称" rules={[{ required: true, message: "请输入角色名称" }]}><Input /></Form.Item>
          {/* 角色描述 */}
          <Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item>
          {/* 权限多选：可搜索，选项为全部权限项 */}
          <Form.Item name="permissions" label="权限编码">
            <Select mode="multiple" allowClear showSearch optionFilterProp="label" options={permOptions} placeholder="选择该角色拥有的权限" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

/* ==================================================================
 * 权限字典子面板（只读）
 * ================================================================== */
function PermissionPanel() {
  // 权限列表数据
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  // 挂载时拉取权限字典
  useEffect(() => {
    setLoading(true);
    api.get<Row[]>("/api/admin/permissions")
      .then(setList)
      .catch((e: any) => message.error(e?.message || "加载失败"))
      .finally(() => setLoading(false));
  }, []);

  // 按分组统计数量用于展示
  const groups = Array.from(new Set(list.map((p) => p.group_)));

  return (
    <Card title="权限字典（只读，由种子数据预置）">
      {/* 分组统计标签 */}
      <div style={{ marginBottom: 12 }}>
        {groups.map((g) => (
          <Tag key={g} color="gold" style={{ marginBottom: 4 }}>{g}（{list.filter((p) => p.group_ === g).length} 项）</Tag>
        ))}
      </div>
      <Table
        rowKey="id" loading={loading} size="small"
        dataSource={list}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        columns={[
          { title: "编码", dataIndex: "code" },
          { title: "名称", dataIndex: "name" },
          { title: "分组", dataIndex: "group_", render: (v: string) => <Tag>{v}</Tag> },
        ]}
      />
    </Card>
  );
}

/* ==================================================================
 * 部门管理子面板
 * ================================================================== */
function DepartmentPanel() {
  // 部门列表 + 弹窗状态
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

  // 新增 / 编辑入口
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
  // 保存部门
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
  // 删除部门（软删除）
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

/* ==================================================================
 * 系统管理页容器：四个子面板以 Tabs 组织
 * ================================================================== */
export default function SystemManage() {
  return (
    <Tabs
      defaultActiveKey="admins"
      items={[
        { key: "admins", label: "管理员", children: <AdminPanel /> },
        { key: "roles", label: "角色", children: <RolePanel /> },
        { key: "permissions", label: "权限字典", children: <PermissionPanel /> },
        { key: "departments", label: "部门", children: <DepartmentPanel /> },
      ]}
    />
  );
}
