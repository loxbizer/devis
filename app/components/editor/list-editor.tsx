import { Button } from "../ui/primitives";

/**
 * Éditeur générique de liste d'éléments (prestations, étapes, garanties,
 * FAQ…). Contrôlé par le parent : les lignes sont des objets simples.
 */
export interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "textarea";
  placeholder?: string;
  required?: boolean;
}

export type ListItem = Record<string, string>;

export function ItemListEditor({
  items,
  onChange,
  fields,
  addLabel,
  maxItems = 50,
}: {
  items: ListItem[];
  onChange: (items: ListItem[]) => void;
  fields: FieldDef[];
  addLabel: string;
  maxItems?: number;
}) {
  function update(index: number, key: string, value: string) {
    const next = items.map((item, i) =>
      i === index ? { ...item, [key]: value } : item,
    );
    onChange(next);
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function add() {
    const empty: ListItem = {};
    for (const field of fields) empty[field.key] = "";
    onChange([...items, empty]);
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => (
        <fieldset
          key={index}
          className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
        >
          <legend className="sr-only">Élément {index + 1}</legend>
          <div className="flex flex-col gap-3">
            {fields.map((field) => (
              <label key={field.key} className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">
                  {field.label}
                </span>
                {field.type === "textarea" ? (
                  <textarea
                    value={item[field.key] ?? ""}
                    onChange={(e) => update(index, field.key, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    rows={2}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                ) : (
                  <input
                    type="text"
                    value={item[field.key] ?? ""}
                    onChange={(e) => update(index, field.key, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                )}
              </label>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label={`Monter l'élément ${index + 1}`}
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              ↑
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label={`Descendre l'élément ${index + 1}`}
              disabled={index === items.length - 1}
              onClick={() => move(index, 1)}
            >
              ↓
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-red-600"
              onClick={() => remove(index)}
            >
              Retirer
            </Button>
          </div>
        </fieldset>
      ))}
      {items.length < maxItems && (
        <Button type="button" variant="outline" size="sm" onClick={add}>
          + {addLabel}
        </Button>
      )}
    </div>
  );
}
