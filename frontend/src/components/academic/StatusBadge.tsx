import type { PostStatus } from '@/types';
import { Badge } from '@/components/ui/Badge';

interface StatusBadgeProps {
  status: PostStatus;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<PostStatus, { label: string; variant: 'verified' | 'warning' | 'muted'; icon: string }> = {
  solved:   { label: 'Đã có lời giải',   variant: 'verified', icon: '✓' },
  closed:   { label: 'Đã đóng',   variant: 'warning',  icon: '⊘' },
  open:     { label: 'Đang mở',     variant: 'muted',    icon: '' },
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const { label, variant, icon } = STATUS_CONFIG[status];
  if (status === 'open') return null; // Open is the default state — no badge needed

  return (
    <Badge variant={variant} size={size}>
      {icon && <span aria-hidden="true">{icon} </span>}
      {label}
    </Badge>
  );
}
