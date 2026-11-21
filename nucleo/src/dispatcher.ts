import type { DependenciasDoNucleo } from "./contratos";
import type { ConfigNurture, MotorId } from "./config";
import { alvosDaHora, agendaPadraoDe } from "./agenda";
import { carregarEstadoThrottle, type EstadoThrottle } from "./throttle";
import { PRAZO_DE_LOOP_MS, limparReservasOrfas, retomarEmailsPendentes } from "./outbox";
import { estaEmBlackout, diaPermitido } from "./regras";

export { PRAZO_DE_LOOP_MS };

export interface ResultadoDaRodada {
  motor: MotorId;
  candidatos: number;
  enviados: number;
  pulados: { email: string; motivo: string }[];
  falhas: { email: string; erro: string }[];
}

export interface ContextoDoMotor {
  config: ConfigNurture;
  throttle: EstadoThrottle;
  horarioAlvo: string;
  fusivel: { esgotado(): boolean; consumir(): boolean };
  dry: boolean;
}

export type RunnerDeMotor = (
  deps: DependenciasDoNucleo,
  ctx: ContextoDoMotor,
) => Promise<ResultadoDaRodada>;

export interface OpcoesDoDispatcher {
  dry?: boolean;
  motor?: MotorId;
  prazoMs?: number;
}

export interface ResultadoDoDispatcher {
  resultados: ResultadoDaRodada[];
  cortePorPrazo?: MotorId;
}

export async function rodarDispatcher(
  deps: DependenciasDoNucleo,
  config: ConfigNurture,
  motores: Record<MotorId, RunnerDeMotor>,
  opts?: OpcoesDoDispatcher,
): Promise<ResultadoDoDispatcher> {
  const agora = deps.relogio.agoraIso();
  const hora = deps.relogio.horaLocalHH();
  const dia = deps.relogio.diaDaSemanaLocal();

  if (!diaPermitido(dia, config.janelas.diasPermitidos)) {
    deps.log("[dispatcher] dia fora dos dias permitidos", { dia });
    return { resultados: [] };
  }
  const subHorario = config.janelas.blackout.filter(
    (b) => b.inicio.slice(0, 2) === b.fim.slice(0, 2),
  );
  if (subHorario.length > 0) {
    deps.log("[dispatcher] aviso: janela de blackout menor que 1h é ignorada pelo truncamento", {
      janelas: subHorario,
    });
  }
  if (estaEmBlackout(hora, config.janelas.blackout)) {
    deps.log("[dispatcher] blackout ativo", { hora });
    return { resultados: [] };
  }

  if (opts?.dry !== true) {
    await limparReservasOrfas(deps, agora);

    await retomarEmailsPendentes(deps, agora);
  }

  const agenda = config.agenda ?? agendaPadraoDe(config);
  let devidos = alvosDaHora(agenda, hora, dia);

  if (opts?.motor) devidos = devidos.filter((m) => m === opts.motor);
  const ordenados = config.prioridade.filter((m) => devidos.includes(m));

  const janelaMs = Math.max(
    24 * 60 * 60 * 1000,
    config.throttle.minHorasEntreEnvios * 60 * 60 * 1000,
  );
  const desde = new Date(new Date(agora).getTime() - janelaMs).toISOString();
  const logDeEnvio = await deps.repo.lerLogDeEnvio({ desde });
  const throttle = carregarEstadoThrottle(logDeEnvio, config.throttle, agora);

  let restante = config.fusivel.email;
  const fusivel = {
    esgotado: () => restante <= 0,
    consumir: () => {
      if (restante <= 0) return false;
      restante -= 1;
      return true;
    },
  };

  const prazoMs = opts?.prazoMs ?? PRAZO_DE_LOOP_MS;
  const inicio = Date.now();
  const resultados: ResultadoDaRodada[] = [];

  for (const motor of ordenados) {
    if (Date.now() - inicio >= prazoMs) {
      return { resultados, cortePorPrazo: motor };
    }
    const runner = motores[motor];
    if (!runner) {
      deps.log(`[dispatcher] motor ${motor} da hora mas sem runner registrado`);
      continue;
    }
    const resultado = await runner(deps, {
      config,
      throttle,
      horarioAlvo: hora,
      fusivel,
      dry: opts?.dry === true,
    });
    resultados.push(resultado);

    if (resultado.enviados === 0 && resultado.falhas.length > 0) {
      deps.log("[alerta] motor com 0 enviados e falhas", {
        motor: resultado.motor,
        falhas: resultado.falhas.length,
      });
    }
  }

  return { resultados };
}
