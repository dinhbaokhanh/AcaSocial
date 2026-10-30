"use client";
import { useLinkSafety } from '@/components/shared/LinkSafety';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { discussionsApi } from "@/lib/api/discussions";
import { tagsApi } from "@/lib/api/tags";
import { academicApi } from "@/lib/api/academic";
import { Input } from "@/components/ui/Input";
import { MarkdownEditor } from "@/components/shared/MarkdownEditor";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/shared/LoadingState";
import { ApiRequestError } from "@/lib/api/client";
import type { Tag, PostType, TagSuggestion, MajorCourse, Room } from "@/types";
import styles from "./create-post.module.css";
import markdownStyles from "@/components/shared/Markdown.module.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AttachmentPicker } from "@/components/academic/Attachments";
import type { MediaUploadResponse } from "@/lib/api/media";
import { useRoom } from "@/lib/rooms/context";
import { RoomChooser } from "@/components/rooms/RoomChooser";
import { RoomPicker } from "@/components/rooms/RoomPicker";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/lib/toast/context";

const POST_TYPE_LABELS: Record<PostType, string> = {
  question: "Câu hỏi",
  discussion: "Thảo luận",
};

// --------------------------------------------------------------------------
// Bản nháp: giữ nội dung đang soạn khi tải lại trang, đổi không gian hoặc lưu thất bại.
// --------------------------------------------------------------------------
const DRAFT_KEY = "acasocial:post-draft:v1";

interface Draft {
  roomId?: string;
  postType: PostType;
  title: string;
  content: string;
  isAnonymous: boolean;
  tags: Tag[];
  files: MediaUploadResponse[];
  majorCourseId: string;
}

