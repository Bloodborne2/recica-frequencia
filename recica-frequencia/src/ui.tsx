import type { ReactNode } from 'react'
import type { Level } from './lib/rules'

/** Cor do selo para cada nível de alerta. */
export const tone: Record<Level, string> = {
  'sem-dados': 'neutral',
  ok: 'g',
  atestado: 'a',
  proximo: 'a',
  abaixo: 'r',
  cancelar: 'r',
}

export function Badge({ tone: t, children }: { tone: string; children: ReactNode }) {
  return <span className={`bd ${t}`}>{children}</span>
}

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <header className="hd">
      <div>
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      <div className="actions">{children}</div>
    </header>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      {children}
    </div>
  )
}
