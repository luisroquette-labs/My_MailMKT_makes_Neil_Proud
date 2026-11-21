import type { LinhaLogDeEnvio } from "./contratos";
import type { RegrasThrottle } from "./config";


const TIMEZONE = "America/Sao_Paulo";

const FORMATADOR_DIA_LOCAL = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export interface EstadoThrottle {
  enviadosPorEmail: Map<string, string[]>;
}

function diaLocal(iso: string): string {
  return FORMATADOR_DIA_LOCAL.format(new Date(iso));
}

export function carregarEstadoThrottle(
  log: LinhaLogDeEnvio[],
  regras: RegrasThrottle,
  agoraIso: string,
): EstadoThrottle {
  const janelaMs = Math.max(24 * 60 * 60 * 1000, regras.minHorasEntreEnvios * 60 * 60 * 1000);
  const corte = new Date(agoraIso).getTime() - janelaMs;
  const enviadosPorEmail = new Map<string, string[]>();
  for (const linha of log) {
    const quando = new Date(linha.sentAt).getTime();
    if (!Number.isFinite(quando) || quando < corte) continue;
    const email = linha.email.trim().toLowerCase();
    if (!email) continue;
    const lista = enviadosPorEmail.get(email) ?? [];
    lista.push(linha.sentAt);
    enviadosPorEmail.set(email, lista);
  }
  return { enviadosPorEmail };
}

export function podeReceber(
  estado: EstadoThrottle,
  email: string,
  regras: RegrasThrottle,
  agoraIso: string,
): { permitido: true } | { permitido: false; motivo: "limite_por_dia" | "intervalo_minimo" } {
  const normalizado = email.trim().toLowerCase();
  if (!normalizado) return { permitido: false, motivo: "limite_por_dia" };

  const enviados = estado.enviadosPorEmail.get(normalizado) ?? [];
  if (enviados.length === 0) return { permitido: true };

  const diaDeAgora = diaLocal(agoraIso);
  const noDia = enviados.filter((iso) => diaLocal(iso) === diaDeAgora);
  if (noDia.length >= regras.maxPorLeadPorDia) {
    return { permitido: false, motivo: "limite_por_dia" };
  }

  const maisRecente = enviados
    .map((iso) => new Date(iso).getTime())
    .filter((t) => Number.isFinite(t))
    .reduce((a, b) => Math.max(a, b), -Infinity);
  const agora = new Date(agoraIso).getTime();
  if (maisRecente !== -Infinity && agora - maisRecente < regras.minHorasEntreEnvios * 60 * 60 * 1000) {
    return { permitido: false, motivo: "intervalo_minimo" };
  }

  return { permitido: true };
}

export function aplicarEnvio(estado: EstadoThrottle, email: string, agoraIso: string): void {
  const normalizado = email.trim().toLowerCase();
  if (!normalizado) return;
  const lista = estado.enviadosPorEmail.get(normalizado) ?? [];
  lista.push(agoraIso);
  estado.enviadosPorEmail.set(normalizado, lista);
}
