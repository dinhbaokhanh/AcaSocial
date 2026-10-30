import { Avatar } from '@/components/ui/Avatar';
import type { UserRef } from '@/types';
import styles from './AuthorChip.module.css';

const ANIMALS = ['Cú mèo', 'Cáo nhỏ', 'Gấu trúc', 'Rái cá', 'Chim sẻ', 'Sóc nâu', 'Cá heo', 'Mèo mun', 'Hươu sao', 'Chim cánh cụt', 'Thỏ trắng', 'Rùa biển'];
const TRAITS = ['tò mò', 'chăm chỉ', 'thông thái', 'nhanh nhẹn', 'điềm tĩnh', 'sáng tạo', 'tinh ý', 'kiên nhẫn', 'vui vẻ', 'bí ẩn'];

/**
 * Nickname cố định theo seed để cùng một người ẩn danh giữ một tên trong một bài.
 * Hậu tố `number` do backend cấp theo thứ tự nên không trùng trong bài; nếu thiếu
 * thì suy ra từ seed (1–99), chỉ giảm chứ không loại hẳn khả năng trùng.
 */
export function anonymousNickname(seed: string, number?: number): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const animal = ANIMALS[hash % ANIMALS.length];
  const trait = TRAITS[Math.floor(hash / ANIMALS.length) % TRAITS.length];
  const suffix = number ?? (Math.floor(hash / (ANIMALS.length * TRAITS.length)) % 99) + 1;
  return `${animal} ${trait} ${suffix}`;
}

export function AuthorChip({
  author,
  isAnonymous,
  isMine,
  seed,
  anonymousNumber,
  size = 'sm',
}: {
  author?: UserRef;
  isAnonymous: boolean;
  isMine?: boolean;
  /** anonymousKey từ backend; fallback id nội dung nếu thiếu. */
  seed: string;
  anonymousNumber?: number;
  size?: 'xs' | 'sm';
}) {
  const name = isAnonymous ? anonymousNickname(seed, anonymousNumber) : (author?.fullName ?? 'Thành viên');

  return (
    <span className={`${styles.chip} ${styles[size]}`}>
      {isAnonymous ? (
        <span className={styles.anonymousMark} aria-hidden="true">AS</span>
      ) : (
        <Avatar src={author?.avatarUrl} alt={name} size={size} />
      )}
      <span className={styles.text}>
        <span className={styles.name}>{name}</span>
        {isAnonymous && <span className={styles.tag}>Người dùng ẩn danh</span>}
        {isMine && <span className={styles.tag}>Bạn</span>}
      </span>
    </span>
  );
}
