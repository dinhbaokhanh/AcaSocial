"use client";
import { ROOM_TYPE_LABELS } from '@/lib/constants';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { discussionsApi } from "@/lib/api/discussions";
import { tagsApi } from "@/lib/api/tags";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/shared/LoadingState";
import { ApiRequestError } from "@/lib/api/client";
import type { Tag, PostType } from "@/types";
import styles from "./create-post.module.css";
import { AttachmentPicker } from "@/components/academic/Attachments";
import type { MediaUploadResponse } from "@/lib/api/media";
import { useRoom } from "@/lib/rooms/context";
import { RoomChooser } from "@/components/rooms/RoomChooser";
import { Select } from "@/components/ui/Select";

export default function CreatePostPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { rooms, selectedRoom, loading: roomsLoading, selectRoom } = useRoom();

  const [postType, setPostType] = useState<PostType>("question");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<MediaUploadResponse[]>([]);
  const [uploading, setUploading] = useState(false);
  const [tagError, setTagError] = useState("");
  const [tagRetry, setTagRetry] = useState(0);

  // Fetch available tags on mount
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      tagsApi
        .list(1, 50, tagSearch.trim())
        .then((res) => {
          if (active) {
            setAllTags(res.data);
            setTagError("");
          }
        })
        .catch(() => {
          if (active) setTagError("Không tải được tag. Hãy thử lại.");
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [tagSearch, tagRetry]);

  if (authLoading || roomsLoading) {
    return <LoadingState label="Đang kiểm tra đăng nhập…" />;
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <div
          className={styles.formCard}
          style={{ textAlign: "center", padding: "48px 24px" }}
        >
          <h2 className={styles.title}>Bạn cần đăng nhập</h2>
          <p className={styles.subtitle} style={{ marginBottom: "24px" }}>
            Đăng nhập để đặt câu hỏi hoặc tạo bài thảo luận.
          </p>
          <div
            style={{ display: "flex", justifyContent: "center", gap: "12px" }}
          >
            <Link href="/login">
              <Button variant="primary">Đăng nhập</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline">Tạo tài khoản</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedRoom) return <RoomChooser />;

  const handleToggleTag = (tag: Tag) => {
    setSelectedTags((current) => {
      if (current.some((item) => item.id === tag.id))
        return current.filter((item) => item.id !== tag.id);
      if (current.length >= 5) {
        setError("Bạn có thể chọn tối đa 5 thẻ chủ đề.");
        return current;
      }
      setError("");
      return [...current, tag];
    });
  };

  const filteredTags = allTags.filter(
    (t) =>
      !selectedTags.some((st) => st.id === t.id) &&
      (tagSearch.trim() === "" ||
        t.name.toLowerCase().includes(tagSearch.toLowerCase()) ||
        t.slug.toLowerCase().includes(tagSearch.toLowerCase())),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) return;
    if (!title.trim()) {
      setError("Vui lòng nhập tiêu đề.");
      return;
    }
    if (title.trim().length < 10) {
      setError("Tiêu đề phải có ít nhất 10 ký tự.");
      return;
    }
    if (!content.trim()) {
      setError("Vui lòng nhập nội dung bài đăng.");
      return;
    }
    if (content.trim().length < 20) {
      setError("Nội dung phải có ít nhất 20 ký tự.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const created = await discussionsApi.create({
        roomId: selectedRoom.id,
        title: title.trim(),
        content: content.trim(),
        postType,
        tagIds: selectedTags.map((t) => t.id),
        isAnonymous,
        mediaIds: files.map((file) => file.id),
      });
      router.push(`/posts/${created.id}`);
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Không thể gửi bài đăng. Vui lòng thử lại.",
      );
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          {postType === "question" ? "Đặt câu hỏi" : "Tạo bài thảo luận"}
        </h1>
        <p className={styles.subtitle}>
          Trao đổi kiến thức, đặt câu hỏi và thảo luận cùng sinh viên, giảng viên.
        </p>
      </header>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        {error && (
          <div className={styles.errorAlert} role="alert">
            {error}
          </div>
        )}

        <div className={styles.roomSection}>
          <label className={styles.label} htmlFor="post-room">Phòng thảo luận (bắt buộc)</label>
          <Select
            id="post-room"
            value={selectedRoom.id}
            options={rooms
              .filter((room) => room.status === "active")
              .map((room) => ({ value: room.id, label: `${room.name} · ${ROOM_TYPE_LABELS[room.roomType]}` }))}
            onChange={(event) => {
              const room = rooms.find((item) => item.id === event.target.value);
              if (room) selectRoom(room);
            }}
          />
          <p className={styles.roomHint}>
            Bài đăng sẽ hiển thị trong {selectedRoom.name} sau khi được duyệt.
          </p>
        </div>

        {/* Post Type Selector */}
        <div className={styles.typeSection}>
          <label className={styles.label}>Loại bài đăng</label>
          <div className={styles.typeGrid}>
            <button
              type="button"
              className={`${styles.typeOption} ${postType === "question" ? styles.typeOptionActive : ""}`}
              onClick={() => setPostType("question")}
            >
              <div className={styles.typeTitle}>
                <span>Câu hỏi</span>
              </div>
              <p className={styles.typeDesc}>
                Đặt câu hỏi cần lời giải về môn học hoặc nghiên cứu.
              </p>
            </button>

            <button
              type="button"
              className={`${styles.typeOption} ${postType === "discussion" ? styles.typeOptionActive : ""}`}
              onClick={() => setPostType("discussion")}
            >
              <div className={styles.typeTitle}>
                <span>Thảo luận</span>
              </div>
              <p className={styles.typeDesc}>
                Trao đổi ý kiến, chia sẻ kiến thức hoặc thông tin học tập.
              </p>
            </button>
          </div>
        </div>

        {/* Title */}
        <Input
          id="post-title"
          label="Tiêu đề"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            postType === "question"
              ? "Nhập câu hỏi bạn muốn trao đổi"
              : "Nhập tiêu đề bài thảo luận"
          }
          hint="Viết tiêu đề rõ ràng, thể hiện nội dung chính của bài đăng."
          required
        />

        {/* Content */}
        <Textarea
          id="post-content"
          label="Nội dung"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Mô tả vấn đề, bối cảnh và ví dụ để người đọc có thể trao đổi hoặc trả lời."
          rows={10}
          required
        />

        {/* Tag Selection */}
        <AttachmentPicker
          files={files}
          onChange={setFiles}
          onBusy={setUploading}
        />
        <div className={styles.tagSection}>
          {tagError && (
            <p role="alert">
              {tagError}{" "}
              <button type="button" onClick={() => setTagRetry((v) => v + 1)}>
                Thử lại
              </button>
            </p>
          )}
          <label className={styles.label}>Thẻ chủ đề (bắt buộc, tối đa 5)</label>
          <div className={styles.selectedTags}>
            {selectedTags.length === 0 ? (
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-muted)",
                }}
              >
                Chọn ít nhất một thẻ để người đọc dễ tìm bài đăng.
              </span>
            ) : (
              selectedTags.map((tag) => (
                <span key={tag.id} className={styles.selectedTagChip}>
                  #{tag.name}
                  <button
                    type="button"
                    className={styles.tagRemoveBtn}
                    onClick={() => handleToggleTag(tag)}
                    aria-label={`Bỏ thẻ ${tag.name}`}
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>

          <Input
            id="tag-filter"
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
            placeholder="Tìm thẻ chủ đề…"
          />

          {filteredTags.length > 0 && (
            <div className={styles.tagSuggestions}>
              {filteredTags.slice(0, 20).map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={styles.suggestionTag}
                  onClick={() => handleToggleTag(tag)}
                >
                  + #{tag.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Anonymous Option */}
        <label className={styles.anonCheckbox}>
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
          />
          <span>
            Đăng ẩn danh (ẩn danh tính với người dùng khác)
          </span>
        </label>

        {/* Actions */}
        <div className={styles.actions}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={loading}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={
              loading ||
              uploading ||
              !title.trim() ||
              !content.trim() ||
              selectedTags.length === 0
            }
          >
            {postType === "question"
              ? "Gửi câu hỏi để duyệt"
              : "Gửi bài thảo luận để duyệt"}
          </Button>
        </div>
      </form>
    </div>
  );
}
