export type ProgramKind = 'modalidade' | 'reforco' | 'empregabilidade'

/** Regras de cada programa. Mude aqui (ou, no futuro, numa tabela do banco) sem tocar nas telas. */
export interface Program {
  id: string
  nome: string
  kind: ProgramKind
  minPct: number // frequência mínima (%)
  margem: number // avisar quando restarem até N faltas para cair abaixo do mínimo
  seguidasAlerta: number // faltas seguidas que pedem atestado
  seguidasCancela?: number // faltas seguidas sem justificativa que cancelam a matrícula
  idadeMin?: number
  idadeMax?: number
  bolsa?: number // R$ por aluno
}

/** P = presente, F = falta, A = falta abonada (atestado) */
export type Mark = 'P' | 'F' | 'A'

export interface Enrollment {
  programId: string
  status: 'ativa' | 'cancelada'
  canceladaEm?: string
  motivo?: string
}

export interface Student {
  id: string
  nome: string
  nascimento?: string // AAAA-MM-DD
  idadeInformada?: number // quando a planilha só trouxe a idade
  responsavel: string
  telAluno: string
  telResp: string
  endereco: string
  periodo: string
  comorbidade?: string // dado sensível (LGPD, art. 11)
  enrollments: Enrollment[]
  criadoEm: string
}

export interface Session {
  id: string // `${programId}_${AAAA-MM-DD}`
  programId: string
  date: string
  canceled: boolean // aula cancelada: ninguém recebe falta
  motivo?: string
  marks: Record<string, Mark> // studentId -> marca
  demo?: boolean
}

export interface Data {
  students: Student[]
  sessions: Session[]
}
