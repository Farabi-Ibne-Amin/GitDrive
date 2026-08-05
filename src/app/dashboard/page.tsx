"use client";

import { useState } from "react";
import type { DriveRepo } from "@/types/drive";
import RepoSelector from "@/components/RepoSelector";
import FileExplorer from "@/components/FileExplorer";

export default function DashboardPage() {
  const [selectedRepo, setSelectedRepo] = useState<DriveRepo | null>(null);

  if (!selectedRepo) {
    return <RepoSelector onSelect={setSelectedRepo} />;
  }

  return (
    <FileExplorer
      repo={selectedRepo}
      onChangeRepo={() => setSelectedRepo(null)}
    />
  );
}
