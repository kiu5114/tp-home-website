import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Spin, message } from "antd";
import { api } from "@tp/api-client";

export default function SiteConfig() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<any>("/api/admin/site-config")
      .then((d) => {
        if (d) form.setFieldsValue(d);
      })
      .catch((e: any) => message.error(e?.message || "加载失败"))
      .finally(() => setLoading(false));
  }, [form]);

  async function save() {
    const v = await form.validateFields();
    setSaving(true);
    try {
      await api.put("/api/admin/site-config", v);
      message.success("保存成功，前台页脚即时生效");
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spin style={{ display: "block", margin: "80px auto" }} />;

  return (
    <Card title="站点配置（前台页脚 / 联系方式）">
      <Form form={form} layout="vertical" style={{ maxWidth: 560 }}>
        <Form.Item name="site_name" label="站点名称" rules={[{ required: true, message: "请输入站点名称" }]}>
          <Input />
        </Form.Item>
        <Form.Item name="logo" label="Logo 路径（/uploads/xxx）">
          <Input />
        </Form.Item>
        <Form.Item name="contact_phone" label="联系电话">
          <Input />
        </Form.Item>
        <Form.Item name="contact_email" label="联系邮箱">
          <Input />
        </Form.Item>
        <Form.Item name="company_address" label="公司地址">
          <Input />
        </Form.Item>
        <Form.Item name="icp" label="ICP 备案号">
          <Input />
        </Form.Item>
        <Form.Item name="copyright" label="版权信息">
          <Input />
        </Form.Item>
        <Button type="primary" loading={saving} onClick={save}>保存配置</Button>
      </Form>
    </Card>
  );
}
