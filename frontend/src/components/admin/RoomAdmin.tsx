"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { useRoom } from "@/lib/rooms/context";
import { roomsApi, type ClosureSchedule } from "@/lib/api/rooms";
import { academicApi, type CatalogItem } from "@/lib/api/academic";
import type { MajorCourse, Room, RoomType } from "@/types";
import { Button } from "@/components/ui/Button";
import styles from "./CatalogAdmin.module.css";
const typeLabels = {
  major: "Ngành",
  course: "Môn học",
  event: "Sự kiện",
  forum: "Trao đổi chung",
};
const statusLabels = {
  draft: "Bản nháp",
  active: "Hoạt động",
  read_only: "Chỉ đọc",
  archived: "Lưu trữ",
};
export function RoomAdmin() {
  const { user, isLoading } = useAuth();
  const { refresh } = useRoom();
  const [rooms, setRooms] = useState<Room[]>([]),
    [majors, setMajors] = useState<CatalogItem[]>([]),
    [courses, setCourses] = useState<MajorCourse[]>([]);
  const [editing, setEditing] = useState<Room | null>(null),
    [showForm, setShowForm] = useState(false);
  const [slug, setSlug] = useState(""),
    [name, setName] = useState(""),
    [description, setDescription] = useState("");
  const [roomType, setRoomType] = useState<RoomType>("forum"),
    [majorId, setMajorId] = useState(""),
    [parentId, setParentId] = useState(""),
    [contextId, setContextId] = useState("");
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [filter, setFilter] = useState(""),
    [page, setPage] = useState(1);
  const [lifecycleRoom, setLifecycleRoom] = useState<Room | null>(null),
    [schedule, setSchedule] = useState<ClosureSchedule | null>(null),
    [scheduleLoading, setScheduleLoading] = useState(false);
  const [closeAt, setCloseAt] = useState(""),
    [reason, setReason] = useState("");
  const load = useCallback(async () => {
    try {
      const items = await roomsApi.list();
      setRooms(items);
      await refresh();
    } finally {
      setLoading(false);
    }
  }, [refresh]);
  useEffect(() => {
    if (user?.role !== "admin") return;
    void Promise.all([load(), academicApi.majors().then(setMajors)]).catch(
      (e) =>
        setError(e instanceof Error ? e.message : "Không tải được dữ liệu"),
    );
  }, [user?.role, load]);
  const parentMajor = rooms.find((r) => r.id === parentId)?.academicBinding
    ?.majorId;
  useEffect(() => {
    let active = true;
    if (roomType !== "course" || !parentMajor) return;
    void academicApi
      .majorCourses(parentMajor)
      .then((rows) => {
        if (active) setCourses(rows);
      })
      .catch((e) => {
        if (active) setError(String(e));
      });
    return () => {
      active = false;
    };
  }, [roomType, parentMajor]);
  function form(room: Room | null) {
    setEditing(room);
    setSlug(room?.slug ?? "");
    setName(room?.name ?? "");
    setDescription(room?.description ?? "");
    setRoomType(room?.roomType ?? "forum");
    setParentId(room?.parentRoomId ?? "");
    setMajorId(room?.academicBinding?.majorId ?? "");
    setContextId(room?.academicBinding?.majorCourseId ?? "");
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
        await roomsApi.update(editing.id, {
          name: name.trim(),
          description: description.trim(),
          expectedVersion: editing.metadataVersion,
        });
      else
        await roomsApi.create({
          slug: slug.trim().toLowerCase(),
          name: name.trim(),
          description: description.trim(),
          roomType,
          ...(roomType === "major" ? { majorId } : {}),
          ...(roomType === "course"
            ? { parentRoomId: parentId, majorCourseId: contextId }
            : {}),
        });
      setShowForm(false);
      setNotice("Đã lưu room.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được room");
    } finally {
      setBusy(false);
    }
  }
  async function openLifecycle(room: Room) {
    setLifecycleRoom(room);
    setSchedule(null);
    setScheduleLoading(true);
    setReason("");
    setCloseAt("");
    setError("");
    try {
      const value = await roomsApi.schedule(room.id);
      setSchedule(value);
      setReason(value?.status === "pending" ? value.reason : "");
      if (value?.status === "pending") {
        const d = new Date(value.close_at);
        setCloseAt(
          new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16),
        );
      }
    } catch (e) {
      setLifecycleRoom(null);
      setError(String(e));
    } finally {
      setScheduleLoading(false);
    }
  }
  async function changeLifecycle(
    action: "schedule" | "cancel" | "active" | "read_only" | "archived",
  ) {
    if (!lifecycleRoom) return;
    if (reason.trim().length < 3) {
      setError("Vui lòng nhập lý do ít nhất 3 ký tự.");
      return;
    }
    if (
      action === "schedule" &&
      (!closeAt || Number.isNaN(new Date(closeAt).getTime()))
    ) {
      setError("Vui lòng chọn thời điểm ngừng hoạt động.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (action === "schedule")
        await roomsApi.setSchedule(
          lifecycleRoom.id,
          {
            closeAt: new Date(closeAt).toISOString(),
            reason: reason.trim(),
            ...(schedule?.status === "pending"
              ? { expectedVersion: schedule.version }
              : {}),
          },
          schedule?.status === "pending",
        );
      else if (action === "cancel" && schedule)
        await roomsApi.cancelSchedule(
          lifecycleRoom.id,
          schedule.version,
          reason.trim(),
        );
      else if (action !== "cancel")
        await roomsApi.status(
          lifecycleRoom.id,
          action,
          lifecycleRoom.metadataVersion,
          reason.trim(),
        );
      setLifecycleRoom(null);
      setNotice("Đã cập nhật vòng đời room. Nội dung cũ được giữ lại.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không cập nhật được room");
    } finally {
      setBusy(false);
    }
  }
  if (isLoading) return <p>Đang kiểm tra quyền…</p>;
  if (user?.role !== "admin") return <p>Bạn không có quyền truy cập.</p>;
  const filtered = rooms.filter((r) => !filter || r.status === filter),
    pages = Math.max(1, Math.ceil(filtered.length / 20));
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Quản lý room</h1>
          <p>Thêm, sửa và ngừng hoạt động room; giữ nguyên bài đăng.</p>
        </div>
        <Button disabled={busy} onClick={() => form(null)}>
          Thêm room
        </Button>
      </header>
      <Link href="/admin/courses">Quản lý môn học →</Link>
      {error && (
        <p role="alert" className={styles.error}>
          {error}{" "}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setShowForm(false);
              setLifecycleRoom(null);
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
          <h2>{editing ? "Sửa room" : "Thêm room"}</h2>
          <label>
            Tên room
            <input
              required
              minLength={3}
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
            />
          </label>
          <label>
            Đường dẫn (slug)
            <input
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              minLength={3}
              maxLength={100}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={busy || !!editing}
            />
          </label>
          <label>
            Loại room
            <select
              value={roomType}
              disabled={busy || !!editing}
              onChange={(e) => {
                setRoomType(e.target.value as RoomType);
                setParentId("");
                setContextId("");
                setCourses([]);
              }}
            >
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {!editing && roomType === "major" && (
            <label>
              Ngành học
              <select
                required
                value={majorId}
                disabled={busy}
                onChange={(e) => setMajorId(e.target.value)}
              >
                <option value="">Chọn ngành</option>
                {majors
                  .filter((m) => m.status === "active")
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {!editing && roomType === "course" && (
            <>
              <label>
                Room ngành cha
                <select
                  required
                  value={parentId}
                  disabled={busy}
                  onChange={(e) => {
                    setParentId(e.target.value);
                    setContextId("");
                    setCourses([]);
                  }}
                >
                  <option value="">Chọn room ngành</option>
                  {rooms
                    .filter(
                      (r) => r.roomType === "major" && r.status === "active",
                    )
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Môn thuộc ngành
                <select
                  required
                  value={contextId}
                  disabled={busy || !parentId}
                  onChange={(e) => setContextId(e.target.value)}
                >
                  <option value="">Chọn môn</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course.code} · {c.course.name}
                    </option>
                  ))}
                </select>
              </label>
              <p>
                Nếu chưa có môn trong ngành, hãy thêm hoặc gắn môn ở trang quản
                lý môn học.
              </p>
            </>
          )}
          <label>
            Mô tả
            <textarea
              maxLength={10000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy}
            />
          </label>
          {editing && (
            <p>
              Giữ nguyên slug, loại room và liên kết học thuật để bảo toàn nội
              dung.
            </p>
          )}
          <div className={styles.actions}>
            <Button type="submit" disabled={busy}>
              {busy ? "Đang lưu…" : "Lưu room"}
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
      {lifecycleRoom && (
        <section className={styles.form}>
          <h2>Vòng đời: {lifecycleRoom.name}</h2>
          <p>
            Trạng thái: {statusLabels[lifecycleRoom.status]}. Dữ liệu không bị
            xóa.
          </p>
          {rooms.some(
            (r) => r.parentRoomId === lifecycleRoom.id && r.status === "active",
          ) && (
            <p className={styles.notice}>
              Room này có room con đang hoạt động. Đóng room cha không tự đóng
              room con.
            </p>
          )}
          {scheduleLoading ? (
            <p>Đang tải lịch…</p>
          ) : (
            <>
              {schedule && (
                <p>
                  Lịch gần nhất:{" "}
                  {new Date(schedule.close_at).toLocaleString("vi-VN")} ·{" "}
                  {schedule.status === "pending"
                    ? "Đang chờ"
                    : schedule.status === "completed"
                      ? "Đã thực thi"
                      : "Đã hủy"}
                </p>
              )}
              <label>
                Lý do
                <input
                  required
                  minLength={3}
                  maxLength={1000}
                  value={reason}
                  disabled={busy}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              {lifecycleRoom.status === "active" && (
                <>
                  <label>
                    Thời điểm ngừng nhận nội dung mới (giờ địa phương)
                    <input
                      type="datetime-local"
                      value={closeAt}
                      disabled={busy}
                      onChange={(e) => setCloseAt(e.target.value)}
                    />
                  </label>
                  <p>
                    Báo trước mặc định ít nhất 7 ngày; tới hạn room chuyển sang
                    chỉ đọc.
                  </p>
                </>
              )}
              <div className={styles.actions}>
                {lifecycleRoom.status === "active" && (
                  <Button
                    disabled={busy}
                    onClick={() => void changeLifecycle("schedule")}
                  >
                    {schedule?.status === "pending"
                      ? "Đổi lịch"
                      : "Lập lịch ngừng hoạt động"}
                  </Button>
                )}
                {schedule?.status === "pending" ? (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => void changeLifecycle("cancel")}
                  >
                    Hủy lịch
                  </Button>
                ) : (
                  <>
                    {lifecycleRoom.status === "active" && (
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Chuyển room sang chỉ đọc ngay? Nội dung cũ vẫn được giữ.",
                            )
                          )
                            void changeLifecycle("read_only");
                        }}
                      >
                        Chỉ đọc ngay
                      </Button>
                    )}
                    {lifecycleRoom.status === "read_only" && (
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => void changeLifecycle("archived")}
                      >
                        Lưu trữ
                      </Button>
                    )}
                    {lifecycleRoom.status !== "active" && (
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => void changeLifecycle("active")}
                      >
                        Mở hoạt động
                      </Button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => setLifecycleRoom(null)}
          >
            Đóng bảng vòng đời
          </Button>
        </section>
      )}
      <label className={styles.toolbar}>
        Lọc trạng thái
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả</option>
          {Object.entries(statusLabels).map(([key, value]) => (
            <option key={key} value={key}>
              {value}
            </option>
          ))}
        </select>
      </label>
      {loading ? (
        <p>Đang tải…</p>
      ) : (
        <div className={styles.list}>
          {!filtered.length && <p>Không có room phù hợp.</p>}
          {filtered.slice((page - 1) * 20, page * 20).map((room) => (
            <article key={room.id} className={styles.item}>
              <div>
                <strong>{room.name}</strong>
                <p>
                  {typeLabels[room.roomType]} · {statusLabels[room.status]}
                </p>
                <small>/{room.slug}</small>
                {room.closureAt && (
                  <p>
                    Ngừng hoạt động:{" "}
                    {new Date(room.closureAt).toLocaleString("vi-VN")}
                  </p>
                )}
              </div>
              <div className={styles.actions}>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => form(room)}
                >
                  Sửa
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy || scheduleLoading}
                  onClick={() => void openLifecycle(room)}
                >
                  Vòng đời
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className={styles.actions}>
        <Button
          variant="ghost"
          disabled={busy || page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Trước
        </Button>
        <span>
          Trang {page}/{pages}
        </span>
        <Button
          variant="ghost"
          disabled={busy || page >= pages}
          onClick={() => setPage((p) => p + 1)}
        >
          Sau
        </Button>
      </div>
    </section>
  );
}
