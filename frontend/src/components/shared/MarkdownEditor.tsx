"use client";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import textareaStyles from "@/components/ui/Textarea.module.css";
import markdownStyles from "./Markdown.module.css";
import styles from "./MarkdownEditor.module.css";

type Edit = (selected: string) => { text: string; select?: [number, number] };

// Bọc vùng chọn bằng ký hiệu Markdown; không chọn gì thì chèn chữ mẫu và bôi đen nó.
const wrap = (mark: string, sample: string): Edit => (selected) => {
  const inner = selected || sample;
  return { text: `${mark}${inner}${mark}`, select: [mark.length, mark.length + inner.length] };
};

const TABLE_TEMPLATE = [
  "| Cột 1 | Cột 2 | Cột 3 |",
  "| --- | --- | --- |",
  "|  |  |  |",
  "|  |  |  |",
].join("\n");

interface Tool {
  label: string;
  title: string;
  shortcut?: string;
  /** Áp dụng cho từng dòng được chọn (tiêu đề, danh sách, trích dẫn). */
  linePrefix?: string | ((index: number) => string);
  edit?: Edit;
  block?: boolean;
  /** Chỉ có tác dụng khi đã bôi đen chữ (đổi chữ hoa/thường). */
  needsSelection?: boolean;
}

const TOOLS: Tool[][] = [
  [
    { label: "B", title: "In đậm (Ctrl+B)", shortcut: "b", edit: wrap("**", "chữ in đậm") },
    { label: "I", title: "In nghiêng (Ctrl+I)", shortcut: "i", edit: wrap("*", "chữ in nghiêng") },
    { label: "S", title: "Gạch ngang", edit: wrap("~~", "chữ gạch ngang") },
    { label: "H", title: "Tiêu đề", linePrefix: "## " },
  ],
  [
    { label: "AA", title: "Chuyển vùng chọn thành CHỮ IN HOA", needsSelection: true, edit: (s) => ({ text: s.toLocaleUpperCase("vi") }) },
    { label: "aa", title: "Chuyển vùng chọn thành chữ thường", needsSelection: true, edit: (s) => ({ text: s.toLocaleLowerCase("vi") }) },
  ],
  [
    { label: "•", title: "Danh sách", linePrefix: "- " },
    { label: "1.", title: "Danh sách đánh số", linePrefix: (i) => `${i + 1}. ` },
    { label: "❝", title: "Trích dẫn", linePrefix: "> " },
  ],
  [
    { label: "</>", title: "Mã nguồn", edit: (s) => s.includes("\n") || !s
        ? { text: "```\n" + (s || "mã nguồn") + "\n```", select: [4, 4 + (s || "mã nguồn").length] }
        : { text: "`" + s + "`" } },
    { label: "🔗", title: "Liên kết", shortcut: "k", edit: (s) => {
        const text = s || "văn bản";
        return { text: `[${text}](https://)`, select: [text.length + 3, text.length + 11] };
      } },
    { label: "⊞", title: "Chèn bảng", block: true, edit: () => ({ text: TABLE_TEMPLATE, select: [2, 7] }) },
  ],
];

/**
 * Ô soạn Markdown có thanh công cụ định dạng và tab xem trước.
 * Nội dung lưu dạng Markdown (GFM), hiển thị bằng ReactMarkdown + remark-gfm như trang bài viết.
 */
export function MarkdownEditor({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  placeholder,
  rows = 10,
  required,
  minLength,
  maxLength,
}: {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");

  // Thay vùng [start, end) bằng text. execCommand giữ lịch sử hoàn tác (Ctrl+Z) của trình duyệt.
  const replace = (start: number, end: number, text: string, select?: [number, number]) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(start, end);
    if (!document.execCommand("insertText", false, text)) {
      onChange(el.value.slice(0, start) + text + el.value.slice(end));
    }
    requestAnimationFrame(() => {
      const [a, b] = select ?? [text.length, text.length];
      el.setSelectionRange(start + a, start + b);
    });
  };

  const apply = (tool: Tool) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value: text } = el;

    if (tool.linePrefix) {
      const lineStart = text.lastIndexOf("\n", start - 1) + 1;
      const nextBreak = text.indexOf("\n", end);
      const lineEnd = nextBreak === -1 ? text.length : nextBreak;
      const lines = text.slice(lineStart, lineEnd).split("\n");
      const prefix = tool.linePrefix;
      const out = lines.map((line, i) => (typeof prefix === "string" ? prefix : prefix(i)) + line).join("\n");
      replace(lineStart, lineEnd, out, [out.length, out.length]);
      return;
    }
    if (!tool.edit) return;
    const selected = text.slice(start, end);
    if (tool.needsSelection && !selected) return;
    const result = tool.edit(selected);
    // Khối (bảng) cần đứng trên dòng riêng, cách đoạn văn phía trước một dòng trống.
    if (tool.block) {
      const before = text.slice(0, start);
      const lead = before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
      const trail = text.slice(end).startsWith("\n") ? "" : "\n";
      const sel = result.select ?? [result.text.length, result.text.length];
      replace(start, end, lead + result.text + trail, [sel[0] + lead.length, sel[1] + lead.length]);
      return;
    }
    replace(start, end, result.text, result.select);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    const tool = TOOLS.flat().find((t) => t.shortcut === event.key.toLowerCase());
    if (tool) {
      event.preventDefault();
      apply(tool);
    }
  };

  return (
    <div className={textareaStyles.wrapper}>
      {label && (
        <label htmlFor={id} className={textareaStyles.label}>
          {label}
          {required && <span className={textareaStyles.required} aria-hidden>*</span>}
        </label>
      )}
      <div className={`${styles.editor} ${error ? styles.invalid : ""}`}>
        <div className={styles.bar}>
          <div className={styles.tabs} role="tablist">
            <button type="button" role="tab" aria-selected={tab === "write"}
              className={tab === "write" ? styles.tabActive : styles.tab} onClick={() => setTab("write")}>
              Soạn thảo
            </button>
            <button type="button" role="tab" aria-selected={tab === "preview"}
              className={tab === "preview" ? styles.tabActive : styles.tab} onClick={() => setTab("preview")}>
              Xem trước
            </button>
          </div>
          {tab === "write" && (
            <div className={styles.toolbar} role="toolbar" aria-label="Định dạng nội dung">
              {TOOLS.map((group, gi) => (
                <div key={gi} className={styles.group}>
                  {group.map((tool) => (
                    <button
                      key={tool.title}
                      type="button"
                      className={styles.tool}
                      title={tool.title}
                      aria-label={tool.title}
                      // Giữ vùng chọn trong textarea khi bấm nút.
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => apply(tool)}
                    >
                      {tool.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        {tab === "write" ? (
          <textarea
            ref={ref}
            id={id}
            className={`${textareaStyles.textarea} ${styles.textarea}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            rows={rows}
            required={required}
            minLength={minLength}
            maxLength={maxLength}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          />
        ) : (
          <div className={`${styles.preview} ${markdownStyles.markdownBody}`}>
            {value.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            ) : (
              <p className={styles.empty}>Chưa có nội dung để xem trước.</p>
            )}
          </div>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className={textareaStyles.error} role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-hint`} className={textareaStyles.hint}>
          {hint}
        </p>
      )}
    </div>
  );
}
