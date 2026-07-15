/** Gabarit des pages légales (fond sombre du site marketing). */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="px-4 py-16 sm:px-6">
      <article className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Dernière mise à jour : {updated}
        </p>
        <div className="prose-legal mt-8 flex flex-col gap-6 text-slate-300 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_li]:mt-1 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </article>
    </main>
  );
}
