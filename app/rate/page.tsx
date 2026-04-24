import { listSpots } from "@/lib/queries";
import { ensureDemoUser } from "@/lib/auth";
import RateForm from "@/components/RateForm";

export default async function RatePage({
  searchParams,
}: {
  searchParams: Promise<{ spot?: string }>;
}) {
  await ensureDemoUser();
  const { spot: spotParam } = await searchParams;
  const spots = await listSpots();
  const selected = spots.find((s) => s.id === spotParam) ?? spots[0];

  return <RateForm spots={spots} initialSpot={selected} />;
}
