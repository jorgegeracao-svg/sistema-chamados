// =============================================================================
// GERENCIADOR-USUARIOS.JS
// =============================================================================
(function () {

    function getUsuarios() { return JSON.parse(localStorage.getItem('usuarios') || '[]'); }
    function saveUsuarios(u) { localStorage.setItem('usuarios', JSON.stringify(u)); }

    const PERFIS = [
        { value: 'ADMIN',          label: 'Administrador'      },
        { value: 'SOLICITANTE',    label: 'Solicitante'        },
        { value: 'TECNICO',        label: 'Técnico'            },
        { value: 'ADMINISTRATIVO', label: 'Adm. de Manutenção' },
        { value: 'COMPRADOR',      label: 'Comprador'          },
        { value: 'GESTOR',         label: 'Gestor'             },
    ];

    function perfilLabel(p) { return (PERFIS.find(x => x.value === p) || {}).label || p; }
    function statusClass(s) { return s === 'Ativo' ? 'ativo' : s === 'Desligado' ? 'desligado' : 'inativo'; }
    function iniciais(nome) {
        const p = (nome || '').trim().split(' ');
        return p.length >= 2 ? (p[0][0] + p[p.length-1][0]).toUpperCase() : (nome||'??').substring(0,2).toUpperCase();
    }

    function abrirModal(id) { document.getElementById(id)?.classList.add('active'); document.body.style.overflow = 'hidden'; }
    function fecharModal(id) { document.getElementById(id)?.classList.remove('active'); document.body.style.overflow = ''; }

    // =========================================================================
    // PÁGINA PRINCIPAL
    // =========================================================================
    function renderUsuariosPage() {
        const container = document.getElementById('usuariosContainer');
        if (!container) return;

        const usuarios = getUsuarios();
        const ativos = usuarios.filter(u => u.status === 'Ativo').length;

        container.innerHTML = `
            <div class="usuarios-resumo">
                <div class="usuarios-resumo-card">
                    <div class="resumo-label">Total</div>
                    <div class="resumo-valor">${usuarios.length}</div>
                </div>
                <div class="usuarios-resumo-card card-ativos">
                    <div class="resumo-label">Ativos</div>
                    <div class="resumo-valor">${ativos}</div>
                </div>
                <div class="usuarios-resumo-card card-inativos">
                    <div class="resumo-label">Inativos / Desligados</div>
                    <div class="resumo-valor">${usuarios.length - ativos}</div>
                </div>
            </div>

            <div class="usuarios-filtros">
                <div class="filtro-busca">
                    <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input id="filtroUsuarios" type="text" placeholder="Buscar por nome, usuário ou RE...">
                </div>
                <select id="filtroPerfilUsuarios">
                    <option value="">Todos os perfis</option>
                    ${PERFIS.map(p => `<option value="${p.value}">${p.label}</option>`).join('')}
                </select>
                <select id="filtroStatusUsuarios">
                    <option value="">Todos os status</option>
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                    <option value="Desligado">Desligado</option>
                </select>
            </div>

            <div class="usuarios-tabela-wrapper">
                <div class="usuarios-tabela-header">
                    <span>Usuário</span>
                    <span>Perfil</span>
                    <span>RE</span>
                    <span>Status</span>
                    <span>Ações</span>
                </div>
                <div id="tabelaUsuarios"></div>
            </div>`;

        _renderTabela(usuarios);
        _bindFiltros();

        // Bind do botão Novo Usuário (que fica no page-header do index.html)
        const btnNovo = document.getElementById('btnNovoUsuario');
        if (btnNovo) {
            btnNovo.onclick = () => _abrirFormUsuario(null);
        }
    }

    // =========================================================================
    // TABELA
    // =========================================================================
    function _renderTabela(lista) {
        const el = document.getElementById('tabelaUsuarios');
        if (!el) return;
        if (!lista.length) {
            el.innerHTML = '<div class="usuarios-empty">Nenhum usuário encontrado.</div>';
            return;
        }
        el.innerHTML = lista.map(u => `
            <div class="usuarios-tabela-row">
                <div class="usuario-cell">
                    <div class="usuario-avatar">${iniciais(u.nomeCompleto)}</div>
                    <div class="usuario-info">
                        <div class="usuario-nome">${u.nomeCompleto || '—'}</div>
                        <div class="usuario-login">@${u.usuario}</div>
                    </div>
                </div>
                <div class="col-perfil">${perfilLabel(u.perfil)}</div>
                <div class="col-re">${u.re || '—'}</div>
                <div><span class="status-badge ${statusClass(u.status)}">${u.status || 'Ativo'}</span></div>
                <div class="col-acoes">
                    <button class="btn-acao editar" title="Editar" onclick="window._editarUsuario(${u.id})">
                        <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-acao senha" title="Redefinir senha" onclick="window._redefinirSenha(${u.id})">
                        <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </button>
                    ${u.status === 'Ativo'
                        ? `<button class="btn-acao desativar" title="Desativar" onclick="window._alterarStatus(${u.id},'Inativo')"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg></button>`
                        : `<button class="btn-acao reativar" title="Reativar" onclick="window._alterarStatus(${u.id},'Ativo')"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></button>`
                    }
                </div>
            </div>`).join('');
    }

    function _bindFiltros() {
        function aplicar() {
            const b = (document.getElementById('filtroUsuarios')?.value || '').toLowerCase();
            const p = document.getElementById('filtroPerfilUsuarios')?.value || '';
            const s = document.getElementById('filtroStatusUsuarios')?.value || '';
            _renderTabela(getUsuarios().filter(u =>
                (!b || (u.nomeCompleto||'').toLowerCase().includes(b) || (u.usuario||'').toLowerCase().includes(b) || (u.re||'').toLowerCase().includes(b)) &&
                (!p || u.perfil === p) && (!s || u.status === s)
            ));
        }
        document.getElementById('filtroUsuarios')?.addEventListener('input', aplicar);
        document.getElementById('filtroPerfilUsuarios')?.addEventListener('change', aplicar);
        document.getElementById('filtroStatusUsuarios')?.addEventListener('change', aplicar);
    }

    // =========================================================================
    // MODAL CRIAR / EDITAR
    // =========================================================================
    function _abrirFormUsuario(usuarioId) {
        const usuarios = getUsuarios();
        const u = usuarioId ? usuarios.find(x => x.id === usuarioId) : null;

        // Remove modal anterior se existir
        document.getElementById('modalUsuario')?.remove();

        const modal = document.createElement('div');
        modal.id = 'modalUsuario';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);

        modal.innerHTML = `
        <div class="modal-content" style="max-width:540px;">
            <div class="modal-header">
                <h3 class="modal-title">${u ? 'Editar Usuário' : 'Novo Usuário'}</h3>
                <button type="button" class="modal-close" id="fecharModalUsuario">
                    <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;max-height:65vh;overflow-y:auto;padding:4px 2px;">

                <div class="form-group" style="grid-column:1/-1;">
                    <label class="form-label required">Nome Completo</label>
                    <input type="text" id="uNome" class="form-input" placeholder="Nome completo" value="${u?.nomeCompleto || ''}">
                </div>

                <div class="form-group">
                    <label class="form-label required">Usuário (login)</label>
                    <input type="text" id="uUsuario" class="form-input" placeholder="nome.sobrenome"
                        value="${u?.usuario || ''}" ${u ? 'readonly style="background:var(--color-gray-100)"' : ''}>
                </div>

                <div class="form-group">
                    <label class="form-label required">RE (Matrícula)</label>
                    <input type="text" id="uRE" class="form-input" placeholder="12345" value="${u?.re || ''}">
                </div>

                ${!u ? `
                <div class="form-group">
                    <label class="form-label required">Senha</label>
                    <input type="password" id="uSenha" class="form-input" placeholder="Senha inicial">
                </div>
                <div class="form-group">
                    <label class="form-label required">Confirmar Senha</label>
                    <input type="password" id="uSenhaConf" class="form-input" placeholder="Repita a senha">
                </div>` : ''}

                <div class="form-group">
                    <label class="form-label required">Perfil</label>
                    <select id="uPerfil" class="form-input">
                        ${PERFIS.map(p => `<option value="${p.value}" ${u?.perfil === p.value ? 'selected' : ''}>${p.label}</option>`).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Cargo</label>
                    <input type="text" id="uCargo" class="form-input" placeholder="Ex: Técnico de Manutenção" value="${u?.cargo || ''}">
                </div>

                <div class="form-group" style="grid-column:1/-1;">
                    <label class="form-label">Local de Trabalho</label>
                    <input type="text" id="uLocal" class="form-input" placeholder="Ex: Manutenção" value="${u?.localTrabalho || ''}">
                </div>

                <div class="form-group">
                    <label class="form-label">Gestor</label>
                    <input type="text" id="uGestor" class="form-input" value="${u?.gestor || ''}">
                </div>

                <div class="form-group">
                    <label class="form-label">Gerente</label>
                    <input type="text" id="uGerente" class="form-input" value="${u?.gerente || ''}">
                </div>

                ${u ? `
                <div class="form-group">
                    <label class="form-label">Status</label>
                    <select id="uStatus" class="form-input">
                        <option value="Ativo"     ${u.status==='Ativo'     ?'selected':''}>Ativo</option>
                        <option value="Inativo"   ${u.status==='Inativo'   ?'selected':''}>Inativo</option>
                        <option value="Desligado" ${u.status==='Desligado' ?'selected':''}>Desligado</option>
                    </select>
                </div>` : ''}

                <div id="erroModalUsuario" style="display:none;grid-column:1/-1;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:10px 14px;font-size:13px;color:#dc2626;"></div>
            </div>

            <div class="modal-actions" style="margin-top:20px;">
                <button type="button" class="btn-cancel" id="cancelarModalUsuario">Cancelar</button>
                <button type="button" class="btn-submit" id="salvarUsuario">${u ? 'Salvar alterações' : 'Criar usuário'}</button>
            </div>
        </div>`;

        // Mostrar modal
        requestAnimationFrame(() => modal.classList.add('active'));
        document.body.style.overflow = 'hidden';

        document.getElementById('fecharModalUsuario').onclick   = () => fecharModal('modalUsuario');
        document.getElementById('cancelarModalUsuario').onclick = () => fecharModal('modalUsuario');
        modal.addEventListener('click', e => { if (e.target === modal) fecharModal('modalUsuario'); });
        document.getElementById('salvarUsuario').onclick = () => _salvarUsuario(usuarioId);
    }

    function _salvarUsuario(usuarioId) {
        const usuarios  = getUsuarios();
        const nome      = document.getElementById('uNome')?.value.trim();
        const usuario   = document.getElementById('uUsuario')?.value.trim();
        const re        = document.getElementById('uRE')?.value.trim();
        const perfil    = document.getElementById('uPerfil')?.value;
        const cargo     = document.getElementById('uCargo')?.value.trim();
        const local     = document.getElementById('uLocal')?.value.trim();
        const gestor    = document.getElementById('uGestor')?.value.trim();
        const gerente   = document.getElementById('uGerente')?.value.trim();
        const status    = document.getElementById('uStatus')?.value || 'Ativo';
        const senha     = document.getElementById('uSenha')?.value;
        const senhaConf = document.getElementById('uSenhaConf')?.value;

        const erroEl = document.getElementById('erroModalUsuario');
        function erro(msg) { erroEl.textContent = msg; erroEl.style.display = 'block'; }
        erroEl.style.display = 'none';

        if (!nome)    return erro('Nome completo é obrigatório.');
        if (!usuario) return erro('Usuário (login) é obrigatório.');
        if (!re)      return erro('RE (matrícula) é obrigatório.');
        if (!perfil)  return erro('Selecione um perfil.');
        if (!usuarioId) {
            if (!senha)              return erro('Senha é obrigatória.');
            if (senha !== senhaConf) return erro('As senhas não coincidem.');
            if (senha.length < 4)   return erro('Mínimo 4 caracteres na senha.');
            if (usuarios.find(u => u.usuario === usuario)) return erro('Esse usuário (login) já existe.');
        }

        if (usuarioId) {
            const idx = usuarios.findIndex(u => u.id === usuarioId);
            if (idx !== -1) usuarios[idx] = { ...usuarios[idx], nomeCompleto: nome, re, perfil, cargo, localTrabalho: local, gestor, gerente, status };
        } else {
            const novoId = Math.max(0, ...usuarios.map(u => u.id || 0)) + 1;
            usuarios.push({ id: novoId, nomeCompleto: nome, re, cargo, localTrabalho: local, gestor, gerente, perfil, status: 'Ativo', usuario, senha, foto: null, dataCadastro: new Date().toISOString() });
        }

        saveUsuarios(usuarios);
        fecharModal('modalUsuario');
        renderUsuariosPage();
        _toast(usuarioId ? 'Usuário atualizado!' : 'Usuário criado com sucesso!');
    }

    // =========================================================================
    // MODAL REDEFINIR SENHA
    // =========================================================================
    function _abrirRedefinirSenha(usuarioId) {
        const u = getUsuarios().find(x => x.id === usuarioId);
        if (!u) return;

        document.getElementById('modalRedefinirSenha')?.remove();
        const modal = document.createElement('div');
        modal.id = 'modalRedefinirSenha';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);

        modal.innerHTML = `
        <div class="modal-content" style="max-width:400px;">
            <div class="modal-header">
                <h3 class="modal-title">Redefinir Senha</h3>
                <button type="button" class="modal-close" id="fecharModalSenha">
                    <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <p class="modal-description">Nova senha para <strong>${u.nomeCompleto}</strong> (@${u.usuario})</p>
            <div style="display:flex;flex-direction:column;gap:14px;margin-top:8px;">
                <div class="form-group">
                    <label class="form-label">Nova Senha</label>
                    <input type="password" id="novaSenha" class="form-input" placeholder="Mínimo 4 caracteres">
                </div>
                <div class="form-group">
                    <label class="form-label">Confirmar Nova Senha</label>
                    <input type="password" id="novaSenhaConf" class="form-input" placeholder="Repita a senha">
                </div>
                <div id="erroSenha" style="display:none;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:10px 14px;font-size:13px;color:#dc2626;"></div>
            </div>
            <div class="modal-actions" style="margin-top:20px;">
                <button type="button" class="btn-cancel" id="cancelarSenha">Cancelar</button>
                <button type="button" class="btn-submit" id="confirmarSenha">Salvar nova senha</button>
            </div>
        </div>`;

        requestAnimationFrame(() => modal.classList.add('active'));
        document.body.style.overflow = 'hidden';

        document.getElementById('fecharModalSenha').onclick = () => fecharModal('modalRedefinirSenha');
        document.getElementById('cancelarSenha').onclick    = () => fecharModal('modalRedefinirSenha');
        modal.addEventListener('click', e => { if (e.target === modal) fecharModal('modalRedefinirSenha'); });
        document.getElementById('confirmarSenha').onclick = () => {
            const nova   = document.getElementById('novaSenha')?.value;
            const conf   = document.getElementById('novaSenhaConf')?.value;
            const erroEl = document.getElementById('erroSenha');
            erroEl.style.display = 'none';
            if (!nova || nova.length < 4) { erroEl.textContent = 'Mínimo 4 caracteres.'; erroEl.style.display = 'block'; return; }
            if (nova !== conf)            { erroEl.textContent = 'As senhas não coincidem.'; erroEl.style.display = 'block'; return; }
            const us = getUsuarios();
            const idx = us.findIndex(x => x.id === usuarioId);
            if (idx !== -1) { us[idx].senha = nova; saveUsuarios(us); }
            fecharModal('modalRedefinirSenha');
            _toast('Senha redefinida com sucesso!');
        };
    }

    // =========================================================================
    // ALTERAR STATUS
    // =========================================================================
    function _alterarStatus(usuarioId, novoStatus) {
        const usuarios = getUsuarios();
        const u = usuarios.find(x => x.id === usuarioId);
        if (!u) return;
        if (!confirm(`Deseja ${novoStatus === 'Ativo' ? 'reativar' : 'desativar'} "${u.nomeCompleto}"?`)) return;
        u.status = novoStatus;
        saveUsuarios(usuarios);
        renderUsuariosPage();
    }

    // =========================================================================
    // TOAST
    // =========================================================================
    function _toast(msg) {
        let t = document.getElementById('toastGerUsuarios');
        if (!t) {
            t = document.createElement('div');
            t.id = 'toastGerUsuarios';
            t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(12px);background:#1f2937;color:#fff;font-size:13px;font-weight:600;padding:10px 20px;border-radius:20px;box-shadow:0 4px 14px rgba(0,0,0,.25);opacity:0;transition:opacity .2s,transform .2s;pointer-events:none;z-index:9999;white-space:nowrap;';
            document.body.appendChild(t);
        }
        t.textContent = '✓ ' + msg;
        t.style.opacity = '1';
        t.style.transform = 'translateX(-50%) translateY(0)';
        clearTimeout(t._t);
        t._t = setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(12px)'; }, 2500);
    }

    // =========================================================================
    // GLOBAL
    // =========================================================================
    window.renderUsuariosPage = renderUsuariosPage;
    window._editarUsuario     = (id) => _abrirFormUsuario(id);
    window._redefinirSenha    = (id) => _abrirRedefinirSenha(id);
    window._alterarStatus     = (id, status) => _alterarStatus(id, status);

    // Fallback: listener global para o botão caso o bind direto não pegue
    document.addEventListener('click', e => {
        if (e.target.closest('#btnNovoUsuario')) _abrirFormUsuario(null);
    });

})();