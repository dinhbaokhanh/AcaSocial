"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRoom } from "@/lib/rooms/context";
import { useAuth } from "@/lib/auth/context";
import { roomsApi, type RoomMember, type PolicyAudit } from "@/lib/api/rooms";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { ReviewIcon } from "@/components/ui/ReviewIcon";
import type { Room } from "@/types";
import styles from "../moderation.module.css";

const permissions = {
  inherit: "Theo mặc định room",
  direct: "Đăng trực tiếp",
  approval: "Luôn cần duyệt",
  blocked: "Không được đăng",
};
const roles = {
  owner: "Chủ room",
  moderator: "Kiểm duyệt viên",
  contributor: "Người đóng góp",
  member: "Thành viên",
};
const memberStatuses = {
  active: "Hoạt động",
  pending: "Chờ tham gia",
  muted: "Tạm hạn chế",
  banned: "Đã cấm",
  left: "Đã rời",
};
export default function RoomPoliciesPage() {
  const { rooms, selectedRoom, loading, refresh } = useRoom();
  const { user } = useAuth();
  const [id, setId] = useState("");
  const managed = rooms.filter((r) => r.canManage);
  const selected =
    managed.find((r) => r.id === id) ??
    managed.find((r) => r.id === selectedRoom?.id) ??
    managed[0];
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            <ReviewIcon /> Quyền đăng post
          </span>
          <h1>Cấu hình room</h1>
          <p className={styles.muted}>
            Đặt chính sách chung và ngoại lệ cho từng thành viên.
          </p>
        </div>
        <Link href="/moderation">← Về kiểm duyệt</Link>
      </header>
      {loading ? (
        <p role="status">Đang tải room…</p>
      ) : !selected ? (
        <div className={styles.empty}>
          <ReviewIcon />
          <h2>Chưa có room được quản lý</h2>
        </div>
      ) : (
        <>
          <div className={styles.filters}>
            <label>
              Room được quản lý
              <select
                value={selected.id}
                onChange={(e) => setId(e.target.value)}
              >
                {managed.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <RoomPolicy
            key={`${selected.id}:${selected.reviewPolicy}:${selected.policyLocked}`}
            room={selected}
            admin={user?.role === "admin"}
            onSaved={refresh}
          />
        </>
      )}
    </section>
  );
}
function RoomPolicy({
  room,
  admin,
  onSaved,
}: {
  room: Room;
  admin: boolean;
  onSaved: () => Promise<void>;
}) {
  const [policy, setPolicy] = useState(room.reviewPolicy);
  const [locked, setLocked] = useState(room.policyLocked);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [history, setHistory] = useState<PolicyAudit[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all([roomsApi.members(room.id), roomsApi.policyHistory(room.id)])
      .then(([items, audits]) => {
        if (active) {
          setMembers(items);
          setHistory(audits);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [room.id, reload]);
  const readOnly = !room.canConfigurePolicy || (room.policyLocked && !admin);
  async function savePolicy() {
    setBusy(true);
    setError("");
    try {
      await roomsApi.policy(room.id, {
        reviewPolicy: policy,
        ...(admin ? { policyLocked: locked } : {}),
      });
      setNotice("Đã lưu chính sách room.");
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể lưu");
    } finally {
      setBusy(false);
    }
  }
  async function saveMember(member: RoomMember) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await roomsApi.updateMember(room.id, member);
      setNotice("Đã cập nhật quyền đăng của thành viên.");
      setHistory(await roomsApi.policyHistory(room.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể lưu");
    } finally {
      setBusy(false);
    }
  }
  const visible = members.filter((m) =>
    `${m.userId} ${m.fullName ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      {error && (
        <p className={styles.alert} role="alert">
          {error}{" "}
          <button
            disabled={busy}
            onClick={() => {
              setLoading(true);
              setError("");
              setReload((r) => r + 1);
            }}
          >
            Thử lại
          </button>
        </p>
      )}
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      {!room.canConfigurePolicy && (
        <p className={styles.alert}>
          Bạn có quyền xem. Chỉ chủ room và admin được thay đổi quyền đăng.
        </p>
      )}
      <section className={styles.panel}>
        <div className={styles.header}>
          <h2>Chính sách mặc định</h2>
          {room.policyLocked && (
            <span className={`${styles.badge} ${styles.warning}`}>
              Đã khóa bởi admin
            </span>
          )}
        </div>
        <p className={styles.muted}>
          Áp dụng cho post mới. Post đang chờ duyệt vẫn ở hàng chờ khi thay đổi
          chính sách.
        </p>
        <div className={styles.policyOptions}>
          {(["direct", "approval"] as const).map((value) => (
            <label className={styles.policyOption} key={value}>
              <input
                type="radio"
                name="policy"
                checked={policy === value}
                disabled={busy || readOnly}
                onChange={() => setPolicy(value)}
              />
              <span>
                <strong>
                  {value === "direct" ? "Đăng trực tiếp" : "Cần duyệt trước"}
                </strong>
                <span className={styles.muted}>
                  {value === "direct"
                    ? "Post hiển thị sau khi kiểm tra file, có thể kiểm duyệt sau."
                    : "Post chỉ xuất hiện khi được người kiểm duyệt chấp nhận."}
                </span>
              </span>
            </label>
          ))}
        </div>
        {admin && (
          <label className={styles.lock}>
            <input
              type="checkbox"
              checked={locked}
              disabled={busy}
              onChange={(e) => setLocked(e.target.checked)}
            />
            Khóa chính sách và ngoại lệ thành viên; chỉ admin được thay đổi.
          </label>
        )}
        <div className={styles.actions}>
          <Button disabled={busy || readOnly} onClick={() => void savePolicy()}>
            Lưu chính sách
          </Button>
        </div>
      </section>
      <section className={styles.panel}>
        <div className={styles.header}>
          <h2>Ngoại lệ thành viên</h2>
          <span className={styles.badge}>{members.length} thành viên</span>
        </div>
        <p className={styles.muted}>
          Quyền đăng độc lập với quyền duyệt. Các giới hạn tham gia room, tạm
          hạn chế và cấm vẫn được áp dụng.
        </p>
        <input
          aria-label="Tìm thành viên"
          value={search}
          placeholder="Tìm theo tên hoặc mã thành viên…"
          onChange={(e) => setSearch(e.target.value)}
        />
        {loading ? (
          <p role="status">Đang tải thành viên…</p>
        ) : !visible.length ? (
          <p className={styles.muted}>Không tìm thấy thành viên.</p>
        ) : (
          visible.map((member) => (
            <div className={styles.member} key={member.id}>
              <div className={styles.row}>
                <Avatar alt={member.fullName ?? roles[member.role]} size="sm" />
                <div>
                  <strong>{member.fullName ?? roles[member.role]}</strong>
                  <small>
                    {roles[member.role]} · {memberStatuses[member.status]}
                  </small>
                  <code>{member.userId}</code>
                </div>
              </div>
              <select
                aria-label={`Quyền đăng của ${member.fullName ?? member.userId}`}
                value={member.postPermission}
                disabled={busy || readOnly}
                onChange={(e) =>
                  setMembers((items) =>
                    items.map((m) =>
                      m.id === member.id
                        ? {
                            ...m,
                            postPermission: e.target
                              .value as RoomMember["postPermission"],
                          }
                        : m,
                    ),
                  )
                }
              >
                {Object.entries(permissions).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                disabled={busy || readOnly}
                onClick={() => void saveMember(member)}
              >
                Lưu
              </Button>
            </div>
          ))
        )}
      </section>
      <details className={styles.panel}>
        <summary>Lịch sử thay đổi quyền ({history.length})</summary>
        {history.map((audit) => (
          <div key={audit.id} className={styles.checks}>
            <strong>
              {audit.member_id
                ? "Thay đổi quyền thành viên"
                : "Thay đổi chính sách room"}
            </strong>
            <p>
              {new Date(audit.created_at).toLocaleString("vi-VN")} · Người thực
              hiện: {audit.actor_id}
            </p>
            {audit.member_id && <p>Thành viên: {audit.member_id}</p>}
            <p>Trước: {describe(audit.before)}</p>
            <p>Sau: {describe(audit.after)}</p>
          </div>
        ))}
      </details>
    </>
  );
}
function describe(value: Record<string, unknown>) {
  const labels: Record<string, string> = {
    ...permissions,
    ...roles,
    ...memberStatuses,
    true: "Đã khóa",
    false: "Không khóa",
  };
  return Object.entries(value)
    .map(
      ([key, v]) =>
        `${({ reviewPolicy: "Mặc định", policyLocked: "Khóa", postPermission: "Quyền đăng", role: "Vai trò", status: "Trạng thái" } as Record<string, string>)[key] ?? key}: ${labels[String(v)] ?? String(v)}`,
    )
    .join(" · ");
}
