/**
 * Função auxiliar para limpar valores monetários (Ex: "R$ 1.500,00" -> 1500.00)
 */
function limparValor(valorStr) {
    if (typeof valorStr === 'string') {
        // Remove 'R$', espaços e pontos de milhar. Troca vírgula por ponto.
        const limpo = valorStr.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
        return parseFloat(limpo);
    }
    return typeof valorStr === 'number' ? valorStr : 0;
}

/**
 * Função auxiliar para calcular idade
 */
function calcularIdade(dataNascimentoStr) {
    const hoje = new Date();
    const nascimento = new Date(dataNascimentoStr);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();

    // Ajuste se o aniversário ainda não aconteceu este ano
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--;
    }
    return idade;
}

/**
 * Função Principal de Avaliação
 */
function avaliarLocacao(dados) {
    // 1. Extração e Tratamento de Dados
    const aluguel = limparValor(dados.imovel.valor_aluguel);
    const condominio = limparValor(dados.imovel.valor_condominio);
    const totalEncargos = aluguel + condominio;

    const rendaLocatario = limparValor(dados.analise_financeira.renda_mensal_comprovada);
    const outrasRendas = limparValor(dados.analise_financeira.outras_rendas);
    const rendaTotalLocatario = rendaLocatario + outrasRendas;

    const temRestricao = dados.analise_financeira.restricoes_spc_serasa;
    const idade = calcularIdade(dados.locatario.data_nascimento);

    // Objeto de parecer inicial
    const parecer = {
        status: "EM ANALISE",
        score_interno: 0,
        detalhes: []
    };

    // 2. Regras de Negação Imediata (Hard Blocks)
    if (temRestricao) {
        parecer.status = "REPROVADO";
        parecer.detalhes.push("REJEIÇÃO: Locatário possui restrições no SPC/Serasa.");
        return parecer;
    }

    if (idade < 18) {
        parecer.status = "REPROVADO";
        parecer.detalhes.push("REJEIÇÃO: Locatário é menor de idade.");
        return parecer;
    }

    // 3. Análise de Capacidade de Pagamento (Regra dos 30%)
    const comprometimento = (totalEncargos / rendaTotalLocatario) * 100;
    parecer.detalhes.push(`Comprometimento de renda: ${comprometimento.toFixed(2)}%`);

    if (comprometimento <= 30) {
        parecer.score_interno += 50;
        parecer.detalhes.push("APROVADO: Renda compatível (dentro dos 30%).");
    } else if (comprometimento <= 35) {
        parecer.score_interno += 30;
        parecer.detalhes.push("ATENÇÃO: Renda no limite (entre 30% e 35%).");
    } else {
        parecer.detalhes.push("RISCO: Renda insuficiente (acima de 35% de comprometimento).");
    }

    // 4. Análise da Garantia (Fiador)
    const modalidade = dados.garantia.modalidade;
    if (modalidade && modalidade.includes("Fiador")) {
        const rendaFiador = limparValor(dados.garantia.fiador.renda_fiador);
        const ratioFiador = rendaFiador / totalEncargos;

        parecer.detalhes.push(`Cobertura do Fiador: ${ratioFiador.toFixed(2)} vezes o aluguel.`);

        if (ratioFiador >= 3) {
            parecer.score_interno += 40;
            parecer.detalhes.push("APROVADO: Fiador possui renda superior a 3x o pacote.");
        } else {
            parecer.detalhes.push("RISCO: Fiador não atinge 3x o valor do pacote.");
        }
    }

    // 5. Estabilidade Profissional
    const vinculo = dados.analise_financeira.vinculo_empregaticio;
    if (vinculo.includes("CLT") || vinculo.includes("Publico")) {
        parecer.score_interno += 10;
    }

    // 6. Decisão Final baseada no Score
    if (parecer.score_interno >= 80) {
        parecer.status = "APROVADO";
    } else if (parecer.score_interno >= 50) {
        parecer.status = "APROVADO COM RESSALVAS";
    } else {
        parecer.status = "REPROVADO";
    }

    return parecer;
}