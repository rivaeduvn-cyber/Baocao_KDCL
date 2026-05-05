"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, FileText, Image, File } from "lucide-react";
import {
  MAX_FILES, MAX_SIZE_MB, ACCEPT_ATTR, ALLOWED_HINT, isAllowedMime,
} from "@/lib/upload-constraints";

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
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

export default function FileUploadInput({
  files,
  onChange,
  maxFiles = MAX_FILES,
  maxSizeMB = MAX_SIZE_MB,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      setError("");
      const arr = Array.from(newFiles);

      // Validate count
      if (files.length + arr.length > maxFiles) {
        setError(`Tối đa ${maxFiles} file`);
        return;
      }

      // Validate size + type
      const maxBytes = maxSizeMB * 1024 * 1024;
      for (const f of arr) {
        if (f.size > maxBytes) {
          setError(`"${f.name}" vượt quá ${maxSizeMB}MB`);
          return;
        }
        if (!isAllowedMime(f.type)) {
          setError(`"${f.name}" không thuộc loại được hỗ trợ`);
          return;
        }
      }

      onChange([...files, ...arr]);
    },
    [files, onChange, maxFiles, maxSizeMB]
  );

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        <Upload className="w-4 h-4 inline mr-1" />
        Đính kèm file ({files.length}/{maxFiles})
      </label>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
          dragOver
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
            : "border-gray-300 dark:border-gray-700 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800"
        } ${files.length >= maxFiles ? "opacity-50 pointer-events-none" : ""}`}
      >
        <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Kéo thả hoặc click chọn file
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Tối đa {maxFiles} file, mỗi file {maxSizeMB}MB · {ALLOWED_HINT}
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}

      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm"
            >
              {getFileIcon(file.type)}
              <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{file.name}</span>
              <span className="text-xs text-gray-400 shrink-0">{formatSize(file.size)}</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
