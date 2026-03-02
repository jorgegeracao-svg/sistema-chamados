// =============================================================================
// FLUXO-CHAMADOS.JS — Lógica completa do fluxo de Manutenção Canteiros
//
// FLUXO DE 12 ETAPAS:
//   Et. 1  — Abertura do Chamado          (SOLICITANTE)
//   Et. 2  — Agendamento da Avaliação     (ADMINISTRATIVO)
//   Et. 3  — Confirmação da Avaliação     (SOLICITANTE)    ↺ reprova → volta Et. 2
//   Et. 4  — Comunicar o Técnico          (ADMINISTRATIVO) → Técnico confirma
//   Et. 5  — Avaliação Técnica            (TECNICO)        5.1 Início | 5.2 Término
//   Et. 6  — Verificação de Estoque       (TECNICO)        SIM → Et. 9 | NÃO → Et. 7
//   Et. 7  — Solicitação de Compra        (ADMINISTRATIVO) sub: 7.1 SC | 7.2 PC | 7.3 Entrega
//   Et. 8  — Recebimento de Mercadoria    (ADMINISTRATIVO)
//   Et. 9  — Programar o Serviço          (ADMINISTRATIVO)
//   Et. 10 — Execução da Manutenção       (TECNICO)        10.1 Início | 10.2 Término
//   Et. 11 — Conferência do Gestor        (GESTOR)         só aprova
//   Et. 12 — Finalizar o Chamado          (SOLICITANTE)
//
// Compatível com: renderizador-etapas.js, script.js, fluxo-config.js
// Chave localStorage: 'chamadosFluxo'
// =============================================================================


// =============================================================================
// CLASSE CHAMADO
// Representa um chamado completo e gerencia a progressão de suas etapas.
// =============================================================================

class Chamado {

    /**
     * @param {number} id
     * @param {string} titulo
     * @param {string} observacao
     * @param {string} unidade
     * @param {Object} solicitante  — objeto completo do usuário logado
     * @param {Array}  fotos        — array de arquivos/base64 (opcional)
     * @param {string} tipoManutencao — tipo selecionado no formulário
     * @param {string} email        — e-mail de contato do solicitante
     * @param {string} contato      — telefone/ramal de contato
     */
    constructor(id, titulo, observacao, unidade, solicitante, fotos,
        tipoManutencao, email, contato) {
        this.id = id;
        this.titulo = titulo;
        this.dataCriacao = new Date();
        this.status = 'EM_ANDAMENTO';
        this.solicitante = solicitante;

        // Atalhos para exibição nos cards da lista
        this._numero = id;
        this._local = unidade;
        this._solicitanteUsuario = solicitante?.usuario || '';
        this._tipoManutencao = tipoManutencao || '';

        this.etapas = [];
        this._criarEtapa1(observacao, unidade, solicitante, fotos, tipoManutencao, email, contato);
    }


    // =========================================================================
    // HELPERS INTERNOS
    // =========================================================================

    /** Cria e empurra um objeto de etapa no array. */
    _pushEtapa(numero, titulo, categoria, extras = {}) {
        this.etapas.push({
            numero,
            titulo,
            categoria,
            status: 'EM_ANDAMENTO',
            expandida: true,
            dados: {},
            conclusao: null,
            ...extras
        });
    }

    /** Conclui uma etapa de nível raiz (número inteiro ou decimal simples). */
    _concluirEtapa(numero, dados, usuario) {
        const etapa = this._getEtapa(numero);
        if (!etapa || etapa.status === 'CONCLUIDA') return false;
        etapa.dados = { ...etapa.dados, ...dados };
        etapa.status = 'CONCLUIDA';
        etapa.expandida = false;
        etapa.conclusao = {
            usuario: usuario?.nomeCompleto || usuario?.usuario || '—',
            dataHora: new Date()
        };
        return true;
    }

