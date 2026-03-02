// Função que chama o Backend "Invisível" (Serverless Function da Vercel)
export const sendLeadEmail = async (dados_lead) => {
    try {
        const response = await fetch("/api/leads", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(dados_lead)
        });

        if (!response.ok) {
            const errorInfo = await response.text();
            throw new Error("Erro na Serverless Function: " + errorInfo);
        }

        return await response.json();
    } catch (err) {
        console.error("Falha ao comunicar com o servidor da Vercel para envio de Lead:", err);
    }
};
