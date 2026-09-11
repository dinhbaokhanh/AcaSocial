function text(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

export function contextualBody(type: string, data: Record<string, unknown>): string | null {
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
  return null;
}
