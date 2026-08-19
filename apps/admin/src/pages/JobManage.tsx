import { useCallback, useEffect, useState } from "react";
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Switch, Table, Tabs, Tag, message } from "antd";
import { api } from "@tp/api-client";

interface Row {
  id: number;
  [k: string]: any;
}

const JOB_STATUS = ["未处理", "已查看", "已联系", "不合适", "已录用"];
const APP_TYPE_LABEL: Record<string, string> = { social: "社会招聘", campus: "校园招聘" };

/* ===== 职位管理 ===== */
function JobPanel() {
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ list: Row[] }>("/api/admin/jobs", { page_size: 100, show_disabled: 1 });
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
    form.setFieldsValue({ job_type: "social", status: 1, sort_order: 1 });
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
      if (editing) await api.put(`/api/admin/jobs/${editing.id}`, v);
      else await api.post("/api/admin/jobs", v);
      message.success("保存成功");
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    }
  }
  async function remove(id: number) {
    try {
      await api.del(`/api/admin/jobs/${id}`);
      message.success("已删除");
      load();
    } catch (e: any) {
      message.error(e?.message || "删除失败");
    }
  }

  return (
    <Card title="职位管理" extra={<Button type="primary" onClick={openCreate}>新增职位</Button>}>
      <Table
        rowKey="id" loading={loading} size="small" pagination={false}
        dataSource={list}
        columns={[
          { title: "职位", dataIndex: "title" },
          { title: "类型", dataIndex: "job_type", render: (v: string) => APP_TYPE_LABEL[v] || v || "—" },
          { title: "部门", dataIndex: "department", render: (v: string) => v || "—" },
          { title: "地点", dataIndex: "location", render: (v: string) => v || "—" },
          { title: "用工", dataIndex: "employment_type", render: (v: string) => v || "—" },
          { title: "排序", dataIndex: "sort_order" },
          { title: "状态", dataIndex: "status", render: (v: number) => (v === 1 ? <Tag color="green">招聘中</Tag> : <Tag>已关闭</Tag>) },
          {
            title: "操作",
            render: (_: any, r: Row) => (
              <span>
                <a onClick={() => openEdit(r)} style={{ marginRight: 12 }}>编辑</a>
                <Popconfirm title="确认删除？" onConfirm={() => remove(r.id)}><a style={{ color: "#cf1322" }}>删除</a></Popconfirm>
              </span>
            ),
          },
        ]}
      />
      <Modal title={editing ? "编辑职位" : "新增职位"} open={modalOpen} onOk={save} onCancel={() => setModalOpen(false)} width={680} destroyOnClose>
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="title" label="职位名称" rules={[{ required: true, message: "请输入职位名称" }]}><Input /></Form.Item>
            <Form.Item name="job_type" label="招聘类型">
              <Select options={[{ value: "social", label: "社会招聘" }, { value: "campus", label: "校园招聘" }]} />
            </Form.Item>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Form.Item name="department" label="部门"><Input /></Form.Item>
            <Form.Item name="location" label="地点"><Input placeholder="上海 / 佛山" /></Form.Item>
            <Form.Item name="employment_type" label="用工类型"><Input placeholder="全职" /></Form.Item>
          </div>
          <Form.Item name="responsibilities" label="岗位职责（每行一条）"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="requirements" label="任职要求（每行一条）"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="benefits" label="福利待遇"><Input.TextArea rows={2} /></Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="sort_order" label="排序"><InputNumber style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="status" label="状态" valuePropName="checked" getValueFromEvent={(e) => (e ? 1 : 0)} getValueProps={(v) => ({ checked: v === 1 })}>
              <Switch checkedChildren="招聘中" unCheckedChildren="已关闭" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </Card>
  );
}

/* ===== 投递管理 ===== */
function ApplicationPanel() {
  const [list, setList] = useState<Row[]>([]);
  const [jobs, setJobs] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ list: Row[] }>("/api/admin/job-applications", { page_size: 100 });
      setList(d.list || []);
    } catch (e: any) {
      message.error(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    api.get<{ list: Row[] }>("/api/admin/jobs", { page_size: 100 }).then((d) => setJobs(d.list || [])).catch(() => {});
  }, [load]);

  function openEdit(r: Row) {
    setEditing(r);
    form.setFieldsValue({ status: r.status, remark: r.remark });
    setModalOpen(true);
  }
  async function save() {
    const v = await form.validateFields();
    try {
      await api.put(`/api/admin/job-applications/${editing!.id}`, v);
      message.success("状态已更新");
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.message || "更新失败");
    }
  }

  return (
    <Card title="投递管理（状态流转）">
      <Table
        rowKey="id" loading={loading} size="small" pagination={false}
        dataSource={list}
        columns={[
          { title: "姓名", dataIndex: "name" },
          { title: "手机号", dataIndex: "phone" },
          { title: "应聘职位", dataIndex: "job_id", render: (v: number) => jobs.find((j) => j.id === v)?.title || "—" },
          { title: "期望岗位", dataIndex: "intended_position", render: (v: string) => v || "—" },
          { title: "留言", dataIndex: "message", render: (v: string) => (v || "").slice(0, 30) || "—" },
          {
            title: "状态",
            dataIndex: "status",
            render: (v: string, r: Row) => (
              <span>
                <Tag color={v === "未处理" ? "orange" : v === "已录用" ? "green" : "blue"}>{v || "未处理"}</Tag>
                {r.remark ? <span style={{ fontSize: 12, color: "#999" }}>备注：{r.remark}</span> : null}
              </span>
            ),
          },
          {
            title: "操作",
            render: (_: any, r: Row) => <a onClick={() => openEdit(r)}>流转</a>,
          },
        ]}
      />
      <Modal title="投递状态流转" open={modalOpen} onOk={save} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical" initialValues={{ status: "未处理" }}>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select options={JOB_STATUS.map((s) => ({ value: s, label: s }))} />
          </Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

export default function JobManage() {
  return (
    <Tabs
      defaultActiveKey="jobs"
      items={[
        { key: "jobs", label: "职位管理", children: <JobPanel /> },
        { key: "apps", label: "投递管理", children: <ApplicationPanel /> },
      ]}
    />
  );
}
