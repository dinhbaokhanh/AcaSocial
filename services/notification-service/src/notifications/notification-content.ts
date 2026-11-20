function text(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

export function contextualBody(type: string, data: Record<string, unknown>): string | null {
  if (type === 'reputation.changed') {
    const delta = typeof data.delta === 'number' && Number.isInteger(data.delta) ? data.delta : 0;
    return delta > 0 ? `Bạn được ghi nhận thêm ${delta} điểm đóng góp. Xem lịch sử điểm để biết chi tiết.` : `Đã điều chỉnh ${delta} điểm do đóng góp không còn đủ điều kiện. Lịch sử điểm vẫn được giữ lại.`;
  }
  if (type === 'badge.awarded') return `Bạn vừa đạt huy hiệu ${text(data.badgeName) || 'đóng góp'}. Xem hồ sơ uy tín để biết phạm vi áp dụng.`;
  if (type === 'badge.revoked') return 'Một huy hiệu đóng góp không còn đủ ngưỡng điểm. Lịch sử đã đạt vẫn được giữ lại.';
  if (type.startsWith('room.')) {
    const messages: Record<string, string> = {
      'room.closure.scheduled': 'Một phòng bạn tham gia đã có lịch ngừng nhận nội dung mới. Mở phòng để xem chi tiết.',
      'room.closure.rescheduled': 'Lịch ngừng hoạt động của một phòng đã thay đổi. Mở phòng để xem lịch mới nhất.',
      'room.closure.cancelled': 'Lịch ngừng hoạt động của một phòng đã được hủy.',
      'room.closed': 'Một phòng đã chuyển sang chỉ đọc. Nội dung cũ được giữ lại.',
      'room.reopened': 'Một phòng đã được mở hoạt động trở lại.',
    };
    return messages[type] ?? 'Trạng thái phòng đã thay đổi.';
  }
  const title = text(data.discussionTitle ?? data.title).slice(0, 300);
  if (type === 'discussion.created' && title) {
    return `Bạn đã tạo bài viết “${title}”.`;
  }
  if (type === 'comment.created') {
    const actor = data.isAnonymous === true
      ? 'Người dùng ẩn danh'
      : text(data.actorName) || 'Một người dùng';
    const post = title ? `bài viết “${title}”` : 'bài viết của bạn';
    const preview = text(data.commentPreview).slice(0, 180);
    return `${actor} đã bình luận vào ${post}.${preview ? ` “${preview}”` : ''}`;
  }
  if (type === 'mention.created') {
    return title
      ? `Bạn được nhắc đến trong “${title}”.`
      : 'Bạn được nhắc đến trong một cuộc thảo luận.';
  }
  return null;
}