    /**
     * Busca uma etapa ou subetapa pelo número.
     * Subetapas ficam dentro de etapa.subetapas[].
     */
    _getEtapa(numero) {
        // Primeiro tenta etapa de nível raiz
        const raiz = this.etapas.find(e => e.numero === numero);
        if (raiz) return raiz;

        // Depois procura dentro das subetapas de qualquer etapa pai
        for (const e of this.etapas) {
            if (e.subetapas) {
                const sub = e.subetapas.find(s => Math.abs(s.numero - numero) < 0.001);
                if (sub) return sub;
            }
        }
        return null;
    }

    /** Retorna a etapa pai (raiz) de uma subetapa. */
    _getEtapaPai(numeroPai) {
        return this.etapas.find(e => e.numero === numeroPai) || null;
    }


    // =========================================================================
    // ETAPA 1 — ABERTURA DO CHAMADO (SOLICITANTE)
    // Criada automaticamente no construtor; já nasce CONCLUIDA.
    // =========================================================================

    _criarEtapa1(observacao, unidade, solicitante, fotos, tipoManutencao, email, contato) {
        this.etapas.push({
            numero: 1,
            titulo: 'Abertura do Chamado',
            categoria: 'SOLICITANTE',
            status: 'CONCLUIDA',
            expandida: false,
            dados: { observacao, unidade, tipoManutencao, email, contato, fotos: fotos || [] },
            conclusao: {
                usuario: solicitante?.nomeCompleto || solicitante?.usuario || '—',
                dataHora: new Date()
            }
        });
        this._criarEtapa2();
    }


    // =========================================================================
    // ETAPA 2 — AGENDAMENTO DA AVALIAÇÃO (ADMINISTRATIVO)
    // ADM define data e hora da visita técnica.
    // =========================================================================

    _criarEtapa2() {
        this._pushEtapa(2, 'Agendamento da Avaliação', 'ADMINISTRATIVO');
    }

    /**
     * @param {string} dataAgendamento  ex: '2026-02-20'
     * @param {string} horaAgendamento  ex: '14:00'
     * @param {string} observacao       mensagem opcional para o solicitante
     * @param {Object} usuario          usuário logado (ADM)
     */
    concluirEtapa2(dataAgendamento, horaAgendamento, observacao, usuario) {
        const ok = this._concluirEtapa(2, { dataAgendamento, horaAgendamento, observacao }, usuario);
        if (ok) this._criarEtapa3();
    }


    // =========================================================================
    // ETAPA 3 — CONFIRMAÇÃO DA AVALIAÇÃO (SOLICITANTE)
    // Aprova → Et. 4 | Reprova → volta para Et. 2 (remarcar)
    // Histórico de reprovações sempre preservado.
    // =========================================================================

    _criarEtapa3() {
        this._pushEtapa(3, 'Confirmação da Avaliação', 'SOLICITANTE', {
            historicoReprovacoes: []
        });
    }

    /**
     * @param {boolean} aprovado     true = confirma | false = reprova
     * @param {string}  motivo       obrigatório quando reprovado
     * @param {Object}  usuario
     */
    confirmarEtapa3(aprovado, motivo, usuario) {
        const etapa = this._getEtapa(3);
        if (!etapa || etapa.status === 'CONCLUIDA') return;

        if (aprovado) {
            this._concluirEtapa(3, { decisao: 'APROVADO' }, usuario);
            this._criarEtapa4();
        } else {
            // Registra no histórico e reabre a Et. 2
            etapa.historicoReprovacoes = etapa.historicoReprovacoes || [];
            etapa.historicoReprovacoes.push({
                motivo,
                usuario: usuario?.nomeCompleto || '—',
                dataHora: new Date()
            });

            // Reabre Et. 2 para remarcar
            const etapa2 = this._getEtapa(2);
            if (etapa2) {
                etapa2.status = 'EM_ANDAMENTO';
                etapa2.expandida = true;
                etapa2.conclusao = null;
                etapa2.dados = { ...etapa2.dados, remarcacao: true };
            }

            // Remove Et. 3 atual para ser recriada após nova Et. 2
            this.etapas = this.etapas.filter(e => e.numero !== 3);
        }
    }


