import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useStore } from '../lib/store'
import { PROGRAMS, programById } from '../lib/programs'
import { norm, todayISO, uid } from '../lib/format'
import { foraDaFaixa, idade } from '../lib/rules'
import type { Student } from '../types'
import { Badge, Empty, PageHeader } from '../ui'

const blank = (): Student => ({
  id: uid(),
  nome: '',
  responsavel: '',
  telAluno: '',
  telResp: '',
  endereco: '',
  periodo: 'Manhã',
  enrollments: [],
  criadoEm: todayISO(),
})

export default function Alunos() {
  const { data } = useStore()
  const [q, setQ] = useState('')
  const [pf, setPf] = useState('all')
  const [editing, setEditing] = useState<Student | null>(null)
  const today = todayISO()

  const list = useMemo(
    () =>
      data.students
        .filter(
          (s) =>
            norm(s.nome).includes(norm(q)) &&
            (pf === 'all' || s.enrollments.some((e) => e.programId === pf && e.status === 'ativa')),
        )
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [data.students, q, pf],
  )

  return (
    <>
      <PageHeader title="Alunos" sub={`${data.students.length} cadastrados`}>
        <button className="btn p" onClick={() => setEditing(blank())}>
          Novo aluno
        </button>
      </PageHeader>

      <div className="toolbar">
        <label className="field grow">
          Buscar por nome
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Digite parte do nome" />
        </label>
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
      </div>

      {data.students.length === 0 ? (
        <Empty title="Nenhum aluno cadastrado">
          <p>Importe a planilha de matrículas na aba “Importar planilha” ou cadastre um aluno manualmente.</p>
          <button className="btn p" onClick={() => setEditing(blank())}>
            Novo aluno
          </button>
        </Empty>
      ) : (
        <div className="card tablewrap">
          <table>
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Idade</th>
                <th>Responsável</th>
                <th>Período</th>
                <th>Detalhe da saúde</th>
                <th>Programas</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.nome}</strong>
                    {s.comorbidade && (
                      <>
                        {' '}
                        <Badge tone="neutral">Observação de saúde</Badge>
                      </>
                    )}
                  </td>
                  <td>{idade(s, today) ?? '—'}</td>
                  <td>
                    {s.responsavel || '—'}
                    <div className="muted">{s.telResp || s.telAluno || 'sem telefone'}</div>
                  </td>
                  <td>{s.periodo || '—'}</td>
                  <td style={{ maxWidth: 260 }}>
                    {s.comorbidade ?? <span className="muted">—</span>}
                  </td>
                  <td>
                    <div className="chips">
                      {s.enrollments.map((e) => (
                        <Badge key={e.programId} tone={e.status === 'ativa' ? 'neutral' : 'r'}>
                          {programById(e.programId)?.nome}
                          {e.status === 'cancelada' ? ' (cancelada)' : ''}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td>
                    <button className="btn sm" onClick={() => setEditing(s)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    Nenhum aluno encontrado com esse filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && <StudentDialog key={editing.id} student={editing} isNew={!data.students.some((s) => s.id === editing.id)} onClose={() => setEditing(null)} />}
    </>
  )
}

function StudentDialog({ student, isNew, onClose }: { student: Student; isNew: boolean; onClose: () => void }) {
  const { dispatch } = useStore()
  const ref = useRef<HTMLDialogElement>(null)
  const [d, setD] = useState<Student>(student)
  const today = todayISO()

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const set = <K extends keyof Student>(k: K, v: Student[K]) => setD((p) => ({ ...p, [k]: v }))
  const ativa = (id: string) => d.enrollments.some((e) => e.programId === id && e.status === 'ativa')

  const toggle = (id: string) =>
    setD((p) => {
      const ex = p.enrollments.find((e) => e.programId === id)
      if (ex?.status === 'ativa') return { ...p, enrollments: p.enrollments.filter((e) => e.programId !== id) }
      if (ex) return { ...p, enrollments: p.enrollments.map((e) => (e.programId === id ? { programId: id, status: 'ativa' } : e)) }
      return { ...p, enrollments: [...p.enrollments, { programId: id, status: 'ativa' }] }
    })

  const emprego = programById('empregabilidade')!
  const avisoFaixa = ativa('empregabilidade') && foraDaFaixa(d, emprego, today)

  function save(e: FormEvent) {
    e.preventDefault()
    if (!d.nome.trim()) return
    dispatch({
      t: 'saveStudent',
      student: { ...d, nome: d.nome.trim(), idadeInformada: d.nascimento ? undefined : d.idadeInformada },
    })
    ref.current?.close()
  }

  function remove() {
    if (!window.confirm(`Excluir ${d.nome}? As presenças dele também serão apagadas.`)) return
    dispatch({ t: 'deleteStudent', id: d.id })
    ref.current?.close()
  }

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="dlg-title">
      <form onSubmit={save}>
        <h2 id="dlg-title">{isNew ? 'Novo aluno' : 'Editar aluno'}</h2>
        <div className="form">
          <label className="field full">
            Nome completo
            <input value={d.nome} onChange={(e) => set('nome', e.target.value)} required />
          </label>
          <label className="field">
            Data de nascimento
            <input type="date" value={d.nascimento ?? ''} onChange={(e) => set('nascimento', e.target.value || undefined)} />
          </label>
          <label className="field">
            Período
            <select value={d.periodo} onChange={(e) => set('periodo', e.target.value)}>
              <option>Manhã</option>
              <option>Tarde</option>
              <option>Noite</option>
            </select>
          </label>
          <label className="field">
            Nome do responsável
            <input value={d.responsavel} onChange={(e) => set('responsavel', e.target.value)} />
          </label>
          <label className="field">
            Telefone do responsável
            <input value={d.telResp} onChange={(e) => set('telResp', e.target.value)} inputMode="tel" />
          </label>
          <label className="field">
            Telefone do aluno
            <input value={d.telAluno} onChange={(e) => set('telAluno', e.target.value)} inputMode="tel" />
          </label>
          <label className="field">
            Endereço
            <input value={d.endereco} onChange={(e) => set('endereco', e.target.value)} />
          </label>
          <label className="field full">
            Observação de saúde (dado sensível: preencha só se for necessário)
            <textarea value={d.comorbidade ?? ''} onChange={(e) => set('comorbidade', e.target.value || undefined)} />
          </label>
          <fieldset className="full">
            <legend>Programas em que está matriculado</legend>
            <div className="progs">
              {PROGRAMS.map((p) => {
                const cancelada = d.enrollments.some((e) => e.programId === p.id && e.status === 'cancelada')
                return (
                  <label key={p.id} className="check">
                    <input type="checkbox" checked={ativa(p.id)} onChange={() => toggle(p.id)} />
                    {p.nome}
                    {cancelada && <span className="muted">(matrícula cancelada)</span>}
                  </label>
                )
              })}
            </div>
          </fieldset>
          {avisoFaixa && (
            <p className="msg warn full" role="alert">
              A Empregabilidade é para alunos de {emprego.idadeMin} a {emprego.idadeMax} anos e este aluno está fora dessa faixa.
            </p>
          )}
        </div>
        <div className="dlgfoot">
          <div>
            {!isNew && (
              <button type="button" className="btn d" onClick={remove}>
                Excluir aluno
              </button>
            )}
          </div>
          <div className="actions">
            <button type="button" className="btn" onClick={() => ref.current?.close()}>
              Cancelar
            </button>
            <button type="submit" className="btn p">
              Salvar aluno
            </button>
          </div>
        </div>
      </form>
    </dialog>
  )
}
