// =============================================================================
// LOGIN.JS — Autenticação e interface da tela de login
// Responsabilidades:
//   - Inicializar usuários e categorias padrão no localStorage
//   - Submeter formulário de login e redirecionar para index.html
//   - Toggle de visibilidade da senha
//   - Modal de recuperação de senha
//   - Acessibilidade (Escape fecha o modal, auto-focus no campo usuário)
//
// NOTA: As funções checkAuth(), logout() e showElementsByPermission()
// estão definidas em auth-integration.js. Não duplicar aqui.
// =============================================================================


// =============================================================================
// DADOS INICIAIS — localStorage
// Criados apenas quando o storage está vazio (primeira execução).
// =============================================================================

// Classe utilitária para leitura/escrita no localStorage
class Storage {

    // Usuários cadastrados no sistema
    static getUsuarios()           { return JSON.parse(localStorage.getItem('usuarios') || '[]'); }
    static saveUsuarios(usuarios)  { localStorage.setItem('usuarios', JSON.stringify(usuarios)); }

    // Usuário da sessão atual
    static getCurrentUserLogin()         { return localStorage.getItem('currentUser'); }
    static setCurrentUserLogin(username) { localStorage.setItem('currentUser', username); }
    static removeCurrentUserLogin()      { localStorage.removeItem('currentUser'); }

    // Categorias de chamado
    static getCategorias()            { return JSON.parse(localStorage.getItem('categorias') || '[]'); }
    static saveCategorias(categorias) { localStorage.setItem('categorias', JSON.stringify(categorias)); }
}

/**
 * Popula o localStorage com os usuários padrão do sistema,
 * caso ainda não existam (primeira execução).
 */
function initUsuarios() {
    if (Storage.getUsuarios().length > 0) return;

    Storage.saveUsuarios([
        {
            id: 1,
            nomeCompleto: 'Administrador do Sistema',
            re: '00000',
            cargo: 'Administrador',
            localTrabalho: 'Administrativo',
            gestor: '',
            gerente: '',
            perfil: 'ADMIN',
            status: 'Ativo',
            usuario: 'admin',
            senha: 'admin',
            foto: null,
            dataCadastro: new Date().toISOString()
        },
        {
            id: 2,
            nomeCompleto: 'Felipe Jorge',
            re: '12345',
            cargo: 'Solicitante',
            localTrabalho: 'Canteiro A',
            gestor: 'Caian Silva',
            gerente: 'Pedro Costa',
            perfil: 'SOLICITANTE',
            status: 'Ativo',
            usuario: 'felipe.jorge',
            senha: '123456',
            foto: null,
            dataCadastro: new Date().toISOString()
        }, 
        {
            id: 3,
            re: '12346',
            cargo: 'Técnico de Manutenção',
            localTrabalho: 'Manutenção',
            gestor: 'João Santos',
            gerente: 'Ana Lima',
            perfil: 'TECNICO',
            status: 'Ativo',
            usuario: 'thiago.santos',
            senha: '123456',
            foto: null,
            dataCadastro: new Date().toISOString()
        },
        {
            id: 4,
            nomeCompleto: 'Carlos Eduardo',
            re: '12347',
            cargo: 'Administrativo da Manutenção',
            localTrabalho: 'Manutenção',
            gestor: 'João Santos',
            gerente: 'Ana Lima',
            perfil: 'ADMINISTRATIVO',
            status: 'Ativo',
            usuario: 'carlos.eduardo',
            senha: '123456',
            foto: null,
            dataCadastro: new Date().toISOString()
        },
        {
            id: 5,
            nomeCompleto: 'Robert Silva',
            re: '12348',
            cargo: 'Comprador',
            localTrabalho: 'Compras',
            gestor: 'Maria Oliveira',
            gerente: 'Carlos Souza',
            perfil: 'COMPRADOR',
            status: 'Ativo',
            usuario: 'robert.silva',
            senha: '123456',
            foto: null,
            dataCadastro: new Date().toISOString()
        }
    ]);
}

