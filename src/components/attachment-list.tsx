"use client";

import { FileText, Image, File, Download, Trash2 } from "lucide-react";

interface AttachmentItem {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
}

interface Props {
  attachments: AttachmentItem[];
  canDelete?: boolean;
  onDelete?: (id: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <Image className="w-4 h-4 text-blue-500" />;
  if (type.includes("pdf")) return <FileText className="w-4 h-4 text-red-500" />;
  return <File className="w-4 h-4 text-gray-500" />;
}

export default function AttachmentList({ attachments, canDelete, onDelete }: Props) {
  if (!attachments.length) return null;

  return (
    <ul className="space-y-1">
      {attachments.map((a) => (
        <li
          key={a.id}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm"
        >
          {getFileIcon(a.fileType)}
          <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{a.fileName}</span>
          <span className="text-xs text-gray-400 shrink-0">{formatSize(a.fileSize)}</span>
          <a
            href={a.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-blue-500 hover:text-blue-700 transition-colors"
            title="Tải về"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(a.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              title="Xóa"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
