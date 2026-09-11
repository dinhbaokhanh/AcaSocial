"use client";
import { useEffect, useState } from "react";
import { mediaApi, type MediaUploadResponse } from "@/lib/api/media";

export function AttachmentPicker({
  files,
  onChange,
  onBusy,
}: {
  files: MediaUploadResponse[];
  onChange: (files: MediaUploadResponse[]) => void;
  onBusy: (value: boolean) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <fieldset disabled={busy} style={{ marginBlock: 16 }}>
      <legend>Ảnh và tài liệu đính kèm (tối đa 10 file, 10 MB/file)</legend>
      <input
        type="file"
        multiple
        aria-label="Chọn ảnh hoặc tài liệu"
        onChange={async (e) => {
          const selected = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length + selected.length > 10) {
            setError("Chỉ được đính kèm tối đa 10 file.");
            return;
          }
          if (selected.some((f) => f.size > 10 * 1024 * 1024)) {
            setError("File vượt quá 10 MB.");
            return;
          }
          setBusy(true);
          onBusy(true);
          setError("");
          const uploaded = [...files];
          try {
            for (const file of selected) {
              const asset = await mediaApi.upload(file);
              if (!uploaded.some((f) => f.id === asset.id))
                uploaded.push(asset);
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : "Tải file thất bại");
          } finally {
            onChange(uploaded);
            setBusy(false);
            onBusy(false);
          }
        }}
      />
      {busy && <p role="status">Đang tải file…</p>}
      {error && <p role="alert">{error}</p>}
      <ul>
        {files.map((file) => (
          <li key={file.id}>
            <a href={file.secureUrl} target="_blank" rel="noopener noreferrer">
              {file.originalName ?? file.mimeType}
            </a>{" "}
            <button
              type="button"
              onClick={() => onChange(files.filter((f) => f.id !== file.id))}
            >
              Bỏ đính kèm
            </button>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
export function AttachmentList({ media }: { media: { mediaId: string }[] }) {
  const [assets, setAssets] = useState<(MediaUploadResponse | null)[]>([]);
  const ids = media.map((m) => m.mediaId).join(",");
  useEffect(() => {
    let active = true;
    Promise.all(
      ids ? ids.split(",").map((id) => mediaApi.get(id).catch(() => null)) : [],
    ).then((result) => {
      if (active) setAssets(result);
    });
    return () => {
      active = false;
    };
  }, [ids]);
  if (!media.length) return null;
  return (
    <section aria-label="Tệp đính kèm">
      <h3>Tệp đính kèm</h3>
      <ul>
        {assets.map((asset, index) => (
          <li key={media[index]?.mediaId ?? index}>
            {asset && /^https?:\/\//.test(asset.secureUrl) ? (
              <a
                href={asset.secureUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {asset.mimeType.startsWith("image/") && (
                  <img
                    src={asset.secureUrl}
                    alt={asset.originalName ?? "Ảnh đính kèm"}
                    loading="lazy"
                    style={{
                      maxWidth: "100%",
                      maxHeight: 360,
                      display: "block",
                    }}
                  />
                )}
                {asset.originalName ?? asset.mimeType} (
                {Math.ceil(asset.sizeBytes / 1024)} KB)
              </a>
            ) : (
              <span>File không còn khả dụng</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
