import type { ClaimView, SourceView } from "@/lib/domain/catalog-view";
import type { Lang, Messages } from "@/lib/i18n/messages";
import { formatStructuredFact } from "@/lib/i18n/format";

export type SourceNumbers = ReadonlyMap<string, number>;

export function FactCitations({
  claim,
  sourceNumbers,
  t,
}: {
  claim: Pick<ClaimView, "id" | "sources">;
  sourceNumbers?: SourceNumbers;
  t: Messages;
}) {
  if (claim.sources.length === 0) return null;

  return <span className="fact-citations" data-citation-for={claim.id} aria-label={t.officialSources}>
    {claim.sources.map((source, index) => {
      const number = sourceNumbers?.get(source.id) ?? index + 1;
      const relationship = source.relationship === "contradicts" ? t.sourceContradicts : t.sourceSupports;
      const label = `${t.officialSources} ${number}: ${source.publisher} — ${source.originalTitle}. ${relationship}; ${t.opensNewTab}`;
      return <a
        key={source.id}
        className={`fact-citation ${source.relationship}`}
        href={source.url}
        target="_blank"
        rel="noreferrer"
        title={`${source.publisher} — ${source.originalTitle}`}
        aria-label={label}
        data-source-id={source.id}
      ><span aria-hidden="true">{number}</span></a>;
    })}
  </span>;
}

export function CitedFact({
  claim,
  lang,
  sourceNumbers,
  t,
  className,
}: {
  claim: ClaimView;
  lang: Lang;
  sourceNumbers?: SourceNumbers;
  t: Messages;
  className?: string;
}) {
  return <span className={className}>
    {formatStructuredFact(claim.fact, lang)}
    <FactCitations claim={claim} sourceNumbers={sourceNumbers} t={t} />
  </span>;
}

export function makeSourceNumbers(sources: SourceView[]): SourceNumbers {
  return new Map(sources.map((source, index) => [source.id, index + 1]));
}
