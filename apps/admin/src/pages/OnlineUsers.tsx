/**
 * 在线用户页面（后台·系统监控，只读）
 * ------------------------------------------------------------------
 * 功能：展示已启用管理员（按最近登录时间排序），作为在线/活跃账号的近似视图。
 * 权限码：online:view
 * 数据来源：/api/admin/online（需登录 + 对应权限码）
 */
import { useCallback, useEffect, useState } from "react";
import { Card, Table, Tag, message } from "antd";
import { api } from "@tp/api-client";

interface Row { id: number; [k: string]: any; }

export default function OnlineUsers() {
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ list: Row[] }>("/api/admin/online");
      setList(d.list || []);
    } catch (e: any) {
      message.error(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { title: "ID", dataIndex: "id", width: 60 },
    { title: "用户名", dataIndex: "username" },
    { title: "姓名", dataIndex: "name", render: (v: string) => v || "—" },
    { title: "角色", dataIndex: "role_name", render: (v: string) => v || "—" },
    { title: "状态", dataIndex: "is_activate", render: (v: number) => (v === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>) },
    { title: "最近登录", dataIndex: "last_login_at", render: (v: string) => (v || "").replace("T", " ") },
  ];

  return (
    <Card title="在线用户（已启用管理员，按最近登录排序）">
      <Table rowKey="id" loading={loading} size="small" pagination={false} dataSource={list} columns={columns} />
    </Card>
  );
}
