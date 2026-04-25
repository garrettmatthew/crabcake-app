"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { dismissReport, unpublishSpot } from "@/lib/actions";
import { showToast } from "../Toast";

type Report = {
  id: string;
  spotId: string;
  reason: string;
  reasonLabel: string;
  note: string | null;
  status: string;
  createdAt: Date | string;
  reporterName: string | null;
  spotName: string | null;
  spotCity: string | null;
  spotPublished: boolean | null;
};

export default function ReportRow({ report }: { report: Report }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmingUnpublish, setConfirmingUnpublish] = useState(false);

  function dismiss() {
    startTransition(async () => {
      try {
        await dismissReport(report.id);
        showToast("Dismissed");
        router.refresh();
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  function unpublish() {
    startTransition(async () => {
      try {
        await unpublishSpot(report.spotId);
        showToast(`${report.spotName ?? "Spot"} unpublished`);
        router.refresh();
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  const dateStr = new Date(report.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-3">
      <div className="flex justify-between items-start gap-2 mb-1">
        <div className="flex-1 min-w-0">
          <Link
            href={`/spot/${report.spotId}`}
            className="font-display font-bold text-[15px] tracking-tight hover:underline"
          >
            {report.spotName ?? report.spotId}
          </Link>
          <div className="text-[11.5px] text-[var(--ink-3)]">
            {report.spotCity ?? ""} · {dateStr}
            {report.reporterName ? ` · by ${report.reporterName}` : ""}
          </div>
        </div>
        <span
          className="font-mono text-[9px] tracking-[.06em] uppercase font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
          style={{ background: "var(--crab)", color: "#fff" }}
        >
          {report.reasonLabel}
        </span>
      </div>
      {report.note && (
        <div className="text-[12.5px] text-[var(--ink-2)] leading-[1.4] mt-1.5 mb-1">
          {report.note}
        </div>
      )}
      <div className="flex gap-2 mt-2.5">
        <button
          onClick={dismiss}
          disabled={pending}
          className="flex-1 h-9 rounded-full text-[12px] font-bold disabled:opacity-50"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            color: "var(--ink-2)",
          }}
        >
          Dismiss
        </button>
        {confirmingUnpublish ? (
          <>
            <button
              onClick={() => setConfirmingUnpublish(false)}
              disabled={pending}
              className="h-9 px-3 rounded-full text-[12px] font-bold"
              style={{
                background: "var(--panel)",
                border: "1px solid var(--border)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={unpublish}
              disabled={pending}
              className="h-9 px-3 rounded-full text-[12px] font-bold text-white disabled:opacity-50"
              style={{ background: "var(--crab)" }}
            >
              {pending ? "…" : "Confirm unpublish"}
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmingUnpublish(true)}
            disabled={pending}
            className="flex-1 h-9 rounded-full text-[12px] font-bold text-white disabled:opacity-50"
            style={{ background: "var(--crab)" }}
          >
            Unpublish spot
          </button>
        )}
      </div>
    </div>
  );
}
