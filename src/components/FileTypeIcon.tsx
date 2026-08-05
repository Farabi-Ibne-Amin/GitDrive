import {
  Folder,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  File as FileIcon,
} from "lucide-react";

const EXTENSION_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  // images
  png: FileImage, jpg: FileImage, jpeg: FileImage, gif: FileImage, svg: FileImage, webp: FileImage,
  // video
  mp4: FileVideo, mov: FileVideo, avi: FileVideo, mkv: FileVideo, webm: FileVideo,
  // audio
  mp3: FileAudio, wav: FileAudio, flac: FileAudio, m4a: FileAudio,
  // archives
  zip: FileArchive, tar: FileArchive, gz: FileArchive, rar: FileArchive, "7z": FileArchive,
  // code
  js: FileCode, ts: FileCode, tsx: FileCode, jsx: FileCode, py: FileCode, json: FileCode,
  html: FileCode, css: FileCode, rs: FileCode, go: FileCode, java: FileCode, c: FileCode, cpp: FileCode,
  // spreadsheets
  csv: FileSpreadsheet, xlsx: FileSpreadsheet, xls: FileSpreadsheet,
  // documents
  txt: FileText, md: FileText, pdf: FileText, doc: FileText, docx: FileText,
};

export default function FileTypeIcon({
  type,
  name,
  className = "h-5 w-5",
}: {
  type: "file" | "dir";
  name: string;
  className?: string;
}) {
  if (type === "dir") {
    return <Folder className={className} fill="currentColor" fillOpacity={0.15} />;
  }

  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const Icon = EXTENSION_MAP[ext] ?? FileIcon;
  return <Icon className={className} />;
}
