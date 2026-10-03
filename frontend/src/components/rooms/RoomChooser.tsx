'use client';

import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/shared/LoadingState';
import { useRoom } from '@/lib/rooms/context';
import type { RoomType } from '@/types';
import styles from './RoomChooser.module.css';

const GROUPS: Array<{ type: RoomType; label: string; description: string }> = [
  { type: 'major', label: 'Ngành học', description: 'Trao đổi cùng người học trong ngành.' },
  { type: 'course', label: 'Môn học', description: 'Câu hỏi và thảo luận theo môn học.' },
  { type: 'event', label: 'Sự kiện', description: 'Hội thảo, cuộc thi và hoạt động có thời hạn.' },
  { type: 'forum', label: 'Trao đổi chung', description: 'Cộng đồng chung và các chủ đề tự quản.' },
];

export function RoomChooser() {
  const { rooms, loading, error, selectRoom, refresh } = useRoom();
  if (loading) return <LoadingState label="Đang tải phòng thảo luận…" />;

  return (
    <section className={styles.wrap} aria-labelledby="room-title">
      <header className={styles.header}>
        <span className={styles.eyebrow}>Cộng đồng AcaSocial</span>
        <h1 id="room-title">Chọn phòng để xem bài đăng</h1>
        <p>
          Chọn ngành học, môn học hoặc nhóm trao đổi bạn quan tâm.
        </p>
      </header>

      {error && (
        <div className={styles.error} role="alert">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => void refresh()}>Thử lại</Button>
        </div>
      )}

      {!error && rooms.length === 0 && (
        <div className={styles.empty}>
          Chưa có phòng thảo luận đang hoạt động.
        </div>
      )}

      {GROUPS.map((group) => {
        const items = rooms.filter(
          (room) => room.roomType === group.type && room.status === 'active',
        );
        if (!items.length) return null;
        return (
          <div className={styles.group} key={group.type}>
            <div className={styles.groupHeading}>
              <h2>{group.label}</h2>
              <p>{group.description}</p>
            </div>
            <div className={styles.grid}>
              {items.map((room) => (
                <button
                  type="button"
                  key={room.id}
                  className={styles.room}
                  onClick={() => selectRoom(room)}
                >
                  <span className={styles.roomType}>{group.label}</span>
                  <strong>{room.name}</strong>
                  {room.description && <span>{room.description}</span>}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
