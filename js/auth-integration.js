// =============================================================================
// AUTH-INTEGRATION.JS — Autenticação e sessão do usuário
// Responsabilidades:
//   - Verificar se o usuário está logado em todas as páginas
//   - Redirecionar para login.html se não autenticado
//   - Preencher informações do usuário na sidebar (nome, perfil, avatar)
//   - Controlar visibilidade de elementos por perfil
//   - Expor checkAuth(), logout(), hasPermission() globalmente
//
// IMPORTANTE: Este arquivo é carregado com <script> no <head> do index.html
// (antes do DOMContentLoaded), então as funções globais ficam disponíveis
// para script.js e os demais arquivos JS.
// =============================================================================


// =============================================================================
// VERIFICAÇÃO DE AUTENTICAÇÃO
// =============================================================================

/**
 * Verifica se há um usuário logado no localStorage.
 * - Se estiver no login.html e já logado → redireciona para index.html
 * - Se estiver em outra página e não logado → redireciona para login.html
 * @returns {Object|null} Objeto do usuário logado, ou null
 */
function checkAuth() {
    const currentUser = localStorage.getItem('currentUser');
    const naLoginPage = window.location.pathname.includes('login.html') ||
                        window.location.pathname === '/' ||
                        window.location.pathname.endsWith('/');

    // Na tela de login: sempre permanece no login (não redireciona automaticamente)
    // O usuário deve fazer login manualmente a cada acesso.
    if (naLoginPage) {
        return null;
    }

    // Nas demais páginas: sem sessão, redireciona para login
    if (!currentUser) {
        window.location.href = 'login.html';
        return null;
    }

    const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
    const user = usuarios.find(u => u.usuario === currentUser);

    // Sessão inválida (usuário removido), limpa e redireciona
    if (!user) {
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
        return null;
    }

    return user;
}


// =============================================================================
// PERMISSÕES
// =============================================================================

/**
 * Retorna o perfil do usuário logado, ou null se não autenticado.
 * @returns {string|null}
 */
function getUserProfile() {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) return null;
    const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
    const user = usuarios.find(u => u.usuario === currentUser);
    return user ? user.perfil : null;
}

/**
 * Verifica se o usuário logado possui um dos perfis permitidos.
 * @param {string[]} allowedProfiles - Lista de perfis que têm acesso
 * @returns {boolean}
 */
function hasPermission(allowedProfiles) {
    const profile = getUserProfile();
    return !!(profile && allowedProfiles.includes(profile));
}


// =============================================================================
// PREENCHIMENTO DA SIDEBAR COM DADOS DO USUÁRIO
// =============================================================================

/**
 * Preenche nome, perfil e avatar na sidebar com base no usuário logado.
 * Também controla visibilidade de elementos restritos por perfil.
 * Usa os IDs definidos no index.html: #userName, #userEmail, #userAvatar.
 */
