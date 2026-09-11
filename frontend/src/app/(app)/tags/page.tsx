"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { tagsApi } from "@/lib/api/tags";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Tag } from "@/types";
import styles from "./tags.module.css";
export default function TagsPage() {
  const { user } = useAuth();
  const manage = ["admin", "moderator"].includes(user?.role ?? "");
  const [tags, setTags] = useState<Tag[]>([]),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [pages, setPages] = useState(1),
    [version, setVersion] = useState(0);
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null),
    [name, setName] = useState(""),
    [description, setDescription] = useState("");
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      tagsApi
        .list(page, 30, search)
        .then((r) => {
          if (active) {
            setTags(r.data);
            setPages(r.meta.totalPages);
            setLoading(false);
            setError("");
          }
        })
        .catch((e) => {
          if (active) {
            setError(e.message);
            setLoading(false);
          }
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [page, search, version]);
  async function save() {
    setBusy(true);
    setError("");
    try {
      const data = { name: name.trim(), description: description.trim() };
      if (editId) await tagsApi.update(editId, data);
      else await tagsApi.create(data);
      setEditId(null);
      setName("");
      setDescription("");
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được tag");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Chủ đề học thuật</h1>
        <p className={styles.subtitle}>
          Tìm bài viết theo môn học và lĩnh vực.
        </p>
      </header>
      <Input
        id="tag-search"
        label="Tìm chủ đề"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />
      {error && (
        <p role="alert">
          {error}{" "}
          <button onClick={() => setVersion((v) => v + 1)}>Thử lại</button>
        </p>
      )}
      {loading && <p>Đang tải…</p>}
      {manage && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          style={{
            padding: 16,
            border: "1px solid var(--color-border)",
            marginBlock: 16,
          }}
        >
          <h2>{editId ? "Sửa chủ đề" : "Thêm chủ đề"}</h2>
          <Input
            id="tag-name"
            label="Tên chủ đề"
            value={name}
            maxLength={100}
            required
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            id="tag-description"
            label="Mô tả"
            value={description}
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button type="submit" disabled={busy || !name.trim()}>
            Lưu
          </Button>
          {editId && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditId(null);
                setName("");
                setDescription("");
              }}
            >
              Hủy
            </Button>
          )}
        </form>
      )}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {tags.map((t) => (
          <li
            key={t.id}
            style={{
              padding: 16,
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <Link href={"/tags/" + encodeURIComponent(t.slug)}>
              <strong>#{t.name}</strong>
            </Link>
            <p>{t.description}</p>
            <small>{t.usageCount} bài viết</small>
            {manage && (
              <div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditId(t.id);
                    setName(t.name);
                    setDescription(t.description ?? "");
                  }}
                >
                  Sửa
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Xóa chủ đề này? Chủ đề đang được sử dụng không thể xóa.",
                      )
                    )
                      return;
                    setBusy(true);
                    void tagsApi
                      .remove(t.id)
                      .then(() => setVersion((v) => v + 1))
                      .catch((e) => setError(e.message))
                      .finally(() => setBusy(false));
                  }}
                >
                  Xóa
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {!loading && !tags.length && <p>Không có chủ đề phù hợp.</p>}
      {pages > 1 && (
        <nav aria-label="Phân trang chủ đề">
          <Button
            variant="ghost"
            disabled={page === 1}
            onClick={() => setPage((v) => v - 1)}
          >
            Trang trước
          </Button>
          <span>
            {page}/{pages}
          </span>
          <Button
            variant="ghost"
            disabled={page >= pages}
            onClick={() => setPage((v) => v + 1)}
          >
            Trang sau
          </Button>
        </nav>
      )}
    </div>
  );
}
