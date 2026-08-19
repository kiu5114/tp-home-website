import { useCallback, useEffect, useState } from "react";
import { Button, Card, Descriptions, Form, Input, Modal, Select, Table, Tag, message } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { api, API_BASE, getAccessToken } from "@tp/api-client";

interface Row {
  id: number;
  [k: string]: any;
}

const LEAD_TYPES: Record<string, string> = {
  online_message: "在线留言",
  appointment_to_store: "预约到店",
};
const LEAD_STATUS = ["未处理", "已联系", "跟进中", "已成交", "无效"];

export default function LeadsManage() {
  const [list, setList] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [keyword, setKeyword] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q: Record<string, any> = { page, page_size: pageSize };
      if (type) q.type = type;
      if (status) q.status = status;
      if (keyword) q.keyword = keyword;
      const d = await api.get<{ list: Row[]; total: number }>("/api/admin/leads", q);
      setList(d.list || []);
      setTotal(d.total || 0);
    } catch (e: any) {
      message.error(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, type, status, keyword]);

  useEffect(() => {
    load();
  }, [load]);

  function openEdit(r: Row) {
    setEditing(r);
    form.setFieldsValue({ status: r.status, remark: r.remark });
    setModalOpen(true);
  }
  async function save() {
    const v = await form.validateFields();
    try {
      await api.put(`/api/admin/leads/${editing!.id}`, v);
      message.success("已更新");
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.message || "更新失败");
    }
  }
  async function remove(id: number) {
    try {
      await api.del(`/api/admin/leads/${id}`);
      message.success("已删除");
      load();
    } catch (e: any) {
      message.error(e?.message || "删除失败");
    }
  }
  function doExport() {
    const qs = new URLSearchParams();
    if (type) qs.set("type", type);
    if (status) qs.set("status", status);
    const url = `${API_BASE}/api/admin/leads/export?${qs.toString()}`;
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", "leads_export.csv");
    // 导出接口同样受 RBAC 保护：以 fetch 带 token 下载
    fetch(url, { headers: { Authorization: `Bearer ${getAccessToken() || ""}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const obj = URL.createObjectURL(blob);
        a.href = obj;
        a.click();
        URL.revokeObjectURL(obj);
      })
      .catch(() => message.error("导出失败"));
  }

  return (
    <Card
      title="留言预约管理"
      extra={<Button icon={<DownloadOutlined />} onClick={doExport}>导出 CSV</Button>}
    >
      <div style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Select
          allowClear placeholder="线索类型"
          style={{ width: 160 }}
          value={type}
          onChange={(v) => { setType(v); setPage(1); }}
          options={Object.entries(LEAD_TYPES).map(([v, l]) => ({ value: v, label: l }))}
        />
        <Select
          allowClear placeholder="状态"
          style={{ width: 160 }}
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={LEAD_STATUS.map((s) => ({ value: s, label: s }))}
        />
        <Input.Search
          placeholder="姓名 / 手机号"
          style={{ width: 220 }}
          allowClear
          onSearch={(v) => { setKeyword(v); setPage(1); }}
        />
      </div>
      <Table
        rowKey="id" loading={loading} size="small"
        dataSource={list}
        pagination={{ current: page, pageSize, total, showSizeChanger: true, onChange: (p, ps) => { setPage(p); setPageSize(ps); } }}
        columns={[
          { title: "ID", dataIndex: "id", width: 60 },
          { title: "类型", dataIndex: "type", render: (v: string) => LEAD_TYPES[v] || v },
          { title: "姓名", dataIndex: "name" },
          { title: "手机号", dataIndex: "phone" },
          { title: "城市", dataIndex: "city", render: (v: string) => v || "—" },
          { title: "需求", dataIndex: "requirement_type", render: (v: string) => v || "—" },
          { title: "门店", dataIndex: "store", render: (v: string) => v || "—" },
          {
            title: "状态",
            dataIndex: "status",
            render: (v: string) => <Tag color={v === "未处理" ? "orange" : v === "已成交" ? "green" : "blue"}>{v || "未处理"}</Tag>,
          },
          { title: "来源", dataIndex: "source_page", render: (v: string) => v || "—" },
          { title: "留言", dataIndex: "message", render: (v: string) => (v || "").slice(0, 20) || "—" },
          { title: "提交时间", dataIndex: "created_date", render: (v: string) => (v || "").slice(0, 16) },
          {
            title: "操作",
            render: (_: any, r: Row) => (
              <span>
                <a onClick={() => openEdit(r)} style={{ marginRight: 12 }}>详情/流转</a>
                <a style={{ color: "#cf1322" }} onClick={() => remove(r.id)}>删除</a>
              </span>
            ),
          },
        ]}
      />
      <Modal title="线索详情 / 状态流转" open={modalOpen} onOk={save} onCancel={() => setModalOpen(false)} destroyOnClose>
        {editing && (
          <Descriptions column={1} size="small" style={{ marginBottom: 16 }} bordered>
            <Descriptions.Item label="类型">{LEAD_TYPES[editing.type] || editing.type}</Descriptions.Item>
            <Descriptions.Item label="姓名">{editing.name}</Descriptions.Item>
            <Descriptions.Item label="手机号">{editing.phone}</Descriptions.Item>
            <Descriptions.Item label="城市">{editing.city || "—"}</Descriptions.Item>
            <Descriptions.Item label="需求">{editing.requirement_type || "—"}</Descriptions.Item>
            <Descriptions.Item label="门店">{editing.store || "—"}</Descriptions.Item>
            <Descriptions.Item label="留言">{editing.message || "—"}</Descriptions.Item>
            <Descriptions.Item label="来源页">{editing.source_page || "—"}</Descriptions.Item>
            <Descriptions.Item label="提交时间">{(editing.created_date || "").slice(0, 19)}</Descriptions.Item>
          </Descriptions>
        )}
        <Form form={form} layout="vertical" initialValues={{ status: "未处理" }}>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select options={LEAD_STATUS.map((s) => ({ value: s, label: s }))} />
          </Form.Item>
          <Form.Item name="remark" label="跟进备注"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
