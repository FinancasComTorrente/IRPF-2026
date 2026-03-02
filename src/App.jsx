import { useState } from 'react'
import html2canvas from 'html2canvas'
import { auditor } from './services/taxEngine'
import { sendLeadEmail } from './services/emailService'
import './index.css'

function App() {
  const [activeTab, setActiveTab] = useState('simulacao')
  const [perfilAtivo, setPerfilAtivo] = useState(null) // null = tela inicial, 'pf' = Pessoa Física, 'pj' = Pessoa Jurídica

  // States - Contracheque
  const [vinculo, setVinculo] = useState('clt')
  const [ccSalario, setCcSalario] = useState('10000')
  const [ccInss, setCcInss] = useState('650.00')
  const [ccIrrf, setCcIrrf] = useState('1000.00')

  // States - Planejamento IRPF Anual
  const [simRenda, setSimRenda] = useState('100000')
  const [simRetido, setSimRetido] = useState('15000')
  const [simInss, setSimInss] = useState('10000')
  const [simDependentes, setSimDependentes] = useState('0')
  const [simSaude, setSimSaude] = useState('5000')
  const [simEducacao, setSimEducacao] = useState('0')
  const [simPgbl, setSimPgbl] = useState('0')
  const [simMolestia, setSimMolestia] = useState(false)
  const [simIdoso, setSimIdoso] = useState(false)

  // States - NF
  const [nfValor, setNfValor] = useState('20000')
  const [nfRbt12, setNfRbt12] = useState('400000')
  const [nfAnexo, setNfAnexo] = useState('III')
  const [nfRbt12Folha, setNfRbt12Folha] = useState('0')
  const [nfFatorR, setNfFatorR] = useState(false)
  const [nfImposto, setNfImposto] = useState('1818')

  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState(null)

  const [errorServer, setErrorServer] = useState(false)

  const auditarContracheque = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorServer(false)
    try {
      const data = {
        salario_bruto: parseFloat(ccSalario),
        inss_retido: parseFloat(ccInss),
        irrf_informado: parseFloat(ccIrrf),
        dependentes: 0,
        pensao_alimenticia: 0.0,
        outras_deducoes: 0.0
      }

      const result = await Promise.resolve(auditor.auditar_contracheque(data))
      setReport(result)
    } catch (err) {
      console.error(err)
      setErrorServer(true)
    } finally {
      setLoading(false)
      if (!errorServer) {
        requestLeadBlock()
      }
    }
  }

  const auditarNf = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorServer(false)
    try {
      const result = await Promise.resolve(auditor.auditar_nota_fiscal_simples(
        {
          valor_servico: parseFloat(nfValor),
          rbt12: parseFloat(nfRbt12),
          anexo: nfAnexo,
          rbt12_folha: parseFloat(nfRbt12Folha),
          is_sujeito_fator_r: nfFatorR
        },
        parseFloat(nfImposto)
      ))
      setReport(result)
    } catch (err) {
      console.error(err)
      setErrorServer(true)
    } finally {
      setLoading(false)
      if (!errorServer) {
        requestLeadBlock()
      }
    }
  }

  const simularAnual = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorServer(false)
    try {
      const data = {
        rendimento_tributavel: parseFloat(simRenda),
        imposto_retido_fonte: parseFloat(simRetido),
        inss_pago: parseFloat(simInss),
        dependentes: parseInt(simDependentes),
        pensao_alimenticia_paga: 0.0,
        despesas_medicas: parseFloat(simSaude),
        despesas_educacao: parseFloat(simEducacao),
        contribuicao_pgbl: parseFloat(simPgbl),
        is_molestia_grave: simMolestia,
        is_idoso_65: simIdoso
      }

      const result = await Promise.resolve(auditor.simular_ajuste_anual(data))

      setReport({
        ...result,
        isSimulacao: true,
        status: result.tipo_declaracao === "Isenta" ? "ISENTA - DIREITO GARANTIDO" : "OTIMIZAÇÃO TRIBUTÁRIA (" + result.tipo_declaracao + ")"
      })
    } catch (err) {
      console.error(err)
      setErrorServer(true)
    } finally {
      setLoading(false)
      if (!errorServer) {
        requestLeadBlock()
      }
    }
  }

  const parseCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  // --- MÁQUINA DE LEADS (PAYWALL VIP) ---
  const [isLeadCaptured, setIsLeadCaptured] = useState(false)
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [leadNome, setLeadNome] = useState('')
  const [leadTelefone, setLeadTelefone] = useState('')
  const [leadEmail, setLeadEmail] = useState('')
  const [leadLoading, setLeadLoading] = useState(false)

  // Dispara logo após o carregamento bem sucedido do relatório (em vez de mostrá-lo)
  const requestLeadBlock = () => {
    if (!isLeadCaptured) {
      setShowLeadModal(true)
    }
  }

  const submitLead = async (e) => {
    e.preventDefault()
    setLeadLoading(true)
    try {
      let economia = 0.0;
      if (report?.isSimulacao) {
        if (report.tipo_declaracao === "Isenta") {
          economia = Math.abs(report.imposto_restituir_ou_pagar);
        } else {
          economia = Math.abs(report.tipo_declaracao === 'Simplificada' ? report.imposto_restituir_ou_pagar_simplificado : report.imposto_restituir_ou_pagar_completo);
        }
      } else if (report?.diferenca_anual) {
        economia = report.diferenca_anual;
      }

      await sendLeadEmail({
        nome: leadNome,
        telefone: leadTelefone,
        email: leadEmail,
        origem: `Calculadora Torrente IRPF 2025 - Tab: ${activeTab}`,
        valor_encontrado: economia
      });

      setIsLeadCaptured(true)
      setShowLeadModal(false)
    } catch (err) {
      console.error("Erro ao salvar lead:", err)
      // Em caso de erro na API do Lead, liberamos o report pro cliente para não quebrar a experiência
      setIsLeadCaptured(true)
      setShowLeadModal(false)
    } finally {
      setLeadLoading(false)
    }
  }

  // Máscara de Real para os inputs
  const handleCurrencyChange = (e, setter) => {
    let value = e.target.value;

    // Remove tudo que não é número
    value = value.replace(/\D/g, "");

    // Converte para valor float considerando os dois últimos dígitos como decimais
    const numericValue = (parseInt(value || 0, 10) / 100).toFixed(2);

    // Só atualiza se for um número válido
    if (!isNaN(numericValue)) {
      setter(numericValue);
    }
  };

  const displayCurrency = (val) => {
    // Formata o valor bruto (que está em string no formato "2000.00") para a tela "2.000,00" (sem o símbolo R$ para não sobrepor o CSS)
    const floatVal = parseFloat(val);
    if (isNaN(floatVal)) return "";
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(floatVal);
  }

  const exportarWhatsApp = () => {
    if (!report) {
      alert("Por favor, gere o relatório primeiro.");
      return;
    }

    let msg = "";

    // Tratamento para Guia Planejamento Tributário / Simulador
    if (report.isSimulacao) {
      msg += `[ *Planejamento Tributário - IRPF* ]\n`;
      msg += `_Torrente Capitais_\n\n`;
      msg += `*Parecer:* ${report.status}\n\n`;

      if (report.tipo_declaracao === "Isenta") {
        msg += `[ *Isenção Total Reconhecida* ]\n`;
        msg += `Restituir 100%: R$ ${displayCurrency(Math.abs(report.imposto_restituir_ou_pagar))}\n\n`;
        msg += `*Diretriz Legal:*\n${report.mensagem_otimizacao}\n`;
      } else {
        msg += `[ *Comparativo de Cenários* ]\n`;
        msg += `\n*Simplificada* ${report.tipo_declaracao === 'Simplificada' ? '(Melhor Opção)' : ''}\n`;
        msg += `- Base de Cálculo: R$ ${displayCurrency(report.base_calculo_simplificada)}\n`;
        msg += `- Imposto Devido: R$ ${displayCurrency(report.imposto_devido_simplificado)}\n`;
        msg += `- ${report.imposto_restituir_ou_pagar_simplificado < 0 ? 'Restituir' : 'Pagar'}: R$ ${displayCurrency(Math.abs(report.imposto_restituir_ou_pagar_simplificado))}\n`;

        msg += `\n*Completa* ${report.tipo_declaracao === 'Completa' ? '(Melhor Opção)' : ''}\n`;
        msg += `- Base de Cálculo: R$ ${displayCurrency(report.base_calculo_completa)}\n`;
        msg += `- Imposto Devido: R$ ${displayCurrency(report.imposto_devido_completo)}\n`;
        msg += `- ${report.imposto_restituir_ou_pagar_completo < 0 ? 'Restituir' : 'Pagar'}: R$ ${displayCurrency(Math.abs(report.imposto_restituir_ou_pagar_completo))}\n\n`;

        msg += `*Dica de Planejamento:*\n${report.mensagem_otimizacao}\n`;
      }
    }
    // Tratamento para Auditoria de Contracheque e DAS
    else {
      msg += `[ *Auditoria Fiscal - Parecer Técnico* ]\n`;
      msg += `_Torrente Capitais_\n\n`;

      msg += `*Status:* ${report.status}\n`;
      msg += `*Documento Validado:* ${report.documento_tipo || 'Documento Fiscal/Contracheque'}\n\n`;

      msg += `*Apurado pelo Cliente:* R$ ${displayCurrency(report.imposto_informado || report.imposto_retido)}\n`;
      msg += `*Exigido pela Receita:* R$ ${displayCurrency(report.imposto_calculado || report.imposto_devido_correto)}\n`;

      const dif = report.diferenca || report.diferencia_de_imposto || (report.imposto_devido_correto - report.imposto_informado) || 0;
      msg += `*Diferença Indevida:* R$ ${displayCurrency(dif)}\n`;

      if (report.diferenca_anual) {
        msg += `*Impacto Financeiro Anual:* R$ ${displayCurrency(report.diferenca_anual)}\n`;
      }

      msg += `\n*Justificativa Legal:*\n${report.mensagem}\n`;
    }

    msg += `\nAcesse: https://www.matheustorrente.com.br/bio`;

    const zapUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(zapUrl, '_blank');
  };

  return (
    <>
      <style>
        {`
          .currency-input-wrapper {
            position: relative;
            display: flex;
            align-items: center;
          }
          .currency-prefix {
            position: absolute;
            left: 12px;
            color: var(--text-secondary);
            pointer-events: none;
            font-weight: 500;
          }
          .currency-input {
            padding-left: 35px !important;
          }
        `}
      </style>
      <div className="app-header hide-on-print" style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '0 1rem' }}>
        <img src="/logo-escrita.png" alt="Torrente Educação Financeira" style={{ maxWidth: '280px', width: '80%', marginBottom: '0.5rem', display: 'inline-block' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'block'; }} />
        <h1 style={{ margin: 0, display: 'none' }}>Auditoria Tributária</h1>
        <p className="subtitle" style={{ margin: 0, fontSize: '0.9rem' }}>Motor Inteligente ajustado para regras IRPF 2025 e LC 123/06</p>
      </div>
      <div className="grid-container">
        {/* Painel Esquerdo: Formulário */}
        <div className="glass-panel">

          {/* TELA INICIAL: Escolha de Perfil */}
          {!perfilAtivo && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <h2 style={{ marginBottom: '0.5rem' }}>Bem-vindo(a)! 👋</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
                Selecione o seu perfil para começar a análise tributária:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div
                  onClick={() => { setPerfilAtivo('pf'); setActiveTab('simulacao'); setReport(null); }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(96,165,250,0.15), rgba(167,139,250,0.15))',
                    border: '1px solid rgba(96,165,250,0.4)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👤</div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#60a5fa' }}>Pessoa Física</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>IRPF, Elisão Fiscal e Auditoria de Holerite</p>
                </div>
                <div
                  onClick={() => { setPerfilAtivo('pj'); setActiveTab('nf'); setReport(null); }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(208,167,71,0.15), rgba(251,191,36,0.1))',
                    border: '1px solid rgba(208,167,71,0.4)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏢</div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-color)' }}>Pessoa Jurídica</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>IRPJ, Simples Nacional e Planejamento Tributário</p>
                </div>
              </div>
            </div>
          )}

          {/* ABAS: Pessoa Física */}
          {perfilAtivo === 'pf' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={() => { setPerfilAtivo(null); setReport(null); }}
                  style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '0.3rem 0.7rem', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)', width: 'auto', marginTop: 0 }}
                >← Voltar</button>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>👤 Pessoa Física</span>
              </div>
              <div className="tabs">
                <div
                  className={`tab ${activeTab === 'simulacao' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('simulacao'); setReport(null); setErrorServer(false) }}
                >
                  IRPF 2026
                </div>
                <div
                  className={`tab ${activeTab === 'contracheque' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('contracheque'); setReport(null); setErrorServer(false) }}
                >
                  Holerite Mensal
                </div>
              </div>
            </div>
          )}

          {/* ABAS: Pessoa Jurídica */}
          {perfilAtivo === 'pj' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={() => { setPerfilAtivo(null); setReport(null); }}
                  style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '0.3rem 0.7rem', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)', width: 'auto', marginTop: 0 }}
                >← Voltar</button>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>🏢 Pessoa Jurídica</span>
              </div>
              <div className="tabs">
                <div
                  className={`tab ${activeTab === 'nf' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('nf'); setReport(null); setErrorServer(false) }}
                >
                  IRPJ 2026
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contracheque' && perfilAtivo && (
            <form onSubmit={auditarContracheque}>
              <h2>Dados do Trabalhador</h2>
              <div className="intro-card">
                <strong>Auditor de Retenção na Fonte</strong>
                Descubra se a sua empresa descontou o valor exato pro INSS e Receita Federal no seu Holerite do mês.
              </div>

              <div className="form-group">
                <label>Vínculo Empregatício</label>
                <select className="form-control" value={vinculo} onChange={(e) => setVinculo(e.target.value)}>
                  <option value="clt">CLT (Iniciativa Privada)</option>
                  <option value="servidor">Servidor Público</option>
                </select>
              </div>

              <div className="form-group">
                <label>Salário Bruto (R$)</label>
                <div className="currency-input-wrapper">
                  <span className="currency-prefix">R$</span>
                  <input type="text" className="form-control currency-input" placeholder="0,00" value={displayCurrency(ccSalario)} onChange={(e) => handleCurrencyChange(e, setCcSalario)} required />
                </div>
              </div>

              <div className="form-group">
                <label>{vinculo === 'clt' ? 'INSS Retido (R$)' : 'Previdência Própria - IPREV (R$)'}</label>
                <div className="currency-input-wrapper">
                  <span className="currency-prefix">R$</span>
                  <input type="text" className="form-control currency-input" placeholder="0,00" value={displayCurrency(ccInss)} onChange={(e) => handleCurrencyChange(e, setCcInss)} required />
                </div>
              </div>

              <div className="form-group">
                <label>IRRF Cobrado (R$) - Valor do Holerite</label>
                <div className="currency-input-wrapper">
                  <span className="currency-prefix">R$</span>
                  <input type="text" className="form-control currency-input" placeholder="0,00" value={displayCurrency(ccIrrf)} onChange={(e) => handleCurrencyChange(e, setCcIrrf)} required />
                </div>
              </div>

              <button type="submit" disabled={loading}>
                {loading ? 'Calculando Malha Fina...' : 'Auditar Retenção'}
              </button>
            </form>
          )}

          {activeTab === 'simulacao' && perfilAtivo && (
            <form onSubmit={simularAnual}>
              <h2>Declaração de Ajuste Anual</h2>
              <div className="intro-card">
                <strong>Simulador de Elisão Fiscal</strong>
                Crie um cenário comparativo e descubra imediatamente qual te trará mais dinheiro no bolso: a Declaração Simplificada ou a Completa.
              </div>

              <div className="form-group">
                <label>Rendimento Tributável (R$)</label>
                <div className="currency-input-wrapper">
                  <span className="currency-prefix">R$</span>
                  <input type="text" className="form-control currency-input" value={displayCurrency(simRenda)} onChange={(e) => handleCurrencyChange(e, setSimRenda)} required />
                </div>
              </div>

              <div className="form-grid-2col">
                <div className="form-group">
                  <label>INSS/Previdência Paga</label>
                  <div className="currency-input-wrapper">
                    <span className="currency-prefix">R$</span>
                    <input type="text" className="form-control currency-input" value={displayCurrency(simInss)} onChange={(e) => handleCurrencyChange(e, setSimInss)} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>IR Retido na Fonte</label>
                  <div className="currency-input-wrapper">
                    <span className="currency-prefix">R$</span>
                    <input type="text" className="form-control currency-input" value={displayCurrency(simRetido)} onChange={(e) => handleCurrencyChange(e, setSimRetido)} required />
                  </div>
                </div>
              </div>

              <div className="form-group form-grid-2col">
                <div className="form-group">
                  <label>Saúde Ilimitada (R$)</label>
                  <span className="sub-label">*Somente consultas, hospitais e planos médicos. Gastos com farmácia não contam!*</span>
                  <div className="currency-input-wrapper">
                    <span className="currency-prefix">R$</span>
                    <input type="text" className="form-control currency-input" value={displayCurrency(simSaude)} onChange={(e) => handleCurrencyChange(e, setSimSaude)} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Educação (R$)</label>
                  <span className="sub-label">*Apenas escolas e faculdades. Limite de R$ 3.561,50 por pessoa.*</span>
                  <div className="currency-input-wrapper">
                    <span className="currency-prefix">R$</span>
                    <input type="text" className="form-control currency-input" value={displayCurrency(simEducacao)} onChange={(e) => handleCurrencyChange(e, setSimEducacao)} />
                  </div>
                </div>
              </div>

              <div className="form-group form-grid-2col">
                <div className="form-group">
                  <label>
                    Depósitos em PGBL
                    <div className="tooltip-container">
                      <span className="tooltip-icon">ⓘ</span>
                      <span className="tooltip-text">Planos de Previdência Privada tipo PGBL abatem até 12% da sua base de cálculo do imposto na declaração completa.</span>
                    </div>
                  </label>
                  <div className="currency-input-wrapper">
                    <span className="currency-prefix">R$</span>
                    <input type="text" className="form-control currency-input" value={displayCurrency(simPgbl)} onChange={(e) => handleCurrencyChange(e, setSimPgbl)} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Qtd. Dependentes</label>
                  <input type="number" className="form-control" value={simDependentes} onChange={(e) => setSimDependentes(e.target.value)} />
                </div>
              </div>

              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <label style={{ margin: '0 0 10px 0', display: 'block' }}>Garantias de Isenção da Legislação:</label>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <input type="checkbox" id="molestia" checked={simMolestia} onChange={e => setSimMolestia(e.target.checked)} />
                  <label htmlFor="molestia" style={{ margin: 0, fontWeight: 'normal' }}>Possui Doença Grave (Alienação, Cegueira, Câncer, etc)</label>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="checkbox" id="idoso" checked={simIdoso} onChange={e => setSimIdoso(e.target.checked)} />
                  <label htmlFor="idoso" style={{ margin: 0, fontWeight: 'normal' }}>Aposentado/Pensionista Mair de 65 Anos</label>
                </div>
              </div>

              {parseInt(simDependentes || 0) > 0 && parseFloat(simEducacao || 0) === 0 && (
                <div className="proactive-alert">
                  <span>💡</span>
                  <span><strong>Sabia que você pode abater impostos escolares?</strong> Você informou dependentes mas nenhuma despesa de educação. Creches, pré-escolas e faculdades abatem até R$ 3.561,50 por pessoa do seu imposto!</span>
                </div>
              )}

              <button type="submit" disabled={loading} style={{ background: 'var(--success-color)' }}>
                {loading ? 'Otimizando Impostos...' : 'Ver Relatório de Planejamento'}
              </button>
            </form>
          )}

          {activeTab === 'nf' && perfilAtivo && (
            <form onSubmit={auditarNf}>
              <h2>Dados da NFS-e</h2>
              <div className="intro-card">
                <strong>Guia Tributário Inteligente</strong>
                Valide se o DAS gerado pela sua contabilidade está correto (ex: 6% vs 15,5%) aplicando o Fator R de folha de pagamento.
              </div>

              <div className="form-group">
                <label>Serviço Prestado (R$)</label>
                <div className="currency-input-wrapper">
                  <span className="currency-prefix">R$</span>
                  <input type="text" className="form-control currency-input" placeholder="0,00" value={displayCurrency(nfValor)} onChange={(e) => handleCurrencyChange(e, setNfValor)} required />
                </div>
              </div>

              <div className="form-group">
                <label>Receita Bruta 12 Meses</label>
                <div className="currency-input-wrapper">
                  <span className="currency-prefix">R$</span>
                  <input type="text" className="form-control currency-input" placeholder="0,00" value={displayCurrency(nfRbt12)} onChange={(e) => handleCurrencyChange(e, setNfRbt12)} required />
                </div>
              </div>

              <div className="form-group">
                <label>Anexo (Simples Nacional)</label>
                <select className="form-control" value={nfAnexo} onChange={e => setNfAnexo(e.target.value)}>
                  <option value="I">Anexo I (Comércio, ex: Lojas)</option>
                  <option value="II">Anexo II (Indústria, ex: Fábricas)</option>
                  <option value="III">Anexo III (Prestação de Serviços em Geral)</option>
                  <option value="IV">Anexo IV (Advocacia, Limpeza, Vigilância)</option>
                  <option value="V">Anexo V (Intelectuais, Engenharia, Auditoria)</option>
                </select>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '1rem', marginBottom: '1rem' }}>
                <input type="checkbox" id="fatorR" checked={nfFatorR} onChange={e => setNfFatorR(e.target.checked)} />
                <label htmlFor="fatorR" style={{ margin: 0 }}>
                  Atividade sujeita ao Fator R?
                  <div className="tooltip-container">
                    <span className="tooltip-icon">ⓘ</span>
                    <span className="tooltip-text">Se suas despesas com Folha de Pagamento/Pró-Labore forem iguais ou maiores que 28% do faturamento, seu imposto no Simples Nacional cai de 15,5% para apenas 6%.</span>
                  </div>
                </label>
              </div>

              {nfFatorR && (
                <div className="form-group">
                  <label>Receita de Folha + Pró-Labore em 12 Meses</label>
                  <div className="currency-input-wrapper">
                    <span className="currency-prefix">R$</span>
                    <input type="text" className="form-control currency-input" placeholder="0,00" value={displayCurrency(nfRbt12Folha)} onChange={(e) => handleCurrencyChange(e, setNfRbt12Folha)} required />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Imposto Apurado - DAS Gerado (R$)</label>
                <div className="currency-input-wrapper">
                  <span className="currency-prefix">R$</span>
                  <input type="text" className="form-control currency-input" placeholder="0,00" value={displayCurrency(nfImposto)} onChange={(e) => handleCurrencyChange(e, setNfImposto)} required />
                </div>
              </div>

              {(nfAnexo === 'V' || nfAnexo === 'III') && !nfFatorR && (
                <div className="proactive-alert">
                  <span>⚠️</span>
                  <span><strong>Carga Tributária Alta (Anexo V):</strong> Você pode pagar a alíquota punitiva de 15,5% na primeira faixa se estiver no Anexo V sem benefício. Se você tiver um Pró-labore ou folha que atinja 28% do faturamento, marque o Fator R acima para cair para esmagadores 6% (Anexo III).</span>
                </div>
              )}

              <button type="submit" disabled={loading}>
                {loading ? 'Revisando Anexos...' : 'Auditar DAS'}
              </button>
            </form>
          )}

        </div>

        {/* --- MODAL DE CAÇA DE LEADS (PAYWALL VIP) --- */}
        {showLeadModal && (
          <div className="lead-modal-overlay">
            <div className="lead-modal-content">
              <h2>Quase lá!</h2>
              <p>O Motor AntiGravity encontrou uma restituição tributária no seu CPF/CNPJ.</p>
              <p>Para desbloquear o seu <strong>Parecer Técnico Oficial</strong>, informe seu contato:</p>

              <form onSubmit={submitLead} className="lead-form">
                <input
                  type="text"
                  placeholder="Seu Nome Completo"
                  className="form-control"
                  value={leadNome}
                  onChange={e => setLeadNome(e.target.value)}
                  required
                />

                <input
                  type="tel"
                  placeholder="Seu WhatsApp (com DDD)"
                  className="form-control"
                  value={leadTelefone}
                  onChange={e => setLeadTelefone(e.target.value)}
                  required
                />

                <input
                  type="email"
                  placeholder="Seu E-mail Oficial"
                  className="form-control"
                  value={leadEmail}
                  onChange={e => setLeadEmail(e.target.value)}
                  required
                />

                <button type="submit" disabled={leadLoading} style={{ background: 'var(--accent-color)', marginTop: '1rem' }}>
                  {leadLoading ? 'Liberando Acesso VIP...' : 'Desbloquear Meu Parecer Agora'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Painel Direito: Relatório (Parecer) */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>

          {!report && !loading && !errorServer && !showLeadModal && (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>
              Preencha os dados e execute a auditoria para ver o relatório oficial aqui.
            </div>
          )}

          {loading && (
            <div style={{ color: 'var(--accent-color)', textAlign: 'center', marginTop: '2rem', fontWeight: 'bold' }}>
              Analisando Legislação...
            </div>
          )}

          {errorServer && (
            <div style={{ color: 'var(--danger-color)', textAlign: 'center', marginTop: '2rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
              <strong>Falha no Cálculo:</strong> Ocorreu um erro interno ao processar os dados tributários.<br />
              Por favor, verifique os valores informados ou tente novamente.
            </div>
          )}

          {/* O Relatório só aparece se o Lead foi capturado! */}
          {report && !loading && isLeadCaptured && (
            <div className="report-box">
              <div className="watermark"></div>
              <div className="print-only premium-print-header">
                <img src="/logo-escrita.png" alt="Torrente Educação Financeira" className="print-logo" />
                <div className="print-header-text">
                  <h2>Parecer Técnico</h2>
                  <p>Auditoria Tributária e Elisão Fiscal</p>
                </div>
              </div>

              <div className={`status-badge ${report.isSimulacao ? 'status-conforme' :
                (report.status === 'CONFORME' ? 'status-conforme' : 'status-divergente')}`}>
                {report.status}
              </div>

              {report.isSimulacao ? (
                <>
                  {report.tipo_declaracao === "Isenta" ? (
                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                      <h3 style={{ color: 'var(--success-color)', marginBottom: '1rem' }}>Isenção Total Reconhecida</h3>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success-color)' }}>
                        Restituir 100%: {parseCurrency(Math.abs(report.imposto_restituir_ou_pagar))}
                      </div>
                      <div className="report-message" style={{ marginTop: '1.5rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        <strong>🎯 Parecer Final:</strong><br />
                        {report.mensagem_otimizacao}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="data-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                        <span className="data-label">Comparativo de Cenários</span>
                      </div>

                      <div className="form-grid-2col" style={{ marginTop: '1rem' }}>
                        {/* Card Simplificada */}
                        <div style={{
                          background: report.tipo_declaracao === 'Simplificada' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                          border: report.tipo_declaracao === 'Simplificada' ? '1px solid var(--success-color)' : '1px solid rgba(255, 255, 255, 0.1)',
                          padding: '1rem', borderRadius: '8px',
                          boxShadow: report.tipo_declaracao === 'Simplificada' ? '0 0 10px rgba(34, 197, 94, 0.2)' : 'none'
                        }}>
                          <h4 style={{ margin: '0 0 15px 0', textAlign: 'center', color: report.tipo_declaracao === 'Simplificada' ? 'var(--success-color)' : 'var(--text-secondary)' }}>
                            Simplificada {report.tipo_declaracao === 'Simplificada' && '👑'}
                          </h4>
                          <div style={{ fontSize: '0.85rem', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Dedução Padrão:</span>
                            <strong>20% (Limitado)</strong>
                          </div>
                          <div style={{ fontSize: '0.85rem', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Base de Cálculo:</span>
                            <strong>{parseCurrency(report.base_calculo_simplificada)}</strong>
                          </div>
                          <div style={{ fontSize: '0.85rem', marginBottom: '15px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Imposto Devido:</span>
                            <strong>{parseCurrency(report.imposto_devido_simplificado)}</strong>
                          </div>
                          <div style={{
                            fontSize: '1.1rem', fontWeight: 'bold', textAlign: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)',
                            color: report.imposto_restituir_ou_pagar_simplificado < 0 ? 'var(--success-color)' : 'var(--danger-color)'
                          }}>
                            {report.imposto_restituir_ou_pagar_simplificado < 0 ? '🤑 Restituir: ' : '⚠️ Pagar: '}<br />
                            {parseCurrency(Math.abs(report.imposto_restituir_ou_pagar_simplificado))}
                          </div>
                        </div>

                        {/* Card Completa */}
                        <div style={{
                          background: report.tipo_declaracao === 'Completa' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                          border: report.tipo_declaracao === 'Completa' ? '1px solid var(--success-color)' : '1px solid rgba(255, 255, 255, 0.1)',
                          padding: '1rem', borderRadius: '8px',
                          boxShadow: report.tipo_declaracao === 'Completa' ? '0 0 10px rgba(34, 197, 94, 0.2)' : 'none'
                        }}>
                          <h4 style={{ margin: '0 0 15px 0', textAlign: 'center', color: report.tipo_declaracao === 'Completa' ? 'var(--success-color)' : 'var(--text-secondary)' }}>
                            Completa {report.tipo_declaracao === 'Completa' && '👑'}
                          </h4>
                          <div style={{ fontSize: '0.85rem', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Deduções Legais:</span>
                            <strong>{parseCurrency(report.deducoes_totais)}</strong>
                          </div>
                          <div style={{ fontSize: '0.85rem', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Base de Cálculo:</span>
                            <strong>{parseCurrency(report.base_calculo_completa)}</strong>
                          </div>
                          <div style={{ fontSize: '0.85rem', marginBottom: '15px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Imposto Devido:</span>
                            <strong>{parseCurrency(report.imposto_devido_completo)}</strong>
                          </div>
                          <div style={{
                            fontSize: '1.1rem', fontWeight: 'bold', textAlign: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)',
                            color: report.imposto_restituir_ou_pagar_completo < 0 ? 'var(--success-color)' : 'var(--danger-color)'
                          }}>
                            {report.imposto_restituir_ou_pagar_completo < 0 ? '🤑 Restituir: ' : '⚠️ Pagar: '}<br />
                            {parseCurrency(Math.abs(report.imposto_restituir_ou_pagar_completo))}
                          </div>
                        </div>
                      </div>

                      {report.mensagem_otimizacao && (
                        <div className="report-message" style={{ marginTop: '1.5rem', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: 'white' }}>
                          <strong style={{ color: 'var(--accent-color)' }}>🎯 Dica do Planejamento Tributário:</strong><br />
                          {report.mensagem_otimizacao}
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="data-row">
                    <span className="data-label">Documento Validado</span>
                    <span className="data-value">{report.documento_tipo}</span>
                  </div>

                  <div className="data-row">
                    <span className="data-label">Imposto Recolhido</span>
                    <span className="data-value">{parseCurrency(report.imposto_informado)}</span>
                  </div>

                  <div className="data-row">
                    <span className="data-label">Cálculo pela Receita</span>
                    <span className="data-value">{parseCurrency(report.imposto_calculado)}</span>
                  </div>

                  <div className="data-row">
                    <span className="data-label">Salto / Diferença (Mensal)</span>
                    <span className={`data-value ${report.diferenca < 0 ? 'highlight-red' : (report.diferenca > 0 ? 'highlight-red' : 'highlight-green')}`}>
                      {parseCurrency(report.diferenca)}
                    </span>
                  </div>

                  {report.diferenca !== 0 && (
                    <div className="data-row">
                      <span className="data-label">Impacto Anual (12 Meses)</span>
                      <span className={`data-value highlight-red`}>
                        {parseCurrency(report.diferenca_anual)}
                      </span>
                    </div>
                  )}

                  <div className="report-message">
                    <strong>Justificativa Base Legal:</strong><br />
                    {report.mensagem.split('|').map((p, i) => (
                      <div key={i} style={{ marginTop: i > 0 ? '0.5rem' : '0' }}>{p.trim()}</div>
                    ))}
                  </div>
                </>
              )}

              <div className="print-only premium-print-footer">
                <div className="signature-block">
                  <div className="signature-line"></div>
                  <p><strong>Matheus Torrente</strong></p>
                  <p>Economista e Educador Financeiro</p>
                  <p>CORECON RO/AC 782</p>
                </div>
                <div className="contact-info">
                  <p><strong>Torrente Capitais</strong></p>
                  <p>contato@matheustorrente.com.br</p>
                  <p><a href="https://www.matheustorrente.com.br/bio" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>www.matheustorrente.com.br</a></p>
                </div>
              </div>

              <div className="action-buttons" style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }} data-html2canvas-ignore="true">
                <button type="button" onClick={() => window.print()} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 'bold', flex: 1, padding: '15px' }}>
                  🖨️ Exportar PDF
                </button>
                <button type="button" onClick={exportarWhatsApp} style={{ background: '#25D366', color: 'white', fontWeight: 'bold', flex: 1, padding: '15px', border: '1px solid #1da851' }}>
                  💬 Enviar WhatsApp
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer style={{
        textAlign: 'center',
        padding: '2rem 1rem 1rem 1rem',
        fontSize: '0.8rem',
        color: 'var(--text-secondary)',
        opacity: 0.8
      }}>
        <p style={{ margin: '0 0 5px 0' }}>
          <strong>Fontes Legais e Métodos de Cálculo Utilizados nesta Auditoria:</strong>
        </p>
        <p style={{ margin: '0 0 3px 0' }}>
          • IRPF 2025: Lei nº 15.270/2025 (e Medida Provisória nº 1.206/2024) | IN RFB nº 1.500/2014
        </p>
        <p style={{ margin: '0 0 3px 0' }}>
          • Simples Nacional: Lei Complementar nº 123/2006 (Anexos I a V e regras do Fator R)
        </p>
        <p style={{ margin: '0' }}>
          • Previdência Social (INSS): Portaria Interministerial vigente (MTP/ME)
        </p>
      </footer>
    </>
  )
}

export default App
