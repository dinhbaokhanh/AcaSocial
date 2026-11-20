"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth/context";
import {
  gamificationApi,
  type RuleSet,
  type GamificationRules,
  type RuleAudit,
  type ReconciliationJob,
} from "@/lib/api/gamification";
import { Button } from "@/components/ui/Button";
import styles from "./CatalogAdmin.module.css";
import { GamificationOperations } from "./GamificationOperations";
const labels = {
  upvotePoints: "Điểm mỗi upvote",
  acceptedPoints: "Điểm Accepted Answer",
  publicationPoints: "Điểm bài được duyệt",
  upvoteDailyCap: "Tối đa điểm upvote/ngày",
  publicationDailyCap: "Tối đa bài nhận điểm/ngày",
  pairDailyCap: "Tối đa lượt được thưởng từ cùng người/ngày",
};
export function GamificationAdmin() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p>Đang kiểm tra quyền…</p>;
  if (user?.role !== "admin") return <p>Bạn không có quyền truy cập.</p>;
  return <AdminSession key={user.id} />;
}
function AdminSession() {
  const [rule, setRule] = useState<RuleSet | null>(null),
    [config, setConfig] = useState<GamificationRules | null>(null),
    [audits, setAudits] = useState<RuleAudit[]>([]),
    [jobsList, setJobsList] = useState<{ page: number; rows: ReconciliationJob[] } | null>(null);
  const [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [reload, setReload] = useState(0),
    [auditPage, setAuditPage] = useState(1);
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsReload, setJobsReload] = useState(0);
  const jobs = jobsList?.page === jobsPage ? jobsList.rows : [];
  const [auditError, setAuditError] = useState(""),
    [serverRule, setServerRule] = useState<RuleSet | null>(null);
  const dirty =
    !!config &&
    !!rule &&
    (JSON.stringify(config) !== JSON.stringify(rule.config) ||
      reason.length > 0);
  useEffect(() => {
    let active = true;
    void gamificationApi
      .rules()
      .then((r) => {
        if (active) {
          setRule(r);
          setConfig(r.config);
          setServerRule(null);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(String(e));
      });
    return () => {
      active = false;
    };
  }, [reload]);
  useEffect(() => {
    let active = true;
    void gamificationApi
      .audits(auditPage)
      .then((a) => {
        if (active) {
          setAudits(a);
          setAuditError("");
        }
      })
      .catch((e) => {
        if (active) setAuditError(String(e));
      });
    return () => {
      active = false;
    };
  }, [auditPage, reload]);
  useEffect(() => {
    let active = true;
    let inFlight = false;
    const load = () => {
      if (inFlight) return;
      inFlight = true;
      void gamificationApi
        .jobs(jobsPage)
        .then((data) => {
          if (active) setJobsList({ page: jobsPage, rows: data });
        })
        .catch(() => {})
        .finally(() => { inFlight = false; });
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [jobsPage, jobsReload]);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!config || !rule) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next = await gamificationApi.updateRules(
        config,
        rule.version,
        reason.trim(),
      );
      setRule(next);
      setReason("");
      setNotice("Đã lưu phiên bản quy tắc mới. Điểm đã cấp không bị tính lại.");
      setReload((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được cấu hình");
      const latest = await gamificationApi.rules().catch(() => null);
      if (latest && latest.version !== rule.version) setServerRule(latest);
    } finally {
      setBusy(false);
    }
  }
  async function reconcile() {
    setBusy(true);
    try {
      await gamificationApi.reconcile();
      setNotice(
        "Đã xếp lịch kiểm tra đối soát; tác vụ chỉ đọc, không tự sửa điểm.",
      );
      setJobsPage(1);
      setJobsReload((value) => value + 1);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.page}>
      <h1>Cấu hình Gamification</h1>
      <p>
        Quy tắc mới áp dụng cho quyết định cấp mới. Thu hồi/khôi phục dùng mức
        điểm gốc. Tắt giới hạn vẫn giữ kiểm tra tự vote và chống xử lý trùng.
      </p>
      {error && (
        <p role="alert">
          {error}{" "}
          <button
            disabled={busy}
            onClick={() => {
              if (
                !dirty ||
                window.confirm(
                  "Tải lại sẽ thay thế dữ liệu chưa lưu. Tiếp tục?",
                )
              ) {
                setReason("");
                setReload((n) => n + 1);
              }
            }}
          >
            Tải lại quy tắc
          </button>
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {serverRule && (
        <div role="status">
          <p>
            Server đã có phiên bản {serverRule.version}. Bản nhập của bạn được
            giữ nguyên.
          </p>
          <details>
            <summary>So sánh cấu hình server</summary>
            <pre>{JSON.stringify(serverRule.config, null, 2)}</pre>
          </details>
          <Button
            disabled={busy}
            onClick={() => {
              setRule(serverRule);
              setServerRule(null);
            }}
          >
            Dùng phiên bản mới, giữ giá trị đang nhập
          </Button>
        </div>
      )}
      {config && rule && (
        <form onSubmit={save} className={styles.form}>
          <h2>Phiên bản {rule.version}</h2>
          {Object.entries(labels).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                type="number"
                min={0}
                max={
                  key === "upvoteDailyCap"
                    ? 100000
                    : key === "publicationPoints" ||
                        key === "publicationDailyCap"
                      ? 100
                      : 1000
                }
                step={1}
                required
                disabled={busy}
                value={config[key as keyof typeof labels]}
                onChange={(e) =>
                  setConfig({ ...config, [key]: Number(e.target.value) })
                }
              />
            </label>
          ))}
          <label>
            <span>
              <input
                type="checkbox"
                checked={config.capEnabled}
                disabled={busy}
                onChange={(e) =>
                  setConfig({ ...config, capEnabled: e.target.checked })
                }
              />{" "}
              Bật giới hạn chống spam điểm
            </span>
          </label>
          {["Helper", "Contributor", "Expert"].map((code, i) => (
            <label key={code}>
              Ngưỡng {code}
              <input
                type="number"
                required
                min={1}
                max={10000000}
                step={1}
                value={config.thresholds[i]}
                disabled={busy}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    thresholds: config.thresholds.map((v, n) =>
                      n === i ? Number(e.target.value) : v,
                    ),
                  })
                }
              />
            </label>
          ))}
          <label>
            Lý do thay đổi
            <textarea
              required
              minLength={5}
              maxLength={1000}
              value={reason}
              disabled={busy}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <Button type="submit" disabled={busy}>
            Lưu phiên bản mới
          </Button>
        </form>
      )}
      <h2>Lịch sử cấu hình</h2>
      {auditError && <p role="alert">{auditError}</p>}
      {audits.map((a) => (
        <article key={a.id} className={styles.item}>
          <div>
            <strong>{a.reason}</strong>
            <p>
              {new Date(a.created_at).toLocaleString("vi-VN")} · Người thực hiện{" "}
              {a.actor_id}
            </p>
            <details>
              <summary>Chi tiết trước/sau</summary>
              <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {JSON.stringify(
                  { before: a.before.config, after: a.after.config },
                  null,
                  2,
                )}
              </pre>
            </details>
          </div>
        </article>
      ))}
      <div className={styles.actions}>
        <Button
          variant="ghost"
          disabled={auditPage <= 1 || busy}
          onClick={() => setAuditPage((p) => p - 1)}
        >
          Trước
        </Button>
        <span>Trang {auditPage}</span>
        <Button
          variant="ghost"
          disabled={audits.length < 20 || busy}
          onClick={() => setAuditPage((p) => p + 1)}
        >
          Sau
        </Button>
      </div>
      <h2>Đối soát dữ liệu</h2>
      <Button disabled={busy} onClick={() => void reconcile()}>
        Tạo báo cáo đối soát
      </Button>
      {jobs.map((j) => (
        <article key={j.id} className={styles.item}>
          <div>
            <strong>
              {j.status === "completed" ? "Đã hoàn thành" : "Đang chờ xử lý"}
            </strong>
            <p>{new Date(j.created_at).toLocaleString("vi-VN")}</p>
            {j.result && (
              <p>
                {j.result.totalFindings} sai lệch · {j.result.pending} event
                chưa áp dụng ·{" "}
                {j.result.dryRun ? "Chỉ kiểm tra" : "Đã dựng lại projection"}.
              </p>
            )}
          </div>
        </article>
      ))}
      <nav className={styles.actions} aria-label="Trang danh sách đối soát">
        <Button disabled={busy || jobsPage === 1} variant="ghost" onClick={() => setJobsPage((page) => page - 1)}>
          Trước
        </Button>
        <span>Trang {jobsPage}</span>
        <Button disabled={busy || jobs.length < 20} variant="ghost" onClick={() => setJobsPage((page) => page + 1)}>
          Sau
        </Button>
      </nav>
      <GamificationOperations />
    </section>
  );
}
