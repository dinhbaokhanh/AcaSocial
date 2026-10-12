"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { mediaApi, type MediaUploadResponse } from "@/lib/api/media";
import { ReviewIcon } from "@/components/ui/ReviewIcon";
import styles from "./Attachments.module.css";

type FailedFile = { file: File; error: string };
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
  const [current, setCurrent] = useState("");
  const [failed, setFailed] = useState<FailedFile[]>([]);
  async function upload(selected: File[], remaining: FailedFile[] = failed) {
    if (files.length + remaining.length + selected.length > 10) {
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
    const failures = [...remaining];
    for (const file of selected) {
      setCurrent(file.name);
      try {
        const asset = await mediaApi.upload(file);
        if (!uploaded.some((f) => f.id === asset.id)) uploaded.push(asset);
      } catch (e) {
        failures.push({
          file,
          error: e instanceof Error ? e.message : "Không thể kiểm tra file",
        });
      }
    }
    onChange(uploaded);
    setFailed(failures);
    setBusy(false);
    setCurrent("");
    onBusy(failures.length > 0);
  }
  return (
    <fieldset className={styles.picker} disabled={busy}>
      <legend>
        <ReviewIcon kind="file" /> Ảnh và tài liệu
      </legend>
      <p className={styles.hint}>
        Tối đa 10 file, 10 MB/file. File được quét virus trước khi đăng.
      </p>
      <input
        type="file"
        multiple
        aria-label="Chọn ảnh hoặc tài liệu"
        onChange={(event) => {
          const selected = Array.from(event.target.files ?? []);
          event.target.value = "";
          void upload(selected);
        }}
      />
      {busy && (
        <p className={styles.scan} role="status">
          <ReviewIcon kind="clock" /> Đang tải và quét: {current}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <ul className={styles.files}>
        {files.map((file) => (
          <li className={styles.file} key={file.id}>
            <ReviewIcon kind="file" />
            <div>
              <a
                href={file.secureUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {file.originalName ?? file.mimeType}
              </a>
              <small className={styles.clean}>
                ✓ Không phát hiện mối đe dọa
              </small>
            </div>
            <button
              type="button"
              onClick={() => onChange(files.filter((f) => f.id !== file.id))}
              aria-label={`Gỡ ${file.originalName}`}
            >
              Gỡ
            </button>
          </li>
        ))}
        {failed.map((item, index) => (
          <li
            className={`${styles.file} ${styles.failed}`}
            key={`${item.file.name}:${index}`}
          >
            <ReviewIcon kind="block" />
            <div>
              <strong>{item.file.name}</strong>
              <small role="alert">{item.error}</small>
            </div>
            <button
              type="button"
              onClick={() =>
                void upload(
                  [item.file],
                  failed.filter((_, i) => i !== index),
                )
              }
            >
              Thử lại
            </button>
            <button
              type="button"
              onClick={() => {
                const remaining = failed.filter((_, i) => i !== index);
                setFailed(remaining);
                onBusy(remaining.length > 0);
              }}
            >
              Gỡ
            </button>
          </li>
        ))}
      </ul>
      {failed.length > 0 && (
        <p className={styles.error}>
          Hãy thử lại hoặc gỡ các file chưa đạt kiểm tra trước khi gửi post.
        </p>
      )}
    </fieldset>
  );
}
export function AttachmentList({ media }: { media: { mediaId: string }[] }) {
  const [result, setResult] = useState<{
    ids: string;
    assets: (MediaUploadResponse | null)[];
  } | null>(null);
  const ids = media.map((m) => m.mediaId).join(",");
  useEffect(() => {
    let active = true;
    Promise.all(
      ids ? ids.split(",").map((id) => mediaApi.get(id).catch(() => null)) : [],
    ).then((assets) => {
      if (active) setResult({ ids, assets });
    });
    return () => {
      active = false;
    };
  }, [ids]);
  if (!media.length) return null;
  return (
    <section className={styles.attachments} aria-label="Tệp đính kèm">
      <h3>
        <ReviewIcon kind="file" /> Tệp đính kèm
      </h3>
      {!result || result.ids !== ids ? (
        <p role="status">Đang kiểm tra tệp…</p>
      ) : (
        <ul className={styles.files}>
          {result.assets.map((asset, index) => (
            <li className={styles.file} key={media[index].mediaId}>
              {asset?.scanStatus === "clean" &&
              /^https?:\/\//.test(asset.secureUrl) ? (
                <div>
                  {asset.mimeType.startsWith("image/") && (
                    <a
                      href={asset.secureUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Image
                        unoptimized
                        width={600}
                        height={360}
                        src={asset.secureUrl}
                        alt={asset.originalName ?? "Ảnh đính kèm"}
                        loading="lazy"
                        className={styles.thumbnail}
                      />
                    </a>
                  )}
                  <a
                    href={asset.secureUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {asset.originalName ?? asset.mimeType} ↗
                  </a>
                  <small>
                    {Math.ceil(asset.sizeBytes / 1024)} KB ·{" "}
                    <span className={styles.clean}>
                      ✓ Không phát hiện mối đe dọa
                    </span>
                  </small>
                </div>
              ) : (
                <div>
                  <strong>
                    {asset?.originalName ?? "File không khả dụng"}
                  </strong>
                  <small className={styles.error}>
                    Chưa xác minh kết quả quét. Chủ file cần tải lại để kiểm
                    tra.
                  </small>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
