import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react'
import type { Data, Session, Student } from '../types'

// Persistência provisória no navegador. Quando o Supabase entrar, troque só este arquivo.
const KEY = 'recica:v1'
const empty: Data = { students: [], sessions: [] }

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const d = JSON.parse(raw)
      if (Array.isArray(d.students) && Array.isArray(d.sessions)) return d as Data
    }
  } catch {
    /* sem dados salvos */
  }
  return empty
}

export type Action =
  | { t: 'addStudents'; students: Student[] }
  | { t: 'saveStudent'; student: Student }
  | { t: 'deleteStudent'; id: string }
  | { t: 'saveSession'; session: Session }
  | { t: 'addSessions'; sessions: Session[] }
  | { t: 'cancelEnrollment'; studentId: string; programId: string; data: string; motivo: string }
  | { t: 'clearDemo' }
  | { t: 'reset' }

function reducer(d: Data, a: Action): Data {
  switch (a.t) {
    case 'addStudents':
      return { ...d, students: [...d.students, ...a.students] }
    case 'saveStudent':
      return {
        ...d,
        students: d.students.some((s) => s.id === a.student.id)
          ? d.students.map((s) => (s.id === a.student.id ? a.student : s))
          : [...d.students, a.student],
      }
    case 'deleteStudent':
      return {
        students: d.students.filter((s) => s.id !== a.id),
        sessions: d.sessions.map((s) => {
          const marks = { ...s.marks }
          delete marks[a.id]
          return { ...s, marks }
        }),
      }
    case 'saveSession':
      return {
        ...d,
        sessions: d.sessions.some((s) => s.id === a.session.id)
          ? d.sessions.map((s) => (s.id === a.session.id ? a.session : s))
          : [...d.sessions, a.session],
      }
    case 'addSessions':
      return {
        ...d,
        sessions: [...d.sessions.filter((o) => !a.sessions.some((n) => n.id === o.id)), ...a.sessions],
      }
    case 'cancelEnrollment':
      return {
        ...d,
        students: d.students.map((s) =>
          s.id !== a.studentId
            ? s
            : {
                ...s,
                enrollments: s.enrollments.map((e) =>
                  e.programId === a.programId ? { ...e, status: 'cancelada', canceladaEm: a.data, motivo: a.motivo } : e,
                ),
              },
        ),
      }
    case 'clearDemo':
      return { ...d, sessions: d.sessions.filter((s) => !s.demo) }
    case 'reset':
      return empty
  }
}

const Ctx = createContext<{ data: Data; dispatch: Dispatch<Action> } | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, load)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      /* armazenamento cheio ou bloqueado */
    }
  }, [data])
  return <Ctx.Provider value={{ data, dispatch }}>{children}</Ctx.Provider>
}

export function useStore() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useStore fora do StoreProvider')
  return c
}
