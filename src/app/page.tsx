import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspaceSelection } from "@/lib/workspace";

/** Root route: send people to login, the workspace picker, or the app. */
export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const workspace = await getWorkspaceSelection(user);
  redirect(workspace ? "/projects" : "/select-workspace");
}
