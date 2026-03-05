// =============================================================================
// SCRIPT.JS — Controlador principal do index.html
// Responsabilidades:
//   - Navegação entre páginas (sidebar → .page-content)
//   - Sidebar mobile (abrir/fechar com overlay)
//   - Tela de Novo Chamado (abrir, fechar, submeter formulário)
//   - Tela de Detalhes do Chamado (abrir, renderizar progresso, mensagens, formulário)
//   - Renderização de cards nas caixas (Entrada, Log, Saída)
//   - Fluxo de 12 etapas com roteamento condicional
//
// Depende de:
//   - auth-integration.js  (checkAuth, logout, showElementsByPermission)
//   - fluxo-config.js      (FLUXO_MANUTENCAO, FLUXO_MAP, CATEGORIA_LABEL)
//   - fluxo-chamados.js    (Chamado, GerenciadorChamados, gerenciadorChamados)
//   - card-lista.js        (createCardLista)
//   - card-quadrado.js     (createCardQuadrado)
//   - renderizador-etapas.js (RenderizadorEtapas)
// =============================================================================


// =============================================================================
// VARIÁVEIS GLOBAIS
// =============================================================================
let currentTicketId = null;  // ID do chamado aberto na tela de detalhes
let usuarioAtual = null;  // Objeto do usuário logado (preenchido no DOMContentLoaded)


// =============================================================================
// FUNÇÕES GLOBAIS — acessíveis por card-lista.js e card-quadrado.js
// =============================================================================

/**
 * Retorna a etapa (ou subetapa) atualmente EM_ANDAMENTO de um chamado.
 * Considera também AGUARDANDO_CONFIRMACAO (Et. 4).
 */
function getEtapaAtivaGlobal(chamado) {
    if (!chamado.etapas) return null;
    for (const etapa of chamado.etapas) {
        const ativa = etapa.status === 'EM_ANDAMENTO' ||
            etapa.status === 'AGUARDANDO_CONFIRMACAO';
        if (ativa) {
            if (etapa.subetapas?.length > 0) {
                const subAtiva = etapa.subetapas.find(s => s.status === 'EM_ANDAMENTO');
                if (subAtiva) return subAtiva;
            }
            return etapa;
        }
    }
    return null;
}

/** Retorna o nome legível da etapa ativa nos cards */
function getNomeEtapaAtiva(chamado) {
    const e = getEtapaAtivaGlobal(chamado);
    if (!e) return chamado.status === 'FINALIZADO' ? 'Finalizado' : '-';
    if (e.status === 'AGUARDANDO_CONFIRMACAO') return `${e.titulo} (Aguard. confirmação)`;
    return e.titulo;
}

/** Retorna o nome legível do responsável pela etapa ativa nos cards */
function getResponsavelEtapaAtiva(chamado) {
    const e = getEtapaAtivaGlobal(chamado);
    if (!e) return '-';
    return (window.CATEGORIA_LABEL || {})[e.categoria] || e.categoria;
}

