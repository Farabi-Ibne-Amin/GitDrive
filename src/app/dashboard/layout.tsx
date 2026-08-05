import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import TopBar from "@/components/TopBar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        login={session.githubLogin}
        avatarUrl={session.avatarUrl}
      />
      <div className="flex-1">{children}</div>
    </div>
  );
}
