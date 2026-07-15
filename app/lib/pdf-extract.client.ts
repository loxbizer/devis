/**
 * Extraction de texte d'un PDF côté navigateur avec PDF.js (gratuit,
 * aucun appel serveur ni OCR payant). Les PDF scannés sans couche texte
 * renvoient `hasText: false` : l'utilisateur saisit alors les informations
 * manuellement et le PDF est conservé en pièce jointe.
 */

export interface PdfExtractionResult {
  hasText: boolean;
  pageCount: number;
  text: string;
  /** Première proposition de contenu déduite du texte (à corriger par l'humain). */
  guess: {
    title: string | null;
    clientName: string | null;
    totalAmountCents: number | null;
    lines: string[];
  };
}

export async function extractPdfText(file: File): Promise<PdfExtractionResult> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url"))
    .default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;

  let text = "";
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    text += pageText + "\n";
  }
  const pageCount = pdf.numPages;
  await loadingTask.destroy();

  const cleaned = text.replace(/[ \t]+/g, " ").trim();
  const hasText = cleaned.length > 40;

  return {
    hasText,
    pageCount,
    text: cleaned,
    guess: hasText ? guessFromText(cleaned) : emptyGuess(),
  };
}

function emptyGuess(): PdfExtractionResult["guess"] {
  return { title: null, clientName: null, totalAmountCents: null, lines: [] };
}

/**
 * Heuristiques simples et honnêtes : le MVP ne prétend pas extraire
 * parfaitement tous les devis — tout est vérifié par l'utilisateur.
 */
export function guessFromText(text: string): PdfExtractionResult["guess"] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  // Montant : on prend le plus grand montant « TTC » sinon le plus grand tout court.
  const amountRegex =
    /(\d{1,3}(?:[ \u00a0\u202f.]\d{3})*(?:[.,]\d{1,2})?)\s*€/g;
  let best: number | null = null;
  let bestTtc: number | null = null;
  for (const match of text.matchAll(amountRegex)) {
    let raw = match[1].replace(/[ \u00a0\u202f]/g, "");
    // Points utilisés comme séparateurs de milliers (« 7.900,50 »).
    if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(raw)) {
      raw = raw.replace(/\./g, "");
    }

    const value = Math.round(parseFloat(raw.replace(",", ".")) * 100);
    if (!Number.isFinite(value)) continue;
    const context = text
      .slice(Math.max(0, (match.index ?? 0) - 40), (match.index ?? 0) + 20)
      .toLowerCase();
    if (context.includes("ttc") || context.includes("total")) {
      if (bestTtc === null || value > bestTtc) bestTtc = value;
    }
    if (best === null || value > best) best = value;
  }

  // Titre : ligne contenant « devis » ou première ligne significative.
  const titleLine =
    lines.find((line) => /devis/i.test(line) && line.length < 120) ??
    lines.find((line) => line.length > 10 && line.length < 120) ??
    null;

  // Client : ligne après « client », « à l'attention de », « Monsieur/Madame ».
  let clientName: string | null = null;
  const clientMatch = text.match(
    /(?:client|à l'attention de|attention de)\s*:?\s*((?:M\.|Mme|Monsieur|Madame)?\s*[A-ZÀ-Ý][\p{L}' -]{2,60})/iu,
  );
  if (clientMatch) clientName = clientMatch[1].trim();
  else {
    const civMatch = text.match(
      /(?:Monsieur|Madame|M\.|Mme)\s+([A-ZÀ-Ý][\p{L}' -]{2,60})/u,
    );
    if (civMatch) clientName = civMatch[0].trim();
  }

  return {
    title: titleLine,
    clientName,
    totalAmountCents: bestTtc ?? best,
    lines: lines.slice(0, 80),
  };
}
