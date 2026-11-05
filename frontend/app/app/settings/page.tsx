import { redirect } from "next/navigation";

// Settings only has the projects screen today; /app/settings used to be a 404.
export default function SettingsIndexPage() {
  redirect("/app/settings/projects");
}
