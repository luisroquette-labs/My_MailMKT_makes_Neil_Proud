
export type FormatoDePasso = "lesson" | "letter" | "echo";

export interface PassoDeSequencia {
  dia: number;
  formato: FormatoDePasso;
  funcao: string;
}

export const SEQUENCIA_25_DIAS: readonly PassoDeSequencia[] = [
  { dia: 0, formato: "lesson", funcao: "welcome" },
  { dia: 1, formato: "letter", funcao: "big_idea" },
  { dia: 3, formato: "lesson", funcao: "deepen_problem" },
  { dia: 5, formato: "echo", funcao: "evidence" },
  { dia: 7, formato: "lesson", funcao: "self_service_tool" },
  { dia: 9, formato: "letter", funcao: "conversion_offer" },
  { dia: 12, formato: "echo", funcao: "objection_and_cost_of_delay" },
  { dia: 14, formato: "lesson", funcao: "how_to_evaluate_any_provider" },
  { dia: 18, formato: "letter", funcao: "final_call" },
  { dia: 25, formato: "echo", funcao: "reengage" },
] as const;

export const FORMATOS_PERMITIDOS: readonly FormatoDePasso[] = ["lesson", "letter", "echo"];

export function passoDadoDiaDesdeCadastro(diasDesde: number): PassoDeSequencia | null {
  if (diasDesde < 0) return null;
  const passo = SEQUENCIA_25_DIAS.find((p) => p.dia === diasDesde);
  return passo ?? null;
}

export const COPY_SEED: Record<string, { subject: string; corpo: string }> = {
  welcome: {
    subject: "{{lead.firstName}}, comece por aqui",
    corpo:
      "Bem-vindo(a), {{lead.firstName}}. Nesta série, você vai aprender algo útil em cada e-mail — e só depois eu apresento a oferta.",
  },
  big_idea: {
    subject: "A ideia que muda o jogo",
    corpo:
      "Hoje eu nomeio a ideia central: aplicar IA nos processos de marketing não é sobre ferramentas, é sobre sequência.",
  },
  conversion_offer: {
    subject: "A oferta com menor atrito possível",
    corpo: "Se esta série fez sentido até aqui, este é o passo natural. Sem compromisso.",
  },
};