/** Formata Date ou string ISO para 'DD/MM/YYYY, HH:MM' */
function formatarDataHora(data) {
    if (!data) return '-';
    const d = new Date(data);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy}, ${hh}:${min}`;
}


// =============================================================================
// INICIALIZAÇÃO
// =============================================================================

document.addEventListener('DOMContentLoaded', function () {

    // Verificar autenticação — redireciona para login.html se não logado
    usuarioAtual = (typeof checkAuth === 'function') ? checkAuth() : null;
    if (!usuarioAtual) return;

    // -------------------------------------------------------------------------
    // Referências aos elementos do DOM
    // -------------------------------------------------------------------------
    const btnNovoChamado = document.getElementById('btnNovoChamado');
    const btnVoltar = document.getElementById('btnVoltar');
    const btnCancelar = document.getElementById('btnCancelar');
    const newTicketScreen = document.getElementById('newTicketScreen');
    const newTicketForm = document.getElementById('newTicketForm');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const ticketTypeSelect = document.getElementById('ticketType');
    const manutencaoFields = document.getElementById('manutencaoFields');
    const pedidoAnualFields = document.getElementById('pedidoAnualFields');
    const pedidoAvulsoFields = document.getElementById('pedidoAvulsoFields');
    const localSelect = document.getElementById('local');
    const localOutroGroup = document.getElementById('localOutroGroup');
    const checkOutroTipo = document.getElementById('checkOutroTipo');
    const tipoManutencaoOutroGroup = document.getElementById('tipoManutencaoOutroGroup');
    const fotoUpload = document.getElementById('fotoUpload');
    const fileName = document.getElementById('fileName');
    const documentoPedidoAnual = document.getElementById('documentoPedidoAnual');
    const fileNameAnual = document.getElementById('fileNameAnual');
    const documentoPedidoAvulso = document.getElementById('documentoPedidoAvulso');
    const fileNameAvulso = document.getElementById('fileNameAvulso');
    const ticketDetailsScreen = document.getElementById('ticketDetailsScreen');
    const btnVoltarDetalhes = document.getElementById('btnVoltarDetalhes');
    const btnNotificacoes = document.getElementById('btnNotificacoes');
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page-content');


    // =========================================================================
    // HELPERS — localStorage / dados
    // =========================================================================

    /** Retorna todos os chamados salvos como objetos simples (JSON) */
    function getChamadosFluxo() {
        return JSON.parse(localStorage.getItem('chamadosFluxo') || '[]');
    }

    /** Reidrata JSON plano como instância de Chamado (restaura métodos) */
    function reidratarChamado(obj) {
        if (!obj) return null;
        return Object.assign(Object.create(window.Chamado.prototype), obj);
    }

    /** Gera número sequencial ANO+4dígitos para o chamado */
    function gerarNumeroChamado() {
        const ano = new Date().getFullYear();
        const seq = getChamadosFluxo().length;
        return parseInt(`${ano}${String(seq).padStart(4, '0')}`);
    }

    // =========================================================================
    // HELPERS — Etapas e permissões
    // =========================================================================

    /**
     * Retorna a etapa (ou subetapa) EM_ANDAMENTO ou AGUARDANDO_CONFIRMACAO.
     * Versão local (mesma lógica que getEtapaAtivaGlobal, mas scoped aqui).
     */
    function getEtapaAtiva(chamado) {
        return getEtapaAtivaGlobal(chamado);
    }

    /** Mapa de categoria → perfis que podem atender */
    const CATEGORIA_MAP = {
        'SOLICITANTE': ['SOLICITANTE', 'ADMIN'],
        'ADMINISTRATIVO': ['ADMINISTRATIVO', 'ADMIN'],
        'TECNICO': ['TECNICO', 'ADMIN'],
        'COMPRADOR': ['COMPRADOR', 'ADMINISTRATIVO', 'ADMIN'],
        'GESTOR': ['ADMIN']
    };

    function podeAtenderEtapa(etapa, perfil) {
        if (!etapa) return false;
        // Et. 4 em AGUARDANDO_CONFIRMACAO: só TECNICO ou ADMIN confirma
        if (etapa.numero === 4 && etapa.status === 'AGUARDANDO_CONFIRMACAO') {
            return ['TECNICO', 'ADMIN'].includes(perfil);
        }
        return (CATEGORIA_MAP[etapa.categoria] || []).includes(perfil);
    }

    // =========================================================================
    // FILTROS DAS CAIXAS
    // =========================================================================

    /** Caixa Entrada: chamados EM ANDAMENTO cuja etapa ativa o usuário pode atender AGORA */
    function getChamadosEntrada() {
        return getChamadosFluxo().filter(c => {
            if (c.status === 'FINALIZADO') return false;
            const etapa = getEtapaAtiva(c);
            return etapa && podeAtenderEtapa(etapa, usuarioAtual.perfil);
        });
    }

    /** Caixa Log: chamados em andamento que passam pelo usuário, mas não estão na Entrada */
    function getChamadosLog() {
        return getChamadosFluxo().filter(c => {
            if (c.status === 'FINALIZADO') return false;
            const etapa = getEtapaAtiva(c);
            if (etapa && podeAtenderEtapa(etapa, usuarioAtual.perfil)) return false;
            return _chamadoPassaPorMim(c);
        });
    }

    /** Caixa Finalizados: chamados FINALIZADO que o usuário participou */
    function getChamadosSaida() {
        return getChamadosFluxo().filter(c => {
            if (c.status !== 'FINALIZADO') return false;
            return _chamadoPassaPorMim(c);
        });
    }

    /**
     * Retorna true se o usuário logado já atuou ou pode atuar em alguma etapa
     * do chamado (para incluir nas caixas Log e Finalizados).
     */
    function _chamadoPassaPorMim(c) {
        const perfil = usuarioAtual.perfil;
        const nome = usuarioAtual.nomeCompleto;

        const todasEtapas = [];
        (c.etapas || []).forEach(e => {
            todasEtapas.push(e);
            (e.subetapas || []).forEach(s => todasEtapas.push(s));
        });

        return todasEtapas.some(e => {
            if (e.conclusao?.usuario === nome) return true;
            return (CATEGORIA_MAP[e.categoria] || []).includes(perfil);
        });
    }

    /** Atualiza os badges de contagem na sidebar */
    function atualizarBadgesNav() {
        const contagens = {
            badgeEntrada: getChamadosEntrada().length,
            badgeLog: getChamadosLog().length,
            badgeSaida: getChamadosSaida().length
        };
        Object.entries(contagens).forEach(([id, count]) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.textContent = count;
            el.style.display = count > 0 ? 'flex' : 'none';
        });
    }


    // =========================================================================
    // NAVEGAÇÃO — Sidebar → páginas de conteúdo
    // =========================================================================

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetPageId = item.dataset.page;
            navItems.forEach(n => n.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            item.classList.add('active');
            const targetPage = document.getElementById(targetPageId);
            if (targetPage) targetPage.classList.add('active');
            if (targetPageId === 'caixaEntradaPage') renderTickets('entrada');
            if (targetPageId === 'caixaLogPage') renderTickets('log');
            if (targetPageId === 'caixaSaidaPage') renderTickets('saida');
            if (targetPageId === 'perfilPage') renderPerfilPage();
            if (targetPageId === 'usuariosPage' && typeof window.renderUsuariosPage === 'function') window.renderUsuariosPage();
            if (window.innerWidth <= 768) closeSidebar();

            // Fechar tela de detalhes se estiver aberta ao navegar pela sidebar
            if (ticketDetailsScreen?.classList.contains('active')) {
                ticketDetailsScreen.classList.remove('active', 'fullscreen');
                document.querySelector('.mobile-header').style.display = '';
                currentTicketId = null;
            }
        });
    });


    // =========================================================================
    // SIDEBAR — clique no perfil do usuário abre a página de perfil
    // =========================================================================

    document.querySelector('.user-profile')?.addEventListener('click', (e) => {
        if (e.target.closest('.logout-btn')) return;
        navItems.forEach(n => n.classList.remove('active'));
        pages.forEach(p => p.classList.remove('active'));
        document.querySelector('[data-page="perfilPage"]')?.classList.add('active');
        document.getElementById('perfilPage')?.classList.add('active');
        renderPerfilPage();
        if (window.innerWidth <= 768) closeSidebar();
        if (ticketDetailsScreen?.classList.contains('active')) {
            ticketDetailsScreen.classList.remove('active', 'fullscreen');
            document.querySelector('.mobile-header').style.display = '';
            currentTicketId = null;
        }
    });


    // =========================================================================
    // SIDEBAR MOBILE
    // =========================================================================

    function openSidebar() {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    menuToggle?.addEventListener('click', () => {
        sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });
    sidebarOverlay?.addEventListener('click', closeSidebar);
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) closeSidebar();
    });


    // =========================================================================
    // TELA DE NOVO CHAMADO
    // =========================================================================

    // Injetar rodapé na tela de novo chamado (espelho do cabeçalho)
    if (newTicketScreen && !newTicketScreen.querySelector('.ticket-footer')) {
        const footer = document.createElement('div');
        footer.className = 'ticket-footer';
        footer.innerHTML = `
            <button type="button" class="btn-cancel" id="btnCancelarFooter">Cancelar</button>
            <button type="submit" form="newTicketForm" class="btn-submit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Enviar Chamado
            </button>`;
        newTicketScreen.appendChild(footer);
        footer.querySelector('#btnCancelarFooter')?.addEventListener('click', () => closeTicketScreen());
    }

    btnNovoChamado?.addEventListener('click', () => {
        newTicketScreen.classList.add('active');
        if (window.innerWidth <= 768) closeSidebar();
        setTimeout(() => { newTicketScreen.scrollTop = 0; }, 100);
    });

    function closeTicketScreen() {
        newTicketScreen.classList.remove('active');
        newTicketForm.reset();
        _hideAllTicketFields();
        localOutroGroup?.classList.add('hidden');
        tipoManutencaoOutroGroup?.classList.add('hidden');
        if (fileName) fileName.textContent = 'Nenhum arquivo selecionado';
        if (fileNameAnual) fileNameAnual.textContent = 'Nenhum arquivo selecionado';
        if (fileNameAvulso) fileNameAvulso.textContent = 'Nenhum arquivo selecionado';

        // Resetar chip de solicitante
        const chip = document.getElementById('solicitanteChip');
        const hiddenId = document.getElementById('solicitanteId');
        const inputWrapper = document.querySelector('.user-search-input-wrapper');
        const searchInput = document.getElementById('solicitanteSearch');
        if (chip) chip.classList.remove('visible');
        if (hiddenId) hiddenId.value = '';
        if (inputWrapper) inputWrapper.style.display = '';
        if (searchInput) searchInput.value = '';
    }

    function _hideAllTicketFields() {
        manutencaoFields?.classList.remove('hidden');
        pedidoAnualFields?.classList.add('hidden');
        pedidoAvulsoFields?.classList.add('hidden');
    }

    btnVoltar?.addEventListener('click', closeTicketScreen);
    btnCancelar?.addEventListener('click', closeTicketScreen);

    ticketTypeSelect?.addEventListener('change', (e) => {
        _hideAllTicketFields();
        const v = e.target.value;
        if (v === 'manutencao' && manutencaoFields) manutencaoFields.classList.remove('hidden');
        if (v === 'pedido_anual' && pedidoAnualFields) pedidoAnualFields.classList.remove('hidden');
        if (v === 'pedido_avulso' && pedidoAvulsoFields) pedidoAvulsoFields.classList.remove('hidden');
    });

    document.querySelectorAll('input[name="tipoManutencao"]').forEach(cb => {
        cb.addEventListener('change', () => {
            tipoManutencaoOutroGroup?.classList.toggle('hidden', !checkOutroTipo?.checked);
        });
    });

    localSelect?.addEventListener('change', (e) => {
        localOutroGroup?.classList.toggle('hidden', e.target.value !== 'OUTRO');
    });

    fotoUpload?.addEventListener('change', e => {
        if (fileName) fileName.textContent = e.target.files[0]?.name || 'Nenhum arquivo selecionado';
    });
    documentoPedidoAnual?.addEventListener('change', e => {
        if (fileNameAnual) fileNameAnual.textContent = e.target.files[0]?.name || 'Nenhum arquivo selecionado';
    });
    documentoPedidoAvulso?.addEventListener('change', e => {
        if (fileNameAvulso) fileNameAvulso.textContent = e.target.files[0]?.name || 'Nenhum arquivo selecionado';
    });


    // =========================================================================
    // SUBMETER FORMULÁRIO DE NOVO CHAMADO
    // =========================================================================

    // =========================================================================
    // VALIDAÇÃO VISUAL — exibe/remove mensagem de erro em cima do campo
    // =========================================================================

    /**
     * Marca um campo como inválido: adiciona borda vermelha e
     * insere uma mensagem de erro logo acima do elemento.
     * @param {HTMLElement} el     - O campo (input, select, textarea, ou container)
     * @param {string}      msg    - Texto do erro exibido acima do campo
     */
    function marcarErro(el, msg) {
        if (!el) return;
        el.classList.add('campo-invalido');

        // Evita duplicar a mensagem se já existir
        const jaExiste = el.parentElement?.querySelector('.campo-erro-msg');
        if (jaExiste) return;

        const span = document.createElement('span');
        span.className = 'campo-erro-msg';
        span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>${msg}`;
        el.parentElement?.insertBefore(span, el);

        // Remove o erro automaticamente ao interagir com o campo
        const limpar = () => { limparErro(el); el.removeEventListener('input', limpar); el.removeEventListener('change', limpar); };
        el.addEventListener('input', limpar);
        el.addEventListener('change', limpar);
    }

    /** Remove a marcação de erro de um campo */
    function limparErro(el) {
        if (!el) return;
        el.classList.remove('campo-invalido');
        el.parentElement?.querySelector('.campo-erro-msg')?.remove();
    }

    /** Limpa todos os erros do formulário */
    function limparTodosErros() {
        document.querySelectorAll('.campo-invalido').forEach(el => el.classList.remove('campo-invalido'));
        document.querySelectorAll('.campo-erro-msg').forEach(el => el.remove());
    }

    newTicketForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        limparTodosErros();

        const selectedType = ticketTypeSelect?.value;
        if (!selectedType) {
            marcarErro(ticketTypeSelect, 'Selecione o tipo de chamado');
            ticketTypeSelect?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (selectedType === 'manutencao') {
            const unidadeEl    = document.getElementById('unidade');
            const tituloEl     = document.getElementById('tituloManutencao');
            const observacaoEl = document.getElementById('observacaoManutencao');
            const localOutroEl = document.getElementById('localOutro');
            const tipoOutroEl  = document.getElementById('tipoManutencaoOutro');

            const unidade    = unidadeEl?.value;
            const local      = localSelect?.value;
            const titulo     = tituloEl?.value.trim();
            const observacao = observacaoEl?.value.trim();
            const email      = document.getElementById('emailSolicitante')?.value.trim();
            const contato    = document.getElementById('telefoneSolicitante')?.value.trim();

            const tiposManutencao = Array.from(
                document.querySelectorAll('input[name="tipoManutencao"]:checked')
            ).map(cb => cb.value);

            // Validações visuais — acumula todos os erros antes de retornar
            let temErro = false;
            let primeiroErro = null;

            if (!unidade) {
                marcarErro(unidadeEl, 'Selecione a unidade');
                primeiroErro = primeiroErro || unidadeEl;
                temErro = true;
            }
            if (!local) {
                marcarErro(localSelect, 'Selecione o local');
                primeiroErro = primeiroErro || localSelect;
                temErro = true;
            }
            if (local === 'OUTRO' && !localOutroEl?.value.trim()) {
                marcarErro(localOutroEl, 'Especifique o local');
                primeiroErro = primeiroErro || localOutroEl;
                temErro = true;
            }
            if (tiposManutencao.length === 0) {
                // Para checkboxes, marca o container pai
                const checkboxContainer = document.querySelector('.tipo-manutencao-grid') || document.querySelector('[name="tipoManutencao"]')?.closest('.form-group');
                if (checkboxContainer) {
                    checkboxContainer.classList.add('campo-invalido');
                    const jaExiste = checkboxContainer.parentElement?.querySelector('.campo-erro-msg');
                    if (!jaExiste) {
                        const span = document.createElement('span');
                        span.className = 'campo-erro-msg';
                        span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>Selecione pelo menos um tipo`;
                        checkboxContainer.parentElement?.insertBefore(span, checkboxContainer);
                        document.querySelectorAll('input[name="tipoManutencao"]').forEach(cb => {
                            const limpar = () => { checkboxContainer.classList.remove('campo-invalido'); span.remove(); };
                            cb.addEventListener('change', limpar, { once: true });
                        });
                    }
                    primeiroErro = primeiroErro || checkboxContainer;
                }
                temErro = true;
            }
            if (tiposManutencao.includes('OUTRO') && !tipoOutroEl?.value.trim()) {
                marcarErro(tipoOutroEl, 'Especifique o tipo de manutenção');
                primeiroErro = primeiroErro || tipoOutroEl;
                temErro = true;
            }
            if (!titulo) {
                marcarErro(tituloEl, 'Preencha o título do chamado');
                primeiroErro = primeiroErro || tituloEl;
                temErro = true;
            }
            if (!observacao) {
                marcarErro(observacaoEl, 'Descreva o problema');
                primeiroErro = primeiroErro || observacaoEl;
                temErro = true;
            }

            // Solicitante (chip de busca de usuário)
            // A estrutura é: .form-group > .user-search-wrapper > .user-search-input-wrapper > input
            // A mensagem deve ser inserida antes do .user-search-wrapper, não antes do input
            const solicitanteId = document.getElementById('solicitanteId')?.value;
            const solicitanteInput = document.getElementById('solicitanteSearch');
            if (!solicitanteId) {
                const userSearchWrapper = solicitanteInput?.closest('.user-search-wrapper');
                if (userSearchWrapper) {
                    // Remove erro anterior se existir
                    userSearchWrapper.parentElement?.querySelector('.campo-erro-msg')?.remove();
                    userSearchWrapper.classList.add('campo-invalido');

                    const span = document.createElement('span');
                    span.className = 'campo-erro-msg';
                    span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>Selecione o solicitante`;
                    userSearchWrapper.parentElement?.insertBefore(span, userSearchWrapper);

                    // Remove ao selecionar usuário (mudança no campo oculto) ou ao digitar
                    const limpar = () => {
                        userSearchWrapper.classList.remove('campo-invalido');
                        span.remove();
                    };
                    solicitanteInput.addEventListener('input', limpar, { once: true });
                    document.getElementById('solicitanteId')?.addEventListener('change', limpar, { once: true });
                    // Observa o chip se tornar visível
                    const chipRemove = document.getElementById('solicitanteChip');
                    if (chipRemove) {
                        const obs = new MutationObserver(() => { if (chipRemove.classList.contains('visible')) { limpar(); obs.disconnect(); } });
                        obs.observe(chipRemove, { attributes: true, attributeFilter: ['class'] });
                    }
                    primeiroErro = primeiroErro || userSearchWrapper;
                }
                temErro = true;
            }

            const emailEl    = document.getElementById('emailSolicitante');
            const telefoneEl = document.getElementById('telefoneSolicitante');

            if (!email) {
                marcarErro(emailEl, 'Preencha o e-mail');
                primeiroErro = primeiroErro || emailEl;
                temErro = true;
            }
            if (!contato) {
                marcarErro(telefoneEl, 'Preencha o telefone');
                primeiroErro = primeiroErro || telefoneEl;
                temErro = true;
            }

            if (temErro) {
                primeiroErro?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            const localFinal = local === 'OUTRO'
                ? document.getElementById('localOutro').value.trim()
                : local;
            const tiposFinais = tiposManutencao.map(t =>
                t === 'OUTRO' ? document.getElementById('tipoManutencaoOutro').value.trim() : t
            );

            if (typeof window.gerenciadorChamados === 'undefined') {
                alert('Erro: gerenciador de chamados não carregado.'); return;
            }

            // Ler fotos em base64 antes de criar o chamado
            const _criarComFotos = (fotos) => {
                const novoChamado = window.gerenciadorChamados.criarChamado(
                    titulo,
                    observacao,
                    `${unidade} — ${localFinal} (${tiposFinais.join(', ')})`,
                    usuarioAtual,
                    fotos,
                    tiposFinais.join(', '),        // tipoManutencao
                    email,
                    contato
                );

                novoChamado._solicitanteUsuario = usuarioAtual.usuario;
                novoChamado._numero = gerarNumeroChamado();
                window.gerenciadorChamados.atualizarChamado(novoChamado);

                const numFormatado = String(novoChamado._numero).padStart(8, '0');
                alert(`Chamado ${numFormatado} criado com sucesso!\nAguardando agendamento da visita pela Administração de Manutenção (Etapa 2).`);

                closeTicketScreen();
                renderTickets('entrada');
                renderTickets('log');
            };

            if (typeof window.lerArquivosBase64 === 'function' && fotoUpload?.files?.length > 0) {
                window.lerArquivosBase64(fotoUpload).then(_criarComFotos);
            } else {
                _criarComFotos([]);
            }
            return; // evita o closeTicketScreen abaixo (já está dentro do callback)

        } else {
            alert('Tipo registrado. O fluxo completo de etapas está disponível apenas para Manutenção Canteiros.');
        }

        closeTicketScreen();
        renderTickets('entrada');
        renderTickets('log');
    });


    // =========================================================================
    // RENDERIZAR CARDS NAS CAIXAS
    // =========================================================================

    function renderTickets(tipo) {
        const gridIds = {
            entrada: 'ticketsEntradaGrid',
            log: 'ticketsLogGrid',
            saida: 'ticketsSaidaGrid'
        };
        const filtroIds = {
            entrada: { texto: 'filtroEntradaNumero', data: 'filtroEntradaData', tipo: 'filtroEntradaTipo' },
            log: { texto: 'filtroLogNumero', data: 'filtroLogData', tipo: 'filtroLogTipo' },
            saida: { texto: 'filtroSaidaNumero', data: 'filtroSaidaData', tipo: 'filtroSaidaTipo' }
        };

        const grid = document.getElementById(gridIds[tipo]);
        if (!grid) return;

        const textoFiltro = (document.getElementById(filtroIds[tipo].texto)?.value || '').trim().toLowerCase();
        const dataFiltro = document.getElementById(filtroIds[tipo].data)?.value || '';
        const tipoFiltro = document.getElementById(filtroIds[tipo].tipo)?.value || '';

        const listas = { entrada: getChamadosEntrada, log: getChamadosLog, saida: getChamadosSaida };
        let lista = listas[tipo]();

        if (textoFiltro) {
            lista = lista.filter(c => {
                const numero = String(c._numero || c.id || '').toLowerCase();
                const titulo = (c.titulo || '').toLowerCase();
                const solicitante = (c.etapas?.[0]?.conclusao?.usuario || c._solicitanteUsuario || '').toLowerCase();
                return numero.includes(textoFiltro) || titulo.includes(textoFiltro) || solicitante.includes(textoFiltro);
            });
        }
        if (dataFiltro) {
            lista = lista.filter(c => {
                if (!c.dataCriacao) return false;
                return new Date(c.dataCriacao).toISOString().slice(0, 10) === dataFiltro;
            });
        }
        if (tipoFiltro) {
            lista = lista.filter(c => (c._tipo || '').toLowerCase().replace(/\s/g, '_') === tipoFiltro);
        }

        grid.innerHTML = '';

        if (lista.length === 0) {
            const buscando = textoFiltro || dataFiltro || tipoFiltro;
            grid.innerHTML = `
                <div class="no-tickets-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5" stroke-linecap="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <p>${buscando ? 'Nenhum chamado encontrado para este filtro.' : 'Nenhum chamado encontrado'}</p>
                </div>`;
            atualizarBadgesNav();
            return;
        }

        lista.forEach(c => grid.appendChild(_createCard(c, grid)));
        atualizarBadgesNav();
    }

    function _createCard(chamado, grid) {
        const isModoGrade = grid?.classList.contains('modo-grade') ?? false;
        return isModoGrade
            ? window.createCardQuadrado(chamado, openTicketDetails)
            : window.createCardLista(chamado, openTicketDetails);
    }

    // Listeners dos filtros
    [
        { texto: 'filtroEntradaNumero', data: 'filtroEntradaData', tipo: 'filtroEntradaTipo', caixa: 'entrada' },
        { texto: 'filtroLogNumero', data: 'filtroLogData', tipo: 'filtroLogTipo', caixa: 'log' },
        { texto: 'filtroSaidaNumero', data: 'filtroSaidaData', tipo: 'filtroSaidaTipo', caixa: 'saida' }
    ].forEach(({ texto, data, tipo, caixa }) => {
        document.getElementById(texto)?.addEventListener('input', () => renderTickets(caixa));
        document.getElementById(data)?.addEventListener('change', () => renderTickets(caixa));
        document.getElementById(tipo)?.addEventListener('change', () => renderTickets(caixa));
    });


    // =========================================================================
    // TELA DE DETALHES DO CHAMADO
    // =========================================================================

    function openTicketDetails(chamadoId) {
        const dadoBruto = getChamadosFluxo().find(c => c.id == chamadoId);
        if (!dadoBruto) { console.warn('[script.js] Chamado não encontrado:', chamadoId); return; }

        const chamado = reidratarChamado(dadoBruto);
        currentTicketId = chamadoId;
        window.chamadoAtual = chamado;

        // Preencher cabeçalho
        const numero = chamado._numero || chamado.id;
        const numEl = document.getElementById('detailsTicketNumber');
        const titleEl = document.getElementById('detailsTicketTitle');
        if (numEl) numEl.textContent = '#' + String(numero).padStart(8, '0');
        if (titleEl) titleEl.textContent = chamado.titulo;

        // Rodapé
        const rodapeNum = document.getElementById('rodapeNumeroChamado');
        if (rodapeNum) rodapeNum.textContent = 'Chamado #' + String(numero).padStart(8, '0');

        // Header mobile
        const mobileTitulo = document.getElementById('detailsMobileTitulo');
        if (mobileTitulo) mobileTitulo.textContent = '#' + String(numero).padStart(8, '0');

        const abertoPorUsuario = chamado.etapas?.[0]?.conclusao?.usuario || chamado._solicitanteUsuario || '';
        const abertoPorNome = chamado.etapas?.[0]?.conclusao?.nomeCompleto || abertoPorUsuario;
        const abertoPorEl = document.getElementById('detailsAbertoPor');
        if (abertoPorEl) abertoPorEl.textContent = abertoPorNome || '-';

        // Avatar: foto ou iniciais
        const avatarEl = document.getElementById('detailsUsuarioAvatar');
        if (avatarEl) {
            const fotoAbertura = (typeof getFotoUsuario === 'function') ? getFotoUsuario(abertoPorUsuario) : null;
            if (fotoAbertura) {
                avatarEl.innerHTML = '<img src="' + fotoAbertura + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
                avatarEl.style.padding = '0';
            } else {
                const iniciais = (abertoPorNome || abertoPorUsuario || '?')
                    .trim().split(' ').filter(Boolean)
                    .reduce((acc, p, i, arr) => i === 0 || i === arr.length - 1 ? acc + p[0] : acc, '')
                    .toUpperCase().slice(0, 2);
                avatarEl.textContent = iniciais;
                avatarEl.style.padding = '';
            }
        }

        // Pills: unidade, local, data
        const localRaw = chamado._local || chamado.etapas?.[0]?.dados?.unidade || '';
        const localMatch = localRaw.match(/^(.+?)\s*(?:—|-)\s*(.+?)\s*\((.+)\)$/) || [];
        const localUnidade = localMatch[1] || localRaw;
        const localSala    = localMatch[2] || '';

        const pillTipo    = document.getElementById('detailsPillTipo');
        const pillUnidade = document.getElementById('detailsPillUnidade');
        const pillLocal   = document.getElementById('detailsPillLocal');
        const pillData    = document.getElementById('detailsPillData');

        if (chamado._tipoManutencao && pillTipo) {
            document.getElementById('detailsPillTipoText').textContent = chamado._tipoManutencao;
            pillTipo.style.display = 'inline-flex';
        }

        if (localUnidade && pillUnidade) {
            document.getElementById('detailsPillUnidadeText').textContent = localUnidade;
            pillUnidade.style.display = 'inline-flex';
        }
        if (localSala && pillLocal) {
            document.getElementById('detailsPillLocalText').textContent = localSala;
            pillLocal.style.display = 'inline-flex';
        }
        if (chamado.dataCriacao && pillData) {
            document.getElementById('detailsPillDataText').textContent = formatarDataHora(chamado.dataCriacao);
            pillData.style.display = 'inline-flex';
        }

        // Badge de status
        const badge = document.getElementById('detailsStatusBadge');
        if (badge) {
            badge.textContent = chamado.status === 'FINALIZADO' ? 'Finalizado' : 'Em andamento';
            badge.className = 'chamado-detalhes-badge' + (chamado.status === 'FINALIZADO' ? ' finalizado' : '');
        }

        // Botão copiar número
        document.getElementById('btnCopiarNumero')?.addEventListener('click', () => {
            const numStr = String(numero).padStart(8, '0');
            navigator.clipboard?.writeText(numStr).then(() => {
                // Toast de confirmação
                let toast = document.getElementById('copyToast');
                if (!toast) {
                    toast = document.createElement('div');
                    toast.id = 'copyToast';
                    toast.style.cssText = `
                        position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(12px);
                        background: #1f2937; color: #fff; font-size: 13px; font-weight: 600;
                        padding: 8px 18px; border-radius: 20px; box-shadow: 0 4px 14px rgba(0,0,0,0.25);
                        opacity: 0; transition: opacity 0.2s, transform 0.2s; pointer-events: none; z-index: 9999;
                        white-space: nowrap;
                    `;
                    document.body.appendChild(toast);
                }
                toast.textContent = `✓ Número ${numStr} copiado`;
                toast.style.opacity = '1';
                toast.style.transform = 'translateX(-50%) translateY(0)';
                clearTimeout(toast._timeout);
                toast._timeout = setTimeout(() => {
                    toast.style.opacity = '0';
                    toast.style.transform = 'translateX(-50%) translateY(12px)';
                }, 2000);
            });
        });

        // Renderizar seções
        renderProgresso(chamado);
        window.renderMensagens(chamado);
        renderFormularioAba(chamado);
        renderResumoFluxo(chamado);
        renderAnexosAba(chamado);

        // Resetar para aba Mensagens
        document.querySelectorAll('.chamado-aba-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.chamado-aba-conteudo').forEach(c => c.classList.remove('active'));
        document.querySelector('[data-aba="mensagens"]')?.classList.add('active');
        document.getElementById('aba-mensagens')?.classList.add('active');

        // Abrir tela
        ticketDetailsScreen.classList.add('active');
        // Esconde o header mobile das telas de lista ao entrar nos detalhes
        const mobileHeader = document.querySelector('.mobile-header');
        if (mobileHeader) mobileHeader.style.display = 'none';
        if (sidebar?.classList.contains('sidebar-hidden')) {
            ticketDetailsScreen.classList.add('fullscreen');
        } else {
            ticketDetailsScreen.classList.remove('fullscreen');
        }
    }


    // =========================================================================
    // BARRA DE PROGRESSO DAS ETAPAS
    // =========================================================================

    function renderProgresso(chamado) {
        const container = document.getElementById('progressoLinha');
        if (!container) return;
        container.innerHTML = '';

        const etapasConfig = window.FLUXO_MANUTENCAO || [];

        // Mapa { num: status }
        const etapasMap = {};
        (chamado.etapas || []).forEach(e => {
            etapasMap[String(e.numero)] = e.status;
            (e.subetapas || []).forEach(s => { etapasMap[String(s.numero)] = s.status; });
        });

        etapasConfig.forEach(cfg => {
            const status    = etapasMap[String(cfg.num)];
            const concluida = status === 'CONCLUIDA';
            const atual     = status === 'EM_ANDAMENTO' || status === 'AGUARDANDO_CONFIRMACAO';

            // Ocultar condicionais que não existem no fluxo deste chamado
            if (cfg.condicional && !status && chamado.status !== 'FINALIZADO') return;

            const estadoCls = concluida ? 'concluida' : atual ? 'atual' : 'pendente';

            const item = document.createElement('div');
            item.className = [
                'progresso-item',
                cfg.sub ? 'subetapa' : '',
                estadoCls
            ].filter(Boolean).join(' ');

            // Círculo: check se concluída, número se não
            const circulo = document.createElement('div');
            circulo.className = 'progresso-circulo';
            if (concluida) {
                circulo.innerHTML = `<svg class="progresso-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            } else {
                circulo.textContent = String(cfg.num);
            }

            // Label com nome completo da etapa
            const label = document.createElement('div');
            label.className = 'progresso-label';
            label.textContent = cfg.label || (cfg.sub ? `Sub ${cfg.num}` : `Etapa ${cfg.num}`);

            item.appendChild(circulo);
            item.appendChild(label);
            container.appendChild(item);
        });

        // Bolinha "Finalizado"
        const finalizado = chamado.status === 'FINALIZADO';
        const itemFinal = document.createElement('div');
        itemFinal.className = 'progresso-item ' + (finalizado ? 'concluida' : 'pendente');

        const circuloFinal = document.createElement('div');
        circuloFinal.className = 'progresso-circulo';
        circuloFinal.innerHTML = finalizado
            ? `<svg class="progresso-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;opacity:0.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

        const labelFinal = document.createElement('div');
        labelFinal.className = 'progresso-label';
        labelFinal.textContent = 'Finalizado';

        itemFinal.appendChild(circuloFinal);
        itemFinal.appendChild(labelFinal);
        container.appendChild(itemFinal);
    }




    // =========================================================================
    // ABA FLUXO / RESUMO
    // =========================================================================

    function renderResumoFluxo(chamado) {
        const abaFluxo = document.getElementById('aba-fluxo');
        if (!abaFluxo) return;
        abaFluxo.innerHTML = '';

        const colSumario = document.createElement('div');
        colSumario.className = 'fluxo-col-sumario';
        const colCards = document.createElement('div');
        colCards.className = 'fluxo-col-cards';
        abaFluxo.appendChild(colSumario);
        abaFluxo.appendChild(colCards);

        const agora = new Date();
        const dataAbertura = chamado.dataCriacao ? new Date(chamado.dataCriacao) : null;
        const diasAberto = dataAbertura ? Math.floor((agora - dataAbertura) / 86400000) : null;
        const etapaAtiva = getEtapaAtiva(chamado);
        const finalizado = chamado.status === 'FINALIZADO';

        // Tempo na etapa atual
        let horasEtapa = null;
        if (etapaAtiva) {
            const idxAtiva = (chamado.etapas || []).findIndex(e =>
                e.numero === etapaAtiva.numero || e === etapaAtiva
            );
            const anterior = idxAtiva > 0 ? chamado.etapas[idxAtiva - 1] : null;
            const refInicio = anterior?.conclusao?.dataHora
                ? new Date(anterior.conclusao.dataHora)
                : dataAbertura;
            if (refInicio) horasEtapa = ((agora - refInicio) / 3600000).toFixed(1);
        }

        // Duração total (se finalizado)
        let dataFim = null;
        if (finalizado && chamado.etapas) {
            const ultima = [...chamado.etapas].reverse().find(e => e.conclusao?.dataHora);
            if (ultima) dataFim = new Date(ultima.conclusao.dataHora);
        }
        const diasTotal = dataAbertura && dataFim
            ? Math.floor((dataFim - dataAbertura) / 86400000)
            : diasAberto;

        const etapasRaiz = (chamado.etapas || []).filter(e => !String(e.numero).includes('.'));
        const etapasConcluidas = etapasRaiz.filter(e => e.status === 'CONCLUIDA').length;
        const totalEtapas = 12;

        // Cards de métricas
        const metricas = [
            {
                icone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
                label: 'Data de abertura',
                valor: dataAbertura ? formatarDataHora(chamado.dataCriacao) : '-',
                cor: 'azul'
            },
            {
                icone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
                label: finalizado ? 'Duração total' : 'Dias em andamento',
                valor: diasTotal !== null ? `${diasTotal} dia${diasTotal !== 1 ? 's' : ''}` : '-',
                cor: 'azul'
            },
            {
                icone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`,
                label: 'Etapa atual',
                valor: getNomeEtapaAtiva(chamado),
                cor: finalizado ? 'verde' : 'azul'
            },
            {
                icone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
                label: finalizado ? 'Finalizado por' : 'Setor responsável',
                valor: getResponsavelEtapaAtiva(chamado),
                cor: 'azul'
            },
            {
                icone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
                label: 'Tempo na etapa',
                valor: horasEtapa !== null
                    ? (horasEtapa < 1 ? `${Math.round(horasEtapa * 60)} min` : `${horasEtapa}h`)
                    : (finalizado ? 'Concluído' : '-'),
                cor: 'azul'
            },
            {
                icone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`,
                label: 'Etapas concluídas',
                valor: `${etapasConcluidas} de ${totalEtapas}`,
                cor: 'azul'
            }
        ];

        metricas.forEach(m => {
            const el = document.createElement('div');
            el.className = `resumo-card resumo-card-${m.cor}`;
            el.innerHTML = `
                <div class="resumo-card-icone">${m.icone}</div>
                <div class="resumo-card-info">
                    <span class="resumo-card-label">${m.label}</span>
                    <span class="resumo-card-valor">${m.valor}</span>
                </div>`;
            colCards.appendChild(el);
        });

        // Sumário de etapas
        const etapasMap = {};
        (chamado.etapas || []).forEach(e => {
            etapasMap[String(e.numero)] = e;
            (e.subetapas || []).forEach(s => { etapasMap[String(s.numero)] = s; });
        });

        const tituloSumario = document.createElement('p');
        tituloSumario.className = 'fluxo-progresso-titulo';
        tituloSumario.textContent = 'Sumário das etapas';
        colSumario.appendChild(tituloSumario);

        const lista = document.createElement('div');
        lista.className = 'fluxo-sumario-lista';

        (window.FLUXO_MANUTENCAO || []).forEach(cfg => {
            const etapa = etapasMap[cfg.num];
            const concluida = etapa?.status === 'CONCLUIDA';
            const emAndamento = etapa?.status === 'EM_ANDAMENTO' || etapa?.status === 'AGUARDANDO_CONFIRMACAO';
            const responsavel = (window.CATEGORIA_LABEL || {})[cfg.categoria] || cfg.categoria;
            const dataConc = etapa?.conclusao?.dataHora ? formatarDataHora(etapa.conclusao.dataHora) : null;
            const usuario = etapa?.conclusao?.usuario || null;

            const statusLabel = concluida ? 'Concluída' : emAndamento ? 'Em andamento' : 'Pendente';
            const statusClass = concluida ? 'sumario-status-ok' : emAndamento ? 'sumario-status-ativo' : 'sumario-status-pendente';
            const numClass = concluida ? 'sumario-num-ok' : emAndamento ? 'sumario-num-ativo' : 'sumario-num-pendente';

            // Ocultar condicionais que não foram ativadas no fluxo deste chamado
            if (cfg.condicional && !etapa) return;

            const row = document.createElement('div');
            row.className = `sumario-row${emAndamento ? ' sumario-row-ativo' : ''}${cfg.sub ? ' sumario-row-sub' : ''}`;
            row.innerHTML = `
                <div class="sumario-num ${numClass}">
                    ${concluida
                    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
                    : cfg.num}
                </div>
                <div class="sumario-info">
                    <div class="sumario-titulo">${cfg.label}</div>
                    <div class="sumario-meta">
                        <span class="sumario-responsavel">${responsavel}</span>
                        ${dataConc ? `<span class="sumario-sep">·</span><span class="sumario-data">${dataConc}</span>` : ''}
                        ${usuario ? `<span class="sumario-sep">·</span><span class="sumario-usuario">${usuario}</span>` : ''}
                    </div>
                </div>
                <span class="sumario-status ${statusClass}">${statusLabel}</span>`;
            lista.appendChild(row);
        });

        colSumario.appendChild(lista);
    }



    // =========================================================================
    // ABA ANEXOS — coleta todas as imagens/arquivos de todas as etapas
    // =========================================================================

    function renderAnexosAba(chamado) {
        const lista = document.getElementById('chamadoAnexosLista');
        if (!lista) return;
        lista.innerHTML = '';

        const todosAnexos = [];

        function coletarAnexosDe(etapaOuSub, rotulo) {
            const d = etapaOuSub.dados || {};
            ['fotos', 'fotosAntes', 'fotosDepois', 'anexos'].forEach(campo => {
                if (Array.isArray(d[campo]) && d[campo].length > 0) {
                    d[campo].forEach(arq => todosAnexos.push({ ...arq, etapa: rotulo }));
                }
            });
        }

        (chamado.etapas || []).forEach(etapa => {
            const rotulo = `Etapa ${etapa.numero} — ${etapa.titulo || ''}`;
            coletarAnexosDe(etapa, rotulo);
            (etapa.subetapas || []).forEach(sub => {
                coletarAnexosDe(sub, `Etapa ${sub.numero} — ${sub.titulo || ''}`);
            });
        });

        if (todosAnexos.length === 0) {
            lista.innerHTML = `
                <div class="chamado-sem-anexos">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                    </svg>
                    <p>Nenhum anexo enviado</p>
                </div>`;
            return;
        }

        // Agrupa por etapa
        const grupos = {};
        todosAnexos.forEach(arq => {
            if (!grupos[arq.etapa]) grupos[arq.etapa] = [];
            grupos[arq.etapa].push(arq);
        });

        Object.entries(grupos).forEach(([etapaLabel, arquivos]) => {
            const grupo = document.createElement('div');
            grupo.className = 'anexos-grupo';

            const titulo = document.createElement('div');
            titulo.className = 'anexos-grupo-titulo';
            titulo.textContent = etapaLabel;
            grupo.appendChild(titulo);

            const grid = document.createElement('div');
            grid.className = 'anexos-grid';

            arquivos.forEach(arq => {
                const isImagem = arq.tipo && arq.tipo.startsWith('image/');
                const tamanhoStr = arq.tamanho ? (arq.tamanho / 1024).toFixed(1) + ' KB' : '';
                const nomeStr = arq.nome || (isImagem ? 'Imagem' : 'Arquivo');

                const card = document.createElement('div');
                card.className = 'anexo-card';

                const iconeHtml = isImagem
                    ? `<div class="anexo-icon anexo-icon-img" style="background-image:url('${arq.dados}')"></div>`
                    : `<div class="anexo-icon anexo-icon-file">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                       </div>`;

                card.innerHTML = `
                    ${iconeHtml}
                    <div class="anexo-info">
                        <span class="anexo-nome">${nomeStr}</span>
                        <span class="anexo-tamanho">${tamanhoStr}</span>
                    </div>
                    <div class="anexo-acoes">
                        ${isImagem && arq.dados ? `
                        <button class="anexo-btn anexo-btn-ver" title="Visualizar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>` : ''}
                        ${arq.dados ? `
                        <button class="anexo-btn anexo-btn-download" title="Download">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                        </button>` : ''}
                    </div>
                `;

                // Botão visualizar — abre preview inline
                card.querySelector('.anexo-btn-ver')?.addEventListener('click', () => {
                    const jaAberto = card.nextElementSibling?.classList.contains('anexo-preview-inline');
                    document.querySelectorAll('.anexo-preview-inline').forEach(el => el.remove());
                    document.querySelectorAll('.anexo-card').forEach(c => c.classList.remove('ativo'));
                    if (!jaAberto) {
                        card.classList.add('ativo');
                        const preview = document.createElement('div');
                        preview.className = 'anexo-preview-inline';
                        preview.innerHTML = `<img src="${arq.dados}" alt="${nomeStr}">
                            <button class="anexo-preview-fechar" title="Fechar">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>`;
                        preview.querySelector('.anexo-preview-fechar').addEventListener('click', () => {
                            preview.remove();
                            card.classList.remove('ativo');
                        });
                        card.after(preview);
                    }
                });

                // Botão download
                card.querySelector('.anexo-btn-download')?.addEventListener('click', () => {
                    const a = document.createElement('a');
                    a.href = arq.dados;
                    a.download = nomeStr;
                    a.click();
                });

                grid.appendChild(card);
            });

            grupo.appendChild(grid);
            lista.appendChild(grupo);
        });
    }


    // =========================================================================
    // RE-RENDERIZAÇÃO CENTRALIZADA DA TELA DE DETALHES
    // =========================================================================

    function reRenderizarDetalhes(chamadoId) {
        const dadoAtualizado = reidratarChamado(
            window.gerenciadorChamados.chamados.find(c => c.id == chamadoId)
        );
        if (!dadoAtualizado) return;
        window.chamadoAtual = dadoAtualizado;
        renderProgresso(dadoAtualizado);
        window.renderMensagens(dadoAtualizado);
        renderFormularioAba(dadoAtualizado);
        renderResumoFluxo(dadoAtualizado);
        renderAnexosAba(dadoAtualizado);
        atualizarBadgesNav();
    }


    // =========================================================================
    // ABA FORMULÁRIO — formulário completo da etapa ativa (via RenderizadorEtapas)
    // =========================================================================

    function renderFormularioAba(chamado) {
        const container = document.getElementById('chamadoFormularioContainer');
        if (!container) return;

        container.innerHTML = '';

        const renderizador = typeof window.RenderizadorEtapas !== 'undefined'
            ? new window.RenderizadorEtapas('chamadoFormularioContainer', chamado, usuarioAtual)
            : null;

        // --- Painel superior: dados acumulados das etapas concluídas ---
        if (renderizador) {
            const painelDados = renderizador.renderFormularioDados();
            if (painelDados) container.appendChild(painelDados);
        }

        const etapa = getEtapaAtiva(chamado);

        if (!etapa) {
            if (chamado.status === 'FINALIZADO') {
                const msg = document.createElement('p');
                msg.style.cssText = 'color:#10b981;font-weight:600;padding:20px 0;';
                msg.textContent = '✓ Chamado finalizado com sucesso.';
                container.appendChild(msg);
            }
            return;
        }

        if (!podeAtenderEtapa(etapa, usuarioAtual.perfil)) {
            return;
        }

        // Divisor entre dados e formulário de ação
        const divisor = document.createElement('div');
        divisor.className = 'formulario-divisor';
        divisor.innerHTML = `<span>Etapa ${etapa.numero} — ${etapa.titulo}</span>`;
        container.appendChild(divisor);

        // Formulário da etapa ativa
        if (renderizador) {
            window.renderizadorAtual = renderizador;
            container.appendChild(renderizador.criarConteudo(etapa));
        }
    }


    // =========================================================================
    // TROCA DE ABAS — tela de detalhes
    // =========================================================================

    document.querySelectorAll('.chamado-aba-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const aba = btn.dataset.aba;
            document.querySelectorAll('.chamado-aba-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.chamado-aba-conteudo').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('aba-' + aba)?.classList.add('active');
        });
    });


    // =========================================================================
    // VOLTAR DA TELA DE DETALHES
    // =========================================================================

    btnVoltarDetalhes?.addEventListener('click', () => {
        ticketDetailsScreen.classList.remove('active', 'fullscreen');
        document.querySelector('.mobile-header').style.display = '';
        currentTicketId = null;
        renderTickets('entrada');
        renderTickets('log');
        renderTickets('saida');
    });

    // Botões do header mobile da tela de detalhes
    document.getElementById('btnVoltarDetalhesMobile')?.addEventListener('click', () => {
        ticketDetailsScreen.classList.remove('active', 'fullscreen');
        document.querySelector('.mobile-header').style.display = '';
        currentTicketId = null;
        renderTickets('entrada');
        renderTickets('log');
        renderTickets('saida');
    });

    document.getElementById('btnMenuDetalhesMobile')?.addEventListener('click', () => {
        // Abre a sidebar (mesmo comportamento do hamburguer do mobile-header)
        document.getElementById('sidebar')?.classList.add('open');
        document.getElementById('sidebarOverlay')?.classList.add('active');
        document.body.style.overflow = 'hidden';
    });


    // =========================================================================
    // ACESSIBILIDADE — Escape fecha telas sobrepostas
    // =========================================================================

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (sidebar?.classList.contains('open')) closeSidebar();
        if (newTicketScreen?.classList.contains('active')) closeTicketScreen();
        if (ticketDetailsScreen?.classList.contains('active')) {
            ticketDetailsScreen.classList.remove('active', 'fullscreen');
            document.querySelector('.mobile-header').style.display = '';
            currentTicketId = null;
        }
    });


    // =========================================================================
    // PÁGINA MEU PERFIL
    // =========================================================================

    function renderPerfilPage() {
        const container = document.getElementById('perfilContainer');
        if (!container || !usuarioAtual) return;

        const u = usuarioAtual;
        const iniciais = (u.nomeCompleto || u.usuario || 'US')
            .split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

        const perfilLabel = (window.CATEGORIA_LABEL || {})[u.perfil] || u.perfil || '-';

        const todos = getChamadosFluxo();
        const meus = todos.filter(c => {
            const todasEtapas = [];
            (c.etapas || []).forEach(e => {
                todasEtapas.push(e);
                (e.subetapas || []).forEach(s => todasEtapas.push(s));
            });
            return todasEtapas.some(e => e.conclusao?.usuario === u.nomeCompleto)
                || c._solicitanteUsuario === u.usuario;
        });
        const abertos = meus.filter(c => c.status !== 'FINALIZADO').length;
        const finalizados = meus.filter(c => c.status === 'FINALIZADO').length;

        container.innerHTML = `
            <div class="perfil-wrapper">

                <div class="perfil-header-card">
                    <div class="perfil-avatar">${iniciais}</div>
                    <div class="perfil-header-info">
                        <h2 class="perfil-nome">${u.nomeCompleto || u.usuario}</h2>
                        <span class="perfil-cargo">${perfilLabel}</span>
                    </div>
                </div>

                <div class="perfil-stats">
                    <div class="perfil-stat">
                        <span class="perfil-stat-valor">${meus.length}</span>
                        <span class="perfil-stat-label">Total de chamados</span>
                    </div>
                    <div class="perfil-stat">
                        <span class="perfil-stat-valor" style="color:#f59e0b;">${abertos}</span>
                        <span class="perfil-stat-label">Em andamento</span>
                    </div>
                    <div class="perfil-stat">
                        <span class="perfil-stat-valor" style="color:#10b981;">${finalizados}</span>
                        <span class="perfil-stat-label">Finalizados</span>
                    </div>
                </div>

                <div class="perfil-secao">
                    <div class="perfil-secao-header">
                        <span class="perfil-secao-titulo">Informações pessoais</span>
                        <button class="perfil-btn-editar" id="btnEditarContato">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            Editar
                        </button>
                    </div>
                    <div class="perfil-dados">
                        <div class="perfil-dado-item">
                            <span class="perfil-dado-label">Nome completo</span>
                            <span class="perfil-dado-valor">${u.nomeCompleto || '-'}</span>
                        </div>
                        <div class="perfil-dado-item">
                            <span class="perfil-dado-label">Usuário</span>
                            <span class="perfil-dado-valor">@${u.usuario || '-'}</span>
                        </div>
                        <div class="perfil-dado-item">
                            <span class="perfil-dado-label">E-mail</span>
                            <span class="perfil-dado-valor">${u.email || '—'}</span>
                        </div>
                        <div class="perfil-dado-item">
                            <span class="perfil-dado-label">Telefone</span>
                            <span class="perfil-dado-valor">${u.telefone || '—'}</span>
                        </div>
                    </div>
                </div>

                <div class="perfil-secao">
                    <div class="perfil-secao-header">
                        <span class="perfil-secao-titulo">Acesso</span>
                    </div>
                    <div class="perfil-dados">
                        <div class="perfil-dado-item">
                            <span class="perfil-dado-label">Perfil</span>
                            <span class="perfil-dado-valor"><span class="perfil-badge">${perfilLabel}</span></span>
                        </div>
                        <div class="perfil-dado-item">
                            <span class="perfil-dado-label">Status</span>
                            <span class="perfil-dado-valor"><span class="perfil-badge perfil-badge-green">● ${u.status || 'Ativo'}</span></span>
                        </div>
                        ${u.dataCadastro ? `
                        <div class="perfil-dado-item">
                            <span class="perfil-dado-label">Desde</span>
                            <span class="perfil-dado-valor">${formatarDataHora(u.dataCadastro)}</span>
                        </div>` : ''}
                    </div>
                </div>

                <div class="perfil-secao">
                    <div class="perfil-secao-header">
                        <span class="perfil-secao-titulo">Segurança</span>
                        <button class="perfil-btn-editar" id="btnAlterarSenha">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            Alterar senha
                        </button>
                    </div>
                    <div class="perfil-dados">
                        <div class="perfil-dado-item">
                            <span class="perfil-dado-label">Senha</span>
                            <span class="perfil-dado-valor" style="letter-spacing:3px;color:#9ca3af;">••••••••</span>
                        </div>
                    </div>
                </div>

            </div>
        `;

        document.getElementById('btnEditarContato')?.addEventListener('click', () => {
            abrirModalPerfil('Editar contato', `
                <div class="form-group-etapa" style="margin-bottom:14px;">
                    <label class="form-label-etapa">E-mail</label>
                    <input type="email" class="form-input-etapa" id="editEmail" value="${u.email || ''}" placeholder="seu@email.com">
                </div>
                <div class="form-group-etapa" style="margin-bottom:20px;">
                    <label class="form-label-etapa">Telefone</label>
                    <input type="text" class="form-input-etapa" id="editTelefone" value="${u.telefone || ''}" placeholder="(00) 00000-0000">
                </div>
                <div style="display:flex;gap:10px;">
                    <button type="button" class="btn-etapa" style="flex:1;padding:10px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer;font-family:inherit;" id="cancelarEditarContato">Cancelar</button>
                    <button type="button" class="btn-etapa btn-etapa-primary" style="flex:1;" id="salvarContato">Salvar</button>
                </div>
            `);
            document.getElementById('cancelarEditarContato')?.addEventListener('click', fecharModalPerfil);
            document.getElementById('salvarContato')?.addEventListener('click', () => {
                const email = document.getElementById('editEmail').value.trim();
                const telefone = document.getElementById('editTelefone').value.trim();
                const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
                const idx = usuarios.findIndex(x => x.usuario === u.usuario);
                if (idx >= 0) {
                    usuarios[idx].email = email;
                    usuarios[idx].telefone = telefone;
                    localStorage.setItem('usuarios', JSON.stringify(usuarios));
                }
                usuarioAtual.email = email;
                usuarioAtual.telefone = telefone;
                fecharModalPerfil();
                renderPerfilPage();
            });
        });

        document.getElementById('btnAlterarSenha')?.addEventListener('click', () => {
            abrirModalPerfil('Alterar senha', `
                <div class="form-group-etapa" style="margin-bottom:14px;">
                    <label class="form-label-etapa">Senha atual</label>
                    <input type="password" class="form-input-etapa" id="senhaAtual" placeholder="••••••••">
                </div>
                <div class="form-group-etapa" style="margin-bottom:14px;">
                    <label class="form-label-etapa">Nova senha</label>
                    <input type="password" class="form-input-etapa" id="novaSenha" placeholder="••••••••">
                </div>
                <div class="form-group-etapa" style="margin-bottom:20px;">
                    <label class="form-label-etapa">Confirmar nova senha</label>
                    <input type="password" class="form-input-etapa" id="confirmarSenha" placeholder="••••••••">
                </div>
                <p id="senhaErro" style="color:#ef4444;font-size:13px;margin-bottom:10px;display:none;"></p>
                <div style="display:flex;gap:10px;">
                    <button type="button" class="btn-etapa" style="flex:1;padding:10px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer;font-family:inherit;" id="cancelarSenha">Cancelar</button>
                    <button type="button" class="btn-etapa btn-etapa-primary" style="flex:1;" id="salvarSenha">Salvar</button>
                </div>
            `);
            document.getElementById('cancelarSenha')?.addEventListener('click', fecharModalPerfil);
            document.getElementById('salvarSenha')?.addEventListener('click', () => {
                const atual = document.getElementById('senhaAtual').value;
                const nova = document.getElementById('novaSenha').value;
                const confirmar = document.getElementById('confirmarSenha').value;
                const erroEl = document.getElementById('senhaErro');
                const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
                const user = usuarios.find(x => x.usuario === u.usuario);
                if (!user || user.senha !== atual) {
                    erroEl.textContent = 'Senha atual incorreta.'; erroEl.style.display = 'block'; return;
                }
                if (nova.length < 4) {
                    erroEl.textContent = 'A nova senha deve ter pelo menos 4 caracteres.'; erroEl.style.display = 'block'; return;
                }
                if (nova !== confirmar) {
                    erroEl.textContent = 'As senhas não coincidem.'; erroEl.style.display = 'block'; return;
                }
                user.senha = nova;
                localStorage.setItem('usuarios', JSON.stringify(usuarios));
                fecharModalPerfil();
                let toast = document.getElementById('copyToast');
                if (!toast) { toast = document.createElement('div'); toast.id = 'copyToast'; document.body.appendChild(toast); }
                toast.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1f2937;color:#fff;font-size:13px;font-weight:600;padding:8px 18px;border-radius:20px;box-shadow:0 4px 14px rgba(0,0,0,0.25);opacity:1;pointer-events:none;z-index:9999;`;
                toast.textContent = '✓ Senha alterada com sucesso';
                clearTimeout(toast._timeout);
                toast._timeout = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
            });
        });
    }

    function abrirModalPerfil(titulo, corpo) {
        document.getElementById('modalEditarPerfilTitulo').textContent = titulo;
        document.getElementById('modalEditarPerfilCorpo').innerHTML = corpo;
        document.getElementById('modalEditarPerfil').classList.add('active');
    }

    function fecharModalPerfil() {
        document.getElementById('modalEditarPerfil').classList.remove('active');
    }

    document.getElementById('fecharModalPerfil')?.addEventListener('click', fecharModalPerfil);


    // =========================================================================
    // TOGGLE LISTA / GRADE
    // =========================================================================

    const GRIDS = { entrada: 'ticketsEntradaGrid', log: 'ticketsLogGrid', saida: 'ticketsSaidaGrid' };
    const TOGGLES = { entrada: 'viewToggle', log: 'viewToggleLog', saida: 'viewToggleSaida' };

    let modoVisualiz = localStorage.getItem('modoVisualizacao') || 'lista';

    function aplicarModoVisualizacao(modo) {
        modoVisualiz = modo;
        localStorage.setItem('modoVisualizacao', modo);
        Object.values(GRIDS).forEach(gridId => {
            document.getElementById(gridId)?.classList.toggle('modo-grade', modo === 'grade');
        });
        Object.values(TOGGLES).forEach(toggleId => {
            document.querySelectorAll(`#${toggleId} .view-toggle-btn`).forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === modo);
            });
        });
    }

    Object.values(TOGGLES).forEach(toggleId => {
        document.querySelectorAll(`#${toggleId} .view-toggle-btn`).forEach(btn => {
            btn.addEventListener('click', () => aplicarModoVisualizacao(btn.dataset.view));
        });
    });

    aplicarModoVisualizacao(modoVisualiz);


    // =========================================================================
    // INICIALIZAÇÃO FINAL
    // =========================================================================

    // =========================================================================
    // EXPOR FUNÇÕES INTERNAS PARA MÓDULOS EXTERNOS (aba-mensagens.js, etc.)
    // =========================================================================
    window.getEtapaAtiva = getEtapaAtiva;
    window.podeAtenderEtapa = podeAtenderEtapa;
    window.reidratarChamado = reidratarChamado;
    window.reRenderizarDetalhes = reRenderizarDetalhes;
    window.usuarioAtual = usuarioAtual;

    console.log(`✅ Sistema iniciado | Usuário: ${usuarioAtual.usuario} | Perfil: ${usuarioAtual.perfil}`);
    atualizarBadgesNav();
    renderTickets('entrada');
    renderTickets('log');
    renderTickets('saida');

    // Garante visibilidade dos itens de menu por perfil após tudo estar montado
    if (typeof showElementsByPermission === 'function') {
        showElementsByPermission();
    }

});