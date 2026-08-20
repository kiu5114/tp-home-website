/**
 * 角色管理页面（后台·系统管理）
 * ------------------------------------------------------------------
 * 功能：
 *  1. 角色管理：列表 + 新增/编辑 Modal（权限编码多选下拉）
 *     —— 权限码 role:view / role:edit / role:delete；超级管理员角色（id=1）受保护
 *  2. 权限字典（只读）：展示全部权限项（code + name + 分组），供角色编辑参考
 *     —— 权限码 permission:view
 * ------------------------------------------------------------------
 * 数据来源：/api/admin/roles、/api/admin/permissions（需登录 + 对应权限码）
 */
import { useCallback, useEffect, useState } from "react";
import {
  Button, Card, Form, Input, Modal, Popconfirm, Select, Table, Tag, message,
} from "antd";
import { api } from "@tp/api-client";

/** 通用行数据类型 */
interface Row {
  id: number;
  [k: string]: any;
}

/* ==================================================================
 * 角色管理面板
 * ================================================================== */
function RolePanel() {
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
          <Form.Item name="name" label="角色名称" rules={[{ required: true, message: "请输入角色名称" }]}><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="permissions" label="权限编码">
            <Select mode="multiple" allowClear showSearch optionFilterProp="label" options={permOptions} placeholder="选择该角色拥有的权限" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

/* ==================================================================
 * 权限字典面板（只读）
 * ================================================================== */
function PermissionPanel() {
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get<Row[]>("/api/admin/permissions")
      .then(setList)
      .catch((e: any) => message.error(e?.message || "加载失败"))
      .finally(() => setLoading(false));
  }, []);

  const groups = Array.from(new Set(list.map((p) => p.group_)));

  return (
    <Card title="权限字典（只读，由种子数据预置）" style={{ marginTop: 16 }}>
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

export default function RolesManage() {
  return (
    <div>
      <RolePanel />
      <PermissionPanel />
    </div>
  );
}
