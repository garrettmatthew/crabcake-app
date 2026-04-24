import { ensureDemoUser, hasClerk } from "@/lib/auth";
import SubmitForm from "@/components/SubmitForm";
import { redirect } from "next/navigation";

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{
    name?: string;
    city?: string;
    lat?: string;
    lng?: string;
    addr?: string;
  }>;
}) {
  const user = await ensureDemoUser();
  if (hasClerk && !user) redirect("/sign-in?redirect_url=/submit");
  const sp = await searchParams;
  return (
    <SubmitForm
      initial={{
        name: sp.name ?? "",
        city: sp.city ?? "",
        address: sp.addr ?? "",
        latitude: sp.lat ? parseFloat(sp.lat) : undefined,
        longitude: sp.lng ? parseFloat(sp.lng) : undefined,
      }}
    />
  );
}
