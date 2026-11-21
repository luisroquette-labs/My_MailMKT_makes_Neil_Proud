import type { EnviadorDeEmail, FilaOutbox, EmailParaEnviar, DependenciasDoNucleo } from "./contratos";


export const LEASE_MS = 5 * 60 * 1000;

export const DEAD_LETTER_MS = 23 * 60 * 60 * 1000;

export const PRAZO_DE_LOOP_MS = 240_000;

export function prazoDeRetomada(agoraIso: string): string {
  return new Date(new Date(agoraIso).getTime() - DEAD_LETTER_MS).toISOString();
}

export type ResultadoDoOutbox =
  | { resultado: "enviado" }
  | { resultado: "reagendado"; detalhe?: string }
  | { resultado: "sem_fila"; detalhe?: string };

export async function enviarComOutbox(
  deps: { fila: FilaOutbox; enviador: EnviadorDeEmail; log(msg: string, meta?: unknown): void },
  e: EmailParaEnviar,
): Promise<ResultadoDoOutbox> {
  const reservado = await deps.fila.reservar(e);
  if (!reservado) {
    return { resultado: "sem_fila", detalhe: "outbox recusou a reserva" };
  }

  const resultado = await deps.enviador.enviar(e);
  if (resultado === "entregue") {
    await deps.fila.concluir(e.idempotencyKey);
    return { resultado: "enviado" };
  }

  if (resultado === "falhaDefinitiva") {
    await deps.fila.liberar(e.idempotencyKey);
    return { resultado: "reagendado", detalhe: "falha definitiva — liberado para retry" };
  }

  deps.log("[outbox] resultado ambíguo — reserva preservada (fail-closed)", {
    idempotencyKey: e.idempotencyKey,
  });
  return { resultado: "reagendado", detalhe: "resultado ambíguo — reserva preservada" };
}

export const ORFAO_MS = 60 * 60 * 1000;

export async function limparReservasOrfas(deps: DependenciasDoNucleo, agoraIso: string): Promise<number> {
  const corte = new Date(new Date(agoraIso).getTime() - ORFAO_MS).toISOString();
  const removidas = await deps.fila.removerOrfas(corte);
  if (removidas > 0) {
    deps.log("[outbox] reservas órfãs removidas", { removidas });
  }
  return removidas;
}

export const RETRY_MINIMO_MS = 20 * 60 * 60 * 1000;

export async function retomarEmailsPendentes(
  deps: DependenciasDoNucleo,
  agoraIso: string,
): Promise<{ retomadas: number; deadLetters: number }> {
  const pendentes = await deps.fila.listarPendentes();
  const supressoes = await deps.repo.lerSupressoes();
  const agora = new Date(agoraIso).getTime();
  let retomadas = 0;
  let deadLetters = 0;

  for (const p of pendentes) {
    const idadeMs = agora - new Date(p.criadoEm).getTime();
    if (idadeMs >= DEAD_LETTER_MS) {
      deadLetters += 1;
      deps.log("[alerta] outbox dead-letter (>23h)", { idempotencyKey: p.idempotencyKey });
      await deps.fila.descartar(p.idempotencyKey);
      continue;
    }
    if (p.ultimaTentativaEm) {
      const desdeTentativa = agora - new Date(p.ultimaTentativaEm).getTime();
      if (desdeTentativa < RETRY_MINIMO_MS) continue;
    }
    const reivindicado = await deps.fila.reivindicar(p.idempotencyKey);
    if (!reivindicado) continue;

    if (supressoes.has(reivindicado.to.trim().toLowerCase())) {
      await deps.fila.liberar(p.idempotencyKey);
      deps.log("[outbox] retomada pulada por opt-out", { idempotencyKey: p.idempotencyKey });
      continue;
    }

    const resultado = await deps.enviador.enviar(reivindicado);
    if (resultado === "entregue") {
      await deps.fila.concluir(p.idempotencyKey);
      retomadas += 1;
    } else if (resultado === "falhaDefinitiva") {
      await deps.fila.liberar(p.idempotencyKey);
    }
    // ambiguous: fail closed, reservation preserved, next round tries again.
  }

  return { retomadas, deadLetters };
}
