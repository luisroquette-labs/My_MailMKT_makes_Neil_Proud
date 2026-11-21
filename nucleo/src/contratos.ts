
export interface LeadNurture {
  id: string;
  email: string;
  name: string;
  whatsapp?: string | null;
  company?: string | null;
  role?: string | null;
  segment?: string | null;
  interest?: string | null;
  source?: string | null;
  page?: string | null;
  createdAt: string;
}

export interface LinhaLogDeEnvio {
  email: string;
  emailType: string;
  sentAt: string;
}

export interface Pagina<T> {
  itens: T[];
  temMais: boolean;
  offset: number;
}

export interface ReservaLog {
  leadId: string;
  email: string;
  emailType: string;
  sentAt: string;
}

export type ResultadoReserva = "ok" | "duplicado" | "erro";

export interface EmailParaEnviar {
  to: string;
  subject: string;
  html: string;
  emailType: string;
  trackingId?: string | null;
  idempotencyKey: string;
}

export type ResultadoEnvio = "entregue" | "falhaDefinitiva" | "ambiguo";

export interface EventoDeEmail {
  tipo: "abertura" | "clique" | "conversao";
  email: string;
  emailType: string;
  url?: string;
  em: string;
}

export interface Relogio {
  agoraIso(): string;
  horaLocalHH(): string;
  diaDaSemanaLocal(): number;
}

export interface RepositorioDeNurture {
  lerLeads(opts: { offset: number; limite: number }): Promise<Pagina<LeadNurture>>;
  lerSupressoes(): Promise<Set<string>>;
  lerLogDeEnvio(opts: { desde: string }): Promise<LinhaLogDeEnvio[]>;
  reservarNoLog(r: ReservaLog): Promise<ResultadoReserva>;
}

export interface PendenciaDaFila {
  idempotencyKey: string;
  email: EmailParaEnviar;
  criadoEm: string;
  ultimaTentativaEm: string | null;
}

export interface FilaOutbox {
  reservar(e: EmailParaEnviar): Promise<boolean>;
  reivindicar(idempotencyKey: string): Promise<EmailParaEnviar | null>;
  concluir(idempotencyKey: string): Promise<void>;
  liberar(idempotencyKey: string): Promise<void>;
  listarPendentes(): Promise<PendenciaDaFila[]>;
  removerOrfas(maisVelhasQue: string): Promise<number>;
  descartar(idempotencyKey: string): Promise<void>;
}

export interface EnviadorDeEmail {
  enviar(e: EmailParaEnviar): Promise<ResultadoEnvio>;
}

export interface RegistradorDeEventos {
  registrar(ev: EventoDeEmail): Promise<void>;
}

export interface DependenciasDoNucleo {
  repo: RepositorioDeNurture;
  fila: FilaOutbox;
  enviador: EnviadorDeEmail;
  eventos: RegistradorDeEventos;
  relogio: Relogio;
  log(msg: string, meta?: unknown): void;
}
