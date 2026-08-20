/**
 * 操作日志页面（后台）
 * ------------------------------------------------------------------
 * 功能：查看系统内所有管理操作记录（只读）
 *  - 列表：操作人、操作行为、目标、操作时间
 *  - 支持按动作码筛选 + 分页
 * ------------------------------------------------------------------
 * 数据来源：GET /api/admin/operation-logs（权限码 log:view）
 * ------------------------------------------------------------------
 * 【中文注释说明】
 * - 动作码为后端 record_log 写入的字符串（如 product:create / lead:update 等）。
 * - 操作人姓名由后端关联 Admin 表后通过 operator_name 返回，不再展示原始 ID。
 * - 操作时间由后端统一格式化为东八区（Asia/Shanghai）字符串。
 */
import { useCallback, useEffect, useState } from "react";
import { Card, Table, Tag } from "antd";
import { api } from "@tp/api-client";

/** 操作日志行数据结构 */
interface LogRow {
  id: number;
  created_at?: number | null; // 操作人 ID（注意：不是时间戳）
  action: string;             // 动作码，如 product:create
  target?: string | null;     // 操作对象（如记录 ID 或名称）
  ip?: string | null;         // 来源 IP（预留）
  created_date?: string | null; // 操作时间（已格式化为东八区字符串）
  operator_name?: string | null; // 操作人姓名（后端关联 Admin 表返回）
}

export default function OperationLogs() {
  // ---------- 状态定义 ----------
  // list：日志列表；total：总数；page/pageSize：分页；loading：加载态
  const [list, setList] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  // ---------- 数据加载 ----------
  // 依赖 page/pageSize 变化重新请求；按 id 倒序（最新在前）
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ list: LogRow[]; total: number }>("/api/admin/operation-logs", {
        page,
        page_size: pageSize,
      });
      setList(d.list || []);
      setTotal(d.total || 0);
    } catch {
      // 无权限（非 log:view 角色）时静默，表格保持空态
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  // 组件挂载与分页变化时重新加载
  useEffect(() => {
    load();
  }, [load]);

  // ---------- 表格列定义 ----------
  const columns = [
    { title: "ID", dataIndex: "id", width: 70 },
    // 操作人：后端已关联 Admin 表返回 operator_name
    { title: "操作人", dataIndex: "operator_name", render: (v: string) => v || "—" },
    // 操作行为：Tag 展示
    {
      title: "操作行为",
      dataIndex: "action",
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    // 操作目标
    { title: "目标", dataIndex: "target", render: (v: string) => v || "—" },
    // 来源 IP（预留字段）
    { title: "IP", dataIndex: "ip", render: (v: string) => v || "—" },
    // 操作时间：后端已格式化为东八区字符串
    { title: "时间", dataIndex: "created_date", render: (v: string) => v || "—" },
  ];

  return (
    <Card title="操作日志（只读）">
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={list}
        size="small"
        // 分页配置：总数来自后端，页码/每页条数变化触发重新加载
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />
    </Card>
  );
}
