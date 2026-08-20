/**
 * 图片裁剪组件（通用）
 * ------------------------------------------------------------------
 * 用途：上传产品图片/横幅/案例图等场景下，用户上传后可裁剪（自由比例或固定比例），
 *       确认后产出 Blob 再走上传。
 * 特点：
 *  - 基于 react-easy-crop（轻量、零样式污染）
 *  - 支持比例预设（自由 / 1:1 / 4:3 / 3:2 / 16:9），可配置默认比例
 *  - 支持缩放（zoom 滑块）
 *  - 输出 Blob（保持原图 MIME）与画布尺寸，可限定输出最大边长
 * ------------------------------------------------------------------
 */
import { useCallback, useRef, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Button, Modal, Segmented, Slider, Space } from "antd";

export interface ImageCropperProps {
  /** 待裁剪的图片 URL（ObjectURL 或服务端 URL） */
  src: string;
  /** 初始比例；undefined=自由比例。Segmented 预设会覆盖它 */
  initialAspect?: number;
  /** 输出图片最大边长（像素）；默认 1600，避免上传过大 */
  maxOutputSize?: number;
  /** 取消 */
  onCancel: () => void;
  /** 确认：返回 Blob 与导出的宽高（已按 maxOutputSize 缩放） */
  onConfirm: (blob: Blob, width: number, height: number) => void | Promise<void>;
}

/** Segmented 预设 */
const ASPECT_OPTIONS: { label: string; value: string; ratio?: number }[] = [
  { label: "自由", value: "free" },
  { label: "1:1", value: "1:1", ratio: 1 },
  { label: "4:3", value: "4:3", ratio: 4 / 3 },
  { label: "3:2", value: "3:2", ratio: 3 / 2 },
  { label: "16:9", value: "16:9", ratio: 16 / 9 },
];

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;

export default function ImageCropper({
  src,
  initialAspect,
  maxOutputSize = 1600,
  onCancel,
  onConfirm,
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  // 默认选中最接近 initialAspect 的预设
  const initialPreset = initialAspect
    ? ASPECT_OPTIONS.find((o) => o.ratio && Math.abs(o.ratio - initialAspect) < 0.02)?.value || "4:3"
    : "free";
  const [aspectKey, setAspectKey] = useState<string>(initialPreset);
  const aspect =
    ASPECT_OPTIONS.find((o) => o.value === aspectKey)?.ratio; // undefined = 自由
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_: Area, cropped: Area) => {
    setCroppedAreaPixels(cropped);
  }, []);

  /** 生成裁剪后的 Blob（使用 canvas） */
  async function getCroppedBlob(): Promise<{ blob: Blob; width: number; height: number }> {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.crossOrigin = "anonymous";
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = src;
    });
    const area = croppedAreaPixels!;
    // 按 maxOutputSize 等比缩放
    const scale = Math.min(1, maxOutputSize / Math.max(area.width, area.height));
    const w = Math.round(area.width * scale);
    const h = Math.round(area.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, w, h);
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas.toBlob 失败"))), "image/png", 0.92)
    );
    return { blob, width: w, height: h };
  }

  /** 确认按钮：裁剪 → 上传 */
  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    setBusy(true);
    try {
      const { blob, width, height } = await getCroppedBlob();
      await onConfirm(blob, width, height);
    } catch (e: any) {
      console.error(e);
      // 这里不弹 toast，让父级处理
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      title="裁剪图片"
      width={720}
      onCancel={onCancel}
      destroyOnClose
      maskClosable={false}
      footer={
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" loading={busy} onClick={handleConfirm}>
            确认裁剪并使用
          </Button>
        </Space>
      }
    >
      {/* 裁剪区域（高 360） */}
      <div style={{ position: "relative", height: 360, background: "#1a1714", borderRadius: 6, overflow: "hidden" }}>
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          restrictPosition
          showGrid
          objectFit="contain"
        />
      </div>
      {/* 比例 + 缩放 */}
      <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
        <Segmented
          options={ASPECT_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
          value={aspectKey}
          onChange={(v) => setAspectKey(v as string)}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 280 }}>
          <span style={{ width: 56, color: "#888" }}>缩放</span>
          <Slider
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={0.1}
            value={zoom}
            onChange={setZoom}
            style={{ flex: 1 }}
          />
        </div>
      </div>
    </Modal>
  );
}

/**
 * 工具：从 File 生成可裁剪的 ObjectURL（组件卸载时记得 revoke）
 */
export function fileToObjectURL(file: File): string {
  return URL.createObjectURL(file);
}