import { redirect } from "next/navigation";

export default function AdminSessionsLiveRedirect() {
  redirect("/admin/live");
}
