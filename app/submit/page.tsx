import { ensureDemoUser, hasClerk } from "@/lib/auth";
import AddSpotForm from "@/components/AddSpotForm";
import { redirect } from "next/navigation";

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await ensureDemoUser();
  if (hasClerk && !user) redirect("/sign-in?redirect_url=/submit");
  const sp = await searchParams;
  const hasKey = Boolean(process.env.GOOGLE_PLACES_API_KEY);
  return <AddSpotForm initialQuery={sp.q ?? ""} hasKey={hasKey} />;
}
