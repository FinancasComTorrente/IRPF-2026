// Motor de Cálculo JS (Substitui o Python)

class CalculadoraIRPF2025 {
    constructor() {
        this.TETO_ISENCAO_TABELA = 2428.80;
        this.DESCONTO_SIMPLIFICADO_MENSAL = 607.20;
        this.VALOR_DEPENDENTE = 189.59;

        this.FAIXAS = [
            [2428.80, 0.0, 0.0],
            [2826.65, 0.075, 182.16],
            [3751.05, 0.15, 394.16],
            [4664.68, 0.225, 675.49],
            [Infinity, 0.275, 908.73]
        ];

        this.VALOR_DEPENDENTE_ANUAL = 2275.08;
        this.LIMITE_EDUCACAO_ANUAL = 3561.50;
        this.LIMITE_DESCONTO_SIMPLIFICADO_ANUAL = 16754.34;
        this.ISENCAO_IDOSO_65_MENSAL = 1903.98;

        this.FAIXAS_ANUAL = [
            [2428.80 * 12, 0.0, 0.0],
            [2826.65 * 12, 0.075, 182.16 * 12],
            [3751.05 * 12, 0.15, 394.16 * 12],
            [4664.68 * 12, 0.225, 675.49 * 12],
            [Infinity, 0.275, 908.73 * 12]
        ];
    }

    _calcular_imposto_tabela_anual(base_calculo) {
        for (let [limite, aliquota, parcela_deduzir] of this.FAIXAS_ANUAL) {
            if (base_calculo <= limite) {
                let imposto = (base_calculo * aliquota) - parcela_deduzir;
                return Math.max(0.0, imposto);
            }
        }
        return 0.0;
    }

    simular_ajuste_anual(dados) {
        if (dados.is_molestia_grave) {
            return {
                tipo_declaracao: "Isenta",
                base_calculo: 0.0,
                imposto_devido: 0.0,
                imposto_restituir_ou_pagar: Number((-dados.imposto_retido_fonte).toFixed(2)),
                deducoes_totais: 0.0,
                mensagem_otimizacao: "Contribuinte diagnosticado com moléstia grave possui isenção total de IRPF sobre proventos de aposentadoria/reforma/pensão."
            };
        }

        let rendimento_base = dados.rendimento_tributavel;
        if (dados.is_idoso_65) {
            let isencao_idoso = Math.min(this.ISENCAO_IDOSO_65_MENSAL * 12, rendimento_base);
            rendimento_base -= isencao_idoso;
        }

        // Deduções Legais (Completa)
        let deducao_educacao = Math.min(dados.despesas_educacao, this.LIMITE_EDUCACAO_ANUAL);
        let deducao_pgbl = Math.min(dados.contribuicao_pgbl, rendimento_base * 0.12);
        let deducoes_legais = (
            dados.inss_pago +
            (dados.dependentes * this.VALOR_DEPENDENTE_ANUAL) +
            dados.despesas_medicas +
            deducao_educacao +
            deducao_pgbl
        );
        let base_calculo_completa = Math.max(0.0, rendimento_base - deducoes_legais);
        let imposto_completo = this._calcular_imposto_tabela_anual(base_calculo_completa);

        // Dedução Simplificada (Padrão 20%)
        let desconto_simplificado = Math.min(rendimento_base * 0.20, this.LIMITE_DESCONTO_SIMPLIFICADO_ANUAL);
        let base_calculo_simplificada = Math.max(0.0, rendimento_base - desconto_simplificado);
        let imposto_simplificado = this._calcular_imposto_tabela_anual(base_calculo_simplificada);

        // Redução Anual Lei de 2026
        if (dados.rendimento_tributavel <= 60000.0) {
            imposto_completo = Math.max(0.0, imposto_completo - Math.min(imposto_completo, 2694.15));
            imposto_simplificado = Math.max(0.0, imposto_simplificado - Math.min(imposto_simplificado, 2694.15));
        }

        let resultado_financeiro_completo = imposto_completo - dados.imposto_retido_fonte;
        let resultado_financeiro_simplificado = imposto_simplificado - dados.imposto_retido_fonte;

        let tipo, imposto_devido, base_calculo, deducoes, resultado_financeiro;
        if (imposto_completo <= imposto_simplificado) {
            tipo = "Completa";
            imposto_devido = imposto_completo;
            base_calculo = base_calculo_completa;
            deducoes = deducoes_legais;
            resultado_financeiro = resultado_financeiro_completo;
        } else {
            tipo = "Simplificada";
            imposto_devido = imposto_simplificado;
            base_calculo = base_calculo_simplificada;
            deducoes = desconto_simplificado;
            resultado_financeiro = resultado_financeiro_simplificado;
        }

        let msg = `A opção '${tipo}' é mais vantajosa economicamente.`;
        if (dados.contribuicao_pgbl === 0.0 && tipo === "Simplificada") {
            let potencial_pgbl = rendimento_base * 0.12;
            msg += ` Dica: Investir até R$ ${potencial_pgbl.toFixed(2)} em PGBL ajudaria a reduzir mais a base de cálculo na Completa.`;
        }

        return {
            tipo_declaracao: tipo,
            base_calculo: Number(base_calculo.toFixed(2)),
            imposto_devido: Number(imposto_devido.toFixed(2)),
            imposto_restituir_ou_pagar: Number(resultado_financeiro.toFixed(2)),
            deducoes_totais: Number(deducoes.toFixed(2)),
            mensagem_otimizacao: msg
        };
    }
}

