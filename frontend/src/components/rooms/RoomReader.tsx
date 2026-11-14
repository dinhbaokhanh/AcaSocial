"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { roomsApi } from "@/lib/api/rooms";
import { discussionsApi } from "@/lib/api/discussions";
import { KnowledgePostCard } from "@/components/academic/KnowledgePostCard";
import { useAuth } from "@/lib/auth/context";
import { useRoom } from "@/lib/rooms/context";
import type { Room, Discussion } from "@/types";
import styles from "../admin/CatalogAdmin.module.css";
export function RoomReader({ id }: { id: string }) {
  const { user } = useAuth();
  return <RoomReaderSession key={`${id}:${user?.id ?? "guest"}`} id={id} />;
}
function RoomReaderSession({ id }: { id: string }) {
  const { user } = useAuth();
  const { selectRoom } = useRoom();
  const [now, setNow] = useState(0);
  const [room, setRoom] = useState<Room | null>(null),
    [posts, setPosts] = useState<Discussion[]>([]);
  const [page, setPage] = useState(1),
    [pages, setPages] = useState(1),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const r = await roomsApi.get(id);
        const result = await discussionsApi.list({
          roomId: r.id,
          page,
          limit: 20,
        });
        if (active) {
          setNow(Date.now());
          setRoom(r);
          setPosts(result.data);
          setPages(Math.max(1, result.meta.totalPages));
          setError("");
        }
      } catch (e) {
        if (active) {
          setRoom(null);
          setPosts([]);
          setError(e instanceof Error ? e.message : "Không tải được room");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id, page, user?.id, user?.role]);
  if (error) return <p role="alert">{error}</p>;
  if (!room) return <p>Đang tải room…</p>;
  const writable =
    room.status === "active" &&
    (!room.closureAt || new Date(room.closureAt).getTime() > now);
  return (
    <section className={styles.page}>
      <header>
        <h1>{room.name}</h1>
        <p>{room.description}</p>
      </header>
      {!writable && (
        <p className={styles.notice}>
          Room đã ngừng nhận nội dung mới. Bạn vẫn có thể đọc các bài đăng cũ
          theo quyền truy cập.
        </p>
      )}
      {room.closureAt && (
        <p>
          Thời điểm ngừng hoạt động:{" "}
          {new Date(room.closureAt).toLocaleString("vi-VN")}
        </p>
      )}
      {writable && (
        <Link href="/" onClick={() => selectRoom(room)}>
          Mở room trong bảng tin →
        </Link>
      )}
      {loading && <p role="status">Đang cập nhật…</p>}
      {!posts.length && !loading && <p>Chưa có bài đăng.</p>}
      {posts.map((post) => (
        <KnowledgePostCard
          key={post.id}
          discussion={post}
          isAuthenticated={!!user && writable}
        />
      ))}
      <div className={styles.actions}>
        <button
          disabled={loading || page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Trước
        </button>
        <span>
          Trang {page}/{pages}
        </span>
        <button
          disabled={loading || page >= pages}
          onClick={() => setPage((p) => p + 1)}
        >
          Sau
        </button>
      </div>
    </section>
  );
}
