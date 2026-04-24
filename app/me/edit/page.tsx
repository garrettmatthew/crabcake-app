import { ensureDemoUser } from "@/lib/auth";
import EditProfileForm from "@/components/EditProfileForm";

export default async function EditProfilePage() {
  const user = await ensureDemoUser();
  if (!user) return null;
  return (
    <EditProfileForm
      displayName={user.displayName ?? ""}
      homeCity={user.homeCity ?? ""}
      bio={user.bio ?? ""}
      avatarSwatch={user.avatarSwatch ?? "g1"}
    />
  );
}