/**
 * Popula o localStorage com as categorias padrão,
 * caso ainda não existam.
 */
function initCategorias() {
    if (Storage.getCategorias().length > 0) return;

    Storage.saveCategorias([
        { id: 1, nome: 'Elétrica',        descricao: 'Problemas elétricos em geral',               ativo: true },
        { id: 2, nome: 'Hidráulica',      descricao: 'Vazamentos e problemas hidráulicos',          ativo: true },
        { id: 3, nome: 'TI - Hardware',   descricao: 'Problemas com computadores e equipamentos',   ativo: true },
        { id: 4, nome: 'TI - Software',   descricao: 'Problemas com sistemas e programas',          ativo: true },
        { id: 5, nome: 'Ar Condicionado', descricao: 'Manutenção de ar condicionado',               ativo: true },
        { id: 6, nome: 'Estrutura',       descricao: 'Problemas estruturais do prédio',             ativo: true },
        { id: 7, nome: 'Limpeza',         descricao: 'Solicitações de limpeza',                     ativo: true },
        { id: 8, nome: 'Outros',          descricao: 'Outras solicitações',                         ativo: true }
    ]);
}


// =============================================================================
// ALERTA DE FEEDBACK — exibido dentro do formulário de login
// =============================================================================

/**
 * Exibe uma mensagem de alerta na tela de login.
 * @param {string} message - Texto da mensagem
 * @param {'success'|'error'} type - Tipo visual do alerta
 */
function showAlert(message, type = 'success') {
    const alertEl = document.getElementById('loginAlert');
    if (!alertEl) return;

    alertEl.textContent = message;
    alertEl.className = `alert ${type} show`;

    // Remove o alerta automaticamente após 4 segundos
    setTimeout(() => alertEl.classList.remove('show'), 4000);
}


// =============================================================================
// INICIALIZAÇÃO DA TELA DE LOGIN
// Executado após o DOM estar completamente carregado.
// =============================================================================

