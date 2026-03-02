export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método não permitido' });
    }

    // Pega a chave do painel da Vercel para não expor no frontend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const EMAIL_DESTINO = process.env.EMAIL_DESTINO || "matheustorrente@gmail.com";

    if (!RESEND_API_KEY) {
        return res.status(500).json({ message: 'Chave do Resend não configurada no backend.' });
    }

    try {
        const dados_lead = req.body;
        const nome = dados_lead.nome || 'Não informado';
        const telefone = dados_lead.telefone || 'Não informado';
        const email_lead = dados_lead.email || 'Não informado';
        const origem = dados_lead.origem || 'Calculadora Torrente';
        const economia = dados_lead.valor_encontrado || 0.0;

        // Formatação do link Whatsapp (igual ao Front)
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

        // HTML do E-mail
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

        // Disparo para o Resend pelo BACKEND
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
            const errorData = await response.text();
            throw new Error(`Resend API Error: ${errorData}`);
        }

        const responseData = await response.json();
        return res.status(200).json({ success: true, data: responseData });

    } catch (err) {
        console.error("Erro na Serverless Function:", err);
        return res.status(500).json({ error: err.message });
    }
}
