'use client';

import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/shared/LoadingState';
import { useRoom } from '@/lib/rooms/context';
import type { RoomType } from '@/types';
import styles from './RoomChooser.module.css';

const GROUPS: Array<{ type: RoomType; label: string; description: string }> = [
  { type: 'major', label: 'Chuyên ngành', description: 'Cộng đồng chính thức theo chuyên ngành.' },
  { type: 'course', label: 'Môn học', description: 'Hỏi đáp và kiến thức theo từng môn.' },
  { type: 'event', label: 'Sự kiện', description: 'Seminar, cuộc thi và hoạt động có thời hạn.' },
  { type: 'forum', label: 'General & ngoài lề', description: 'Cộng đồng chung và các chủ đề tự quản.' },
];

export function RoomChooser() {
  const { rooms, loading, error, selectRoom, refresh } = useRoom();
  if (loading) return <LoadingState label="Đang tải room..." />;

  return (
    <section className={styles.wrap} aria-labelledby="room-title">
      <header className={styles.header}>
        <span className={styles.eyebrow}>AcaSocial communities</span>
        <h1 id="room-title">Chọn room trước khi tham gia</h1>
        <p>
          Feed chỉ hiển thị nội dung của room bạn chọn, tránh trộn bài học thuật,
          sự kiện và nội dung ngoài lề vào cùng một nơi.
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
          Chưa có room đang hoạt động. Admin cần tạo Major, Course hoặc General room trước.
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
                  <span className={styles.roomType}>{room.roomType}</span>
                  <strong>{room.name}</strong>
                  <span>{room.description || `r/${room.slug}`}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
