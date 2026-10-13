import { Link } from 'react-router-dom'
import { Car, ChevronLeft, Database, Mail, Trash2 } from 'lucide-react'

const SUPPORT_EMAIL = 'appmotorista.teste.play@gmail.com'

export default function ExcluirConta() {
  const mailSubject = encodeURIComponent('Solicitacao de exclusao de conta - App Motorista')
  const mailBody = encodeURIComponent(
    'Ola, quero excluir minha conta e meus dados do App Motorista.\n\nE-mail cadastrado no app:\n\nConfirmo que desejo excluir os dados vinculados a essa conta.',
  )

  return (
    <main className="privacy-page">
      <section className="privacy-shell">
        <Link className="privacy-back" to="/login">
          <ChevronLeft size={18} />
          Voltar
        </Link>

        <div className="privacy-brand">
          <span className="brand-icon">
            <Car size={24} />
          </span>
          <div>
            <strong>App Motorista</strong>
            <span>Exclusao de conta e dados</span>
          </div>
        </div>

        <div className="privacy-card card">
          <p className="privacy-updated">Ultima atualizacao: 13/10/2026</p>
          <h1>Excluir Conta</h1>
          <p>
            O usuario pode solicitar a exclusao da conta e dos dados cadastrados no App Motorista a qualquer momento.
            Para confirmar o pedido, envie uma solicitacao usando o mesmo email cadastrado no app.
          </p>

          <div className="privacy-highlight">
            <Trash2 size={22} />
            <span>A exclusao remove os dados vinculados a conta do usuario.</span>
          </div>

          <h2>Como solicitar</h2>
          <ol className="privacy-steps">
            <li>Entre em contato pelo botao abaixo.</li>
            <li>Informe o email usado no cadastro do App Motorista.</li>
            <li>Confirme que deseja excluir a conta e os dados vinculados.</li>
          </ol>

          <h2>Dados removidos</h2>
          <p>
            Apos a confirmacao, podem ser removidos registros de ganhos, gastos, despesas fixas, metas, manutencoes,
            historicos, preferencias e anexos vinculados a conta.
          </p>

          <h2>Prazo</h2>
          <p>
            A solicitacao sera analisada e processada em ate 30 dias, salvo quando houver obrigacao legal de manter
            alguma informacao por mais tempo.
          </p>

          <div className="privacy-actions">
            <a className="privacy-action-link" href={`mailto:${SUPPORT_EMAIL}?subject=${mailSubject}&body=${mailBody}`}>
              <Mail size={18} />
              Solicitar exclusao
            </a>
            <span>
              <Database size={18} />
              Dados da conta
            </span>
          </div>
        </div>
      </section>
    </main>
  )
}
