// =============================================================================
// FLUXO-CONFIG.JS — Configuração centralizada do fluxo de Manutenção Canteiros
//
// Fonte única de verdade para as etapas do fluxo.
// Usada por: renderProgresso, renderResumoFluxo, sumário de etapas,
//            renderizador-etapas.js, card-lista.js, card-quadrado.js.
//
// Para adicionar/renomear uma etapa: edite APENAS este arquivo.
//
// REGRAS DE ROTEAMENTO (implementadas em fluxo-chamados.js):
//   Et. 3  → REPROVA   : volta para Et. 2 (remarcar agendamento)
//   Et. 6  → SIM       : pula para Et. 9  (sem compra)
//   Et. 6  → NÃO       : abre Et. 7 → Et. 8 → Et. 9
// =============================================================================

window.FLUXO_MANUTENCAO = [

    // ---- Bloco 1: Abertura e Agendamento ----
    { num: '1',    label: 'Abertura do Chamado',       categoria: 'SOLICITANTE'    },
    { num: '2',    label: 'Agendamento da Avaliação',  categoria: 'ADMINISTRATIVO' },
    { num: '3',    label: 'Confirmação da Avaliação',  categoria: 'SOLICITANTE'    },

    // ---- Bloco 2: Atribuição e Avaliação Técnica ----
    { num: '4',    label: 'Comunicar o Técnico',       categoria: 'ADMINISTRATIVO' },
    { num: '5',    label: 'Avaliação Técnica',         categoria: 'TECNICO'        },
    { num: '5.1',  label: 'Início da Avaliação',       categoria: 'TECNICO',        sub: true },
    { num: '5.2',  label: 'Término da Avaliação',      categoria: 'TECNICO',        sub: true },

    // ---- Bloco 3: Estoque e Compra (condicional) ----
    { num: '6',    label: 'Verificação de Estoque',    categoria: 'TECNICO'        },
    { num: '7',    label: 'Processo de Compra',        categoria: 'ADMINISTRATIVO', condicional: true },
    { num: '7.1',  label: 'Solicitação de Compra',     categoria: 'ADMINISTRATIVO', sub: true, condicional: true },
    { num: '7.2',  label: 'Pedido de Compra',          categoria: 'COMPRADOR',      sub: true, condicional: true },
    { num: '7.3',  label: 'Programar Entrega',         categoria: 'COMPRADOR',      sub: true, condicional: true },
    { num: '8',    label: 'Recebimento de Mercadoria', categoria: 'ADMINISTRATIVO', condicional: true },

    // ---- Bloco 4: Execução ----
    { num: '9',    label: 'Programar o Serviço',       categoria: 'ADMINISTRATIVO' },
    { num: '10',   label: 'Execução da Manutenção',    categoria: 'TECNICO'        },
    { num: '10.1', label: 'Início do Serviço',         categoria: 'TECNICO',        sub: true },
    { num: '10.2', label: 'Término do Serviço',        categoria: 'TECNICO',        sub: true },

    // ---- Bloco 5: Aprovação e Fechamento ----
    { num: '11',   label: 'Conferência do Gestor',     categoria: 'GESTOR'         },
    { num: '12',   label: 'Finalizar o Chamado',       categoria: 'SOLICITANTE'    }
];


// =============================================================================
// MAPA AUXILIAR: número da etapa → objeto de config
// Útil para lookup rápido no renderizador e nos cards.
// =============================================================================
window.FLUXO_MAP = Object.fromEntries(
    window.FLUXO_MANUTENCAO.map(e => [e.num, e])
);


// =============================================================================
// LABELS DE CATEGORIA (para exibição na UI)
// =============================================================================
window.CATEGORIA_LABEL = {
    'SOLICITANTE':    'Solicitante',
    'ADMINISTRATIVO': 'Adm. de Manutenção',
    'TECNICO':        'Técnico',
    'COMPRADOR':      'Comprador',
    'GESTOR':         'Gestor'
};