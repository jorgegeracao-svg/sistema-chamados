// =============================================================================
// CARD-QUADRADO.JS — Renderização do card no modo grade (quadrado)
// Expõe: window.createCardQuadrado(chamado, openTicketDetails)
// Depende de: getNomeEtapaAtiva, getResponsavelEtapaAtiva, formatarDataHora
//             (definidas no script.js principal)
// =============================================================================

/**
 * Cria e retorna um card no formato quadrado (modo grade).
 *
 * Layout (baseado no design aprovado):
 *   ┌─────────────────────────────────────┐
 *   │ [MANUTENÇÃO CANTEIROS]   #00000001  │  ← grade-header (badge amarelo + número azul)
 *   │                                     │
 *   │ TÍTULO DO CHAMADO                   │  ← grade-titulo (negrito grande)
 *   │                                     │
 *   │         👤 (centralizado)           │  ← ícone centralizado
 *   │  Solicitante: Felipe Jorge          │  ← texto centralizado
 *   │         📅 (centralizado)           │
 *   │  12/02/2026, 18:05                  │
 *   ├─────────────────────────────────────┤
 *   │ Etapa atual:    Agend. Avaliação    │  ← footer com linha divisória
 *   │ Responsável:    Adm. de Manutenção  │
 *   │ Status:         Em andamento        │
 *   └─────────────────────────────────────┘
 *
 * @param {Object}   chamado          - Objeto do chamado
 * @param {Function} openTicketDetails - Callback para abrir os detalhes
 * @returns {HTMLElement}
 */
function createCardQuadrado(chamado, openTicketDetails) {
    const card = document.createElement('div');
    card.className = 'ticket-card tcard-quadrado';

    const numero          = chamado._numero || chamado.id;
    const numeroFormatado = '#' + String(numero).padStart(8, '0');
    const etapaAtiva      = getNomeEtapaAtiva(chamado);
    const responsavel     = getResponsavelEtapaAtiva(chamado);
    const dataAbertura    = formatarDataHora(chamado.dataCriacao);
    const solicitanteNome = chamado.etapas?.[0]?.conclusao?.usuario
                         || chamado._solicitanteUsuario
                         || '-';
    const fotoSolicitante = (typeof getFotoUsuario === 'function') ? getFotoUsuario(solicitanteNome) : null;
    const statusTexto     = chamado.status === 'FINALIZADO' ? 'Finalizado' : 'Em andamento';
    const statusClass     = chamado.status === 'FINALIZADO' ? 'tq-status-finalizado' : 'tq-status-andamento';

    card.innerHTML = `
        <div class="tq-header">
            <span class="ticket-type-badge tipo-manutencao">MANUTENÇÃO CANTEIROS</span>
            <span class="tq-numero">${numeroFormatado}</span>
        </div>

        <h3 class="tq-titulo">${chamado.titulo}</h3>

        <div class="tq-body">
            <div class="tq-info-item">
                ${fotoSolicitante
                    ? `<img src="${fotoSolicitante}" style="width:22px;height:22px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
                    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>`}
                <span>Solicitante: <strong>${solicitanteNome}</strong></span>
            </div>

            <div class="tq-info-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>${dataAbertura}</span>
            </div>
        </div>

        <div class="tq-footer">
            <div class="tq-footer-row">
                <span class="tq-footer-label">Etapa atual:</span>
                <span class="tq-footer-value">${etapaAtiva}</span>
            </div>
            <div class="tq-footer-row">
                <span class="tq-footer-label">Responsável:</span>
                <span class="tq-footer-value">${responsavel}</span>
            </div>
            <div class="tq-footer-row">
                <span class="tq-footer-label">Status:</span>
                <span class="tq-footer-value ${statusClass}">${statusTexto}</span>
            </div>
        </div>`;

    card.addEventListener('click', () => openTicketDetails(chamado.id));

    return card;
}

window.createCardQuadrado = createCardQuadrado;