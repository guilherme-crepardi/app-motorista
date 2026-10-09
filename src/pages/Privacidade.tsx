import { Link } from 'react-router-dom'
import { Car, ChevronLeft, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'

export default function Privacidade() {
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
            <span>Politica de privacidade</span>
          </div>
        </div>

        <div className="privacy-card card">
          <p className="privacy-updated">Ultima atualizacao: 09/10/2026</p>
          <h1>Politica de Privacidade</h1>
          <p>
            O App Motorista ajuda motoristas a organizar ganhos, gastos, manutencoes, metas e historico de trabalho. Esta
            politica explica quais informacoes podem ser usadas no app e como elas sao protegidas.
          </p>

          <div className="privacy-highlight">
            <ShieldCheck size={22} />
            <span>Os dados cadastrados sao usados somente para o funcionamento do aplicativo.</span>
          </div>

          <h2>Informacoes que o app pode armazenar</h2>
          <p>
            O app pode guardar email de acesso, preferencias do usuario, registros de ganhos, despesas, manutencoes,
            quilometragem, horas trabalhadas, metas e observacoes preenchidas pelo proprio usuario.
          </p>

          <h2>Como usamos essas informacoes</h2>
          <p>
            As informacoes sao usadas para exibir calculos, historicos, filtros, relatorios e metas dentro da conta do
            usuario. O app nao vende dados pessoais.
          </p>

          <h2>Login e armazenamento</h2>
          <p>
            O login e os dados do app usam Supabase como servico de autenticacao e banco de dados. A hospedagem web usa
            Vercel. Esses servicos podem processar dados tecnicos necessarios para manter o app funcionando.
          </p>

          <h2>Seguranca</h2>
          <p>
            O acesso aos dados exige autenticacao. Mesmo assim, nenhum sistema e totalmente livre de risco. Por isso, o
            usuario deve manter sua senha protegida e usar um email confiavel.
          </p>

          <h2>Exclusao de dados</h2>
          <p>
            O usuario pode solicitar a exclusao dos dados da conta pelo canal de contato informado na pagina do app na
            Google Play.
          </p>

          <h2>Contato</h2>
          <p>
            Para duvidas sobre privacidade ou exclusao de dados, use o email de suporte informado na ficha do aplicativo
            na Google Play.
          </p>

          <div className="privacy-actions">
            <span>
              <LockKeyhole size={18} />
              Dados protegidos por login
            </span>
            <span>
              <Mail size={18} />
              Suporte pela Google Play
            </span>
          </div>
        </div>
      </section>
    </main>
  )
}
