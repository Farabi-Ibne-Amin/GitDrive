"use client";

import { signIn } from "next-auth/react";
import { Github } from "lucide-react";

export default function SignInButton() {
  return (
    <button
      onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
      className="flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800 active:scale-[0.98]"
    >
      <Github className="h-5 w-5" />
      Sign in with GitHub
    </button>
  );
}
