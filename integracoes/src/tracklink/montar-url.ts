
export const SLUG_PREFIX = "mailmkt-";
export const CAMPAIGN_PREFIX = "mailmkt_";
export const UTM_SOURCE = "mailmkt";
export const UTM_MEDIUM = "email";
const SLUG_MAX_LENGTH = 80;
const UTM_CAMPAIGN_MAX_LENGTH = 120;
const URL_MAX_LENGTH = 4096;

function normalizar(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function montarSlug(slugDaCampanha: string): string {
  const completo = `${SLUG_PREFIX}${normalizar(slugDaCampanha)}`;
  if (completo.length <= SLUG_MAX_LENGTH) return completo;
  const cabeca = completo.slice(0, 55);
  const cauda = completo.slice(-24);
  return `${cabeca}-${cauda}`.replace(/-+$/g, "");
}

export function hashCurto(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function hashCurtoDestino(url: string): string {
  return `${hashCurto(url)}-${normalizar(url).slice(0, 8)}`;
}

export function montarUtmCampaign(slugDaCampanha: string): string {
  return `${CAMPAIGN_PREFIX}${normalizar(slugDaCampanha)}`.slice(0, UTM_CAMPAIGN_MAX_LENGTH);
}

export function montarUrlComUtms(
  destino: string,
  u: { source: string; medium: string; campaign: string },
): string {
  try {
    const url = new URL(destino);
    url.searchParams.set("utm_source", u.source);
    url.searchParams.set("utm_medium", u.medium);
    url.searchParams.set("utm_campaign", u.campaign);
    const final = url.toString();
    if (final.length > URL_MAX_LENGTH) return destino;
    return final;
  } catch {
    return destino;
  }
}

export function embrulharLinksDoHtml(html: string, mapeamento: (url: string) => string): string {
  return html.replace(/<a\b[^>]*href=(?:"([^"]*)"|'([^']*)')/gi, (tag, dupla?: string, simples?: string) => {
    const cru = (dupla ?? simples ?? "").trim();
    if (!cru) return tag;
    if (/^mailto:/i.test(cru)) return tag;
    if (/\/unsubscribe/i.test(cru)) return tag;
    const novo = mapeamento(cru);
    return tag.replace(cru, () => novo);
  });
}
