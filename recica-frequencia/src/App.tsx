import { useMemo, useState } from 'react'
import { StoreProvider, useStore } from './lib/store'
import { buildRows } from './lib/rules'
import Alunos from './screens/Alunos'
import Importar from './screens/Importar'
import Chamada from './screens/Chamada'
import Acompanhamento from './screens/Acompanhamento'

type Tab = 'alunos' | 'importar' | 'chamada' | 'acompanhamento'

const TABS: { id: Tab; label: string }[] = [
  { id: 'alunos', label: 'Alunos' },
  { id: 'importar', label: 'Importar planilha' },
  { id: 'chamada', label: 'Chamada' },
  { id: 'acompanhamento', label: 'Acompanhamento' },
]

function Shell() {
  const { data } = useStore()
  const [tab, setTab] = useState<Tab>('alunos')
  const alertas = useMemo(
    () => buildRows(data.students, data.sessions, 'all', {}).filter((r) => r.ev.peso >= 3).length,
    [data],
  )
  return (
    <div className="app">
      <nav className="sb" aria-label="Principal">
        <strong className="brand">
          RECICA<span>Frequência</span>
        </strong>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'on' : ''}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'acompanhamento' && alertas > 0 && (
              <span className="count" aria-label={`${alertas} alertas`}>
                {alertas}
              </span>
            )}
          </button>
        ))}
      </nav>
      <main className="main">
        {tab === 'alunos' && <Alunos />}
        {tab === 'importar' && <Importar onDone={() => setTab('alunos')} />}
        {tab === 'chamada' && <Chamada />}
        {tab === 'acompanhamento' && <Acompanhamento />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
