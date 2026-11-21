import { montarSlug, montarUtmCampaign, montarUrlComUtms, UTM_SOURCE, UTM_MEDIUM } from "./montar-url";

export interface IntegracaoDeTracking {
  obterOuCriarLink(opts: {
    campanhaSlug: string;
    campanhaNome: string;
    destino: string;
    motor?: string;
  }): Promise<string>;

  registrarAbertura(trackingId: string): Promise<void>;
  registrarClique(trackingId: string, url: string): Promise<void>;
}

export interface OpcoesDeTracking {
  siteUrl: string;
  salvarLink: (link: {
    slug: string;
    destino: string;
    destinoRastreado: string;
    nome: string;
  }) => Promise<{ ok: true } | { ok: false; codigo?: string }>;
  atualizarLink: (slug: string, destino: string, destinoRastreado: string) => Promise<void>;
}

export function criarIntegracaoDeTracking(
  opts: OpcoesDeTracking,
  log: (msg: string, meta?: unknown) => void,
): IntegracaoDeTracking {
  return {
    async obterOuCriarLink({ campanhaSlug, campanhaNome, destino, motor }) {
      const slug = montarSlug(motor ? `${motor}-${campanhaSlug}` : campanhaSlug);
      const utmCampaign = montarUtmCampaign(motor ? `${motor}-${campanhaSlug}` : campanhaSlug);
      const destinoRastreado = montarUrlComUtms(destino, {
        source: UTM_SOURCE,
        medium: UTM_MEDIUM,
        campaign: utmCampaign,
      });
      try {
        const r = await opts.salvarLink({
          slug,
          destino,
          destinoRastreado,
          nome: `Mail Mkt · ${campanhaNome}`.slice(0, 100),
        });
        if (!r.ok && r.codigo !== "23505") {
          log("[tracklink] persistência falhou — envio segue com URL crua", {
            slug,
            codigo: r.codigo,
          });
          return destino;
        }
        if (!r.ok) {
          try {
            await opts.atualizarLink(slug, destino, destinoRastreado);
          } catch {
            log("[tracklink] refresh do destino falhou — segue com o destino registrado", { slug });
          }
        }
      } catch (erro) {
        log("[tracklink] persistência falhou — envio segue com URL crua", {
          slug,
          erro: erro instanceof Error ? erro.message : String(erro),
        });
        return destino;
      }
      return `${opts.siteUrl}/t/${slug}`;
    },
    async registrarAbertura(trackingId) {
      await registrarEvento(opts, log, { trackingId, tipo: "abertura" });
    },
    async registrarClique(trackingId, url) {
      await registrarEvento(opts, log, { trackingId, tipo: "clique", url });
    },
  };
}

async function registrarEvento(
  opts: OpcoesDeTracking,
  log: (msg: string, meta?: unknown) => void,
  ev: { trackingId: string; tipo: string; url?: string },
): Promise<void> {
  void opts;
  void ev;
  log("[tracklink] evento", ev);
}