    // =========================================================================
    // ETAPA 4 — COMUNICAR O TÉCNICO (ADMINISTRATIVO)
    // ADM seleciona o técnico. O próprio técnico confirma o recebimento.
    // =========================================================================

    _criarEtapa4() {
        this._pushEtapa(4, 'Comunicar o Técnico', 'ADMINISTRATIVO', {
            tecnicoConfirmou: false
        });
    }

    /**
     * ADM seleciona o técnico responsável.
     * @param {string} tecnicoUsuario  login do técnico selecionado
     * @param {string} tecnicoNome     nome completo do técnico
     * @param {string} observacao      mensagem para o técnico
     * @param {Object} usuario         usuário logado (ADM)
     */
    selecionarTecnicoEtapa4(tecnicoUsuario, tecnicoNome, observacao, usuario) {
        const etapa = this._getEtapa(4);
        if (!etapa) return;
        etapa.dados = { tecnicoUsuario, tecnicoNome, observacao, selecionadoPor: usuario?.nomeCompleto };
        etapa.status = 'AGUARDANDO_CONFIRMACAO';
        // Armazena para que o renderizador saiba exibir o botão de confirmação ao técnico
    }

    /**
     * Técnico confirma o recebimento da comunicação.
     * @param {Object} usuario  usuário logado (TECNICO)
     */
    tecnicoConfirmarEtapa4(usuario) {
        const etapa = this._getEtapa(4);
        if (!etapa) return;
        etapa.tecnicoConfirmou = true;
        this._concluirEtapa(4, { confirmadoPor: usuario?.nomeCompleto, dataConfirmacao: new Date() }, usuario);
        this._criarEtapa5();
    }


    // =========================================================================
    // ETAPA 5 — AVALIAÇÃO TÉCNICA (TECNICO) — subetapas 5.1 e 5.2
    // 5.1 Início da avaliação | 5.2 Término (diagnóstico + materiais)
    // =========================================================================

    _criarEtapa5() {
        this.etapas.push({
            numero: 5,
            titulo: 'Avaliação Técnica',
            categoria: 'TECNICO',
            status: 'EM_ANDAMENTO',
            expandida: true,
            dados: {},
            conclusao: null,
            subetapas: []
        });
        this._criarSubetapa51();
    }

    // ---- 5.1 Início da Avaliação ----

    _criarSubetapa51() {
        const pai = this._getEtapaPai(5);
        if (!pai) return;
        pai.subetapas.push({
            numero: 5.1,
            titulo: 'Início da Avaliação',
            categoria: 'TECNICO',
            status: 'EM_ANDAMENTO',
            expandida: true,
            dados: {},
            conclusao: null
        });
    }

    /**
     * @param {string} dataInicio
     * @param {string} horaInicio
     * @param {string} observacaoInicio
     * @param {Object} usuario
     */
    concluirSubetapa51(dataInicio, horaInicio, observacaoInicio, usuario) {
        const sub = this._getEtapa(5.1);
        if (!sub || sub.status === 'CONCLUIDA') return;
        sub.dados = { dataInicio, horaInicio, observacaoInicio };
        sub.status = 'CONCLUIDA';
        sub.expandida = false;
        sub.conclusao = { usuario: usuario?.nomeCompleto || '—', dataHora: new Date() };
        this._criarSubetapa52();
    }

    // ---- 5.2 Término da Avaliação (diagnóstico) ----

    _criarSubetapa52() {
        const pai = this._getEtapaPai(5);
        if (!pai) return;
        pai.subetapas.push({
            numero: 5.2,
            titulo: 'Término da Avaliação',
            categoria: 'TECNICO',
            status: 'EM_ANDAMENTO',
            expandida: true,
            dados: {},
            conclusao: null
        });
    }

