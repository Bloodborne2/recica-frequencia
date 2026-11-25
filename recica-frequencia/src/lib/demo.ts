import type { Mark, Session, Student } from '../types'
import { addDays } from './format'
import { PROGRAMS } from './programs'

/** Gera 12 semanas de chamadas fictícias para ver os alertas funcionando. Marcadas com demo:true. */
export function demoSessions(students: Student[], today: string): Session[] {
  let seed = 7
  const rnd = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const out: Session[] = []
  for (const pg of PROGRAMS) {
    const roster = students.filter((s) => s.enrollments.some((e) => e.programId === pg.id && e.status === 'ativa'))
    if (!roster.length) continue
    for (let w = 12; w >= 1; w--) {
      const date = addDays(today, -7 * w)
      const marks: Record<string, Mark> = {}
      roster.forEach((s, i) => {
        let m: Mark = rnd() < 0.1 ? 'F' : 'P'
        if (rnd() < 0.04) m = 'A'
        if (i % 5 === 1 && w <= 3) m = 'F' // 3 faltas seguidas
        if (i % 5 === 2 && rnd() < 0.3) m = 'F' // perto/abaixo do limite
        if (i % 9 === 4 && pg.seguidasCancela && w <= pg.seguidasCancela) m = 'F' // 10 seguidas
        marks[s.id] = m
      })
      out.push({ id: `${pg.id}_${date}`, programId: pg.id, date, canceled: w === 6, marks: w === 6 ? {} : marks, demo: true })
    }
  }
  return out
}
