// Serviço de Disparo de E-mails HTML B2B para Consultoria de Leads Premium via Frontend

// Para SPA (sem API Python), colocamos a Key aqui - Como esse front end vai para o github pages
// essa API key vazará (já conversei com o cliente sobre o tradeoff).
const RESEND_API_KEY = "re_jWZmJjRe_CpWmUVk8g5z2ZKDDP5yeeygC";
const EMAIL_DESTINO = "matheustorrente@gmail.com";

export const sendLeadEmail = async (dados_lead) => {
    try {
        const nome = dados_lead.nome || 'Não informado';
        const telefone = dados_lead.telefone || 'Não informado';
        const email_lead = dados_lead.email || 'Não informado';
        const origem = dados_lead.origem || 'Calculadora Torrente';
        const economia = dados_lead.valor_encontrado || 0.0;

        // Gera o link do WhatsApp com numero limpo e mensagem pré-escrita
        let telefone_limpo = String(telefone).replace(/\D/g, '');
        if (telefone_limpo && !telefone_limpo.startsWith('55')) {
            telefone_limpo = '55' + telefone_limpo;
        }

        const mensagem_wpp =
            `Olá, ${nome}! Tudo bem? ` +
            `Sou o Matheus da Torrente Capitais. ` +
            `Você utilizou nossa calculadora de análise tributária e identificamos uma economia potencial de R$ ${Number(economia).toLocaleString('pt-br', { minimumFractionDigits: 2 })} no seu imposto de renda. ` +
            `Gostaria de te apresentar um parecer completo e gratuito sobre como capturar esse valor. ` +
            `Podemos marcar uma conversa rápida?`;

        const link_wpp = `https://wa.me/${telefone_limpo}?text=${encodeURIComponent(mensagem_wpp)}`;

        const html_corpo = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#0C1C34;color:#fff;border-radius:12px;padding:32px;border:1px solid #1E3A8A">
      <h2 style="color:#F59E0B;margin-top:0">Novo Lead Quente Capturado!</h2>
      <p style="color:#94A3B8">A ferramenta AntiGravity acabou de captar um novo prospect premium:</p>
      
      <div style="background:#0F294D;border-radius:8px;padding:20px;margin:20px 0;border:1px solid #1E3A8A">
        <h3 style="color:#38BDF8;margin-top:0">Dados do Cliente</h3>
        <p><strong>Nome:</strong> ${nome}</p>
        <p><strong>WhatsApp:</strong> ${telefone}</p>
        <p><strong>E-mail:</strong> ${email_lead}</p>
      </div>
      
      <div style="background:#064E3B;border-radius:8px;padding:20px;margin:20px 0;border:1px solid #059669">
        <h3 style="color:#34D399;margin-top:0">Parecer da Calculadora</h3>
        <p><strong>Origem:</strong> ${origem}</p>
        <p style="font-size:1.4rem;font-weight:bold;color:#34D399">Economia Encontrada: R$ ${Number(economia).toLocaleString('pt-br', { minimumFractionDigits: 2 })}</p>
      </div>

      <div style="text-align:center;margin:28px 0">
        <a href="${link_wpp}" 
           style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;font-weight:bold;font-size:1.1rem;padding:16px 32px;border-radius:50px;letter-spacing:0.5px;box-shadow:0 4px 15px rgba(37,211,102,0.4)">
          Abrir WhatsApp com Mensagem Pronta
        </a>
        <p style="color:#475569;font-size:0.8rem;margin-top:10px">Toque no botão para abrir a conversa com a mensagem já preenchida</p>
      </div>

      <hr style="border-color:#1E3A8A"/>
      <p style="color:#475569;font-size:0.8rem">Torrente Capitais - AntiGravity Tax Engine</p>
    </div>
    `;

        // Utilizando o Fetch diretamente da API Rest do Resend.
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: "AntiGravity Leads <onboarding@resend.dev>",
                to: [EMAIL_DESTINO],
                subject: `Novo Lead: ${nome} — R$ ${Number(economia).toLocaleString('pt-br', { minimumFractionDigits: 2 })} de economia identificada`,
                html: html_corpo
            })
        });

        if (!response.ok) {
            throw new Error("Falha HTTP na comunicação com a API do Resend");
        }

        return await response.json();
    } catch (err) {
        console.error("Erro interno ao enviar Lead:", err);
    }
};