    /**
     * @param {string} dataTermino
     * @param {string} horaTermino
     * @param {string} diagnostico      descrição técnica do problema
     * @param {string} materiaisNecessarios
     * @param {Array}  fotos
     * @param {Object} usuario
     */
    concluirSubetapa52(dataTermino, horaTermino, diagnostico, materiaisNecessarios, fotos, usuario) {
        const sub = this._getEtapa(5.2);
        if (!sub || sub.status === 'CONCLUIDA') return;
        sub.dados = { dataTermino, horaTermino, diagnostico, materiaisNecessarios, fotos: fotos || [] };
        sub.status = 'CONCLUIDA';
        sub.expandida = false;
        sub.conclusao = { usuario: usuario?.nomeCompleto || '—', dataHora: new Date() };

        // Conclui a etapa pai 5
        const pai = this._getEtapaPai(5);
        if (pai) {
            pai.status = 'CONCLUIDA';
            pai.expandida = false;
            pai.conclusao = { usuario: usuario?.nomeCompleto || '—', dataHora: new Date() };
        }

        this._criarEtapa6();
    }


    // =========================================================================
    // ETAPA 6 — VERIFICAÇÃO DE ESTOQUE (TECNICO)
    // SIM → pula para Et. 9 (Programar Serviço)
    // NÃO → abre Et. 7 (Solicitação de Compra com subetapas)
    // =========================================================================

    _criarEtapa6() {
        this._pushEtapa(6, 'Verificação de Estoque', 'TECNICO');
    }

    /**
     * @param {boolean} possuiEstoque
     * @param {string}  observacao
     * @param {Object}  usuario
     */
    concluirEtapa6(possuiEstoque, observacao, usuario) {
        const ok = this._concluirEtapa(6, { possuiEstoque, observacao }, usuario);
        if (!ok) return;

        if (possuiEstoque) {
            // Estoque disponível → pula compra e vai direto para programar serviço
            this._criarEtapa9();
        } else {
            // Sem estoque → abre processo de compra (Et. 7 com subetapas)
            this._criarEtapa7();
        }
    }


    // =========================================================================
    // ETAPA 7 — SOLICITAÇÃO DE COMPRA (ADMINISTRATIVO/COMPRADOR)
    // Subetapas: 7.1 SC | 7.2 PC | 7.3 Programar Entrega
    // =========================================================================

    _criarEtapa7() {
        this.etapas.push({
            numero: 7,
            titulo: 'Processo de Compra',
            categoria: 'ADMINISTRATIVO',
            status: 'EM_ANDAMENTO',
            expandida: true,
            dados: {},
            conclusao: null,
            subetapas: []
        });
        this._criarSubetapa71();
    }

    // ---- 7.1 Solicitação de Compra (SC) ----

    _criarSubetapa71() {
        const pai = this._getEtapaPai(7);
        if (!pai) return;
        pai.subetapas.push({
            numero: 7.1,
            titulo: 'Solicitação de Compra',
            categoria: 'ADMINISTRATIVO',
            status: 'EM_ANDAMENTO',
            expandida: true,
            dados: {},
            conclusao: null
        });
    }

    /**
     * @param {Array}  itens         [{ descricao, quantidade, unidade }]
     * @param {string} justificativa
     * @param {string} urgencia      'NORMAL' | 'URGENTE'
     * @param {Object} usuario
     */
    concluirSubetapa71(itens, justificativa, urgencia, usuario) {
        const sub = this._getEtapa(7.1);
        if (!sub || sub.status === 'CONCLUIDA') return;
        sub.dados = { itens, justificativa, urgencia };
        sub.status = 'CONCLUIDA';
        sub.expandida = false;
        sub.conclusao = { usuario: usuario?.nomeCompleto || '—', dataHora: new Date() };
        this._criarSubetapa72();
    }

    // ---- 7.2 Pedido de Compra (PC) ----

    _criarSubetapa72() {
        const pai = this._getEtapaPai(7);
        if (!pai) return;
        pai.subetapas.push({
            numero: 7.2,
            titulo: 'Pedido de Compra',
            categoria: 'COMPRADOR',
            status: 'EM_ANDAMENTO',
            expandida: true,
            dados: {
                produtos: [
                    { produto: '', quantidade: '', valorUnitario: '' },
                    { produto: '', quantidade: '', valorUnitario: '' },
                    { produto: '', quantidade: '', valorUnitario: '' }
                ]
            },
            conclusao: null
        });
    }

