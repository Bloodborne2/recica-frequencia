export const norm = (s: unknown) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

export const clean = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()

export const uid = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const todayISO = () => toISO(new Date())

export function addDays(iso: string, n: number) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export const fmtDate = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '—')

export function ageOn(iso: string, ref: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const [ry, rm, rd] = ref.split('-').map(Number)
  let a = ry - y
  if (rm < m || (rm === m && rd < d)) a--
  return a
}

const serialToISO = (n: number) => new Date(Math.round((n - 25569) * 86400000)).toISOString().slice(0, 10)

/**
 * Lê datas bagunçadas de formulário: "07/07/2015", "21/02/12", "20/082016", "11..09..2020",
 * "26 02 2015", 12032014 (número), serial do Excel ou só a idade ("10 anos").
 */
export function parseBirth(v: unknown): { iso?: string; idade?: number } {
  if (typeof v === 'number' && v > 20000 && v < 80000) return { iso: serialToISO(v) }
  if (typeof v === 'number' && v > 0 && v < 100) return { idade: Math.round(v) }
  const toks: string[] = (typeof v === 'number' ? String(Math.round(v)) : clean(v)).match(/\d+/g) ?? []
  let dd: number, mm: number, yy: number
  // Três primeiros números = dia, mês e ano; o que vier depois ("8 anos", "idade:13") é ignorado.
  if (toks.length >= 3 && (toks.length === 3 || toks[2].length === 4)) {
    dd = +toks[0]
    mm = +toks[1]
    yy = +toks[2]
    if (toks[2].length === 2) yy += yy <= new Date().getFullYear() % 100 ? 2000 : 1900
  } else {
    const all = toks.join('')
    if (all.length === 8) {
      dd = +all.slice(0, 2)
      mm = +all.slice(2, 4)
      yy = +all.slice(4)
    } else if (toks.length === 1 && toks[0].length <= 2) return { idade: +toks[0] }
    else return {}
  }
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yy < 1950 || yy > new Date().getFullYear()) return {}
  return { iso: `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}` }
}

/** Telefone vindo como número (11989649488), texto ("N tem") ou com DDI 55. */
export function parsePhone(v: unknown): { text: string; valid: boolean } {
  const raw = typeof v === 'number' ? String(Math.round(v)) : String(v ?? '').trim().replace(/\.0+$/, '')
  let d = raw.replace(/\D/g, '')
  if (!d) return { text: '', valid: false }
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2)
  if (d.length === 11) return { text: `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`, valid: true }
  if (d.length === 10) return { text: `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`, valid: true }
  return { text: d, valid: false }
}
