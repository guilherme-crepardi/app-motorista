import { Link } from 'react-router-dom'
import { CalendarRange, HelpCircle, Receipt, Target, Trash2, Wallet, Wrench } from 'lucide-react'

const helpTopics = [
  {
    title: 'Como registrar um ganho?',
    text: 'Toque em Ganhos, depois em Registrar ganho. Informe o valor, a data e o aplicativo usado. Se quiser, adicione corridas, km, horas e observacao.',
    link: '/ganhos',
    linkLabel: 'Ir para Ganhos',
    icon: Wallet,
  },
  {
    title: 'Como registrar um gasto?',
    text: 'Toque em Gastos, depois em Registrar gasto. Escolha a categoria, informe o valor e salve. Voce tambem pode editar ou excluir depois.',
    link: '/gastos',
    linkLabel: 'Ir para Gastos',
    icon: Receipt,
  },
  {
    title: 'Como acompanhar metas?',
    text: 'Use a tela Metas para definir valores diarios, semanais e mensais. O Dashboard mostra o quanto falta para chegar la.',
    link: '/metas',
    linkLabel: 'Ir para Metas',
    icon: Target,
  },
  {
    title: 'Onde vejo o resumo do mes?',
    text: 'Abra Mes para ver o resumo mensal. O Dashboard mostra a visao geral com ganhos, gastos, saldo e metas.',
    link: '/mes',
    linkLabel: 'Ver Mes',
    icon: CalendarRange,
  },
  {
    title: 'Como registrar manutencao?',
    text: 'Entre em Manutencoes, toque em Registrar manutencao e preencha tipo, valor e data. Use esse espaco para revisoes, pneus, oleo e outros cuidados.',
    link: '/manutencoes',
    linkLabel: 'Ir para Manutencoes',
    icon: Wrench,
  },
  {
    title: 'Como excluir minha conta?',
    text: 'No menu, toque em Excluir conta. A pagina explica como solicitar a exclusao da conta e dos dados cadastrados.',
    link: '/excluir-conta',
    linkLabel: 'Excluir conta',
    icon: Trash2,
  },
]

export default function Ajuda() {
  return (
    <div className="page help-page">
      <header className="page-header">
        <div>
          <h1>Ajuda</h1>
          <p className="page-subtitle">Passo a passo simples para usar o app no dia a dia.</p>
        </div>
      </header>

      <section className="help-intro card">
        <span className="help-intro-icon">
          <HelpCircle size={24} />
        </span>
        <div>
          <strong>Comece pelo basico</strong>
          <p>Registre os ganhos e gastos do dia. Depois acompanhe os resumos nas telas Dashboard, Semana e Mes.</p>
        </div>
      </section>

      <section className="help-list">
        {helpTopics.map(({ title, text, link, linkLabel, icon: Icon }) => (
          <article className="help-card card" key={title}>
            <div className="help-card-icon">
              <Icon size={22} />
            </div>
            <div className="help-card-content">
              <h2>{title}</h2>
              <p>{text}</p>
              <Link className="btn btn-secondary" to={link}>
                {linkLabel}
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
