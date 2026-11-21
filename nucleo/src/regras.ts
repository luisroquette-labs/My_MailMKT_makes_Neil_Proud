import type { JanelaDeBlackout } from "./config";


export function estaEmBlackout(horaHH: string, blackout: JanelaDeBlackout[]): boolean {
  const h = horaHH.slice(0, 2);
  const agora = Number(h);
  if (!Number.isFinite(agora)) return false;

  for (const janela of blackout) {
    const ini = Number(janela.inicio.slice(0, 2));
    const fim = Number(janela.fim.slice(0, 2));
    if (!Number.isFinite(ini) || !Number.isFinite(fim)) continue;
    if (ini === fim) continue;
    const dentro = ini < fim ? agora >= ini && agora < fim : agora >= ini || agora < fim;
    if (dentro) return true;
  }
  return false;
}

export function diaPermitido(diaDaSemana: number, diasPermitidos: number[]): boolean {
  return diasPermitidos.includes(diaDaSemana);
}
