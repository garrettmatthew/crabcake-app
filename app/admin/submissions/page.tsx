import { listPendingSubmissions } from "@/lib/queries";
import SubmissionRow from "@/components/admin/SubmissionRow";

export default async function SubmissionsPage() {
  const submissions = await listPendingSubmissions();
  return (
    <div className="p-4">
      <h2 className="font-display font-extrabold text-xl tracking-tight mb-3">
        Pending submissions ({submissions.length})
      </h2>
      {submissions.length === 0 ? (
        <div className="text-center py-10 text-sm text-[var(--ink-3)]">
          All caught up. No pending submissions.
        </div>
      ) : (
        submissions.map((s) => <SubmissionRow key={s.id} submission={s} />)
      )}
    </div>
  );
}
