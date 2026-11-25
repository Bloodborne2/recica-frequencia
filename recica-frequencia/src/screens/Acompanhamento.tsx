import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { PROGRAMS } from '../lib/programs'
import { bolsaStatus, buildRows, foraDaFaixa, type Bolsa } from '../lib/rules'
import { demoSessions } from '../lib/demo'
import { todayISO } from '../lib/format'
import { Badge, Empty, PageHeader, tone } from '../ui'

const bolsaTxt: Record<Bolsa, [string, string]> = {
  mantida: ['g', 'Mantida'],
  risco: ['a', 'Em risco'],
  perdida: ['r', 'Perde a bolsa'],
  'sem-dados': ['neutral', '—'],
}

export default function Acompanhamento() {
  const { data, dispatch } = useStore()
  const [pf, setPf] = useState('all')
  const [month, setMonth] = useState('all')
  const [soAlertas, setSoAlertas] = useState(true)
  const today = todayISO()

  const months = useMemo(() => [...new Set(data.sessions.map((s) => s.date.slice(0, 7)))].sort().reverse(), [data.sessions])
  const rows = useMemo(
    () => buildRows(data.students, data.sessions, pf, month === 'all' ? {} : { from: `${month}-01`, to: `${month}-31` }),
    [data.students, data.sessions, pf, month],
  )
  const visiveis = soAlertas ? rows.filter((r) => r.ev.peso >= 2) : rows
  const conta = (l: string) => rows.filter((r) => r.ev.level === l).length
  const bolsistas = rows.filter((r) => r.program.bolsa && r.ev.level !== 'sem-dados')
  const mantidas = bolsistas.filter((r) => bolsaStatus(r.ev) === 'mantida')
  const valorBolsa = mantidas.reduce((t, r) => t + (r.program.bolsa ?? 0), 0)
  const hasBolsa = visiveis.some((r) => r.program.bolsa)
  const temDemo = data.sessions.some((s) => s.demo)

  function cancelar(studentId: string, programId: string, nome: string, programa: string, seguidas: number) {
    if (!window.confirm(`Cancelar a matrícula de ${nome} em ${programa}?`)) return
    dispatch({ t: 'cancelEnrollment', studentId, programId, data: today, motivo: `${seguidas} faltas seguidas sem justificativa` })
  }

  return (
    <>
      <PageHeader title="Acompanhamento" sub="Quem está perto de bater o limite de faltas e quem já passou dele.">
        <label className="field">
          Programa
          <select value={pf} onChange={(e) => setPf(e.target.value)}>
            <option value="all">Todos</option>
            {PROGRAMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Período
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="all">Todo o período</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {m.split('-').reverse().join('/')}
              </option>
            ))}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={soAlertas} onChange={(e) => setSoAlertas(e.target.checked)} />
          Mostrar só alertas
        </label>
      </PageHeader>

      {data.sessions.length === 0 ? (
        <Empty title="Ainda não há chamadas registradas">
          <p>Faça a primeira chamada na aba Chamada. Os alertas aparecem a partir da 4ª aula de cada aluno.</p>
          {data.students.length > 0 && (
            <button className="btn" onClick={() => dispatch({ t: 'addSessions', sessions: demoSessions(data.students, today) })}>
              Gerar chamadas de exemplo para testar
            </button>
          )}
        </Empty>
      ) : (
        <>
          <div className="cards">
            <div className="card"><div className="k">A cancelar (10 seguidas)</div><div className="v" style={{ color: 'var(--r)' }}>{conta('cancelar')}</div></div>
            <div className="card"><div className="k">Abaixo do mínimo</div><div className="v" style={{ color: 'var(--r)' }}>{conta('abaixo')}</div></div>
            <div className="card"><div className="k">Perto do limite</div><div className="v" style={{ color: 'var(--a)' }}>{conta('proximo')}</div></div>
            <div className="card"><div className="k">Atestado pendente</div><div className="v">{conta('atestado')}</div></div>
            {bolsistas.length > 0 && (
              <div className="card">
                <div className="k">Bolsas mantidas</div>
                <div className="v">{mantidas.length} de {bolsistas.length}</div>
                <div className="muted">R$ {valorBolsa.toLocaleString('pt-BR')} no período</div>
              </div>
            )}
          </div>

          <div className="card tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Programa</th>
                  <th>Frequência</th>
                  <th>Pres. / Faltas / Abon.</th>
                  <th>Pode faltar mais</th> 
                  <th>Seguidas</th>
                  <th>Situação</th>
                  {hasBolsa && <th>Bolsa</th>}
                  <th />
                </tr>
              </thead>
              <tbody>
                {visiveis.map((r) => {
                  const t = tone[r.ev.level]
                  const [bt, bl] = bolsaTxt[bolsaStatus(r.ev)]
                  return (
                    <tr key={r.student.id + r.program.id}>
                      <td>
                        <strong>{r.student.nome}</strong>
                        {foraDaFaixa(r.student, r.program, today) && (
                          <div><Badge tone="a">Fora dos {r.program.idadeMin}–{r.program.idadeMax} anos</Badge></div>
                        )}
                      </td>
                      <td>{r.program.nome}</td>
                      <td>
                        {r.stats.pct === null ? '—' : (
                          <>
                            <span className="bar" aria-hidden="true"><i className={t === 'neutral' ? 'g' : t} style={{ width: `${r.stats.pct}%` }} /></span>
                            {r.stats.pct}%
                          </>
                        )}
                      </td>
                      <td>{r.stats.presencas} / {r.stats.faltas} / {r.stats.abonadas}</td>
                      <td>{r.stats.restantes ?? '—'}</td>
                      <td>{r.stats.seguidas}</td>
                      <td><Badge tone={t}>{r.ev.label}</Badge></td>
                      {hasBolsa && <td>{r.program.bolsa ? <Badge tone={bt}>{bl}</Badge> : <span className="muted">—</span>}</td>}
                      <td>
                        {r.ev.level === 'cancelar' && (
                          <button className="btn sm d" onClick={() => cancelar(r.student.id, r.program.id, r.student.nome, r.program.nome, r.stats.seguidas)}>
                            Cancelar matrícula
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {visiveis.length === 0 && (
                  <tr>
                    <td colSpan={9} className="muted">Nenhum aluno em alerta neste filtro.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="legend">
            Frequência = presenças ÷ (presenças + faltas). Falta abonada e aula cancelada não entram na conta. Os alertas de percentual só aparecem a partir de 4 aulas. “Pode faltar mais” é quantas faltas o aluno ainda tem antes de cair abaixo do mínimo. Falta abonada ou presença zera a contagem de faltas seguidas.
            {temDemo && (
              <>
                {' '}
                <button className="btn sm" onClick={() => dispatch({ t: 'clearDemo' })}>Remover chamadas de exemplo</button>
              </>
            )}
          </p>
        </>
      )}
    </>
  )
}