function showElementsByPermission() {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) return;

    const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
    const user = usuarios.find(u => u.usuario === currentUser);
    if (!user) return;

    const perfilNomes = {
        'ADMIN':          'Administrador',
        'SOLICITANTE':    'Solicitante',
        'TECNICO':        'Técnico',
        'ADMINISTRATIVO': 'Administrativo',
        'COMPRADOR':      'Comprador'
    };

    // --- Nome completo do usuário ---
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = user.nomeCompleto;

    // --- Perfil exibido abaixo do nome (campo "e-mail" reutilizado como cargo) ---
    const userEmailEl = document.getElementById('userEmail');
    if (userEmailEl) userEmailEl.textContent = perfilNomes[user.perfil] || user.perfil;

    // --- Avatar: foto ou iniciais ---
    const userAvatarEl = document.getElementById('userAvatar');
    if (userAvatarEl) {
        const partes = (user.nomeCompleto || user.usuario || 'US').trim().split(' ');
        const iniciais = partes.length >= 2
            ? partes[0][0] + partes[partes.length - 1][0]
            : partes[0].substring(0, 2);
        if (user.foto) {
            userAvatarEl.innerHTML = `<img src="${user.foto}" alt="${user.nomeCompleto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            userAvatarEl.style.padding = '0';
        } else {
            userAvatarEl.textContent = iniciais.toUpperCase();
            userAvatarEl.style.padding = '';
        }
    }

    // --- Ocultar "Configurações" para perfis sem acesso administrativo ---
    // "Meu Perfil" fica visível para todos; apenas "Configurações" é restrita
    const navConfigItem = document.querySelector('[data-page="configPage"]');
    if (navConfigItem) {
        navConfigItem.style.display = ['ADMIN'].includes(user.perfil) ? '' : 'none';
    }
    // Botão Usuários — esconde para quem não é ADMIN
    const navUsuariosItem = document.getElementById('navUsuarios');
    if (navUsuariosItem) {
        if (!['ADMIN'].includes(user.perfil)) {
            navUsuariosItem.style.display = 'none';
        }
    }
    // Garante que nav-settings (container) seja sempre visível
    const navSettings = document.querySelector('.nav-settings');
    if (navSettings) navSettings.style.display = 'block';
}


// =============================================================================
// LOGOUT
// =============================================================================

/**
 * Encerra a sessão do usuário após confirmação e redireciona para o login.
 * Chamado diretamente via onclick="logout()" no botão da sidebar.
 */
function logout() {
    if (confirm('Deseja realmente sair do sistema?')) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('rememberMe');
        window.location.href = 'login.html';
    }
}


// =============================================================================
// INICIALIZAÇÃO AUTOMÁTICA NO DOMContentLoaded
// Executado apenas no index.html (e outras páginas que não sejam login).
// =============================================================================

document.addEventListener('DOMContentLoaded', function () {
    const naLoginPage = window.location.pathname.includes('login.html') ||
                        window.location.pathname === '/' ||
                        window.location.pathname.endsWith('/');

    // Não executa lógica de sessão na tela de login
    if (naLoginPage) return;

    const user = checkAuth();
    if (user) {
        showElementsByPermission();
    }
});


// =============================================================================
// FUNÇÕES AUXILIARES DE PERMISSÃO (exemplos reutilizáveis)
// =============================================================================

/** Abre a tela de usuários (apenas ADMIN) */
function abrirTelaUsuarios() {
    if (!hasPermission(['ADMIN'])) {
        alert('Você não tem permissão para acessar esta área!');
        return;
    }
    // TODO: implementar abertura da tela de usuários
}

/** Salva uma categoria (ADMIN, TECNICO ou ADMINISTRATIVO) */
function salvarCategoria() {
    if (!hasPermission(['ADMIN', 'TECNICO', 'ADMINISTRATIVO'])) {
        alert('Você não tem permissão para editar categorias!');
        return;
    }
    // TODO: implementar salvamento de categoria
}

/**
 * Retorna chamados visíveis para o usuário logado.
 * Admin/Técnico/Administrativo veem todos; demais veem apenas os seus.
 */
function getChamadosDoUsuario() {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) return [];

    const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
    const user = usuarios.find(u => u.usuario === currentUser);
    if (!user) return [];

    const chamados = JSON.parse(localStorage.getItem('chamados') || '[]');

    return ['ADMIN', 'TECNICO', 'ADMINISTRATIVO'].includes(user.perfil)
        ? chamados
        : chamados.filter(c => c.solicitante === user.usuario);
}


// =============================================================================
// EXPORTAR PARA ESCOPO GLOBAL
// =============================================================================
window.checkAuth              = checkAuth;
window.getUserProfile         = getUserProfile;
window.hasPermission          = hasPermission;
window.logout                 = logout;
window.showElementsByPermission = showElementsByPermission;

/**
 * Retorna a foto (base64) de um usuário pelo nomeCompleto ou usuario (login).
 * Usado pelos cards e pela tela de perfil.
 * @param {string} identificador - nomeCompleto ou login do usuário
 * @returns {string|null}
 */
function getFotoUsuario(identificador) {
    if (!identificador) return null;
    const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
    const user = usuarios.find(u =>
        u.nomeCompleto === identificador || u.usuario === identificador
    );
    return user?.foto || null;
}
window.getFotoUsuario = getFotoUsuario; 