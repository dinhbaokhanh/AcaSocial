"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { externalLinks } from "@/lib/link-safety";
import { Button } from "@/components/ui/Button";
import styles from "./LinkSafety.module.css";

const Context = createContext<(text: string) => Promise<boolean>>(
  async () => true,
);
export const useLinkSafety = () => useContext(Context);

export function LinkSafety({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<{
    links: string[];
    mode: "send" | "open";
  } | null>(null);
  const resolve = useRef<((allowed: boolean) => void) | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const finish = useCallback((allowed: boolean) => {
    dialog.current?.close();
    resolve.current?.(allowed);
    resolve.current = null;
    setRequest(null);
    previousFocus.current?.focus();
  }, []);
  const ask = useCallback((links: string[], mode: "send" | "open") => {
    if (!links.length) return Promise.resolve(true);
    resolve.current?.(false);
    previousFocus.current = document.activeElement as HTMLElement;
    setRequest({ links, mode });
    return new Promise<boolean>((done) => {
      resolve.current = done;
    });
  }, []);
  useEffect(() => {
    if (request && !dialog.current?.open) dialog.current?.showModal();
  }, [request]);
  useEffect(() => () => resolve.current?.(false), []);
  const confirmSend = useCallback(
    (text: string) => ask(externalLinks(text, window.location.origin), "send"),
    [ask],
  );
  return (
    <Context.Provider value={confirmSend}>
      <div
        onClickCapture={(event) => {
          const anchor = (event.target as HTMLElement).closest("a[href]");
          if (!(anchor instanceof HTMLAnchorElement)) return;
          let url: URL;
          try {
            url = new URL(anchor.href, window.location.origin);
          } catch {
            return;
          }
          if (
            !["http:", "https:"].includes(url.protocol) ||
            url.origin === window.location.origin
          )
            return;
          event.preventDefault();
          event.stopPropagation();
          const newTab =
            anchor.target === "_blank" ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey;
          void ask([url.href], "open").then((allowed) => {
            if (allowed) {
              if (newTab)
                window.open(url.href, "_blank", "noopener,noreferrer");
              else window.location.assign(url.href);
            }
          });
        }}
        onAuxClickCapture={(event) => {
          const anchor = (event.target as HTMLElement).closest("a[href]");
          if (event.button !== 1 || !(anchor instanceof HTMLAnchorElement))
            return;
          const url = new URL(anchor.href, window.location.origin);
          if (
            ["http:", "https:"].includes(url.protocol) &&
            url.origin !== window.location.origin
          ) {
            event.preventDefault();
            void ask([url.href], "open").then((allowed) => {
              if (allowed)
                window.open(url.href, "_blank", "noopener,noreferrer");
            });
          }
        }}
      >
        {children}
      </div>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="link-warning-title"
        onCancel={(event) => {
          event.preventDefault();
          finish(false);
        }}
      >
        <div className={styles.icon} aria-hidden="true">
          ↗
        </div>
        <h2 id="link-warning-title">
          {request?.mode === "send"
            ? "Kiểm tra liên kết trước khi gửi"
            : "Bạn sắp mở liên kết bên ngoài"}
        </h2>
        <p>
          Hãy kiểm tra tên miền và địa chỉ đích. AcaSocial chưa xác minh độ an
          toàn của các liên kết này.
        </p>
        <ul className={styles.links}>
          {request?.links.map((link) => (
            <li key={link}>
              <strong>{new URL(link).hostname}</strong>
              <span>{link}</span>
            </li>
          ))}
        </ul>
        <div className={styles.actions}>
          <Button variant="outline" onClick={() => finish(false)} autoFocus>
            {request?.mode === "send" ? "Quay lại chỉnh sửa" : "Hủy"}
          </Button>
          <Button onClick={() => finish(true)}>
            {request?.mode === "send" ? "Xác nhận gửi" : "Mở liên kết"}
          </Button>
        </div>
      </dialog>
    </Context.Provider>
  );
}