    /**
     * @param {string} numeroPedido
     * @param {string} fornecedor
     * @param {Array}  produtos      [{ produto, quantidade, valorUnitario }]
     * @param {number} valorTotal
     * @param {string} observacao
     * @param {string} anexo         base64 ou nome do arquivo
     * @param {Object} usuario
     */
    concluirSubetapa72(numeroPedido, fornecedor, produtos, valorTotal, observacao, anexo, usuario) {
        const sub = this._getEtapa(7.2);
        if (!sub || sub.status === 'CONCLUIDA') return;
        sub.dados = { numeroPedido, fornecedor, produtos, valorTotal, observacao, anexo };
        sub.status = 'CONCLUIDA';
        sub.expandida = false;
        sub.conclusao = { usuario: usuario?.nomeCompleto || '—', dataHora: new Date() };
        this._criarSubetapa73();
    }

    // ---- 7.3 Programar Entrega ----

    _criarSubetapa73() {
        const pai = this._getEtapaPai(7);
        if (!pai) return;
        pai.subetapas.push({
            numero: 7.3,
            titulo: 'Programar Entrega',
            categoria: 'COMPRADOR',
            status: 'EM_ANDAMENTO',
            expandida: true,
            dados: {},
            conclusao: null
        });
    }

    /**
     * @param {string} dataEntrega
     * @param {string} horaEntrega
     * @param {string} localEntrega
     * @param {string} observacao
     * @param {Object} usuario
     */
    concluirSubetapa73(dataEntrega, horaEntrega, localEntrega, observacao, usuario) {
        const sub = this._getEtapa(7.3);
        if (!sub || sub.status === 'CONCLUIDA') return;
        sub.dados = { dataEntrega, horaEntrega, localEntrega, observacao };
        sub.status = 'CONCLUIDA';
        sub.expandida = false;
        sub.conclusao = { usuario: usuario?.nomeCompleto || '—', dataHora: new Date() };

        // Conclui etapa pai 7
        const pai = this._getEtapaPai(7);
        if (pai) {
            pai.status = 'CONCLUIDA';
            pai.expandida = false;
            pai.conclusao = { usuario: usuario?.nomeCompleto || '—', dataHora: new Date() };
        }

        this._criarEtapa8();
    }


    // =========================================================================
    // ETAPA 8 — RECEBIMENTO DE MERCADORIA (ADMINISTRATIVO)
    // Só existe se a Et. 6 foi NÃO (passou pela compra).
    // =========================================================================

    _criarEtapa8() {
        this._pushEtapa(8, 'Recebimento de Mercadoria', 'ADMINISTRATIVO');
    }

    /**
     * @param {string} dataRecebimento
     * @param {string} numeroNF        nota fiscal
     * @param {string} observacao
     * @param {Array}  fotos
     * @param {Object} usuario
     */
    concluirEtapa8(dataRecebimento, numeroNF, observacao, fotos, usuario) {
        const ok = this._concluirEtapa(8, { dataRecebimento, numeroNF, observacao, fotos: fotos || [] }, usuario);
        if (ok) this._criarEtapa9();
    }


    // =========================================================================
    // ETAPA 9 — PROGRAMAR O SERVIÇO (ADMINISTRATIVO)
    // Chegamos aqui vindo da Et. 6 (SIM) ou da Et. 8 (após compra).
    // =========================================================================

    _criarEtapa9() {
        this._pushEtapa(9, 'Programar o Serviço', 'ADMINISTRATIVO');
    }

    /**
     * @param {string} dataServico
     * @param {string} horaServico
     * @param {string} tecnicoResponsavel  nome do técnico
     * @param {string} observacao
     * @param {Object} usuario
     */
    concluirEtapa9(dataServico, horaServico, tecnicoResponsavel, observacao, usuario) {
        const ok = this._concluirEtapa(9, { dataServico, horaServico, tecnicoResponsavel, observacao }, usuario);
        if (ok) this._criarEtapa10();
    }


