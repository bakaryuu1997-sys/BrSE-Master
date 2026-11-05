import { redirect } from "next/navigation";

// There is no minutes index screen; /app/minutes used to be a 404. Send people to the workspace.
export default function MinutesIndexPage() {
  redirect("/app/minutes/new");
}