function readDraft(): Partial<Draft> {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeDraft(draft: Draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Trình duyệt chặn storage: bỏ qua, nội dung vẫn còn trong trang.
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

type FieldErrors = Partial<Record<"room" | "title" | "content" | "tags", string>>;

export default function CreatePostPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { rooms, selectedRoom, loading: roomsLoading, selectRoom } = useRoom();

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

  // Đổi không gian thì dựng lại form; nội dung đang soạn được khôi phục từ bản nháp.
  return (
    <PostComposer
      key={selectedRoom.id}
      room={selectedRoom}
      rooms={rooms}
      onSelectRoom={selectRoom}
    />
  );
}

function PostComposer({
  room,
  rooms,
  onSelectRoom,
}: {
  room: Room;
  rooms: Room[];
  onSelectRoom: (room: Room) => void;
}) {
  const confirmLinks = useLinkSafety();
  const router = useRouter();
  const toast = useToast();

  const [draft] = useState(readDraft);
  const [postType, setPostType] = useState<PostType>(draft.postType ?? "question");
  const [title, setTitle] = useState(draft.title ?? "");
  const [content, setContent] = useState(draft.content ?? "");
  const [isAnonymous, setIsAnonymous] = useState(draft.isAnonymous ?? false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>(draft.tags ?? []);
  const [files, setFiles] = useState<MediaUploadResponse[]>(draft.files ?? []);
  const [majorCourseId, setMajorCourseId] = useState(
    draft.roomId === room.id ? (draft.majorCourseId ?? "") : "",
  );

  const [step, setStep] = useState<"edit" | "review">("edit");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [tagError, setTagError] = useState("");
  const [tagRetry, setTagRetry] = useState(0);

  const [aiTags, setAiTags] = useState<TagSuggestion[]>([]);
  const [aiCandidates, setAiCandidates] = useState<TagSuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<{ kind: "info" | "error"; text: string } | null>(null);
  // Mọi tag AI từng gợi ý trong lúc soạn (tagId → score), gửi kèm khi đăng bài.
  const [aiShown, setAiShown] = useState<{ model: string; scores: Record<string, number> } | null>(null);

  const [courses, setCourses] = useState<MajorCourse[]>([]);

  const binding = room.academicBinding;
  const blocked = room.effectivePostPermission === "blocked";
  const tagsRequired = room.roomType === "major" || room.roomType === "course";
  const fixedCourse = binding?.majorCourseId
    ? courses.find((c) => c.id === binding.majorCourseId)
    : undefined;
  const chosenCourse = courses.find((c) => c.id === majorCourseId);

  // Bước 4: ghi nhận dữ liệu đang soạn.
  useEffect(() => {
    writeDraft({
      roomId: room.id,
      postType,
      title,
      content,
      isAnonymous,
      tags: selectedTags,
      files,
      majorCourseId,
    });
  }, [room.id, postType, title, content, isAnonymous, selectedTags, files, majorCourseId]);

  // Danh mục tag chuẩn; trong room môn, tag của môn đó được xếp lên đầu.
  const roomCourseId = binding?.courseId ?? null;
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      tagsApi
        .list(1, 50, tagSearch.trim(), roomCourseId)
        .then((res) => {
          if (active) {
            setAllTags(res.data);
            setTagError("");
          }
        })
        .catch(() => {
          if (active) setTagError("Không tải được danh mục tag. Hãy thử lại.");
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [tagSearch, tagRetry, roomCourseId]);

  // Môn học của ngành mà không gian đang gắn, để chọn ngữ cảnh học thuật.
  useEffect(() => {
    if (!binding?.majorId) return;
    let active = true;
    academicApi
      .majorCourses(binding.majorId)
      .then((list) => {
        if (active) setCourses(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [binding?.majorId]);

  const handleToggleTag = (tag: Tag) => {
    setSelectedTags((current) => {
      if (current.some((item) => item.id === tag.id))
        return current.filter((item) => item.id !== tag.id);
      if (current.length >= 5) {
        setFieldErrors((e) => ({ ...e, tags: "Bạn có thể chọn tối đa 5 tag." }));
        return current;
      }
      setFieldErrors((e) => ({ ...e, tags: undefined }));
      return [...current, tag];
    });
  };

  // Bước 5: người dùng chủ động gọi AI gợi ý tag.
  const handleSuggestTags = async () => {
    if (content.trim().length < 20) {
      setAiMessage({ kind: "info", text: "Hãy viết nội dung ít nhất 20 ký tự để AI có đủ thông tin gợi ý tag." });
      return;
    }
    setAiLoading(true);
    setAiMessage(null);
    try {
      const res = await discussionsApi.suggestTags({ title: title.trim(), content: content.trim() });
      if (!res.available || !res.model) {
        setAiTags([]);
        setAiCandidates([]);
        setAiMessage({ kind: "error", text: "AI gợi ý tag đang gặp lỗi. Nội dung của bạn vẫn được giữ nguyên, hãy chọn tag từ danh mục bên dưới." });
        return;
      }
      // Ứng viên ngoài gợi ý chính. Bài bị coi là lạc đề thì chỉ hiện ứng viên trong room ngành/môn,
      // nơi bài gần như chắc chắn thuộc một môn; ở room diễn đàn chúng thường là nhiễu.
      const others = (res.candidates ?? []).filter((c) => !res.tags.some((t) => t.tag.id === c.tag.id));
      const shownCandidates = res.tags.length > 0 || tagsRequired ? others : [];
      setAiTags(res.tags);
      setAiCandidates(shownCandidates);
      if (res.tags.length === 0) {
        setAiMessage({
          kind: "info",
          text: shownCandidates.length
            ? "AI chưa chắc bài thuộc môn nào. Bạn xem các tag có thể liên quan bên dưới hoặc chọn từ danh mục."
            : "AI không tìm thấy tag phù hợp với nội dung này. Bạn hãy chọn tag từ danh mục.",
        });
      }
      const shown = [...res.tags, ...shownCandidates];
      if (!shown.length) return;
      const model = res.model;
      setAiShown((prev) => ({
        model,
        scores: {
          ...(prev?.model === model ? prev.scores : {}),
          ...Object.fromEntries(shown.map((s) => [s.tag.id, s.score])),
        },
      }));
    } catch {
      setAiTags([]);
      setAiCandidates([]);
      setAiMessage({ kind: "error", text: "AI gợi ý tag đang gặp lỗi. Nội dung của bạn vẫn được giữ nguyên, hãy chọn tag từ danh mục bên dưới." });
    } finally {
      setAiLoading(false);
    }
  };

  const pendingAiTags = aiTags.filter(
    (s) => !selectedTags.some((st) => st.id === s.tag.id),
  );
  const pendingCandidates = aiCandidates.filter(
    (s) => !selectedTags.some((st) => st.id === s.tag.id),
  );

  const filteredTags = allTags.filter(
    (t) =>
      !selectedTags.some((st) => st.id === t.id) &&
      (tagSearch.trim() === "" ||
        t.name.toLowerCase().includes(tagSearch.toLowerCase()) ||
        t.slug.toLowerCase().includes(tagSearch.toLowerCase())),
  );

  // Ngoại lệ 7.1–7.2 và 3.1–3.2: đánh dấu các trường cần bổ sung.
  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (blocked) errors.room = "Bạn không có quyền đăng bài trong không gian này. Hãy chọn không gian khác.";
    const t = title.trim();
    if (!t) errors.title = "Vui lòng nhập tiêu đề.";
    else if (t.length < 10) errors.title = "Tiêu đề phải có ít nhất 10 ký tự.";
    else if (t.length > 300) errors.title = "Tiêu đề tối đa 300 ký tự.";
    const c = content.trim();
    if (!c) errors.content = "Vui lòng nhập nội dung bài đăng.";
    else if (c.length < 20) errors.content = "Nội dung phải có ít nhất 20 ký tự.";
    if (tagsRequired && selectedTags.length === 0)
      errors.tags = "Chọn ít nhất một tag từ danh mục hoặc dùng AI gợi ý tag.";
    return errors;
  };

  // Bước 7: xem lại trước khi gửi.
  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) {
      setError("Đang tải hoặc kiểm tra tệp đính kèm, hãy đợi hoàn tất hoặc gỡ tệp lỗi.");
      return;
    }
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError("Bài đăng còn thiếu thông tin. Hãy bổ sung các trường được đánh dấu.");
      return;
    }
    setError("");
    setStep("review");
  };

  // Bước 8: gửi bài; hệ thống kiểm tra lại quyền, tag, tệp và lưu bài.
  const handleSubmit = async () => {
    if (loading) return;
    if (!(await confirmLinks(title + "\n" + content))) return;
    setLoading(true);
    setError("");
    try {
      const created = await discussionsApi.create({
        roomId: room.id,
        majorCourseId: room.roomType === "major" && majorCourseId ? majorCourseId : undefined,
        title: title.trim(),
        content: content.trim(),
        postType,
        tagIds: selectedTags.map((t) => t.id),
        isAnonymous,
        mediaIds: files.map((file) => file.id),
        aiSuggestion: aiShown
          ? {
              model: aiShown.model,
              tags: Object.entries(aiShown.scores)
                .slice(0, 20)
                .map(([tagId, score]) => ({ tagId, score })),
            }
          : undefined,
      });
      clearDraft();
      if (created.visibility === "held")
        toast.info("Bài viết đã được gửi", "Bài đang chờ người quản lý không gian duyệt trước khi hiển thị.");
      else if (files.length)
        toast.success("Đã đăng bài viết", "Bài sẽ hiển thị sau khi tệp đính kèm được kiểm tra xong.");
      else toast.success("Đã đăng bài viết");
      router.push(`/posts/${created.id}`);
    } catch (err) {
      setLoading(false);
      if (err instanceof ApiRequestError && err.status === 403) {
        setFieldErrors({ room: `${err.message} Hãy chọn không gian khác.` });
        setError(err.message);
        setStep("edit");
        return;
      }
      if (err instanceof ApiRequestError && err.status === 400) {
        setError(`${err.message} Hãy kiểm tra lại bài viết.`);
        setStep("edit");
        return;
      }
      // Ngoại lệ 7.2: không lưu được, giữ nội dung để gửi lại.
      setError(
        `Không lưu được bài viết${err instanceof ApiRequestError ? `: ${err.message}` : ""}. Nội dung đang soạn vẫn được giữ, bạn hãy thử gửi lại.`,
      );
    }
  };

  const roomHint = blocked
    ? null
    : room.effectivePostPermission === "approval"
      ? "Bài đăng sẽ được gửi vào hàng chờ duyệt của không gian."
      : "Bài đăng sẽ hiển thị ngay sau khi tệp đính kèm (nếu có) được kiểm tra.";

  const contextLabel = fixedCourse
    ? fixedCourse.course.name
    : chosenCourse
      ? chosenCourse.course.name
      : null;

  if (step === "review") {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Xem lại bài đăng</h1>
          <p className={styles.subtitle}>Kiểm tra thông tin trước khi gửi. Bạn có thể quay lại chỉnh sửa.</p>
        </header>
        <div className={styles.formCard}>
          {error && (
            <div className={styles.errorAlert} role="alert">
              {error}
            </div>
          )}
          <dl className={styles.review}>
            <dt>Không gian</dt>
            <dd>{room.name}</dd>
            <dt>Loại bài</dt>
            <dd>{POST_TYPE_LABELS[postType]}</dd>
            {contextLabel && (
              <>
                <dt>Môn học</dt>
                <dd>{contextLabel}</dd>
              </>
            )}
            <dt>Chế độ đăng</dt>
            <dd>{isAnonymous ? "Ẩn danh" : "Thông thường"}</dd>
            <dt>Tag</dt>
            <dd>{selectedTags.length ? selectedTags.map((t) => `#${t.name}`).join(", ") : "Không có"}</dd>
            <dt>Tệp đính kèm</dt>
            <dd>{files.length ? `${files.length} tệp` : "Không có"}</dd>
          </dl>
          <div className={styles.reviewPost}>
            <h2 className={styles.reviewTitle}>{title.trim()}</h2>
            <div className={`${styles.reviewContent} ${markdownStyles.markdownBody}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content.trim()}</ReactMarkdown>
            </div>
          </div>
          <div className={styles.actions}>
            <Button type="button" variant="ghost" onClick={() => setStep("edit")} disabled={loading}>
              Chỉnh sửa
            </Button>
            <Button type="button" variant="primary" loading={loading} onClick={handleSubmit}>
              {loading ? "Đang gửi…" : "Gửi bài"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

      <form className={styles.formCard} onSubmit={handleReview} noValidate>
        {error && (
          <div className={styles.errorAlert} role="alert">
            {error}
          </div>
        )}

        {/* Bước 3: không gian, loại bài, ngữ cảnh học thuật */}
        <div className={styles.roomSection}>
          <label className={styles.label} htmlFor="post-room">Không gian đăng bài (bắt buộc)</label>
          <RoomPicker
            id="post-room"
            rooms={rooms}
            value={room}
            error={fieldErrors.room}
            onChange={onSelectRoom}
          />
          {blocked ? (
            <p className={styles.warningAlert} role="alert">
              Bạn không có quyền đăng bài trong không gian này. Hãy chọn không gian khác.
            </p>
          ) : (
            <p className={styles.roomHint}>{roomHint}</p>
          )}
        </div>

        {fixedCourse && (
          <p className={styles.roomHint}>
            Môn học: <strong>{fixedCourse.course.name}</strong> (theo không gian đã chọn)
          </p>
        )}
        {room.roomType === "major" && courses.length > 0 && (
          <div className={styles.roomSection}>
            <label className={styles.label} htmlFor="post-course">Môn học liên quan (không bắt buộc)</label>
            <Select
              id="post-course"
              value={majorCourseId}
              options={[
                { value: "", label: "Không chọn môn cụ thể" },
                ...courses.map((c) => ({ value: c.id, label: c.course.name })),
              ]}
              onChange={(event) => setMajorCourseId(event.target.value)}
            />
          </div>
        )}

        <div className={styles.typeSection}>
          <label className={styles.label}>Loại bài đăng</label>
          <div className={styles.typeGrid}>
            <button
              type="button"
              className={`${styles.typeOption} ${postType === "question" ? styles.typeOptionActive : ""}`}
              onClick={() => setPostType("question")}
              aria-pressed={postType === "question"}
            >
              <div className={styles.typeTitle}>
                <span>Hỏi đáp</span>
              </div>
              <p className={styles.typeDesc}>
                Đặt câu hỏi cần lời giải về môn học hoặc nghiên cứu.
              </p>
            </button>

            <button
              type="button"
              className={`${styles.typeOption} ${postType === "discussion" ? styles.typeOptionActive : ""}`}
              onClick={() => setPostType("discussion")}
              aria-pressed={postType === "discussion"}
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

        <Input
          id="post-title"
          label="Tiêu đề"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setFieldErrors((f) => ({ ...f, title: undefined }));
          }}
          placeholder={
            postType === "question"
              ? "Nhập câu hỏi bạn muốn trao đổi"
              : "Nhập tiêu đề bài thảo luận"
          }
          hint="Viết tiêu đề rõ ràng, thể hiện nội dung chính của bài đăng."
          error={fieldErrors.title}
          required
        />

        <MarkdownEditor
          id="post-content"
          label="Nội dung"
          value={content}
          onChange={(value) => {
            setContent(value);
            setFieldErrors((f) => ({ ...f, content: undefined }));
          }}
          placeholder="Mô tả vấn đề, bối cảnh và ví dụ để người đọc có thể trao đổi hoặc trả lời."
          hint="Hỗ trợ Markdown: in đậm, in nghiêng, bảng, mã nguồn… Nội dung được tự động lưu nháp."
          error={fieldErrors.content}
          rows={12}
          required
        />

        {/* Bước 5: tag (danh mục chuẩn hoặc AI gợi ý) */}
        <div className={styles.tagSection}>
          <label className={styles.label}>
            Tag chủ đề ({tagsRequired ? "bắt buộc" : "không bắt buộc"}, tối đa 5)
          </label>
          <div className={`${styles.selectedTags} ${fieldErrors.tags ? styles.fieldInvalid : ""}`}>
            {selectedTags.length === 0 ? (
              <span className={styles.emptyHint}>
                Chọn tag để người đọc dễ tìm bài đăng.
              </span>
            ) : (
              selectedTags.map((tag) => (
                <span key={tag.id} className={styles.selectedTagChip}>
                  #{tag.name}
                  <button
                    type="button"
                    className={styles.tagRemoveBtn}
                    onClick={() => handleToggleTag(tag)}
                    aria-label={`Bỏ tag ${tag.name}`}
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
          {fieldErrors.tags && (
            <p className={styles.fieldError} role="alert">{fieldErrors.tags}</p>
          )}

          <div className={styles.aiSuggestions} aria-live="polite">
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={aiLoading}
              onClick={handleSuggestTags}
            >
              {aiLoading ? "AI đang gợi ý…" : "AI gợi ý tag"}
            </Button>
            {pendingAiTags.map((s) => (
              <button
                key={s.tag.id}
                type="button"
                className={styles.aiTag}
                onClick={() => handleToggleTag(s.tag)}
                title="Thêm tag do AI gợi ý"
              >
                + #{s.tag.name}
              </button>
            ))}
          </div>
          {pendingCandidates.length > 0 && (
            <div className={styles.aiSuggestions}>
              <span className={styles.aiLabel}>Có thể liên quan:</span>
              {pendingCandidates.map((s) => (
                <button
                  key={s.tag.id}
                  type="button"
                  className={styles.suggestionTag}
                  onClick={() => handleToggleTag(s.tag)}
                  title="Thêm tag có thể liên quan do AI xếp hạng"
                >
                  + #{s.tag.name}
                </button>
              ))}
            </div>
          )}
          {aiMessage && (
            <p
              className={aiMessage.kind === "error" ? styles.warningAlert : styles.roomHint}
              role={aiMessage.kind === "error" ? "alert" : "status"}
            >
              {aiMessage.text}
            </p>
          )}

          {tagError && (
            <p role="alert" className={styles.fieldError}>
              {tagError}{" "}
              <button type="button" onClick={() => setTagRetry((v) => v + 1)}>
                Thử lại
              </button>
            </p>
          )}
          <Input
            id="tag-filter"
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
            placeholder="Tìm trong danh mục tag…"
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

        <AttachmentPicker
          files={files}
          onChange={setFiles}
          onBusy={setUploading}
        />

        {/* Bước 6: chế độ đăng */}
        <div className={styles.typeSection}>
          <label className={styles.label}>Chế độ đăng</label>
          <div className={styles.typeGrid}>
            <button
              type="button"
              className={`${styles.typeOption} ${!isAnonymous ? styles.typeOptionActive : ""}`}
              onClick={() => setIsAnonymous(false)}
              aria-pressed={!isAnonymous}
            >
              <div className={styles.typeTitle}>
                <span>Thông thường</span>
              </div>
              <p className={styles.typeDesc}>Hiển thị tên của bạn cùng bài đăng.</p>
            </button>
            <button
              type="button"
              className={`${styles.typeOption} ${isAnonymous ? styles.typeOptionActive : ""}`}
              onClick={() => setIsAnonymous(true)}
              aria-pressed={isAnonymous}
            >
              <div className={styles.typeTitle}>
                <span>Ẩn danh</span>
              </div>
              <p className={styles.typeDesc}>Ẩn danh tính của bạn với người dùng khác.</p>
            </button>
          </div>
        </div>

        <div className={styles.actions}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
          >
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={uploading}>
            Xem lại bài
          </Button>
        </div>
      </form>
    </div>
  );
}
