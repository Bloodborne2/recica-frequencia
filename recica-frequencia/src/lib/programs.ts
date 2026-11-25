import type { Program } from '../types'

const mod = (id: string, nome: string): Program => ({
  id,
  nome,
  kind: 'modalidade',
  minPct: 75,
  margem: 2,
  seguidasAlerta: 3,
})

export const PROGRAMS: Program[] = [
  mod('ballet', 'Ballet'),
  mod('jiu-jitsu', 'Jiu-jitsu'),
  mod('capoeira', 'Capoeira'),
  mod('karate', 'Karatê'),
  mod('boxe', 'Boxe'),
  {
    id: 'reforco',
    nome: 'Reforço escolar',
    kind: 'reforco',
    minPct: 75,
    margem: 2,
    seguidasAlerta: 3,
    seguidasCancela: 10,
  },
  {
    id: 'empregabilidade',
    nome: 'Empregabilidade',
    kind: 'empregabilidade',
    minPct: 75,
    margem: 2,
    seguidasAlerta: 3,
    idadeMin: 14,
    idadeMax: 17,
    bolsa: 125,
  },
]

export const programById = (id: string) => PROGRAMS.find((p) => p.id === id)