    // =========================================================================
    // ETAPA 10 — EXECUÇÃO DA MANUTENÇÃO (TECNICO) — subetapas 10.1 e 10.2
    // 10.1 Início do serviço (foto do antes) | 10.2 Término (o que foi feito + fotos)
    // =========================================================================

    _criarEtapa10() {
        this.etapas.push({
            numero: 10,
            titulo: 'Execução da Manutenção',
            categoria: 'TECNICO',
            status: 'EM_ANDAMENTO',
            expandida: true,
            dados: {},
            conclusao: null,
            subetapas: []
        });
        this._criarSubetapa101();
    }

    // ---- 10.1 Início do Serviço ----

    _criarSubetapa101() {
        const pai = this._getEtapaPai(10);
        if (!pai) return;
        pai.subetapas.push({
            numero: 10.1,
            titulo: 'Início do Serviço',
            categoria: 'TECNICO',
            status: 'EM_ANDAMENTO',
            expandida: true,
            dados: {},
            conclusao: null
        });
    }

    /**
     * @param {string} dataInicio
     * @param {string} horaInicio
     * @param {Array}  fotosAntes   fotos do estado anterior ao serviço
     * @param {string} observacao
     * @param {Object} usuario
     */
    concluirSubetapa101(dataInicio, horaInicio, fotosAntes, observacao, usuario) {
        const sub = this._getEtapa(10.1);
        if (!sub || sub.status === 'CONCLUIDA') return;
        sub.dados = { dataInicio, horaInicio, fotosAntes: fotosAntes || [], observacao };
        sub.status = 'CONCLUIDA';
        sub.expandida = false;
        sub.conclusao = { usuario: usuario?.nomeCompleto || '—', dataHora: new Date() };
        this._criarSubetapa102();
    }

    // ---- 10.2 Término do Serviço ----

    _criarSubetapa102() {
        const pai = this._getEtapaPai(10);
        if (!pai) return;
        pai.subetapas.push({
            numero: 10.2,
            titulo: 'Término do Serviço',
            categoria: 'TECNICO',
            status: 'EM_ANDAMENTO',
            expandida: true,
            dados: {},
            conclusao: null
        });
    }

    /**
     * @param {string} dataTermino
     * @param {string} horaTermino
     * @param {string} descricaoServico  o que foi feito
     * @param {string} materiaisUsados
     * @param {Array}  fotosDepois       fotos após o serviço
     * @param {Object} usuario
     */
    concluirSubetapa102(dataTermino, horaTermino, descricaoServico, materiaisUsados, fotosDepois, usuario) {
        const sub = this._getEtapa(10.2);
        if (!sub || sub.status === 'CONCLUIDA') return;
        sub.dados = { dataTermino, horaTermino, descricaoServico, materiaisUsados, fotosDepois: fotosDepois || [] };
        sub.status = 'CONCLUIDA';
        sub.expandida = false;
        sub.conclusao = { usuario: usuario?.nomeCompleto || '—', dataHora: new Date() };

        // Conclui etapa pai 10
        const pai = this._getEtapaPai(10);
        if (pai) {
            pai.status = 'CONCLUIDA';
            pai.expandida = false;
            pai.conclusao = { usuario: usuario?.nomeCompleto || '—', dataHora: new Date() };
        }

        this._criarEtapa11();
    }


    // =========================================================================
    // ETAPA 11 — CONFERÊNCIA DO GESTOR (GESTOR)
    // Apenas aprovação (sem reprovação neste fluxo).
    // Gestor = campo 'gestor' do cadastro do técnico selecionado na Et. 4.
    // =========================================================================

    _criarEtapa11() {
        // Recupera o gestor do técnico atribuído na Et. 4
        const etapa4 = this._getEtapa(4);
        const gestorRef = etapa4?.dados?.gestorDoTecnico || '';

        this._pushEtapa(11, 'Conferência do Gestor', 'GESTOR', {
            gestorResponsavel: gestorRef
        });
    }

