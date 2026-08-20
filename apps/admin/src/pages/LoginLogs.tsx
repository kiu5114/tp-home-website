/**
 * 登录日志页面（后台·系统监控，只读）
 * ------------------------------------------------------------------
 * 功能：登录/登出记录列表（用户名、IP、登录时间、状态、UA）+ 用户名筛选
 * 权限码：loginlog:view（数据由 auth 登录/登出自动写入）
 * 数据来源：/api/admin/login-logs（需登录 + 对应权限码）
 */
import { useCallback, useEffect, useState } from "react";
import { Card, Input, Table, Tag, message } from "antd";
import { api } from "@tp/api-client";

interface Row { id: number; [k: string]: any; }

export default function LoginLogs() {
  const [list, setList] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async (username = "") => {
    setLoading(true);
    try {
      const d = await api.get<{ list: Row[]; total: number }>("/api/admin/login-logs", {
        page: 1, page_size: 50, username: username || undefined,
      });
      setList(d.list || []);
      setTotal(d.total || 0);
    } catch (e: any) {
      message.error(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { title: "ID", dataIndex: "id", width: 60 },
    { title: "用户名", dataIndex: "username", render: (v: string) => v || "—" },
    { title: "IP", dataIndex: "ip", render: (v: string) => v || "—" },
    {
      title: "状态",
      dataIndex: "status",
      render: (v: number) => (v === 1 ? <Tag color="green">成功</Tag> : <Tag color="red">失败</Tag>),
    },
    { title: "登录时间", dataIndex: "login_time", render: (v: string) => (v || "").replace("T", " ") },
    { title: "User-Agent", dataIndex: "user_agent", render: (v: string) => v || "—" },
  ];

  return (
    <Card
      title="登录日志"
      extra={
        <Input.Search
          placeholder="按用户名筛选"
          allowClear
          onSearch={(v) => load(v)}
          style={{ width: 220 }}
        />
      }
    >
      <Table rowKey="id" loading={loading} size="small" pagination={{ total, pageSize: 50, showTotal: (t) => `共 ${t} 条` }} dataSource={list} columns={columns} />
    </Card>
  );
}
