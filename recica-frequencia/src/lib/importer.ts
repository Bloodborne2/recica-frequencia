import * as XLSX from 'xlsx'
import type { Enrollment, Student } from '../types'
import { ageOn, clean, norm, parseBirth, parsePhone, todayISO, uid } from './format'
import { PROGRAMS } from './programs'

export interface ImportRow {
  student: Student
  warnings: string[]
  duplicate: boolean
}

export interface ImportResult {
  rows: ImportRow[]
  ignoradas: number // linhas sem nome
  faltando: string[] // colunas que não foram encontradas
}

/** Trecho do cabeçalho (sem acento/maiúscula) que identifica cada coluna da planilha de matrículas. */
const COLS = {
  periodo: 'periodo',
  modalidades: 'modalidades',
  nome: 'nome completo',
  nascimento: 'nascimento',
  responsavel: 'nome do responsavel',
  telAluno: 'telefone do aluno',
  telResp: 'telefone do responsavel',
  endereco: 'endereco',
  comorbidade: 'comorbidade',
} as const
type ColKey = keyof typeof COLS

const ROTULOS: Record<ColKey, string> = {
  periodo: 'Período',
  modalidades: 'Modalidades',
  nome: 'Nome completo',
  nascimento: 'Data de nascimento',
  responsavel: 'Nome do responsável',
  telAluno: 'Telefone do aluno',
  telResp: 'Telefone do responsável',
  endereco: 'Endereço',
  comorbidade: 'Comorbidade',
}

export function readFirstSheet(buf: ArrayBuffer): unknown[][] {
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: '' })
}

const keyOf = (nome: string, nasc?: string) => `${norm(nome)}|${nasc ?? ''}`

export function parseMatriculas(rows: unknown[][], existing: Student[]): ImportResult {
  const header = (rows[0] ?? []).map(norm)
  const keys = Object.keys(COLS) as ColKey[]
  const idx = {} as Record<ColKey, number>
  for (const k of keys) idx[k] = header.findIndex((h) => h.includes(COLS[k]))
  const faltando = keys.filter((k) => idx[k] < 0).map((k) => ROTULOS[k])
  const get = (r: unknown[], k: ColKey) => (idx[k] >= 0 ? r[idx[k]] : '')

  const seen = new Set(existing.map((s) => keyOf(s.nome, s.nascimento)))
  const out: ImportRow[] = []
  let ignoradas = 0
  if (idx.nome < 0) return { rows: out, ignoradas, faltando }

  for (const r of rows.slice(1)) {
    const nome = clean(get(r, 'nome'))
    if (!nome) {
      ignoradas++
      continue
    }
    const w: string[] = []

    const b = parseBirth(get(r, 'nascimento'))
    if (!b.iso) w.push(b.idade !== undefined ? 'Só a idade foi informada' : 'Data de nascimento ausente ou inválida')
    else {
      const anos = ageOn(b.iso, todayISO())
      if (anos < 3 || anos > 25) w.push(`Idade improvável: ${anos} anos`)
    }

    const ta = parsePhone(get(r, 'telAluno'))
    const tr = parsePhone(get(r, 'telResp'))
    if (!ta.text && !tr.text) w.push('Sem telefone')
    if (ta.text && !ta.valid) w.push(`Telefone do aluno suspeito: ${ta.text}`)
    if (tr.text && !tr.valid) w.push(`Telefone do responsável suspeito: ${tr.text}`)

    const enrollments: Enrollment[] = []
    for (const tok of clean(get(r, 'modalidades')).split(/[,;]/).map(clean).filter(Boolean)) {
      const pg = PROGRAMS.find((p) => p.kind === 'modalidade' && norm(p.nome) === norm(tok))
      if (!pg) w.push(`Modalidade não reconhecida: ${tok}`)
      else if (!enrollments.some((e) => e.programId === pg.id)) enrollments.push({ programId: pg.id, status: 'ativa' })
    }
    if (!enrollments.length) w.push('Nenhuma modalidade reconhecida')

    const per = norm(get(r, 'periodo'))
    const periodo = per.includes('manha') && per.includes('tarde')
      ? 'Manhã e tarde'
      : per.includes('manha') ? 'Manhã' : per.includes('tarde') ? 'Tarde' : clean(get(r, 'periodo'))

    const c = clean(get(r, 'comorbidade'))
    const semComorb = ['', 'nao', 'n', 'nenhuma', 'nenhum', 'nao possui', 'nao tem', 'n tem'].includes(norm(c))
    const comorbidade = semComorb ? undefined : norm(c) === 'sim' ? 'Sim (sem detalhes informados)' : c

    const key = keyOf(nome, b.iso)
    const duplicate = seen.has(key)
    seen.add(key)

    out.push({
      duplicate,
      warnings: w,
      student: {
        id: uid(),
        nome,
        nascimento: b.iso,
        idadeInformada: b.iso ? undefined : b.idade,
        responsavel: clean(get(r, 'responsavel')),
        telAluno: ta.text,
        telResp: tr.text,
        endereco: clean(get(r, 'endereco')),
        periodo,
        comorbidade,
        enrollments,
        criadoEm: todayISO(),
      },
    })
  }
  return { rows: out, ignoradas, faltando }
}
