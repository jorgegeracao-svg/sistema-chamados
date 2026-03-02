// =============================================================================
// USER-SEARCH.JS — Autocomplete de busca de usuário (campo Solicitante)
// Responsabilidades:
//   - Ler usuários do localStorage (mesmo formato de login.js)
//   - Filtrar por nome, usuário ou RE ao digitar
//   - Exibir dropdown com avatar de iniciais, nome e cargo
//   - Ao selecionar, exibir chip com nome e preencher campo oculto #solicitanteId
//   - Botão "x" do chip desfaz a seleção e restaura o input
//
// Depende de: DOM do index.html (ids: solicitanteSearch, solicitanteDropdown,
//             solicitanteChip, solicitanteChipAvatar, solicitanteChipName,
//             solicitanteChipRemove, solicitanteId)
// =============================================================================

document.addEventListener('DOMContentLoaded', function () {

    // -------------------------------------------------------------------------
    // Elementos do DOM
    // -------------------------------------------------------------------------
    const searchInput  = document.getElementById('solicitanteSearch');
    const dropdown     = document.getElementById('solicitanteDropdown');
    const chip         = document.getElementById('solicitanteChip');
    const chipAvatar   = document.getElementById('solicitanteChipAvatar');
    const chipName     = document.getElementById('solicitanteChipName');
    const chipRemove   = document.getElementById('solicitanteChipRemove');
    const hiddenId     = document.getElementById('solicitanteId');

    // Elementos podem não existir se a seção de manutenção ainda não foi exibida
    // (o HTML sempre está no DOM, só oculto via .hidden), então a verificação
    // é feita apenas no momento de uso.

    // -------------------------------------------------------------------------
    // Fonte de dados — mesma estrutura usada por login.js
    // -------------------------------------------------------------------------
    function getUsuarios() {
        return JSON.parse(localStorage.getItem('usuarios') || '[]');
    }

    /** Gera as iniciais a partir do nome completo */
    function gerarIniciais(nomeCompleto) {
        const partes = (nomeCompleto || '').trim().split(' ');
        if (partes.length >= 2) {
            return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
        }
        return partes[0].substring(0, 2).toUpperCase();
    }

    // -------------------------------------------------------------------------
    // Filtrar usuários pelo termo digitado
    // Busca em: nomeCompleto, usuario (login) e re (matrícula)
    // -------------------------------------------------------------------------
    function filtrarUsuarios(termo) {
        if (!termo || termo.length < 1) return [];
        const t = termo.toLowerCase();
        return getUsuarios().filter(u =>
            u.status !== 'Desligado' && u.status !== 'Inativo' && (
                (u.nomeCompleto || '').toLowerCase().includes(t) ||
                (u.usuario      || '').toLowerCase().includes(t) ||
                (u.re           || '').toLowerCase().includes(t)
            )
        );
    }

    // -------------------------------------------------------------------------
    // Renderizar o dropdown com a lista de resultados
    // -------------------------------------------------------------------------
    function renderDropdown(usuarios) {
        if (!dropdown) return;
        dropdown.innerHTML = '';

        if (usuarios.length === 0) {
            dropdown.innerHTML = '<div class="user-search-empty">Nenhum usuário encontrado</div>';
            dropdown.classList.add('open');
            return;
        }

        usuarios.forEach(user => {
            const iniciais = gerarIniciais(user.nomeCompleto);

            const option = document.createElement('div');
            option.className = 'user-search-option';
            option.setAttribute('role', 'option');
            option.dataset.id = user.id;

            option.innerHTML = `
                <div class="user-search-avatar">${iniciais}</div>
                <div class="user-search-option-info">
                    <span class="user-search-option-name">${user.nomeCompleto}</span>
                    <span class="user-search-option-role">${user.cargo || user.perfil || ''}</span>
                </div>
            `;

            // mousedown em vez de click para não perder o foco do input antes da seleção
            option.addEventListener('mousedown', (e) => {
                e.preventDefault();
                selecionarUsuario(user);
            });

            dropdown.appendChild(option);
        });

        dropdown.classList.add('open');
    }

    // -------------------------------------------------------------------------
    // Selecionar um usuário: preenche o chip e esconde o input-wrapper inteiro
    // -------------------------------------------------------------------------
    function selecionarUsuario(user) {
        if (!chip || !chipAvatar || !chipName || !hiddenId || !searchInput) return;

        const iniciais = gerarIniciais(user.nomeCompleto);

        hiddenId.value         = user.id;
        chipAvatar.textContent = iniciais;
        chipName.textContent   = user.nomeCompleto;

        chip.classList.add('visible');

        // Oculta o wrapper inteiro (lupa + input) para não vazar atrás do chip
        const inputWrapper = searchInput.closest('.user-search-input-wrapper');
        if (inputWrapper) inputWrapper.style.display = 'none';

        fecharDropdown();
    }

    // -------------------------------------------------------------------------
    // Remover seleção: volta ao estado inicial com o input visível
    // -------------------------------------------------------------------------
    function removerSelecao() {
        if (!chip || !hiddenId || !searchInput) return;

        hiddenId.value = '';
        chip.classList.remove('visible');

        // Restaura o wrapper com lupa + input
        const inputWrapper = searchInput.closest('.user-search-input-wrapper');
        if (inputWrapper) inputWrapper.style.display = '';

        searchInput.value = '';
        searchInput.focus();
    }

    // -------------------------------------------------------------------------
    // Fechar e limpar o dropdown
    // -------------------------------------------------------------------------
    function fecharDropdown() {
        if (!dropdown) return;
        dropdown.classList.remove('open');
        dropdown.innerHTML = '';
    }

    // -------------------------------------------------------------------------
    // Eventos
    // -------------------------------------------------------------------------

    // Digitar → filtrar e abrir dropdown
    searchInput?.addEventListener('input', () => {
        const termo = searchInput.value.trim();
        if (termo.length < 1) {
            fecharDropdown();
            return;
        }
        renderDropdown(filtrarUsuarios(termo));
    });

    // Foco → reabrir dropdown se já havia texto
    searchInput?.addEventListener('focus', () => {
        const termo = searchInput.value.trim();
        if (termo.length >= 1) {
            renderDropdown(filtrarUsuarios(termo));
        }
    });

    // Perder foco → fechar dropdown (delay para permitir o mousedown nas opções)
    searchInput?.addEventListener('blur', () => {
        setTimeout(fecharDropdown, 150);
    });

    // Botão "x" → remover seleção
    chipRemove?.addEventListener('click', removerSelecao);

    // Clicar fora do wrapper → fechar dropdown
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.user-search-wrapper')) {
            fecharDropdown();
        }
    });

    // Tecla Escape → fechar dropdown
    searchInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') fecharDropdown();
    });

});