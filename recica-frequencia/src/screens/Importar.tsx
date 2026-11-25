import { useState, type DragEvent } from 'react'
import { useStore } from '../lib/store'
import { parseMatriculas, readFirstSheet, type ImportResult } from '../lib/importer'
import { fmtDate } from '../lib/format'
import { programById } from '../lib/programs'
import { Badge, PageHeader } from '../ui'

export default function Importar({ onDone }: { onDone: () => void }) {
  const { data, dispatch } = useStore()
  const [res, setRes] = useState<ImportResult | null>(null)
  const [fileName, setFileName] = useState('')
  const [err, setErr] = useState('')
  const [feito, setFeito] = useState(0)
  const [over, setOver] = useState(false)

  async function load(f: File) {
    setErr('')
    setFeito(0)
    setRes(null)
    if (f.size > 8 * 1024 * 1024) return setErr('O arquivo tem mais de 8 MB.')
    try {
      const r = parseMatriculas(readFirstSheet(await f.arrayBuffer()), data.students)
      if (r.faltando.includes('Nome completo'))
        return setErr('Não encontrei a coluna “Nome completo do aluno”. Confira se é a planilha de matrículas (respostas do formulário).')
      setFileName(f.name)
      setRes(r)
    } catch {
      setErr('Não consegui ler o arquivo. Use .xlsx, .xls ou .csv exportado da planilha de respostas.')
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setOver(false)
    const f = e.dataTransfer.files[0]
    if (f) void load(f)
  }

  const novos = res?.rows.filter((r) => !r.duplicate) ?? []
  const dups = res?.rows.filter((r) => r.duplicate) ?? []
  const comAviso = novos.filter((r) => r.warnings.length).length

  function importar() {
    dispatch({ t: 'addStudents', students: novos.map((r) => r.student) })
    setFeito(novos.length)
    setRes(null)
  }

  return (
    <>
      <PageHeader title="Importar planilha" sub="Planilha de matrículas (respostas do formulário), modalidades." />

      {feito > 0 && (
        <div className="msg ok" role="status">
          {feito} {feito === 1 ? 'aluno importado' : 'alunos importados'}.{' '}
          <button className="btn sm" onClick={onDone}>
            Ver alunos
          </button>
        </div>
      )}
      {err && (
        <div className="msg err" role="alert">
          {err}
        </div>
      )}

      <label
        className={`drop${over ? ' over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files?.[0] && void load(e.target.files[0])} />
        <strong>Arraste a planilha aqui ou clique para escolher</strong>
        <span className="muted">.xlsx, .xls ou .csv. Alunos que já existem (mesmo nome e nascimento) são ignorados.</span>
      </label>

      {res && (
        <section style={{ marginTop: 20 }} aria-label="Prévia da importação">
          <div className="cards">
            <div className="card"><div className="k">Arquivo</div><div style={{ fontWeight: 600, marginTop: 4, wordBreak: 'break-all' }}>{fileName}</div></div>
            <div className="card"><div className="k">Novos alunos</div><div className="v">{novos.length}</div></div>
            <div className="card"><div className="k">Já cadastrados (ignorados)</div><div className="v">{dups.length}</div></div>
            <div className="card"><div className="k">Com avisos para revisar</div><div className="v">{comAviso}</div></div>
          </div>

          {res.faltando.length > 0 && (
            <div className="msg warn" role="status">
              Colunas não encontradas: {res.faltando.join(', ')}. Esses campos ficarão em branco.
            </div>
          )}

          <div className="card tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Situação</th>
                  <th>Aluno</th>
                  <th>Nascimento</th>
                  <th>Período</th>
                  <th>Modalidades</th>
                  <th>Avisos</th>
                </tr>
              </thead>
              <tbody>
                {res.rows.map((r) => (
                  <tr key={r.student.id}>
                    <td>{r.duplicate ? <Badge tone="neutral">Já existe</Badge> : <Badge tone="g">Novo</Badge>}</td>
                    <td><strong>{r.student.nome}</strong></td>
                    <td>{r.student.nascimento ? fmtDate(r.student.nascimento) : r.student.idadeInformada ? `${r.student.idadeInformada} anos` : '—'}</td>
                    <td>{r.student.periodo || '—'}</td>
                    <td>{r.student.enrollments.map((e) => programById(e.programId)?.nome).join(', ') || '—'}</td>
                    <td>{r.warnings.length ? r.warnings.map((w) => <Badge key={w} tone="a">{w}</Badge>) : <span className="muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="actions" style={{ marginTop: 16 }}>
            <button className="btn p" disabled={!novos.length} onClick={importar}>
              Importar {novos.length} {novos.length === 1 ? 'aluno' : 'alunos'}
            </button>
            <button className="btn" onClick={() => setRes(null)}>Cancelar</button>
          </div>
        </section>
      )}

      <p className="legend">
        Dados guardados só neste navegador por enquanto.{' '}
        <button
          className="btn sm d"
          onClick={() => window.confirm('Apagar todos os alunos e chamadas deste navegador?') && dispatch({ t: 'reset' })}
        >
          Apagar todos os dados
        </button>
      </p>
    </>
  )
}
