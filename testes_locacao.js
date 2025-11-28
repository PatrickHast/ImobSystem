describe("Sistema de Análise de Crédito Imobiliário", function() {

    // --- SUITE 1: Funções Auxiliares ---
    describe("Funções Auxiliares", function() {
        
        it("deve limpar corretamente valores monetários formatados", function() {
            expect(limparValor("R$ 1.500,00")).toBe(1500.00);
            expect(limparValor("320,00")).toBe(320.00);
            expect(limparValor("R$ 10.000,50")).toBe(10000.50);
        });

        it("deve calcular a idade corretamente", function() {
            // Cria uma data de 20 anos atrás
            const hoje = new Date();
            const anoNascimento = hoje.getFullYear() - 20;
            const dataNasc = `${anoNascimento}-01-01`; 
            
            expect(calcularIdade(dataNasc)).toBe(20);
        });
    });

    // --- SUITE 2: Lógica Principal (avaliarLocacao) ---
    describe("Regra de Negócio: avaliarLocacao", function() {

        // Template de dados base para usar nos testes
        let dadosBase;

        beforeEach(function() {
            // Reseta os dados antes de cada teste para garantir isolamento
            dadosBase = {
                "imovel": { "valor_aluguel": "R$ 1.000,00", "valor_condominio": "R$ 0,00" },
                "locatario": { "data_nascimento": "1990-01-01" }, // Maior de idade
                "analise_financeira": {
                    "vinculo_empregaticio": "CLT",
                    "renda_mensal_comprovada": "R$ 4.000,00", // Renda segura (25% comprom.)
                    "outras_rendas": "R$ 0,00",
                    "restricoes_spc_serasa": false
                },
                "garantia": {
                    "modalidade": "Fiador",
                    "fiador": { "renda_fiador": "R$ 4.000,00" } // Fiador seguro (4x)
                }
            };
        });

        // CASO 1: CAMINHO FELIZ
        it("deve APROVAR um candidato ideal (Renda boa, CLT, Sem restrições, Bom fiador)", function() {
            const resultado = avaliarLocacao(dadosBase);
            expect(resultado.status).toBe("APROVADO");
            expect(resultado.score_interno).toBeGreaterThanOrEqual(80);
        });

        // CASO 2: RESTRIÇÃO NO CPF
        it("deve REPROVAR IMEDIATAMENTE se houver restrição no SPC/Serasa", function() {
            dadosBase.analise_financeira.restricoes_spc_serasa = true;
            
            const resultado = avaliarLocacao(dadosBase);
            expect(resultado.status).toBe("REPROVADO");
            expect(resultado.detalhes).toContain("REJEIÇÃO: Locatário possui restrições no SPC/Serasa.");
        });

        // CASO 3: MENOR DE IDADE
        it("deve REPROVAR IMEDIATAMENTE se for menor de idade", function() {
            const anoAtual = new Date().getFullYear();
            dadosBase.locatario.data_nascimento = `${anoAtual - 17}-01-01`; // 17 anos

            const resultado = avaliarLocacao(dadosBase);
            expect(resultado.status).toBe("REPROVADO");
            expect(resultado.detalhes).toContain("REJEIÇÃO: Locatário é menor de idade.");
        });

        // CASO 4: RENDA NO LIMITE (30% a 35%)
        it("deve aprovar COM RESSALVAS se a renda estiver no limite (entre 30% e 35%)", function() {
            // Aluguel 1000. Renda 3000. Comprometimento = 33.3%
            dadosBase.analise_financeira.renda_mensal_comprovada = "R$ 3.000,00"; 
            
            const resultado = avaliarLocacao(dadosBase);
            // Fiador bom e CLT salvam a nota, mas o status de renda deve ser alertado
            expect(resultado.detalhes).toContain("ATENÇÃO: Renda no limite (entre 30% e 35%).");
        });

        // CASO 5: FIADOR FRACO
        it("deve penalizar o score se o Fiador não tiver renda de 3x o pacote", function() {
            // Aluguel 1000. Fiador ganha 2000 (2x apenas).
            dadosBase.garantia.fiador.renda_fiador = "R$ 2.000,00";

            const resultado = avaliarLocacao(dadosBase);
            expect(resultado.detalhes).toContain("RISCO: Fiador não atinge 3x o valor do pacote.");
            
            // Sem os 40 pontos do fiador, o score cai de 100 para 60 (Aprovado com Ressalvas)
            expect(resultado.score_interno).toBeLessThan(80);
            expect(resultado.status).toBe("APROVADO COM RESSALVAS");
        });

        // CASO 6: REPROVAÇÃO POR RENDA INSUFICIENTE
        it("deve REPROVAR se a renda for muito baixa (comprometimento > 35%) e fiador ruim", function() {
             // Aluguel 1000. Renda 2000. Comprometimento 50%.
             dadosBase.analise_financeira.renda_mensal_comprovada = "R$ 2.000,00";
             dadosBase.garantia.fiador.renda_fiador = "R$ 1.500,00"; // Fiador ruim
             dadosBase.analise_financeira.vinculo_empregaticio = "Autonomo"; // Sem CLT

             const resultado = avaliarLocacao(dadosBase);
             expect(resultado.status).toBe("REPROVADO");
             expect(resultado.score_interno).toBeLessThan(50);
        });

    });
});