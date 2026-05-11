import { renderDigestHtml, type DigestSummary } from "@/lib/digest";

export const dynamic = "force-dynamic";

/**
 * Admin-only preview of the daily digest email. Shows exactly what
 * recipients will see, rendered with sample data. Edit the SAMPLE
 * below to see how variations render.
 */
export default async function EmailPreviewPage() {
  const SAMPLE: DigestSummary = {
    followers: 2,
    reviewsFromFollowed: [
      { actor: "Austin", spot: "Jimmy's Famous Seafood", spotId: "jimmys" },
      { actor: "Allie", spot: "Koco's Pub", spotId: "kocos" },
      { actor: "Austin", spot: "Mr. Bill's Terrace Inn", spotId: "mr-bills" },
    ],
    badges: ["First Cake 🥇", "City Hopper 🏙️"],
  };

  const html = renderDigestHtml("Garrett", SAMPLE);

  return (
    <div className="px-3 py-3">
      <div className="text-[12.5px] text-[var(--ink-3)] mb-2 px-1">
        Sample daily digest — exactly what subscribers receive. Edit
        <code> app/admin/email-preview/page.tsx </code> to tweak sample data.
      </div>
      <iframe
        srcDoc={html}
        title="Email preview"
        style={{
          width: "100%",
          height: "calc(100vh - 200px)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          background: "#fff",
        }}
      />
    </div>
  );
}
