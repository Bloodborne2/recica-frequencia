# RECICA · Frequência (front-end)

Sistema de chamada e frequência da ONG RECICA. React + TypeScript (Vite). Por enquanto **só o front**:
os dados ficam no `localStorage` do navegador. Quando o Supabase entrar, troque apenas `src/lib/store.tsx`.

## Rodar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera a pasta dist/ (pode subir no Cloudflare Pages)
```

## O que tem

| Aba | O que faz |
|---|---|
| Alunos | Lista, busca, filtro por programa, cadastro e edição (inclui matrículas por programa) |
| Importar planilha | Lê a planilha de matrículas de modalidades (.xlsx/.xls/.csv), mostra prévia com avisos e ignora alunos já cadastrados |
| Chamada | Presente / Falta / Abonada por aluno e por data; "Aula cancelada" não gera falta; mostra o alerta antes de salvar |
| Acompanhamento | Alunos perto do limite, abaixo de 75%, com 3 faltas seguidas (atestado) e com 10 seguidas (Reforço); bolsa da Empregabilidade |

## Regras (em `src/lib/programs.ts` e `src/lib/rules.ts`)

- Frequência mínima de 75% em todos os programas.
- Frequência = presenças ÷ (presenças + faltas). **Falta abonada e aula cancelada não entram na conta.**
- "Pode faltar mais N": quantas faltas ainda cabem antes de cair abaixo de 75%. O alerta amarelo dispara quando N ≤ 2 (campo `margem`).
- Alertas de percentual só a partir de 4 chamadas do aluno (`MIN_AMOSTRA`), para não alarmar com 1 falta no começo.
- 3 faltas seguidas pedem atestado. No Reforço, 10 faltas seguidas sem justificativa geram o alerta de cancelamento; a matrícula só é cancelada quando alguém clica em "Cancelar matrícula".
- Falta abonada ou presença zera a contagem de faltas seguidas (decisão a confirmar com a coordenação).
- Empregabilidade: 14 a 17 anos, bolsa de R$ 125 enquanto mantiver 75%. Aluno fora da faixa recebe aviso.

## Importador

Reconhece as colunas pelo texto do cabeçalho (sem acento e sem maiúsculas), então a ordem não importa.
Trata telefone numérico, "N tem", datas bagunçadas ("21/02/12", "20/082016", "31/08/2017 8 anos", 12032014) e
modalidades separadas por vírgula. Duplicado = mesmo nome + nascimento.

## Pendências conhecidas

- **Biblioteca de planilhas:** `xlsx` 0.18.5 do npm é antiga e tem avisos de segurança conhecidos. Para uma versão atual, instale pelo site oficial do SheetJS (`npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`) e confira se o build passa.
- Falta: atestado (upload), cronograma editável, as outras 3 planilhas (Reforço, Empregabilidade, Apadrinhamento), login e perfis (LGPD) e a troca do `localStorage` pelo Supabase.
- A observação de saúde é dado sensível: no banco, restringir por perfil (RLS).
