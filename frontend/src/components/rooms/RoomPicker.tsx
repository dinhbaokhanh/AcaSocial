"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ROOM_TYPE_LABELS } from "@/lib/constants";
import type { Room } from "@/types";
import styles from "./RoomPicker.module.css";

const MAX_ROWS = 10;

// So khớp không phân biệt dấu: "he dieu hanh" tìm được "Hệ điều hành".
const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();

/**
 * Dropdown chọn không gian đăng bài: có ô tìm kiếm, hiện tối đa 10 room,
 * room có nhiều bài viết nhất lên đầu.
 */
export function RoomPicker({
  id,
  rooms,
  value,
  onChange,
  error,
}: {
  id: string;
  rooms: Room[];
  value: Room;
  onChange: (room: Room) => void;
  error?: string;
}) {
  const [now, setNow] = useState(0);
  useEffect(() => { const tick = () => setNow(Date.now()); const timer = setInterval(tick, 1000); tick(); return () => clearInterval(timer); }, []);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const q = normalize(query.trim());
  const matches = rooms
    .filter((r) => r.status === "active" && (!r.closureAt || new Date(r.closureAt).getTime() > now) && (!q || normalize(r.name).includes(q)))
    .sort((a, b) => (b.postCount ?? 0) - (a.postCount ?? 0) || a.name.localeCompare(b.name, "vi"));
  const visible = matches.slice(0, MAX_ROWS);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const toggle = () => {
    setOpen((v) => !v);
    setQuery("");
    setActive(0);
  };

  const choose = (room: Room) => {
    setOpen(false);
    if (room.id !== value.id) onChange(room);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") setOpen(false);
    else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, visible.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (visible[active]) choose(visible[active]);
    }
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        id={id}
        type="button"
        className={`${styles.trigger} ${error ? styles.invalid : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-describedby={error ? `${id}-error` : undefined}
        onClick={toggle}
      >
        <span className={styles.triggerName}>{value.name}</span>
        <span className={styles.meta}>{ROOM_TYPE_LABELS[value.roomType]}</span>
        <span aria-hidden className={styles.caret}>▾</span>
      </button>
      {open && (
        <div className={styles.panel} onKeyDown={onKeyDown}>
          <input
            autoFocus
            className={styles.search}
            placeholder="Tìm không gian…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            role="combobox"
            aria-controls={listId}
            aria-expanded="true"
            aria-activedescendant={visible[active] ? `${listId}-${visible[active].id}` : undefined}
          />
          <ul id={listId} role="listbox" className={styles.list}>
            {visible.length === 0 && <li className={styles.empty}>Không tìm thấy không gian phù hợp.</li>}
            {visible.map((room, i) => {
              const blocked = room.effectivePostPermission === "blocked";
              return (
                <li
                  key={room.id}
                  id={`${listId}-${room.id}`}
                  role="option"
                  aria-selected={room.id === value.id}
                  className={[
                    styles.option,
                    i === active ? styles.optionActive : "",
                    room.id === value.id ? styles.optionSelected : "",
                  ].join(" ")}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(room)}
                >
                  <span className={styles.optionName}>
                    {room.name}
                    {blocked && <span className={styles.blocked}> · không có quyền đăng</span>}
                  </span>
                  <span className={styles.meta}>
                    {ROOM_TYPE_LABELS[room.roomType]} · {room.postCount ?? 0} bài
                  </span>
                </li>
              );
            })}
          </ul>
          {matches.length > MAX_ROWS && (
            <p className={styles.more}>
              Còn {matches.length - MAX_ROWS} không gian khác, hãy gõ để tìm.
            </p>
          )}
        </div>
      )}
      {error && (
        <p id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
