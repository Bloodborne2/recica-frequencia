import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { PROGRAMS, programById } from '../lib/programs'
import { computeStats, evaluate, foraDaFaixa } from '../lib/rules'
import { todayISO } from '../lib/format'
import type { Mark, Program, Session, Student } from '../types'
import { Badge, Empty, PageHeader, tone } from '../ui'

export default function Chamada() {
  const { data } = useStore()
  const [programId, setProgramId] = useState(PROGRAMS[0].id)
  const [date, setDate] = useState(todayISO())
  const program = programById(programId)!

  const roster = useMemo(
    () =>
      data.students
        .filter((s) => s.enrollments.some((e) => e.programId === programId && e.status === 'ativa'))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [data.students, programId],
  )
  const sid = `${programId}_${date}`

  return (
    <>
      <PageHeader title="Chamada" sub="Marque presença, falta ou falta abonada de cada aluno em cada aula.">
        <label className="field">
          Programa
          <select value={programId} onChange={(e) => setProgramId(e.target.value)}>
            {PROGRAMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Data da aula
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
      </PageHeader>
      <Form key={sid} program={program} date={date} roster={roster} existing={data.sessions.find((s) => s.id === sid)} />
    </>
  )
}

const OPCOES: { m: Mark; label: string }[] = [
  { m: 'P', label: 'Presente' },
  { m: 'F', label: 'Falta' },
  { m: 'A', label: 'Abonada' },
]

function Form({ program, date, roster, existing }: { program: Program; date: string; roster: Student[]; existing?: Session }) {
  const { data, dispatch } = useStore()
  const sid = `${program.id}_${date}`
  const [marks, setMarks] = useState<Record<string, Mark>>(() =>
    Object.fromEntries(roster.map((s) => [s.id, existing?.marks[s.id] ?? 'P'])),
  )
  const [canceled, setCanceled] = useState(existing?.canceled ?? false)
  const [motivo, setMotivo] = useState(existing?.motivo ?? '')
  const [saved, setSaved] = useState(false)

  const draft: Session = { id: sid, programId: program.id, date, canceled, motivo: motivo.trim() || undefined, marks }
  // Estatísticas já considerando o que está marcado agora, para o alerta aparecer antes de salvar.
  const hypo = [...data.sessions.filter((s) => s.id !== sid), draft]

  const mark = (id: string, m: Mark) => {
    setMarks((p) => ({ ...p, [id]: m }))
    setSaved(false)
  }
  const todosPresentes = () => {
    setMarks(Object.fromEntries(roster.map((s) => [s.id, 'P' as Mark])))
    setSaved(false)
  }
  const counts = { P: 0, F: 0, A: 0 }
  for (const s of roster) counts[marks[s.id] ?? 'P']++

  const dia = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  if (!roster.length)
    return (
      <Empty title={`Nenhum aluno ativo em ${program.nome}`}>
        <p>Importe a planilha ou matricule alunos neste programa na aba Alunos.</p>
      </Empty>
    )

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong style={{ textTransform: 'capitalize' }}>{dia}</strong>
            <div className="muted">
              {existing ? 'Chamada já registrada nesta data (você está editando)' : 'Nova chamada'} · {counts.P} presentes · {counts.F} faltas · {counts.A} abonadas
            </div>
          </div>
          <div className="actions">
            <button className="btn" onClick={todosPresentes} disabled={canceled}>
              Marcar todos presentes
            </button>
            <button
              className="btn p"
              onClick={() => {
                dispatch({ t: 'saveSession', session: draft })
                setSaved(true)
              }}
            >
              Salvar chamada
            </button>
          </div>
        </div>
        <div className="toolbar" style={{ margin: '12px 0 0' }}>
          <label className="check">
            <input type="checkbox" checked={canceled} onChange={(e) => { setCanceled(e.target.checked); setSaved(false) }} />
            Aula cancelada (professor ausente ou evento): ninguém recebe falta
          </label>
          {canceled && (
            <label className="field grow">
              Motivo (opcional)
              <input value={motivo} onChange={(e) => { setMotivo(e.target.value); setSaved(false) }} />
            </label>
          )}
        </div>
      </div>

      {saved && (
        <div className="msg ok" role="status">
          Chamada salva.
        </div>
      )}

      <div className="card tablewrap">
        <table>
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Frequência</th>
              <th>Situação com esta chamada</th>
              <th>Presença</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((s) => {
              const st = computeStats(s.id, program, hypo)
              const ev = evaluate(st, program)
              return (
                <tr key={s.id}>
                  <td>
                    <strong>{s.nome}</strong>
                    {foraDaFaixa(s, program, date) && (
                      <>
                        {' '}
                        <Badge tone="a">Fora dos {program.idadeMin}–{program.idadeMax} anos</Badge>
                      </>
                    )}
                  </td>
                  <td>{canceled || st.pct === null ? '—' : `${st.pct}%`}</td>
                  <td>{canceled ? <span className="muted">Aula cancelada</span> : <Badge tone={tone[ev.level]}>{ev.label}</Badge>}</td>
                  <td>
                    <div className="seg" role="group" aria-label={`Presença de ${s.nome}`}>
                      {OPCOES.map((o) => (
                        <button
                          key={o.m}
                          type="button"
                          className={`m${o.m}`}
                          aria-pressed={marks[s.id] === o.m}
                          disabled={canceled}
                          onClick={() => mark(s.id, o.m)}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
