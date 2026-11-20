"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  gamificationApi,
  type RecoveryItem,
  type RecoveryKind,
  type ReconciliationJob,
  type Finding,
  type ReplayJob,
} from "@/lib/api/gamification";
import { Button } from "@/components/ui/Button";
import styles from "./CatalogAdmin.module.css";
export function GamificationOperations() {
  const [kind, setKind] = useState<RecoveryKind>("gaps"),
    [page, setPage] = useState(1),
    [recoveryList, setRecoveryList] = useState<{ kind: RecoveryKind; page: number; rows: RecoveryItem[] } | null>(null),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [loadError, setLoadError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [reload, setReload] = useState(0);
  const [jobsPage, setJobsPage] = useState(1),
    [jobsList, setJobsList] = useState<{ page: number; rows: ReconciliationJob[] } | null>(null),
    [jobId, setJobId] = useState(""),
    [findings, setFindings] = useState<Finding[]>([]),
    [findingPage, setFindingPage] = useState(1),
    [userId, setUserId] = useState(""),
    [rebuildReason, setRebuildReason] = useState("");
  const [replayPage, setReplayPage] = useState(1),
    [replayList, setReplayList] = useState<{ page: number; rows: ReplayJob[] } | null>(null),
    [replayReason, setReplayReason] = useState(""),
    [replayError, setReplayError] = useState(""),
    [replayAggregateId, setReplayAggregateId] = useState(""),
    [replayFrom, setReplayFrom] = useState(""),
    [replayTo, setReplayTo] = useState("");
  const [metrics, setMetrics] = useState<Record<string, string | null>>({});
  const rebuildRequest = useRef<{ signature: string; key: string } | null>(null);
  const currentRecovery = recoveryList?.kind === kind && recoveryList.page === page ? recoveryList : null;
  const rows = currentRecovery?.rows ?? [];
  const jobs = jobsList?.page === jobsPage ? jobsList.rows : [];
  const replays = replayList?.page === replayPage ? replayList.rows : [];

  useEffect(() => {
    let active = true;
    let inFlight = false;
    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      const results = await Promise.allSettled([
        gamificationApi.recovery(kind, page).then((rows) => {
          if (active) setRecoveryList({ kind, page, rows });
        }),
        gamificationApi.jobs(jobsPage).then((rows) => {
          if (active) setJobsList({ page: jobsPage, rows });
        }),
        gamificationApi.replayJobs(replayPage).then((rows) => {
          if (active) setReplayList({ page: replayPage, rows });
        }),
        gamificationApi.metrics().then((metrics) => {
          if (active) setMetrics(metrics);
        }),
      ]);
      const failed = results.find((result) => result.status === "rejected");
      if (active) setLoadError(failed ? String(failed.reason) : "");
      inFlight = false;
    };
    void load();
    const timer = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [kind, page, jobsPage, replayPage, reload]);
  useEffect(() => {
    if (!jobId) return;
    let active = true;
    void gamificationApi
      .findings(jobId, findingPage)
      .then((r) => {
        if (active) setFindings(r);
      })
      .catch((e) => {
        if (active) setError(String(e));
      });
    return () => {
      active = false;
    };
  }, [jobId, findingPage, reload]);
  async function retry(queue: RecoveryKind, item: RecoveryItem) {
    if (busy || !currentRecovery || queue !== currentRecovery.kind) return;
    const id =
      queue === "gaps"
        ? item.aggregate_id
        : queue === "references" || queue === "inbox"
          ? item.event_id
          : item.id;
    if (!id || reason.trim().length < 5) {
      setError("Nhập lý do ít nhất 5 ký tự trước khi thử lại.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await gamificationApi.retry(queue, id, reason.trim());
      setNotice(
        "Đã xếp lịch thử lại. Checkpoint không bị nhảy qua revision thiếu.",
      );
      setReload((n) => n + 1);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function rebuild(e: FormEvent) {
    e.preventDefault();
    if (busy || selectedJob?.kind !== "preview") return;
    const args = [userId.trim(), jobId, rebuildReason.trim()] as const;
    const signature = JSON.stringify(args);
    setBusy(true);
    setError("");
    try {
      if (rebuildRequest.current?.signature !== signature)
        rebuildRequest.current = { signature, key: crypto.randomUUID() };
      await gamificationApi.rebuild(...args, rebuildRequest.current.key);
      rebuildRequest.current = null;
      setNotice(
        "Đã yêu cầu dựng lại projection từ sổ điểm; không sửa ledger hoặc phát lại thông báo.",
      );
      setReload((n) => n + 1);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function replay(id?: string) {
    if (replayReason.trim().length < 5) {
      setReplayError("Nhập lý do đọc lại lịch sử ít nhất 5 ký tự.");
      return;
    }
    if (!id && Boolean(replayFrom) !== Boolean(replayTo)) {
      setReplayError("Hãy nhập cả ngày bắt đầu và ngày kết thúc.");
      return;
    }
    setBusy(true);
    setReplayError("");
    try {
      const result = id
        ? await gamificationApi.executeReplay(id, replayReason.trim())
        : await gamificationApi.previewReplay(replayReason.trim(), {
            aggregateId: replayAggregateId.trim() || undefined,
            fromDate: replayFrom || undefined,
            toDate: replayTo || undefined,
          });
      setReload((n) => n + 1);
      setNotice(
        result.status === "applying"
          ? "Đã xếp lịch kiểm tra hạn mức và thực thi replay."
          : "Đã xếp lịch kiểm tra journal và hạn mức trước khi áp dụng.",
      );
    } catch (e) {
      setReplayError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  const selectedJob = jobs.find((j) => j.id === jobId);
  function changeJobsPage(nextPage: number) {
    setJobsPage(nextPage);
    setJobId("");
    setFindings([]);
    setFindingPage(1);
  }
  return (
    <section className={styles.page}>
      <h2>Phục hồi sự kiện</h2>
      {error && <p role="alert">{error}</p>}
      {loadError && <p role="alert">{loadError}</p>}
      {notice && <p role="status">{notice}</p>}
      <div className={styles.notice}>
        <p>
          Event chờ: {metrics.pending ?? "…"} · Gap cần can thiệp:{" "}
          {metrics.blocked_gaps ?? "…"} · Payload lỗi:{" "}
          {metrics.blocked_payloads ?? "…"} · Inbox cần can thiệp:{" "}
          {metrics.blocked_inbox ?? "…"}
        </p>
        <p>
          Thông báo chưa gửi: {metrics.outbox_pending ?? "…"} · Tuổi event chờ
          lâu nhất: {metrics.oldest_pending_seconds ?? "0"} giây
        </p>
      </div>
      <label className={styles.form}>
        Loại hàng chờ
        <select
          value={kind}
          onChange={(e) => {
            setRecoveryList(null);
            setKind(e.target.value as typeof kind);
            setPage(1);
          }}
        >
          <option value="gaps">Revision bị thiếu</option>
          <option value="references">Snapshot chưa tải xong</option>
          <option value="failures">Event lỗi</option>
          <option value="inbox">Lỗi áp dụng điểm</option>
        </select>
      </label>
      <label className={styles.form}>
        Lý do thử lại
        <input
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      {!currentRecovery && !loadError && <p role="status">Đang tải hàng chờ…</p>}
      {currentRecovery && !rows.length && <p>Không có mục trong trang này.</p>}
      {rows.map((r, i) => (
        <article
          className={styles.item}
          key={r.id ?? r.event_id ?? r.aggregate_id ?? i}
        >
          <div>
            <strong>{r.aggregate_id ?? r.event_id ?? r.id}</strong>
            <p>
              {r.status ?? "Lỗi xử lý"} · Đã thử {r.attempts ?? 0} lần
            </p>
            {r.expected_revision && (
              <p>
                Thiếu revision {r.expected_revision} đến {r.through_revision}
              </p>
            )}
            {r.revision && <p>Revision {r.revision} · Event {r.event_id}</p>}
            <p>{r.last_error ?? r.error}</p>
          </div>
          <Button
            disabled={busy || r.status === "resolved"}
            variant="outline"
            onClick={() => currentRecovery && void retry(currentRecovery.kind, r)}
          >
            Thử lại
          </Button>
        </article>
      ))}
      <div className={styles.actions}>
        <Button
          disabled={page <= 1 || busy}
          variant="ghost"
          onClick={() => { setRecoveryList(null); setPage((p) => p - 1); }}
        >
          Trước
        </Button>
        <span>Trang {page}</span>
        <Button
          disabled={rows.length < 20 || busy}
          variant="ghost"
          onClick={() => { setRecoveryList(null); setPage((p) => p + 1); }}
        >
          Sau
        </Button>
      </div>
      <h2>Chi tiết đối soát và dựng lại projection</h2>
      <nav className={styles.actions} aria-label="Trang báo cáo đối soát">
        <Button disabled={busy || jobsPage === 1} variant="ghost" onClick={() => changeJobsPage(jobsPage - 1)}>
          Trước
        </Button>
        <span>Trang {jobsPage}</span>
        <Button disabled={busy || jobs.length < 20} variant="ghost" onClick={() => changeJobsPage(jobsPage + 1)}>
          Sau
        </Button>
      </nav>
      <label className={styles.form}>
        Báo cáo đã hoàn thành
        <select
          value={jobId}
          onChange={(e) => {
            setJobId(e.target.value);
            setFindings([]);
            setFindingPage(1);
          }}
        >
          <option value="">Chọn báo cáo</option>
          {jobs
            .filter((j) => j.status === "completed")
            .map((j) => (
              <option value={j.id} key={j.id}>
                {new Date(j.created_at).toLocaleString("vi-VN")} · {j.kind} ·{" "}
                {j.result?.totalFindings ?? 0} sai lệch
              </option>
            ))}
        </select>
      </label>
      {jobId && (
        <>
          <div className={styles.list}>
            {findings.map((f) => (
              <article key={f.id} className={styles.item}>
                <div>
                  <strong>
                    {f.kind} · {f.subject}
                  </strong>
                  <p>
                    Đúng: {f.expected} · Hiện tại: {f.actual}
                  </p>
                </div>
              </article>
            ))}
          </div>
          <div className={styles.actions}>
            <Button
              disabled={findingPage <= 1}
              variant="ghost"
              onClick={() => setFindingPage((p) => p - 1)}
            >
              Trước
            </Button>
            <span>Trang {findingPage}</span>
            <Button
              disabled={findings.length < 20}
              variant="ghost"
              onClick={() => setFindingPage((p) => p + 1)}
            >
              Sau
            </Button>
          </div>
        </>
      )}
      <form onSubmit={rebuild} className={styles.form}>
        <p>
          Chỉ dựng lại điểm tổng, điểm theo môn và trạng thái huy hiệu từ lịch
          sử đã lưu. Không tự sửa entitlement/quota và không cộng điểm thủ công.
          Cần báo cáo preview trong vòng 24 giờ.
        </p>
        <label>
          ID tài khoản
          <input
            required
            value={userId}
            pattern="[0-9a-fA-F-]{36}"
            onChange={(e) => setUserId(e.target.value)}
          />
        </label>
        <label>
          Lý do
          <textarea
            required
            minLength={5}
            maxLength={1000}
            value={rebuildReason}
            onChange={(e) => setRebuildReason(e.target.value)}
          />
        </label>
        <Button
          disabled={busy || !selectedJob || selectedJob.kind !== "preview"}
          type="submit"
        >
          Dựng lại projection của tài khoản
        </Button>
      </form>
      <h2>Đọc lại lịch sử còn lưu</h2>
      <p>
        Preview kiểm tra revision còn lưu và hạn mức dùng chung giữa các bài.
        Các lượt đã xử lý giữ kết quả cũ. Dùng tác vụ đối soát và dựng lại
        projection ở trên để sửa sai lệch bảng tổng hợp.
      </p>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void replay();
        }}
      >
        <label>
          ID bài viết (tùy chọn)
          <input
            value={replayAggregateId}
            onChange={(e) => setReplayAggregateId(e.target.value)}
          />
        </label>
        <label>
          Từ ngày (giờ Việt Nam)
          <input type="date" value={replayFrom} onChange={(e) => setReplayFrom(e.target.value)} />
        </label>
        <label>
          Đến hết ngày (giờ Việt Nam)
          <input type="date" min={replayFrom || undefined} value={replayTo} onChange={(e) => setReplayTo(e.target.value)} />
        </label>
        <label>
          Lý do đọc lại journal
          <input
            required
            minLength={5}
            maxLength={1000}
            value={replayReason}
            onChange={(e) => setReplayReason(e.target.value)}
          />
        </label>
        {replayError && <p role="alert">{replayError}</p>}
        <Button type="submit" disabled={busy}>Tạo preview lịch sử</Button>
      </form>
      <nav className={styles.actions} aria-label="Trang job đọc lại lịch sử">
        <Button disabled={busy || replayPage === 1} variant="ghost" onClick={() => setReplayPage((p) => p - 1)}>
          Trước
        </Button>
        <span>Trang {replayPage}</span>
        <Button disabled={busy || replays.length < 20} variant="ghost" onClick={() => setReplayPage((p) => p + 1)}>
          Sau
        </Button>
      </nav>
      {replays.map((r) => (
        <article key={r.id} className={styles.item}>
          <div>
            <strong>
              {r.total_events} event · {r.status}
            </strong>
            <p>
              Đã nạp {r.cursor} event ·{" "}
              {new Date(r.created_at).toLocaleString("vi-VN")}
            </p>
            {r.scope?.aggregateId && <p>Bài {r.scope.aggregateId}</p>}
            {r.scope?.fromDate && <p>Ngày {r.scope.fromDate} đến {r.scope.toDate} (giờ Việt Nam)</p>}
            {!r.scope?.aggregateId && !r.scope?.fromDate && <p>Toàn bộ lịch sử còn lưu</p>}
            {!!r.prerequisite_count && <p>Đã nạp thêm {r.prerequisite_count} revision tiền đề.</p>}
            {r.findings?.length ? (
              <ul>
                {r.findings.map((finding, index) => (
                  <li key={index}>
                    <p>{finding.kind === "pair_cap" ? "Hạn mức theo cặp" : finding.kind === "daily_cap" ? "Hạn mức ngày" : "Dữ liệu replay"} · {finding.message}</p>
                    {finding.userId && <p>Tài khoản {finding.userId} · Ngày {finding.day}</p>}
                    {finding.actorId && <p>Người vote {finding.actorId}</p>}
                    {finding.scopes?.length ? <p>Phạm vi {finding.scopes.join(", ")}</p> : null}
                    {finding.revisions?.map(({ aggregateId, revision }) => (
                      <p key={`${aggregateId}:${revision}`}>Bài {aggregateId} · Revision {revision}</p>
                    ))}
                  </li>
                ))}
              </ul>
            ) : r.last_error && <p>{r.last_error}</p>}
          </div>
          {["preview_ready", "needs_intervention"].includes(r.status) && (
            <Button
              disabled={busy}
              variant="outline"
              onClick={() => void replay(r.id)}
            >
              {r.status === "preview_ready"
                ? "Xác nhận đọc lại"
                : "Kiểm tra lại sau khi xử lý lỗi"}
            </Button>
          )}
        </article>
      ))}
    </section>
  );
}
