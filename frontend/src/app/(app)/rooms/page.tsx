"use client";
import Link from "next/link";
import { useRoom } from "@/lib/rooms/context";
export default function RoomsPage() {
  const { rooms, loading, error } = useRoom();
  return (
    <section>
      <h1>Tra cứu room</h1>
      <p>Các room chỉ đọc và lưu trữ vẫn giữ bài đăng theo quyền truy cập.</p>
      {loading && <p>Đang tải…</p>}
      {error && <p role="alert">{error}</p>}
      <ul>
        {rooms.map((room) => (
          <li key={room.id}>
            <Link href={`/rooms/${room.id}`}>{room.name}</Link> · {room.status}
          </li>
        ))}
      </ul>
    </section>
  );
}
