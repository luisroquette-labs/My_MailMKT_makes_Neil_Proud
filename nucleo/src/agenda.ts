import type { ConfigNurture, AgendaEntrada, MotorId } from "./config";


export function agendaPadraoDe(config: ConfigNurture): AgendaEntrada[] {
  const dias = [0, 1, 2, 3, 4, 5, 6];
  const entradas: AgendaEntrada[] = [];
  for (const motor of config.prioridade) {
    const hora = config.horarios[motor as MotorId];
    if (!hora) continue;
    entradas.push({ dias, horas: [hora], alvo: motor as MotorId });
  }
  return entradas;
}

export function alvosDaHora(
  agenda: AgendaEntrada[],
  horaLocal: string,
  diaDaSemana: number,
): MotorId[] {
  const alvos: MotorId[] = [];
  for (const entrada of agenda) {
    if (!entrada.dias.includes(diaDaSemana)) continue;
    const horasTruncadas = entrada.horas.map((h) => h.slice(0, 2));
    if (horasTruncadas.includes(horaLocal.slice(0, 2))) {
      alvos.push(entrada.alvo);
    }
  }
  return alvos;
}
