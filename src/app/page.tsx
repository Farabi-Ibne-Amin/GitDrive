import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import SignInButton from "@/components/SignInButton";
import { Github, HardDrive, Lock, Upload } from "lucide-react";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-16">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-gray-900 p-3">
          <HardDrive className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">GitDrive</h1>
      </div>

      <p className="max-w-lg text-center text-gray-600">
        Turn any GitHub repository into cloud storage. Upload, organize, and
        share files using the infrastructure you already trust — with full
        version history, for free.
      </p>

      <SignInButton />

      <div className="mt-6 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
        <FeatureCard
          icon={<Upload className="h-5 w-5" />}
          title="Drag & drop upload"
          description="Bulk upload files up to 100MB each, straight into a repo."
        />
        <FeatureCard
          icon={<Lock className="h-5 w-5" />}
          title="Private by default"
          description="Your storage repo can be private — only you can see it."
        />
        <FeatureCard
          icon={<Github className="h-5 w-5" />}
          title="It's just git"
          description="Every change is a real commit. Full history, for free."
        />
      </div>

      <p className="max-w-md text-center text-xs text-gray-400">
        GitDrive requests the{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5">repo</code> OAuth
        scope so it can create and manage a dedicated storage repository on
        your behalf. It never accesses repositories you don&apos;t select.
      </p>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-drive-50 text-drive-700">
        {icon}
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </div>
  );
}