    /**
     * @param {string} parecer      observações do gestor
     * @param {Object} usuario      usuário logado (GESTOR / ADMIN)
     */
    aprovarEtapa11(parecer, usuario) {
        const ok = this._concluirEtapa(11, { decisao: 'APROVADO', parecer }, usuario);
        if (ok) this._criarEtapa12();
    }


    // =========================================================================
    // ETAPA 12 — FINALIZAR O CHAMADO (SOLICITANTE)
    // Última etapa: solicitante confirma a conclusão e pode avaliar o serviço.
    // =========================================================================

    _criarEtapa12() {
        this._pushEtapa(12, 'Finalizar o Chamado', 'SOLICITANTE');
    }

    /**
     * @param {string} confirmacao   'SATISFEITO' | 'INSATISFEITO'
     * @param {number} avaliacao     1–5 estrelas
     * @param {string} observacaoFinal
     * @param {Object} usuario
     */
    concluirEtapa12(confirmacao, avaliacao, observacaoFinal, usuario) {
        const ok = this._concluirEtapa(12, { confirmacao, avaliacao, observacaoFinal }, usuario);
        if (ok) {
            this.status = 'FINALIZADO';
            this.dataFechamento = new Date();
        }
    }


    // =========================================================================
    // PERMISSÕES
    // Quem pode interagir com cada etapa/subetapa.
    // =========================================================================

    /**
     * Mapa de categoria → perfis que podem agir.
     * ADMIN sempre pode tudo.
     */
    static get _CATEGORIA_MAP() {
        return {
            'SOLICITANTE': ['SOLICITANTE', 'ADMIN'],
            'ADMINISTRATIVO': ['ADMINISTRATIVO', 'ADMIN'],
            'TECNICO': ['TECNICO', 'ADMIN'],
            'COMPRADOR': ['COMPRADOR', 'ADMINISTRATIVO', 'ADMIN'],
            'GESTOR': ['ADMIN']   // sem perfil GESTOR dedicado; mapeado via ADMIN
        };
    }

    /**
     * Retorna true se o usuário com o perfil dado pode editar a etapa informada.
     * @param {number} etapaNumero
     * @param {string} usuarioPerfil
     */
    podeEditarEtapa(etapaNumero, usuarioPerfil) {
        const etapa = this._getEtapa(etapaNumero);
        if (!etapa) return false;
        if (etapa.status === 'CONCLUIDA') return false;

        // Et. 4 em AGUARDANDO_CONFIRMACAO: apenas TECNICO ou ADMIN pode confirmar
        if (etapaNumero === 4 && etapa.status === 'AGUARDANDO_CONFIRMACAO') {
            return ['TECNICO', 'ADMIN'].includes(usuarioPerfil);
        }

        const perfisPermitidos = Chamado._CATEGORIA_MAP[etapa.categoria] || [];
        return perfisPermitidos.includes(usuarioPerfil);
    }

    /**
     * Retorna a etapa atualmente em andamento (para exibição nos cards).
     */
    getEtapaAtiva() {
        // Procura primeiro nas subetapas das etapas em andamento
        for (const e of this.etapas) {
            if (e.status === 'EM_ANDAMENTO' || e.status === 'AGUARDANDO_CONFIRMACAO') {
                if (e.subetapas && e.subetapas.length > 0) {
                    const subAtiva = e.subetapas.find(s => s.status === 'EM_ANDAMENTO');
                    if (subAtiva) return subAtiva;
                }
                return e;
            }
        }
        // Chamado finalizado
        return this.etapas[this.etapas.length - 1] || null;
    }

    toggleEtapa(etapaNumero) {
        const etapa = this._getEtapa(etapaNumero);
        if (etapa) etapa.expandida = !etapa.expandida;
    }
}


// =============================================================================
// GERENCIADOR DE CHAMADOS
// Responsável por persistência no localStorage e consultas filtradas.
// =============================================================================

class GerenciadorChamados {

    constructor() {
        this.chamados = this._carregarChamados();
        this.contadorId = this.chamados.length > 0
            ? Math.max(...this.chamados.map(c => c.id)) + 1
            : 1;
    }

