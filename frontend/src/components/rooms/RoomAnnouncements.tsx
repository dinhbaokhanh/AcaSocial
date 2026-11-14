"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { roomsApi, type RoomAnnouncement } from "@/lib/api/rooms";
import styles from "../admin/CatalogAdmin.module.css";
export function RoomAnnouncements() {
  const { user } = useAuth();
  return <RoomAnnouncementsSession key={user?.id ?? "guest"} />;
}
function RoomAnnouncementsSession() {
  const { user } = useAuth();
  const [rows, setRows] = useState<RoomAnnouncement[]>([]),
    [page, setPage] = useState(1),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = () => {
      void roomsApi
        .announcements(page)
        .then((items) => {
          if (active) {
            setRows(items);
            setFailed(false);
          }
        })
        .catch(() => {
          if (active) setFailed(true);
        });
    };
    load();
    const timer = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [user, page]);
  if (!user) return null;
  if (failed)
    return (
      <p role="status">Chưa tải được thông báo room. Hệ thống sẽ thử lại.</p>
    );
  if (!rows.length && page === 1) return null;
  return (
    <aside
      className={styles.notice}
      aria-label="Thông báo ngừng hoạt động room"
    >
      <strong>Lịch ngừng nhận nội dung mới</strong>
      {rows.map((row) => (
        <p key={row.id}>
          <Link href={`/rooms/${row.room_id}`}>{row.name}</Link> ·{" "}
          {new Date(row.close_at).toLocaleString("vi-VN")} · {row.reason}. Bài
          đăng cũ được giữ lại.
        </p>
      ))}
      {(page > 1 || rows.length === 20) && (
        <div className={styles.actions}>
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Trước
          </button>
          <span>Trang {page}</span>
          <button
            disabled={rows.length < 20}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </button>
        </div>
      )}
    </aside>
  );
}
