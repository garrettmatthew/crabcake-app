import { listTags } from "@/lib/queries";
import TagsManager from "@/components/admin/TagsManager";

export default async function AdminTagsPage() {
  const tags = await listTags();
  return <TagsManager tags={tags.map((t) => ({ id: t.id, label: t.label }))} />;
}
