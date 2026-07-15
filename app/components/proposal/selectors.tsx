import { formatEuros } from "~/lib/format";
import type { PublicOption, PublicPackage } from "~/lib/proposal-vm";
import { cx } from "../ui/primitives";

/** PackageSelector — choix de la formule par le client final. */
export function PackageSelector({
  packages,
  selectedId,
  onSelect,
  accentColor,
}: {
  packages: PublicPackage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  accentColor: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Choix de la formule"
      className="grid gap-4 md:grid-cols-3"
    >
      {packages.map((pkg) => {
        const selected = pkg.id === selectedId;
        return (
          <button
            key={pkg.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(pkg.id)}
            className={cx(
              "relative flex flex-col rounded-2xl border-2 bg-white p-5 text-left transition",
              selected
                ? "border-(--accent) shadow-lg"
                : "border-slate-200 hover:border-slate-300",
            )}
            style={{ "--accent": accentColor } as React.CSSProperties}
          >
            {pkg.isRecommended && (
              <span
                className="absolute -top-3 left-4 rounded-full px-3 py-0.5 text-xs font-semibold text-white"
                style={{ backgroundColor: accentColor }}
              >
                Recommandée
              </span>
            )}
            <span className="flex items-start justify-between gap-2">
              <span className="text-lg font-semibold text-slate-900">
                {pkg.name}
              </span>
              <span
                aria-hidden="true"
                className={cx(
                  "mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                  selected ? "border-(--accent)" : "border-slate-300",
                )}
                style={{ "--accent": accentColor } as React.CSSProperties}
              >
                {selected && (
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: accentColor }}
                  />
                )}
              </span>
            </span>
            <span className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {formatEuros(pkg.priceCents)}
            </span>
            {pkg.description && (
              <span className="mt-2 text-sm text-slate-600">
                {pkg.description}
              </span>
            )}
            {pkg.features.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5 text-sm text-slate-700">
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="mt-0.5 size-4 shrink-0 text-emerald-500"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** OptionsSelector — options supplémentaires à cocher. */
export function OptionsSelector({
  options,
  selectedIds,
  onToggle,
  accentColor,
}: {
  options: PublicOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  accentColor: string;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {options.map((option) => {
        const selected = selectedIds.includes(option.id);
        return (
          <li key={option.id}>
            <label
              className={cx(
                "flex cursor-pointer items-start gap-3 rounded-xl border-2 bg-white p-4 transition",
                selected
                  ? "border-(--accent)"
                  : "border-slate-200 hover:border-slate-300",
              )}
              style={{ "--accent": accentColor } as React.CSSProperties}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggle(option.id)}
                className="mt-1 size-4 rounded border-slate-300"
                style={{ accentColor }}
              />
              <span className="flex-1">
                <span className="font-medium text-slate-900">
                  {option.name}
                </span>
                {option.description && (
                  <span className="mt-0.5 block text-sm text-slate-600">
                    {option.description}
                  </span>
                )}
              </span>
              <span className="font-semibold whitespace-nowrap text-slate-900">
                + {formatEuros(option.priceCents)}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
