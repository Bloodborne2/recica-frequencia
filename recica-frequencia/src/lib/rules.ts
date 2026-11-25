import type { Program, Session, Student } from '../types'
import { ageOn } from './format'
import { PROGRAMS, programById } from './programs'

/** Só alerta de percentual a partir de N chamadas, para não disparar com 1 falta no começo. */
export const MIN_AMOSTRA = 4

export interface Range {
  from?: string
  to?: string
}

export interface Stats {
  presencas: number
  faltas: number
  abonadas: number
  contadas: number // presenças + faltas (abonadas e aulas canceladas ficam de fora)
  pct: number | null
  seguidas: number // faltas seguidas sem justificativa até a última chamada
  restantes: number | null // faltas que ainda pode ter sem cair abaixo do mínimo
}

export function computeStats(studentId: string, program: Program, sessions: Session[], range: Range = {}): Stats {
  const all = sessions
    .filter((s) => s.programId === program.id && !s.canceled && s.marks[studentId])
    .sort((a, b) => a.date.localeCompare(b.date))

  // Falta abonada ou presença interrompe a sequência de faltas sem justificativa.
  let seguidas = 0
  for (const s of all) seguidas = s.marks[studentId] === 'F' ? seguidas + 1 : 0

  let p = 0, f = 0, a = 0
  for (const s of all) {
    if ((range.from && s.date < range.from) || (range.to && s.date > range.to)) continue
    const m = s.marks[studentId]
    if (m === 'P') p++
    else if (m === 'F') f++
    else a++
  }
  const n = p + f
  const min = program.minPct / 100
  return {
    presencas: p,
    faltas: f,
    abonadas: a,
    contadas: n,
    pct: n ? Math.round((p / n) * 1000) / 10 : null,
    seguidas,
    restantes: n ? Math.max(0, Math.floor(p / min - n + 1e-9)) : null,
  }
}

export type Level = 'sem-dados' | 'ok' | 'atestado' | 'proximo' | 'abaixo' | 'cancelar'

export interface Evaluation {
  level: Level
  label: string
  peso: number // ordenação: maior = mais urgente
}

export function evaluate(st: Stats, pg: Program): Evaluation {
  if (st.contadas === 0) return { level: 'sem-dados', label: 'Sem chamadas', peso: 0 }
  if (pg.seguidasCancela && st.seguidas >= pg.seguidasCancela)
    return { level: 'cancelar', label: `${st.seguidas} faltas seguidas: avaliar cancelamento`, peso: 5 }
  const amostra = st.contadas >= MIN_AMOSTRA
  if (amostra && (st.pct ?? 100) < pg.minPct)
    return { level: 'abaixo', label: `Abaixo de ${pg.minPct}%`, peso: 4 }
  if (amostra && st.restantes !== null && st.restantes <= pg.margem)
    return {
      level: 'proximo',
      label:
        st.restantes === 0
          ? `No limite: a próxima falta deixa abaixo de ${pg.minPct}%`
          : `Perto do limite: pode faltar mais ${st.restantes} ${st.restantes === 1 ? 'vez' : 'vezes'}`,
      peso: 3,
    }
  if (st.seguidas >= pg.seguidasAlerta)
    return { level: 'atestado', label: `${st.seguidas} faltas seguidas: pedir atestado`, peso: 2 }
  return { level: 'ok', label: 'Em dia', peso: 1 }
}

export type Bolsa = 'sem-dados' | 'mantida' | 'risco' | 'perdida'

export function bolsaStatus(ev: Evaluation): Bolsa {
  if (ev.level === 'sem-dados') return 'sem-dados'
  if (ev.level === 'abaixo' || ev.level === 'cancelar') return 'perdida'
  if (ev.level === 'proximo') return 'risco'
  return 'mantida'
}

export const idade = (s: Student, ref: string) => (s.nascimento ? ageOn(s.nascimento, ref) : s.idadeInformada)

export function foraDaFaixa(s: Student, pg: Program, ref: string) {
  if (pg.idadeMin === undefined) return false
  const i = idade(s, ref)
  return i !== undefined && (i < pg.idadeMin || i > (pg.idadeMax ?? 200))
}

export interface Row {
  student: Student
  program: Program
  stats: Stats
  ev: Evaluation
}

export function buildRows(students: Student[], sessions: Session[], programId: string, range: Range): Row[] {
  const rows: Row[] = []
  for (const s of students)
    for (const e of s.enrollments) {
      if (e.status !== 'ativa' || (programId !== 'all' && e.programId !== programId)) continue
      const program = programById(e.programId)
      if (!program) continue
      const stats = computeStats(s.id, program, sessions, range)
      rows.push({ student: s, program, stats, ev: evaluate(stats, program) })
    }
  const ordem = (r: Row) => PROGRAMS.findIndex((p) => p.id === r.program.id)
  return rows.sort(
    (a, b) =>
      b.ev.peso - a.ev.peso ||
      (a.stats.pct ?? 101) - (b.stats.pct ?? 101) ||
      ordem(a) - ordem(b) ||
      a.student.nome.localeCompare(b.student.nome, 'pt-BR'),
  )
}
