import { listSpots } from "@/lib/queries";
import { ensureDemoUser, hasClerk } from "@/lib/auth";
import RateForm from "@/components/RateForm";
import { redirect } from "next/navigation";

export default async function RatePage({
  searchParams,
}: {
  searchParams: Promise<{ spot?: string }>;
}) {
  const user = await ensureDemoUser();
  if (hasClerk && !user) {
    const { spot } = await searchParams;
    redirect(`/sign-in?redirect_url=/rate${spot ? `?spot=${spot}` : ""}`);
  }
  const { spot: spotParam } = await searchParams;
  const spots = await listSpots();
  const selected = spots.find((s) => s.id === spotParam) ?? spots[0];

  return <RateForm spots={spots} initialSpot={selected} />;
}
