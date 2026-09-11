"use client";

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

export default function CreatePostPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

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

  if (authLoading) {
    return <LoadingState label="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <div
          className={styles.formCard}
          style={{ textAlign: "center", padding: "48px 24px" }}
        >
          <h2 className={styles.title}>Sign in required</h2>
          <p className={styles.subtitle} style={{ marginBottom: "24px" }}>
            You need to be signed in to ask a question or start an academic
            discussion.
          </p>
          <div
            style={{ display: "flex", justifyContent: "center", gap: "12px" }}
          >
            <Link href="/login">
              <Button variant="primary">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline">Create Account</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleToggleTag = (tag: Tag) => {
    if (selectedTags.some((t) => t.id === tag.id)) {
      setSelectedTags(selectedTags.filter((t) => t.id !== tag.id));
    } else {
      if (selectedTags.length >= 5) {
        setError("You can select at most 5 tags.");
        return;
      }
      setError("");
      setSelectedTags([...selectedTags, tag]);
    }
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
      setError("Please enter a title.");
      return;
    }
    if (title.trim().length < 10) {
      setError("Title must be at least 10 characters long.");
      return;
    }
    if (!content.trim()) {
      setError("Please enter the content / details of your post.");
      return;
    }
    if (content.trim().length < 20) {
      setError("Content must be at least 20 characters long.");
      return;
    }
    if (selectedTags.length === 0) {
      setError("Please select at least 1 relevant tag.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const created = await discussionsApi.create({
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
          : "Failed to publish post. Please try again.",
      );
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          {postType === "question" ? "Ask a Question" : "Start a Discussion"}
        </h1>
        <p className={styles.subtitle}>
          Share knowledge, query professors and peers, or brainstorm academic
          topics.
        </p>
      </header>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        {error && (
          <div className={styles.errorAlert} role="alert">
            {error}
          </div>
        )}

        {/* Post Type Selector */}
        <div className={styles.typeSection}>
          <label className={styles.label}>Post Type</label>
          <div className={styles.typeGrid}>
            <button
              type="button"
              className={`${styles.typeOption} ${postType === "question" ? styles.typeOptionActive : ""}`}
              onClick={() => setPostType("question")}
            >
              <div className={styles.typeTitle}>
                <span>❓ Question</span>
              </div>
              <p className={styles.typeDesc}>
                Looking for a specific answer or solution to a
                coursework/research problem.
              </p>
            </button>

            <button
              type="button"
              className={`${styles.typeOption} ${postType === "discussion" ? styles.typeOptionActive : ""}`}
              onClick={() => setPostType("discussion")}
            >
              <div className={styles.typeTitle}>
                <span>💬 Discussion</span>
              </div>
              <p className={styles.typeDesc}>
                Open dialogue, scholarly debate, announcements, or sharing
                insights.
              </p>
            </button>
          </div>
        </div>

        {/* Title */}
        <Input
          id="post-title"
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            postType === "question"
              ? "e.g., How does backpropagation handle vanishing gradients in deep RNNs?"
              : "e.g., Perspectives on the recent ACM paper on zero-knowledge proofs"
          }
          hint="Be specific and imagine you are asking a question to another person."
          required
        />

        {/* Content */}
        <Textarea
          id="post-content"
          label="Details"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Provide all relevant details, formulas, context, or code snippets needed to understand your inquiry..."
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
          <label className={styles.label}>Tags (select 1 to 5)</label>
          <div className={styles.selectedTags}>
            {selectedTags.length === 0 ? (
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-muted)",
                }}
              >
                No tags selected yet. Pick from suggestions below.
              </span>
            ) : (
              selectedTags.map((tag) => (
                <span key={tag.id} className={styles.selectedTagChip}>
                  #{tag.name}
                  <button
                    type="button"
                    className={styles.tagRemoveBtn}
                    onClick={() => handleToggleTag(tag)}
                    aria-label={`Remove tag ${tag.name}`}
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
            placeholder="Search tags (e.g. machine-learning, calculus, network)..."
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
            Post anonymously (hide your identity from other students and
            faculty)
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
            Cancel
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
              ? "Publish Question"
              : "Publish Discussion"}
          </Button>
        </div>
      </form>
    </div>
  );
}