class CalculadoraSimplesNacional {
    constructor() {
        this.ANEXOS = {
            "I": [
                [180000.00, 0.04, 0.0],
                [360000.00, 0.073, 5940.00],
                [720000.00, 0.095, 13860.00],
                [1800000.00, 0.107, 22500.00],
                [3600000.00, 0.143, 87300.00],
                [4800000.00, 0.19, 378000.00]
            ],
            "II": [
                [180000.00, 0.045, 0.0],
                [360000.00, 0.078, 5940.00],
                [720000.00, 0.10, 13860.00],
                [1800000.00, 0.112, 22500.00],
                [3600000.00, 0.147, 85500.00],
                [4800000.00, 0.30, 720000.00]
            ],
            "III": [
                [180000.00, 0.06, 0.0],
                [360000.00, 0.112, 9360.00],
                [720000.00, 0.135, 17640.00],
                [1800000.00, 0.16, 35640.00],
                [3600000.00, 0.21, 125640.00],
                [4800000.00, 0.33, 648000.00]
            ],
            "IV": [
                [180000.00, 0.045, 0.0],
                [360000.00, 0.09, 8100.00],
                [720000.00, 0.102, 12420.00],
                [1800000.00, 0.14, 39780.00],
                [3600000.00, 0.22, 183780.00],
                [4800000.00, 0.33, 828000.00]
            ],
            "V": [
                [180000.00, 0.155, 0.0],
                [360000.00, 0.18, 4500.00],
                [720000.00, 0.195, 9900.00],
                [1800000.00, 0.205, 17100.00],
                [3600000.00, 0.23, 62100.00],
                [4800000.00, 0.305, 540000.00]
            ]
        };
    }

    _obter_faixa(rbt12, anexo_nome) {
        if (!this.ANEXOS[anexo_nome]) return [0, 0];
        let tabela = this.ANEXOS[anexo_nome];

        if (rbt12 === 0) return [tabela[0][1], tabela[0][2]];

        for (let [limite, aliquota, parcela_deduzir] of tabela) {
            if (rbt12 <= limite) return [aliquota, parcela_deduzir];
        }
        return [tabela[tabela.length - 1][1], tabela[tabela.length - 1][2]];
    }

    calcular(dados) {
        let anexo_calculo = dados.anexo;

        if (dados.is_sujeito_fator_r && dados.rbt12 > 0) {
            let fator_r = dados.rbt12_folha / dados.rbt12;
            if (fator_r >= 0.28 && anexo_calculo === "V") anexo_calculo = "III";
            else if (fator_r < 0.28 && anexo_calculo === "III") anexo_calculo = "V";
        }

        let [aliquota_nominal, parcela_deduzir] = this._obter_faixa(dados.rbt12, anexo_calculo);
        let aliquota_efetiva;

        if (dados.rbt12 > 0) {
            aliquota_efetiva = ((dados.rbt12 * aliquota_nominal) - parcela_deduzir) / dados.rbt12;
            aliquota_efetiva = Math.max(aliquota_efetiva, 0.0);
        } else {
            aliquota_efetiva = aliquota_nominal;
        }

        let imposto_devido = dados.valor_servico * aliquota_efetiva;

        return {
            rbt12: dados.rbt12,
            aliquota_nominal: aliquota_nominal,
            parcela_deduzir: parcela_deduzir,
            aliquota_efetiva: aliquota_efetiva,
            imposto_devido: Number(imposto_devido.toFixed(2))
        };
    }
}

