"use client";

import { signOut } from "next-auth/react";
import { HardDrive, LogOut } from "lucide-react";
import Image from "next/image";

export default function TopBar({
  login,
  avatarUrl,
}: {
  login: string;
  avatarUrl?: string;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-gray-900 p-1.5">
          <HardDrive className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold">GitDrive</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={login}
              width={28}
              height={28}
              className="rounded-full"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-gray-200" />
          )}
          <span className="hidden text-sm text-gray-600 sm:inline">{login}</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