document.addEventListener('DOMContentLoaded', function () {

    // -------------------------------------------------------------------------
    // Inicializar dados padrão no localStorage
    // -------------------------------------------------------------------------
    initUsuarios();
    initCategorias();

    // -------------------------------------------------------------------------
    // Referências aos elementos do DOM
    // -------------------------------------------------------------------------
    const loginForm           = document.getElementById('loginForm');
    const passwordInput       = document.getElementById('password');
    const togglePassword      = document.getElementById('togglePassword');
    const eyeIcon             = document.getElementById('eyeIcon');
    const eyeOffIcon          = document.getElementById('eyeOffIcon');
    const forgotPasswordLink  = document.getElementById('forgotPassword');
    const forgotPasswordModal = document.getElementById('forgotPasswordModal');
    const closeModal          = document.getElementById('closeModal');
    const cancelRecovery      = document.getElementById('cancelRecovery');
    const forgotPasswordForm  = document.getElementById('forgotPasswordForm');


    // =========================================================================
    // TOGGLE: MOSTRAR / OCULTAR SENHA
    // Alterna o type do input entre "password" e "text"
    // e troca o ícone de olho correspondente.
    // =========================================================================
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const isHidden = passwordInput.type === 'password';
            passwordInput.type = isHidden ? 'text' : 'password';

            // Alterna a visibilidade dos ícones
            eyeIcon?.classList.toggle('hidden', !isHidden);
            eyeOffIcon?.classList.toggle('hidden', isHidden);
        });
    }


    // =========================================================================
    // SUBMIT DO FORMULÁRIO DE LOGIN
    // Valida credenciais contra o localStorage e redireciona para index.html.
    // =========================================================================
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const username   = document.getElementById('username').value.trim();
            const password   = passwordInput.value;
            const rememberMe = document.getElementById('rememberMe').checked;

            // Validação básica de campos vazios
            if (!username || !password) {
                showAlert('Por favor, preencha todos os campos', 'error');
                return;
            }

            // Buscar usuário no localStorage
            const user = Storage.getUsuarios().find(
                u => u.usuario === username && u.senha === password
            );

            if (!user) {
                showAlert('Usuário ou senha incorretos!', 'error');
                return;
            }

            // Bloquear usuários desligados ou inativos
            if (user.status === 'Desligado' || user.status === 'Inativo') {
                showAlert('Usuário inativo. Entre em contato com o administrador.', 'error');
                return;
            }

            // Salvar sessão (limpa sessão anterior primeiro)
            localStorage.removeItem('currentUser');
            Storage.setCurrentUserLogin(user.usuario);
            if (rememberMe) localStorage.setItem('rememberMe', 'true');

            showAlert('Login realizado com sucesso!', 'success');

            // Redirecionar após breve pausa (para o alerta ser visível)
            setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        });
    }


    // =========================================================================
    // MODAL DE RECUPERAÇÃO DE SENHA
    // Abre ao clicar em "Esqueceu a senha?" e fecha via botão, cancelar ou Esc.
    // =========================================================================

    /** Abre o modal de recuperação */
    function openRecoveryModal() {
        forgotPasswordModal?.classList.add('active');
        document.body.style.overflow = 'hidden'; // Impede scroll da página ao fundo
    }

    /** Fecha o modal de recuperação e limpa o formulário */
    function closeRecoveryModal() {
        forgotPasswordModal?.classList.remove('active');
        document.body.style.overflow = '';
        forgotPasswordForm?.reset();
    }

    // Abre o modal ao clicar no link
    forgotPasswordLink?.addEventListener('click', (e) => {
        e.preventDefault();
        openRecoveryModal();
    });

    // Fecha via botão "X"
    closeModal?.addEventListener('click', closeRecoveryModal);

    // Fecha via botão "Cancelar"
    cancelRecovery?.addEventListener('click', closeRecoveryModal);

    // Fecha ao clicar no backdrop (área fora da caixa do modal)
    forgotPasswordModal?.addEventListener('click', (e) => {
        if (e.target === forgotPasswordModal) closeRecoveryModal();
    });


    // =========================================================================
    // SUBMIT DO FORMULÁRIO DE RECUPERAÇÃO DE SENHA
    // Verifica se o usuário existe e simula o envio de instruções.
    // =========================================================================
    forgotPasswordForm?.addEventListener('submit', (e) => {
        e.preventDefault();

        const recoveryUsername = document.getElementById('recoveryUsername').value.trim();

        if (!recoveryUsername) {
            alert('Por favor, insira seu usuário');
            return;
        }

        const user = Storage.getUsuarios().find(u => u.usuario === recoveryUsername);

        if (!user) {
            alert('Usuário não encontrado!');
            return;
        }

        // Em produção, aqui seria feita a chamada ao backend para envio de e-mail
        console.log('[Login] Recuperação de senha solicitada para:', recoveryUsername);

        alert('Instruções de recuperação foram enviadas ao administrador. Entre em contato para resetar sua senha.');
        closeRecoveryModal();
    });


    // =========================================================================
    // ACESSIBILIDADE
    // =========================================================================

    // Fecha o modal ao pressionar Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && forgotPasswordModal?.classList.contains('active')) {
            closeRecoveryModal();
        }
    });

    // Foca automaticamente no campo de usuário ao carregar a página
    document.getElementById('username')?.focus();


    // =========================================================================
    // LOG DE DIAGNÓSTICO (desenvolvimento)
    // =========================================================================
    console.log('✅ Login inicializado');
    console.log('Usuários disponíveis:');
    console.log('  admin / admin            → ADMIN');
    console.log('  felipe.jorge / 123456   → SOLICITANTE');
    console.log('  thiago.santos / 123456  → TECNICO');
    console.log('  carlos.eduardo / 123456 → ADMINISTRATIVO');
    console.log('  robert.silva / 123456   → COMPRADOR');
});