class AuditorFiscal {
    constructor() {
        this.irpf_calc = new CalculadoraIRPF2025();
        this.simples_calc = new CalculadoraSimplesNacional();
    }

    _avaliar_diferenca(informado, calculado) {
        let diff = informado - calculado;
        if (Math.abs(diff) <= 0.05) {
            return [0.0, "CONFORME", "O recolhimento está rigorosamente em dia com a Lei."];
        } else if (diff > 0) {
            return [Number(diff.toFixed(2)), "DIVERGENTE - RECOLHIMENTO A MAIOR", `O imposto retido foi R$ ${Math.abs(diff).toFixed(2)} superior ao exigido por lei.`];
        } else {
            return [Number(diff.toFixed(2)), "DIVERGENTE - RECOLHIMENTO A MENOR", `O imposto retido foi R$ ${Math.abs(diff).toFixed(2)} inferior ao exigido pela RFB.`];
        }
    }

    auditar_contracheque(dados) {
        if (dados.irrf_informado === undefined || dados.irrf_informado === null) {
            throw new Error("Para auditar um contracheque, o campo 'irrf_informado' deve ser fornecido.");
        }

        // Logica para calcular IRPF
        let deducoes_legais = dados.inss_retido + dados.pensao_alimenticia + dados.outras_deducoes + (dados.dependentes * this.irpf_calc.VALOR_DEPENDENTE);

        let usar_simplificado = this.irpf_calc.DESCONTO_SIMPLIFICADO_MENSAL > deducoes_legais;
        let deducao_aplicada = usar_simplificado ? this.irpf_calc.DESCONTO_SIMPLIFICADO_MENSAL : deducoes_legais;
        let tipo_deducao = usar_simplificado ? "Simplificada" : "Legal";

        let base_calculo_mensal = dados.salario_bruto - deducao_aplicada;

        // Calcular pela tabela
        let imposto_apurado = 0.0;
        for (let [limite, aliquota, parcela_deduzir] of this.irpf_calc.FAIXAS) {
            if (base_calculo_mensal <= limite) {
                let imposto = (base_calculo_mensal * aliquota) - parcela_deduzir;
                imposto_apurado = Math.max(0.0, imposto);
                break;
            }
        }

        let rendimento_tributavel = dados.salario_bruto;
        let reducao = 0.0;

        if (rendimento_tributavel <= 5000.00) {
            reducao = Math.min(imposto_apurado, 312.89);
        } else if (rendimento_tributavel <= 7350.00) {
            let reducao_calc = 978.62 - (0.133145 * rendimento_tributavel);
            reducao = Math.max(0.0, Math.min(imposto_apurado, reducao_calc));
        }

        let imposto_devido = imposto_apurado - reducao;

        let [diff, status, msg] = this._avaliar_diferenca(dados.irrf_informado, imposto_devido);
        let diferenca_anual = Number((diff * 12).toFixed(2));

        return {
            documento_tipo: "Contracheque (IRPF 2025)",
            imposto_informado: dados.irrf_informado,
            imposto_calculado: Number(imposto_devido.toFixed(2)),
            diferenca: diff,
            diferenca_anual: diferenca_anual,
            status: status,
            mensagem: `${msg} | Base de Cálculo: ${Number(base_calculo_mensal.toFixed(2))} | Tipo Dedução: ${tipo_deducao}`
        };
    }


    simular_ajuste_anual(dados) {
        return this.irpf_calc.simular_ajuste_anual(dados);
    }

    auditar_nota_fiscal_simples(dados, imposto_informado) {
        let resultado = this.simples_calc.calcular(dados);
        let [diff, status, msg] = this._avaliar_diferenca(imposto_informado, resultado.imposto_devido);

        return {
            documento_tipo: `Nota Fiscal (Simples Nacional - Anexo ${dados.anexo})`,
            imposto_informado: imposto_informado,
            imposto_calculado: resultado.imposto_devido,
            diferenca: diff,
            diferenca_anual: Number((diff * 12).toFixed(2)),
            status: status,
            mensagem: `${msg} | RBT12: ${resultado.rbt12} | Alíquota Efetiva: ${(resultado.aliquota_efetiva * 100).toFixed(2)}%`
        };
    }
}

export const auditor = new AuditorFiscal();
