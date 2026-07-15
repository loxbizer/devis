import { Link } from "react-router";

/**
 * Gabarit des pages de guide (référencement naturel) : contenu réel,
 * exemple concret, FAQ avec données structurées JSON-LD et liens internes.
 */
export interface GuideData {
  title: string;
  intro: string;
  sections: { heading: string; paragraphs: string[]; list?: string[] }[];
  example: { heading: string; text: string[] };
  faq: { q: string; a: string }[];
  related: { to: string; label: string }[];
}

export function GuidePage({ data }: { data: GuideData }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <main className="px-4 py-16 sm:px-6">
      <script
        type="application/ld+json"
        // JSON généré à partir de données statiques internes uniquement.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {data.title}
        </h1>
        <p className="mt-5 text-lg text-slate-300">{data.intro}</p>

        {data.sections.map((section) => (
          <section key={section.heading} className="mt-10">
            <h2 className="text-2xl font-semibold text-white">
              {section.heading}
            </h2>
            {section.paragraphs.map((paragraph, i) => (
              <p key={i} className="mt-3 text-slate-300">
                {paragraph}
              </p>
            ))}
            {section.list && (
              <ul className="mt-3 list-disc pl-5 text-slate-300">
                {section.list.map((item) => (
                  <li key={item} className="mt-1">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section className="mt-10 rounded-2xl border border-brand-500/30 bg-brand-500/10 p-6">
          <h2 className="text-xl font-semibold text-white">
            {data.example.heading}
          </h2>
          {data.example.text.map((paragraph, i) => (
            <p key={i} className="mt-3 text-slate-300">
              {paragraph}
            </p>
          ))}
          <Link
            to="/demonstration"
            className="mt-4 inline-block rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400"
          >
            Voir un exemple complet en démonstration
          </Link>
        </section>

        <section className="mt-10" aria-labelledby="guide-faq">
          <h2 id="guide-faq" className="text-2xl font-semibold text-white">
            Questions fréquentes
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {data.faq.map((item) => (
              <details key={item.q} className="group glass rounded-2xl">
                <summary className="cursor-pointer list-none px-5 py-4 font-medium text-white">
                  <span className="flex items-center justify-between gap-3">
                    {item.q}
                    <span
                      aria-hidden="true"
                      className="text-slate-500 transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </span>
                </summary>
                <p className="px-5 pb-4 text-sm text-slate-400">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <nav
          aria-label="Guides liés"
          className="mt-10 border-t border-white/10 pt-8"
        >
          <h2 className="text-sm font-semibold tracking-wide text-slate-400 uppercase">
            À lire aussi
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {data.related.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="text-brand-300 underline hover:text-brand-200"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-10 rounded-2xl bg-white p-6 text-center">
          <p className="font-semibold text-slate-900">
            Essayez avec votre propre devis : c'est gratuit jusqu'à 3 pages
            actives.
          </p>
          <Link
            to="/inscription"
            className="mt-4 inline-block rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white transition hover:bg-brand-700"
          >
            Créer ma première DevisRoom
          </Link>
        </div>
      </article>
    </main>
  );
}
