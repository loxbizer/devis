import { useRef, useState } from "react";
import { formatBytes } from "~/lib/format";
import { Button, cx } from "./primitives";

/**
 * FileUploader — zone de dépôt accessible (clavier + lecteur d'écran).
 * La validation finale (MIME, taille, quotas) est toujours refaite côté serveur.
 */
export function FileUploader({
  label,
  accept,
  maxBytes,
  onFile,
  hint,
  disabled,
}: {
  label: string;
  accept: string;
  maxBytes: number;
  onFile: (file: File) => void | Promise<void>;
  hint?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (file.size > maxBytes) {
      setError(
        `Fichier trop volumineux (${formatBytes(file.size)}). Maximum : ${formatBytes(maxBytes)}.`,
      );
      return;
    }
    setBusy(true);
    try {
      await onFile(file);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (!disabled && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (!disabled) void handleFile(event.dataTransfer.files[0]);
        }}
        className={cx(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
          dragOver
            ? "border-brand-500 bg-brand-50"
            : "border-slate-300 bg-slate-50 hover:border-brand-400",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        {busy ? (
          <span
            aria-hidden="true"
            className="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600"
          />
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="size-8 text-slate-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
            />
          </svg>
        )}
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs text-slate-500">
          {hint ??
            `Glissez-déposez ou cliquez — maximum ${formatBytes(maxBytes)}`}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/** ImageUploader — galerie avec suppression, optimisation faite en amont. */
export function ImageUploader({
  images,
  onUpload,
  onDelete,
  maxBytes,
  maxCount,
  disabled,
}: {
  images: { id: string; url: string; filename: string }[];
  onUpload: (file: File) => void | Promise<void>;
  onDelete: (id: string) => void;
  maxBytes: number;
  maxCount: number;
  disabled?: boolean;
}) {
  const full = images.length >= maxCount;
  return (
    <div className="flex flex-col gap-4">
      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((image) => (
            <li key={image.id} className="group relative">
              <img
                src={image.url}
                alt={image.filename}
                loading="lazy"
                className="aspect-square w-full rounded-xl border border-slate-200 object-cover"
              />
              <Button
                type="button"
                variant="danger"
                size="sm"
                aria-label={`Supprimer l'image ${image.filename}`}
                className="absolute top-2 right-2 opacity-90"
                onClick={() => onDelete(image.id)}
              >
                Supprimer
              </Button>
            </li>
          ))}
        </ul>
      )}
      {full ? (
        <p className="text-sm text-slate-500">
          Nombre maximal d'images atteint ({maxCount}).
        </p>
      ) : (
        <FileUploader
          label="Ajouter une photo (JPG, PNG ou WebP)"
          accept="image/jpeg,image/png,image/webp"
          maxBytes={maxBytes}
          onFile={onUpload}
          disabled={disabled}
          hint={`${images.length}/${maxCount} images — optimisées automatiquement avant envoi`}
        />
      )}
    </div>
  );
}
