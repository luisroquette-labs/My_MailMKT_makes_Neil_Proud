import type { LeadNurture } from "@mymailmkt/nucleo";


export interface CampanhaDeMarketing {
  id: string;
  slug: string;
  name: string;
  offerName: string;
  offerUrl: string;
  objective: string;
  audience: string;
  status: "active" | "paused" | "completed";
  cadence: "hourly" | "daily" | "weekly";
  weekdays: number[];
  timezone: string;
  startDate: string;
  endDate: string | null;
  nextSendOn: string | null;
  sendIndex: number;
  sentOccurrences: number;
  lastSentOn: string | null;
  pausedAt: string | null;
  throttleExempt: boolean | null;
  intervalDays: number;
  sendHour: string;
  audienceFilter: {
    segmentos?: string[];
    fontes?: string[];
    idadeMinimaDias?: number;
  } | null;
}

export function estaAtivaNaHora(
  c: CampanhaDeMarketing,
  horaLocal: string,
  diaDaSemana: number,
  diaLocalISO: string,
): boolean {
  if (c.status !== "active") return false;
  if (c.startDate > diaLocalISO) return false;
  if (c.endDate && c.endDate < diaLocalISO) return false;
  if (!c.weekdays.includes(diaDaSemana)) return false;
  if (c.sendHour.slice(0, 2) !== horaLocal.slice(0, 2)) return false;
  return true;
}

export function ocorrenciaId(
  c: CampanhaDeMarketing,
  horaLocal: string,
  diaLocalISO: string,
): string {
  const hora = horaLocal.slice(0, 2);
  if (c.cadence === "hourly") return `${diaLocalISO}-${hora}`;
  return diaLocalISO;
}

export function candidatos(
  c: CampanhaDeMarketing,
  leads: LeadNurture[],
  agoraIso: string,
): LeadNurture[] {
  const f = c.audienceFilter;
  if (!f) return leads;

  return leads.filter((l) => {
    if (f.segmentos && f.segmentos.length > 0) {
      if (!l.segment || !f.segmentos.includes(l.segment)) return false;
    }
    if (f.fontes && f.fontes.length > 0) {
      if (!l.source || !f.fontes.includes(l.source)) return false;
    }
    if (f.idadeMinimaDias !== undefined) {
      const criado = new Date(l.createdAt).getTime();
      if (!Number.isFinite(criado)) return false;
      const idadeDias = (new Date(agoraIso).getTime() - criado) / (24 * 60 * 60 * 1000);
      if (idadeDias < f.idadeMinimaDias) return false;
    }
    return true;
  });
}
