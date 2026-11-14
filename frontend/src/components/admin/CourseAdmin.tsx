"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { academicApi, type CatalogItem } from "@/lib/api/academic";
import { Button } from "@/components/ui/Button";
import styles from "./CatalogAdmin.module.css";

export function CourseAdmin() {
  const { user, isLoading } = useAuth();
  const [items, setItems] = useState<CatalogItem[]>([]),
    [majors, setMajors] = useState<CatalogItem[]>([]);
  const [page, setPage] = useState(1),
    [pages, setPages] = useState(1),
    [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CatalogItem | null>(null),
    [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState(""),
    [name, setName] = useState(""),
    [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [linking, setLinking] = useState<CatalogItem | null>(null),
    [majorId, setMajorId] = useState("");
  const [courseType, setCourseType] = useState<"required" | "elective">(
    "required",
  );
  const load = useCallback(async () => {
    try {
      const data = await academicApi.courses(page);
      setItems(data.data);
      setPages(Math.max(1, data.meta.totalPages));
    } finally {
      setLoading(false);
    }
  }, [page]);
  useEffect(() => {
    if (user?.role !== "admin") return;
    let active = true;
    void Promise.all([
      load(),
      academicApi.majors().then((data) => {
        if (active) setMajors(data.filter((m) => m.status === "active"));
      }),
    ]).catch((e) => {
      if (active)
        setError(e instanceof Error ? e.message : "Không tải được dữ liệu");
    });
    return () => {
      active = false;
    };
  }, [user?.role, load]);
  function form(item: CatalogItem | null) {
    setEditing(item);
    setCode(item?.code ?? "");
    setName(item?.name ?? "");
    setDescription(item?.description ?? "");
    setShowForm(true);
    setError("");
    setNotice("");
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (editing)
        await academicApi.updateCourse(editing.id, {
          name: name.trim(),
          description: description.trim(),
          expectedVersion: editing.metadataVersion,
        });
      else
        await academicApi.createCourse({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim(),
        });
      setShowForm(false);
      setNotice("Đã lưu môn học. Tên room liên quan được giữ nguyên.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được môn học");
    } finally {
      setBusy(false);
    }
  }
  async function link(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!linking) return;
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await academicApi.addMajorCourse({
        courseId: linking.id,
        majorId,
        courseType,
        ...(data.get("credits")
          ? { credits: Number(data.get("credits")) }
          : {}),
        ...(data.get("semester")
          ? { recommendedSemester: Number(data.get("semester")) }
          : {}),
      });
      setLinking(null);
      setNotice(
        "Đã gắn môn vào ngành. Có thể tạo room môn ở trang quản lý room.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không gắn được môn vào ngành");
    } finally {
      setBusy(false);
    }
  }
  if (isLoading) return <p>Đang kiểm tra quyền…</p>;
  if (user?.role !== "admin") return <p>Bạn không có quyền truy cập.</p>;
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Quản lý môn học</h1>
          <p>Thêm và sửa môn học; dữ liệu cũ được giữ nguyên.</p>
        </div>
        <Button onClick={() => form(null)} disabled={busy}>
          Thêm môn học
        </Button>
      </header>
      <Link href="/admin/rooms">Quản lý room →</Link>
      {error && (
        <p role="alert" className={styles.error}>
          {error}{" "}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setShowForm(false);
              void load().catch((e) => setError(String(e)));
            }}
          >
            Tải lại dữ liệu
          </button>
        </p>
      )}
      {notice && (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      )}
      {showForm && (
        <form className={styles.form} onSubmit={save}>
          <h2>{editing ? "Sửa môn học" : "Thêm môn học"}</h2>
          <label>
            Mã môn
            <input
              required
              disabled={!!editing || busy}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={40}
              pattern="[A-Za-z0-9_-]+"
            />
          </label>
          <label>
            Tên môn
            <input
              required
              minLength={2}
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
            />
          </label>
          <label>
            Mô tả
            <textarea
              maxLength={10000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy}
            />
          </label>
          <p>
            Mã môn giữ nguyên sau khi tạo. Sửa tên môn không tự đổi tên room.
          </p>
          <div className={styles.actions}>
            <Button type="submit" disabled={busy}>
              {busy ? "Đang lưu…" : "Lưu môn học"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setShowForm(false)}
            >
              Hủy
            </Button>
          </div>
        </form>
      )}
      {linking && (
        <form className={styles.form} onSubmit={link}>
          <h2>Gắn “{linking.name}” vào ngành</h2>
          <label>
            Ngành
            <select
              required
              value={majorId}
              onChange={(e) => setMajorId(e.target.value)}
              disabled={busy}
            >
              <option value="">Chọn ngành</option>
              {majors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Loại môn
            <select
              value={courseType}
              onChange={(e) =>
                setCourseType(e.target.value as "required" | "elective")
              }
              disabled={busy}
            >
              <option value="required">Bắt buộc</option>
              <option value="elective">Tự chọn</option>
            </select>
          </label>
          <label>
            Tín chỉ
            <input
              name="credits"
              type="number"
              min={0}
              max={50}
              disabled={busy}
            />
          </label>
          <label>
            Học kỳ đề xuất
            <input
              name="semester"
              type="number"
              min={1}
              max={20}
              disabled={busy}
            />
          </label>
          <div className={styles.actions}>
            <Button type="submit" disabled={busy}>
              Gắn vào ngành
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setLinking(null)}
            >
              Hủy
            </Button>
          </div>
        </form>
      )}
      {loading ? (
        <p>Đang tải…</p>
      ) : (
        <div className={styles.list}>
          {!items.length && <p>Chưa có môn học.</p>}
          {items.map((item) => (
            <article className={styles.item} key={item.id}>
              <div>
                <strong>
                  {item.code ?? "Chưa có mã"} · {item.name}
                </strong>
                <p>{item.description}</p>
                <small>
                  {item.status === "active" ? "Hoạt động" : "Ngừng hoạt động"}
                </small>
              </div>
              <div className={styles.actions}>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => form(item)}
                >
                  Sửa
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy || item.status !== "active"}
                  onClick={() => {
                    setLinking(item);
                    setMajorId("");
                  }}
                >
                  Gắn ngành
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className={styles.actions}>
        <Button
          variant="ghost"
          disabled={loading || busy || page <= 1}
          onClick={() => {
            setLoading(true);
            setPage((p) => p - 1);
          }}
        >
          Trước
        </Button>
        <span>
          Trang {page}/{pages}
        </span>
        <Button
          variant="ghost"
          disabled={loading || busy || page >= pages}
          onClick={() => {
            setLoading(true);
            setPage((p) => p + 1);
          }}
        >
          Sau
        </Button>
      </div>
    </section>
  );
}
