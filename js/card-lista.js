// =============================================================================
// CARD-LISTA.JS — Renderização do card no modo lista (linha)
// Expõe: window.createCardLista(chamado, openTicketDetails)
// Depende de: getNomeEtapaAtiva, getResponsavelEtapaAtiva, formatarDataHora
//             (definidas no script.js principal)
// =============================================================================

/**
 * Cria e retorna um card no formato lista (modo linha).
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ [Chamado: 20260001] · TÍTULO DO CHAMADO       [MANUTENÇÃO]  >   │  ← tc-topo
 *   ├──────────────────────────────────────────────────────────────────┤
 *   │  👤 Aberto por: Felipe Jorge    📅 19/02/2026, 16:15            │  ← tc-base (grid 2 col)
 *   │  📍 Unidade: CANTEIRO — SALA    🔧 Tipo de serviço: ELÉTRICA    │
 *   │  〜 Etapa: Solicitação Compra   👥 Responsável atual: Adm. Man. │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * @param {Object}   chamado          - Objeto do chamado
 * @param {Function} openTicketDetails - Callback para abrir os detalhes
 * @returns {HTMLElement}
 */
function createCardLista(chamado, openTicketDetails) {
    const card = document.createElement('div');
    card.className = 'ticket-card';

    const numero          = chamado._numero || chamado.id;
    const numeroFormatado = String(numero).padStart(8, '0');
    const etapaAtiva      = getNomeEtapaAtiva(chamado);
    const responsavel     = getResponsavelEtapaAtiva(chamado);
    const dataAbertura    = formatarDataHora(chamado.dataCriacao);
    const solicitanteNome = chamado.etapas?.[0]?.conclusao?.usuario
                         || chamado._solicitanteUsuario
                         || '-';
    const fotoSolicitante = (typeof getFotoUsuario === 'function') ? getFotoUsuario(solicitanteNome) : null;
    const unidade         = chamado._local || chamado.etapas?.[0]?.dados?.unidade || '';

    // Separar "CANTEIRO ZONA OESTE — SALA (ELÉTRICA)" em unidade e tipo
    const localMatch   = unidade.match(/^(.+?)\s*(?:—|-)\s*(.+?)\s*\((.+)\)$/) || [];
    const localUnidade = localMatch[1] ? (localMatch[1] + (localMatch[2] ? ' — ' + localMatch[2] : '')) : unidade;
    const localTipo    = localMatch[3] || '';

    card.innerHTML = `
        <div class="tc-topo">
            <div class="tc-num-tag">
                <span class="tc-numero">Chamado: ${numeroFormatado}</span>
            </div>
            <div class="tc-dot"></div>
            <h3 class="tc-titulo">${chamado.titulo}</h3>
            <div class="tc-status-area">
                <span class="ticket-type-badge tipo-manutencao">Manutenção</span>
                <button class="ticket-card-arrow" title="Abrir detalhes">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>
            </div>
        </div>

        <div class="tc-base">
            <div class="tc-base-item">
                ${fotoSolicitante
                    ? `<img src="${fotoSolicitante}" style="width:22px;height:22px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
                    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>`}
                <span class="tc-lbl">Aberto por:</span><strong>${solicitanteNome}</strong>
            </div>

            <div class="tc-base-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                ${dataAbertura}
            </div>

            ${localUnidade ? `
            <div class="tc-base-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span class="tc-lbl">Unidade:</span><strong>${localUnidade}</strong>
            </div>` : ''}

            ${localTipo ? `
            <div class="tc-base-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                </svg>
                <span class="tc-lbl">Tipo de serviço:</span><strong>${localTipo}</strong>
            </div>` : ''}

            <div class="tc-base-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                <span class="tc-lbl">Etapa:</span><strong>${etapaAtiva}</strong>
            </div>

            <div class="tc-base-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span class="tc-lbl">Responsável atual:</span><strong>${responsavel}</strong>
            </div>
        </div>`;

    card.querySelector('.ticket-card-arrow').addEventListener('click', (e) => {
        e.stopPropagation();
        openTicketDetails(chamado.id);
    });

    return card;
}

window.createCardLista = createCardLista;