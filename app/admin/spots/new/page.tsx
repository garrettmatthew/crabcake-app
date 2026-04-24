import AdminAddSpotForm from "@/components/admin/AdminAddSpotForm";

export default function AdminAddSpotPage() {
  const hasKey = Boolean(process.env.GOOGLE_PLACES_API_KEY);
  return <AdminAddSpotForm hasKey={hasKey} />;
}
