import { redirect } from "next/navigation";

type Search = { role?: string; next?: string };

export default async function LegacyAuthRedirect({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const segment = sp.role === "rider" ? "rider" : "customer";
  const q = new URLSearchParams();
  if (sp.next) q.set("next", sp.next);
  const qs = q.toString();
  redirect(`/login/${segment}${qs ? `?${qs}` : ""}`);
}
