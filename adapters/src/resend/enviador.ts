import type { EmailParaEnviar, EnviadorDeEmail, ResultadoEnvio } from "@mymailmkt/nucleo";


export interface ClienteResend {
  emails: {
    send(payload: Record<string, unknown>): Promise<{ id?: string; error?: unknown }>;
  };
}

export interface OpcoesDoResend {
  cliente: ClienteResend;
  from: string;
  replyTo?: string;
  siteUrl: string;
  tokenDeDescadastro(email: string): string;
}

export function criarEnviadorResend(opts: OpcoesDoResend): EnviadorDeEmail {
  return {
    async enviar(e: EmailParaEnviar): Promise<ResultadoEnvio> {
      const unsubscribeUrl = `${opts.siteUrl}/unsubscribe?token=${opts.tokenDeDescadastro(e.to)}`;
      const emailDeResposta = (opts.replyTo ?? opts.from).match(/<([^>]+)>/)?.[1] ?? (opts.replyTo ?? opts.from).trim();
      try {
        const r = await opts.cliente.emails.send({
          from: opts.from,
          ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
          to: [e.to],
          subject: e.subject,
          html: e.html,
          headers: {
            "List-Unsubscribe": `<mailto:${emailDeResposta}?subject=unsubscribe>, <${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
        if (r.error) {
          return classificarErro(r.error);
        }
        return "entregue";
      } catch (erro) {
        return classificarErro(erro);
      }
    },
  };
}

function classificarErro(erro: unknown): ResultadoEnvio {
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  const status = (erro as { statusCode?: number })?.statusCode;

  if (status && status >= 400 && status < 500 && status !== 429) {
    return "falhaDefinitiva";
  }
  return "ambiguo";
}