    // -------------------------------------------------------------------------
    // Reidratação — transforma JSON plano de volta em instância de Chamado
    // -------------------------------------------------------------------------
    _reidratar(obj) {
        return Object.assign(Object.create(Chamado.prototype), obj);
    }

    _carregarChamados() {
        const dados = localStorage.getItem('chamadosFluxo');
        if (!dados) return [];
        try {
            return JSON.parse(dados).map(c => this._reidratar(c));
        } catch {
            return [];
        }
    }

    salvarChamados() {
        localStorage.setItem('chamadosFluxo', JSON.stringify(this.chamados));
    }

    // -------------------------------------------------------------------------
    // CRUD
    // -------------------------------------------------------------------------

    /**
     * Cria um novo chamado e persiste no localStorage.
     * @param {string} titulo
     * @param {string} observacao
     * @param {string} unidade
     * @param {Object} solicitante
     * @param {Array}  fotos
     * @param {string} tipoManutencao
     * @param {string} email
     * @param {string} contato
     * @returns {Chamado}
     */
    criarChamado(titulo, observacao, unidade, solicitante, fotos,
        tipoManutencao, email, contato) {
        const chamado = new Chamado(
            this.contadorId++,
            titulo, observacao, unidade, solicitante, fotos,
            tipoManutencao, email, contato
        );
        this.chamados.push(chamado);
        this.salvarChamados();
        return chamado;
    }

    getChamado(id) {
        const c = this.chamados.find(c => c.id == id);
        return c ? this._reidratar(c) : null;
    }

    atualizarChamado(chamado) {
        const index = this.chamados.findIndex(c => c.id == chamado.id);
        if (index !== -1) {
            this.chamados[index] = chamado;
            this.salvarChamados();
        }
    }

    // -------------------------------------------------------------------------
    // FILTRO POR USUÁRIO
    // Admin, TECNICO e ADMINISTRATIVO veem todos os chamados onde têm ação.
    // SOLICITANTE e COMPRADOR veem apenas os seus.
    // -------------------------------------------------------------------------

    getChamadosDoUsuario(usuario) {
        // Admin vê tudo
        if (usuario.perfil === 'ADMIN') {
            return this.chamados.map(c => this._reidratar(c));
        }

        return this.chamados
            .map(c => this._reidratar(c))
            .filter(chamado => {
                // Solicitante sempre vê seus próprios chamados
                if (chamado.solicitante?.usuario === usuario.usuario) return true;

                // Verifica se há alguma etapa raiz em andamento que o perfil pode acessar
                return chamado.etapas.some(etapa => {
                    const ativa = etapa.status === 'EM_ANDAMENTO' ||
                        etapa.status === 'AGUARDANDO_CONFIRMACAO';

                    if (ativa) {
                        const perfis = Chamado._CATEGORIA_MAP[etapa.categoria] || [];
                        if (perfis.includes(usuario.perfil)) return true;
                    }

                    // Verifica subetapas em andamento
                    if (etapa.subetapas) {
                        return etapa.subetapas.some(sub => {
                            if (sub.status === 'EM_ANDAMENTO') {
                                const perfis = Chamado._CATEGORIA_MAP[sub.categoria] || [];
                                return perfis.includes(usuario.perfil);
                            }
                            return false;
                        });
                    }

                    return false;
                });
            });
    }

    // -------------------------------------------------------------------------
    // HELPERS DE CONSULTA (usados pelos cards e renderizador)
    // -------------------------------------------------------------------------

    /** Retorna todos os chamados pendentes de ação para o usuário logado. */
    getChamadosPendentes(usuario) {
        return this.getChamadosDoUsuario(usuario)
            .filter(c => c.status !== 'FINALIZADO');
    }

    /** Retorna o total de chamados em aberto. */
    getTotalAbertos() {
        return this.chamados.filter(c => c.status !== 'FINALIZADO').length;
    }
}


// =============================================================================
// EXPORTAR PARA ESCOPO GLOBAL
// =============================================================================
window.Chamado = Chamado;
window.GerenciadorChamados = GerenciadorChamados;
window.gerenciadorChamados = new GerenciadorChamados();