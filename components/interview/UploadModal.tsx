import { useState } from "react";

import { DocumentType } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface UploadModalProps {
  open: boolean;
  label: string;
  documentType: DocumentType;
  loading: boolean;
  error: string | null;
  isDark: boolean;
  onClose: () => void;
  onUploadFile: (file: File) => Promise<void>;
  onUploadText: (text: string) => Promise<void>;
}

export function UploadModal({
  open,
  label,
  documentType,
  loading,
  error,
  isDark,
  onClose,
  onUploadFile,
  onUploadText,
}: UploadModalProps) {
  const [text, setText] = useState("");
  if (!open) return null;

  const panelClasses = isDark
    ? "border-white/10 bg-[#0d0d0d] text-white"
    : "border-gray-200 bg-white text-gray-900";
  const sectionClasses = isDark
    ? "border-white/10 bg-white/5"
    : "border-gray-200 bg-gray-50";
  const mutedText = isDark ? "text-white/50" : "text-gray-500";
  const labelText = isDark ? "text-white/70" : "text-gray-700";
  const fileInputClasses = isDark
    ? "border-white/10 text-white file:bg-white/10 file:text-white hover:file:bg-white/20"
    : "border-gray-200 text-gray-700 file:bg-gray-200 file:text-gray-900 hover:file:bg-gray-300";
  const textAreaClasses = isDark
    ? "border-white/10 bg-black/20 text-white placeholder:text-white/40 focus-visible:border-emerald-400"
    : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:border-emerald-500";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
          setText("");
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={`rounded-3xl border p-6 shadow-2xl shadow-black/60 ${panelClasses}`}
      >
        <div className="flex items-start justify-between gap-4">
          <DialogHeader className="text-left">
            <DialogDescription
              className={`text-xs uppercase tracking-[0.2em] ${mutedText}`}
            >
              Add {label}
            </DialogDescription>
            <DialogTitle className="text-2xl font-semibold">
              {documentType.toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`rounded-full px-3 text-xs font-semibold ${
                isDark
                  ? "text-white/70 hover:bg-white/10 hover:text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Close
            </Button>
          </DialogClose>
        </div>

        <div className="space-y-4 text-sm">
          <div className={`rounded-2xl border p-4 ${sectionClasses}`}>
            <Label
              className={`text-xs font-semibold uppercase tracking-[0.2em] ${labelText}`}
            >
              Upload a file
            </Label>
            <p className={`mt-1 text-xs ${mutedText}`}>
              PDF, DOCX, DOC, TXT, RTF
            </p>
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.txt,.rtf"
              disabled={loading}
              className={`mt-3 h-11 cursor-pointer rounded-full bg-transparent px-0 py-0 pr-0 text-xs file:mr-3 file:ml-2 file:my-2 file:inline-flex file:h-7 file:items-center file:justify-center file:cursor-pointer file:rounded-full file:border-0 file:px-4 file:py-0 file:text-xs file:font-semibold file:leading-none ${fileInputClasses}`}
              style={{ overflow: "visible", boxSizing: "content-box" }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  await onUploadFile(file);
                  e.target.value = "";
                }
              }}
            />
          </div>

          <div className={`rounded-2xl border p-4 ${sectionClasses}`}>
            <Label
              className={`text-xs font-semibold uppercase tracking-[0.2em] ${labelText}`}
            >
              Paste text
            </Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Paste ${label.toLowerCase()} content here...`}
              className={`mt-3 min-h-[120px] ${textAreaClasses}`}
            />
            <Button
              type="button"
              onClick={async () => {
                if (text.trim().length === 0) return;
                await onUploadText(text);
                setText("");
              }}
              disabled={loading || text.trim().length === 0}
              className={`mt-4 rounded-full px-4 text-xs font-semibold ${
                isDark
                  ? "bg-emerald-500 text-white hover:bg-emerald-400"
                  : "bg-emerald-600 text-white hover:bg-emerald-500"
              }`}
            >
              {loading ? "Saving..." : "Save text"}
            </Button>
          </div>

          {error && (
            <p
              className={`text-xs ${
                isDark ? "text-rose-300" : "text-rose-600"
              }`}
            >
              {error}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
