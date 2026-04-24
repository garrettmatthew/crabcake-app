import { SignUp } from "@clerk/nextjs";
import CrabLogo from "@/components/CrabLogo";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
      <Link href="/" className="mb-6 flex items-center gap-2.5">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
          style={{ background: "var(--crab)" }}
        >
          <CrabLogo size={32} />
        </div>
        <div className="leading-tight">
          <div className="font-display font-extrabold text-2xl tracking-tight">Crabcakes</div>
          <div className="font-mono text-[10px] tracking-[.1em] uppercase text-[var(--ink-3)]">
            by the Baltimore Boys
          </div>
        </div>
      </Link>
      <SignUp
        signInUrl="/sign-in"
        forceRedirectUrl="/"
        appearance={{
          elements: {
            rootBox: { width: "100%", maxWidth: "360px" },
            card: {
              boxShadow: "0 8px 24px rgba(40,30,20,.08)",
              border: "1px solid var(--border)",
              background: "var(--panel)",
            },
            formButtonPrimary: {
              background: "var(--crab)",
              fontWeight: 800,
              fontSize: "15px",
              height: "48px",
              borderRadius: "999px",
              boxShadow: "0 4px 14px -4px rgba(232,61,53,.45)",
            },
            footerActionLink: { color: "var(--crab)", fontWeight: 700 },
          },
        }}
      />
    </div>
  );
}
