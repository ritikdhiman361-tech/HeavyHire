"use client";

import { useRef, useState } from "react";
import { uploadFile } from "@/lib/upload";
import { classNames } from "@/lib/format";
import { Spinner } from "../ui/Spinner";

/** Upload one private document (ID proof, RC). Calls onUploaded with the storage key. */
export function DocumentUpload({
  label,
  doneLabel,
  value,
  onUploaded,
  error,
}: {
  label: string;
  doneLabel: string;
  value?: string;
  onUploaded: (key: string) => void;
  error?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function onFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setUploadError("");
    try {
      const { key } = await uploadFile(file, "document");
      onUploaded(key);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={classNames(
          "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 font-medium",
          value ? "border-green-400 bg-green-50 text-green-800" : "border-stone-300 bg-white text-stone-700 hover:border-brand-500",
        )}
      >
        {busy ? <Spinner className="h-5 w-5" /> : value ? "✅" : "📄"} {value ? doneLabel : label}
      </button>
      <input ref={ref} type="file" accept="image/*,application/pdf" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {(uploadError || error) && <p className="mt-1 text-sm text-red-600">{uploadError || error}</p>}
    </div>
  );
}

/** Upload machine photos (several). */
export function PhotoUpload({
  photos,
  onChange,
  addLabel,
  max = 10,
}: {
  photos: { url: string; publicId: string }[];
  onChange: (photos: { url: string; publicId: string }[]) => void;
  addLabel: string;
  max?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    const added: typeof photos = [];
    for (const file of Array.from(files).slice(0, max - photos.length)) {
      try {
        added.push(await uploadFile(file, "photo"));
      } catch (err) {
        setError((err as Error).message);
      }
    }
    onChange([...photos, ...added]);
    setBusy(false);
    if (ref.current) ref.current.value = "";
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((p, i) => (
          <div key={p.publicId} className="relative aspect-square overflow-hidden rounded-xl bg-stone-100">
            <img src={p.url} alt="" className="h-full w-full object-cover" />
            {i === 0 && <span className="absolute left-1 top-1 rounded bg-ink/80 px-1.5 text-xs text-white">Cover</span>}
            <button
              type="button"
              onClick={() => onChange(photos.filter((_, j) => j !== i))}
              className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm shadow"
              aria-label="Remove photo"
            >
              ✕
            </button>
          </div>
        ))}
        {photos.length < max && (
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-300 bg-white text-sm text-stone-600 hover:border-brand-500"
          >
            {busy ? <Spinner className="h-5 w-5" /> : <span className="text-2xl">📷</span>}
            {addLabel}
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
