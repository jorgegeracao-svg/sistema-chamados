// =============================================================================
// RENDERIZADOR-ETAPAS.JS — Renderização de formulários e dados de cada etapa
//
// PADRÃO DE OBSERVAÇÃO:
//   Toda etapa/subetapa tem um campo "Observação" salvo em etapa.dados.observacao.
//   Quando concluída, exibe o valor salvo (ou "Sem observação." se vazio).
//   Cada etapa pode ter campos adicionais específicos além da observação.
// =============================================================================

// Converte arquivos de um <input type="file"> para base64.
function lerArquivosBase64(fileInput) {
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        return Promise.resolve([]);
    }
    const promessas = Array.from(fileInput.files).map(file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve({ nome: file.name, tipo: file.type, tamanho: file.size, dados: e.target.result });
        reader.onerror = () => reject(new Error('Erro ao ler: ' + file.name));
        reader.readAsDataURL(file);
    }));
    return Promise.all(promessas);
}


// =============================================================================
// HELPERS COMPARTILHADOS
// =============================================================================

/** Bloco de observação em modo leitura */
function _htmlObsLeitura(obs, label = 'Observação') {
    if (!obs || !obs.trim()) {
        return `<div class="dado-item dado-obs-vazia">
            <span class="dado-label">${label}:</span>
            <span class="dado-valor dado-valor-vazio" style="color:#9ca3af;font-style:italic;">Sem observação.</span>
        </div>`;
    }
    return `<div class="dado-item">
        <span class="dado-label">${label}:</span>
        <span class="dado-valor">${obs.replace(/\n/g, '<br>')}</span>
    </div>`;
}

/** Campo textarea de observação para formulários */
function _htmlObsCampo(id, label = 'Observação', placeholder = 'Adicione observações relevantes...') {
    return `
        <div class="form-group-etapa">
            <label class="form-label-etapa">${label}</label>
            <textarea class="form-textarea-etapa" id="${id}" rows="3" placeholder="${placeholder}"></textarea>
        </div>`;
}

/** Campo de upload de arquivo padronizado */
function _htmlUpload(inputId, nameId, label = 'Anexos (Opcional)', accept = '.pdf,.jpg,.png', multiple = false) {
    return `
        <div class="form-group-etapa">
            <label class="form-label-etapa">${label}</label>
            <div class="file-upload-etapa">
                <label for="${inputId}" class="file-upload-btn-etapa">
                    <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    Anexar
                </label>
                <input type="file" id="${inputId}" style="display:none;" accept="${accept}" ${multiple ? 'multiple' : ''}>
                <span class="file-name-etapa" id="${nameId}">Nenhum arquivo</span>
            </div>
        </div>`;
}

/** Instala listener de exibição de nome no input de arquivo */
function _bindFileLabel(inputId, nameId) {
    const input = document.getElementById(inputId);
    const label = document.getElementById(nameId);
    if (!input || !label) return;
    input.addEventListener('change', () => {
        label.textContent = input.files.length > 0 ? `${input.files.length} arquivo(s)` : 'Nenhum arquivo';
    });
}

/** Bloco de contexto de etapas anteriores */
function _htmlContexto(titulo, itens) {
    const linhas = itens.filter(Boolean).map(([l, v]) =>
        `<div class="etapa-contexto-item">
            <span class="etapa-contexto-label">${l}</span>
            <span class="etapa-contexto-valor">${v}</span>
        </div>`
    ).join('');
    if (!linhas) return '';
    return `<div class="etapa-contexto">
        <div class="etapa-contexto-titulo">${titulo}</div>
        ${linhas}
    </div>`;
}


// =============================================================================
// CLASSE RENDERIZADOREDITAPAS
// =============================================================================

class RenderizadorEtapas {
    constructor(containerId, chamado, usuario) {
        this.container = document.getElementById(containerId);
        this.chamado   = chamado;
        this.usuario   = usuario;
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';

        if (this.chamado.status === 'FINALIZADO') {
            this.container.appendChild(this.criarBannerFinalizado());
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'etapas-container';
        this.chamado.etapas.forEach(e => wrapper.appendChild(this.renderEtapa(e)));
        this.container.appendChild(wrapper);
    }

    criarBannerFinalizado() {
        const b = document.createElement('div');
        b.className = 'chamado-finalizado-banner';
        b.innerHTML = `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Chamado Finalizado com Sucesso!</span>`;
        return b;
    }

    renderEtapa(etapa) {
        const card = document.createElement('div');
        card.className = `etapa-card ${etapa.expandida ? 'expandida' : ''} ${etapa.status === 'CONCLUIDA' ? 'concluida' : ''}`;
        card.dataset.etapaNumero = etapa.numero;
        card.appendChild(this._criarHeader(etapa));
        card.appendChild(this._criarConteudo(etapa));
        return card;
    }

    _criarHeader(etapa) {
        const h = document.createElement('div');
        h.className = 'etapa-header';
        const cat = { SOLICITANTE: 'Solicitante', ADMINISTRATIVO: 'Administração', TECNICO: 'Técnico', COMPRADOR: 'Comprador', GESTOR: 'Gestor' }[etapa.categoria] || etapa.categoria;
        h.innerHTML = `
            <div class="etapa-header-left">
                <div class="etapa-numero">${etapa.numero}</div>
                <div class="etapa-info">
                    <div class="etapa-titulo">${etapa.titulo}</div>
                    <div class="etapa-meta">
                        <span class="etapa-status ${etapa.status === 'CONCLUIDA' ? 'concluida' : 'em-andamento'}">${etapa.status === 'CONCLUIDA' ? 'Concluída' : 'Em Andamento'}</span>
                        <span class="etapa-categoria">Responsável: ${cat}</span>
                    </div>
                    ${etapa.conclusao ? `<div class="etapa-conclusao"><strong>${etapa.conclusao.usuario}</strong> • ${this.fmtDH(etapa.conclusao.dataHora)}</div>` : ''}
                </div>
            </div>
            <button class="etapa-toggle" onclick="window.toggleEtapa(${etapa.numero})">
                <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>`;
        return h;
    }

    _criarConteudo(etapa) {
        const c = document.createElement('div');
        c.className = 'etapa-conteudo';
        const i = document.createElement('div');
        i.className = 'etapa-conteudo-inner';
        const map = { 1: 'Et1', 2: 'Et2', 3: 'Et3', 4: 'Et4', 5: 'Et5', 6: 'Et6', 7: 'Et7', 8: 'Et8', 9: 'Et9', 10: 'Et10', 11: 'Et11', 12: 'Et12' };
        const fn = map[parseInt(etapa.numero)];
        if (fn) i.appendChild(this[`_render${fn}`](etapa));
        c.appendChild(i);
        return c;
    }

    // =========================================================================
    // ETAPA 1 — ABERTURA DO CHAMADO (somente leitura)
    // =========================================================================
    _renderEt1(etapa) {
        const d = etapa.dados || {};
        const div = document.createElement('div');
        div.innerHTML = `
            ${d.unidade        ? `<div class="dado-item"><span class="dado-label">Unidade / Local:</span><span class="dado-valor">${d.unidade}</span></div>` : ''}
            ${d.tipoManutencao ? `<div class="dado-item"><span class="dado-label">Tipo de Manutenção:</span><span class="dado-valor">${d.tipoManutencao}</span></div>` : ''}
            ${d.email          ? `<div class="dado-item"><span class="dado-label">E-mail:</span><span class="dado-valor">${d.email}</span></div>` : ''}
            ${d.contato        ? `<div class="dado-item"><span class="dado-label">Contato:</span><span class="dado-valor">${d.contato}</span></div>` : ''}
            ${_htmlObsLeitura(d.observacao)}
        `;
        return div;
    }

    // =========================================================================
    // ETAPA 2 — AGENDAMENTO DA AVALIAÇÃO
    // =========================================================================
    _renderEt2(etapa) {
        const div = document.createElement('div');

        if (etapa.status === 'CONCLUIDA') {
            const d = etapa.dados || {};
            div.innerHTML = `
                ${d.dataAgendamento ? `<div class="dado-item"><span class="dado-label">Data:</span><span class="dado-valor">${this.fmtD(d.dataAgendamento)}</span></div>` : ''}
                ${d.horaAgendamento ? `<div class="dado-item"><span class="dado-label">Horário:</span><span class="dado-valor">${d.horaAgendamento}</span></div>` : ''}
                ${_htmlObsLeitura(d.observacao, 'Mensagem ao Solicitante')}
            `;
            return div;
        }

        if (!['ADMINISTRATIVO', 'ADMIN'].includes(this.usuario.perfil)) {
            div.innerHTML = '<p class="etapa-aguardando">Aguardando agendamento pela Administração...</p>';
            return div;
        }

        // Histórico de reprovações — exibido quando a Et.2 foi reaberta após reprovação na Et.3
        if (etapa.dados?.remarcacao && etapa.historicoReprovacoes?.length) {
            const historicoHtml = etapa.historicoReprovacoes.map((r, i) => `
                <div class="reprovacao-item">
                    <div class="reprovacao-cabecalho">
                        <span class="reprovacao-badge">Tentativa ${i + 1}</span>
                        <span class="reprovacao-meta">${r.usuario} • ${this.fmtDH(r.dataHora)}</span>
                    </div>

                    ${etapa.dados?.dataAgendamento && i === etapa.historicoReprovacoes.length - 1 ? `
                        <div class="reprovacao-agendamento">
                            <span>📅 Agendamento reprovado: <strong>${this.fmtD(etapa.dados.dataAgendamento)}</strong> às <strong>${etapa.dados.horaAgendamento || '—'}</strong></span>
                        </div>` : ''}
                </div>`).join('');

            const historicoBloco = document.createElement('div');
            historicoBloco.className = 'historico-reprovacoes';
            historicoBloco.innerHTML = `
                <div class="historico-reprovacoes-titulo">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Histórico de Reprovações (${etapa.historicoReprovacoes.length})
                </div>
                ${historicoHtml}`;
            div.appendChild(historicoBloco);
        }

        div.innerHTML += `
            <form class="etapa-form" id="form-et2">
                <div class="etapa-form-row2">
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Data do Agendamento</label>
                        <input type="date" class="form-input-etapa" id="et2-data" required>
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Horário</label>
                        <input type="time" class="form-input-etapa" id="et2-hora" required>
                    </div>
                </div>
                ${_htmlObsCampo('et2-obs', 'Mensagem para o Solicitante', 'Instruções para o solicitante confirmar o agendamento...')}
                <div class="etapa-acoes">
                    <button type="submit" class="btn-etapa btn-etapa-primary">
                        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Confirmar Agendamento
                    </button>
                </div>
            </form>`;

        setTimeout(() => {
            document.getElementById('form-et2')?.addEventListener('submit', e => {
                e.preventDefault();
                const data = document.getElementById('et2-data').value;
                const hora = document.getElementById('et2-hora').value;
                const obs  = document.getElementById('et2-obs').value.trim();
                if (data && hora) {
                    this.chamado.concluirEtapa2(data, hora, obs, this.usuario);
                    window.gerenciadorChamados.atualizarChamado(this.chamado);
                    this.render();
                }
            });
        }, 0);

        return div;
    }

    // =========================================================================
    // ETAPA 3 — CONFIRMAÇÃO DA AVALIAÇÃO
    // =========================================================================
    _renderEt3(etapa) {
        const div = document.createElement('div');

        if (etapa.status === 'CONCLUIDA') {
            const d = etapa.dados || {};
            div.innerHTML = `
                <div class="dado-item">
                    <span class="dado-label">Decisão:</span>
                    <span class="dado-valor">${d.decisao === 'APROVADO' ? '✓ Confirmado' : '✗ Reprovado / Remarcado'}</span>
                </div>
                ${_htmlObsLeitura(d.motivo || d.observacao)}
            `;
            return div;
        }

        if (!['SOLICITANTE', 'ADMIN'].includes(this.usuario.perfil)) {
            div.innerHTML = '<p class="etapa-aguardando">Aguardando confirmação do Solicitante...</p>';
            return div;
        }

        // Contexto: agendamento proposto
        const et2 = this.chamado.etapas.find(e => e.numero === 2);
        const ctx = et2?.dados?.dataAgendamento ? _htmlContexto('Agendamento Proposto', [
            ['Data',    this.fmtD(et2.dados.dataAgendamento)],
            ['Horário', et2.dados.horaAgendamento || '-'],
            et2.dados.observacao ? ['Mensagem ADM', et2.dados.observacao] : null,
        ].filter(Boolean)) : '';

        div.innerHTML = `
            ${ctx}
            <form class="etapa-form" id="form-et3">
                ${_htmlObsCampo('et3-obs', 'Observação', 'Informe o motivo caso queira reprovar e remarcar o agendamento...')}
                <div class="etapa-acoes">
                    <button type="button" class="btn-etapa btn-etapa-danger" id="btnReprovar3">
                        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        Reprovar — Remarcar
                    </button>
                    <button type="submit" class="btn-etapa btn-etapa-success">
                        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Confirmar Agendamento
                    </button>
                </div>
            </form>`;

        setTimeout(() => {
            const obsEl = document.getElementById('et3-obs');
            document.getElementById('form-et3')?.addEventListener('submit', e => {
                e.preventDefault();
                this.chamado.confirmarEtapa3(true, obsEl?.value?.trim() || '', this.usuario);
                window.gerenciadorChamados.atualizarChamado(this.chamado);
                this.render();
            });
            document.getElementById('btnReprovar3')?.addEventListener('click', () => {
                const motivo = obsEl?.value?.trim() || '';
                if (!motivo) { obsEl.focus(); obsEl.style.borderColor = 'var(--color-danger)'; return; }
                this.chamado.confirmarEtapa3(false, motivo, this.usuario);
                window.gerenciadorChamados.atualizarChamado(this.chamado);
                this.render();
            });
        }, 0);

        return div;
    }

    // =========================================================================
    // ETAPA 4 — COMUNICAR O TÉCNICO
    // =========================================================================
    _renderEt4(etapa) {
        const div = document.createElement('div');

        if (etapa.status === 'CONCLUIDA' || etapa.status === 'AGUARDANDO_CONFIRMACAO') {
            const d = etapa.dados || {};
            div.innerHTML = `
                ${d.tecnicoNome   ? `<div class="dado-item"><span class="dado-label">Técnico:</span><span class="dado-valor">${d.tecnicoNome}</span></div>` : ''}
                ${d.dataAvaliacao ? `<div class="dado-item"><span class="dado-label">Data da Avaliação:</span><span class="dado-valor">${this.fmtD(d.dataAvaliacao)}</span></div>` : ''}
                ${d.horaAvaliacao ? `<div class="dado-item"><span class="dado-label">Horário:</span><span class="dado-valor">${d.horaAvaliacao}</span></div>` : ''}
                ${_htmlObsLeitura(d.observacao, 'Mensagem ao Técnico')}
            `;

            if (etapa.status === 'AGUARDANDO_CONFIRMACAO' && ['TECNICO', 'ADMIN'].includes(this.usuario.perfil)) {
                const w = document.createElement('div');
                w.style.marginTop = '14px';
                w.innerHTML = `
                    <p style="font-size:13px;color:#92400e;margin-bottom:10px;">⏳ Aguardando sua confirmação de recebimento.</p>
                    <button class="btn-etapa btn-etapa-primary" id="btnConf4">
                        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Confirmar Recebimento
                    </button>`;
                div.appendChild(w);
                setTimeout(() => {
                    document.getElementById('btnConf4')?.addEventListener('click', () => {
                        this.chamado.tecnicoConfirmarEtapa4(this.usuario);
                        window.gerenciadorChamados.atualizarChamado(this.chamado);
                        this.render();
                    });
                }, 0);
            }
            return div;
        }

        if (!['ADMINISTRATIVO', 'ADMIN'].includes(this.usuario.perfil)) {
            div.innerHTML = '<p class="etapa-aguardando">Aguardando comunicação ao técnico...</p>';
            return div;
        }

        const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
        const tecs = usuarios.filter(u => u.status !== 'Desligado' && u.status !== 'Inativo' && (u.perfil === 'TECNICO' || u.perfil === 'ADMIN'));
        const opts = tecs.map(t => `<option value="${t.id}" data-nome="${t.nomeCompleto}" data-usuario="${t.usuario}">${t.nomeCompleto} (${t.usuario})</option>`).join('');

        div.innerHTML = `
            <form class="etapa-form" id="form-et4">
                <div class="form-group-etapa">
                    <label class="form-label-etapa required">Técnico Responsável</label>
                    <select class="form-select-etapa" id="et4-tec" required>
                        <option value="">Selecione o técnico...</option>${opts}
                    </select>
                </div>
                <div class="etapa-form-row2">
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Data da Avaliação</label>
                        <input type="date" class="form-input-etapa" id="et4-data" required>
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Horário</label>
                        <input type="time" class="form-input-etapa" id="et4-hora" required>
                    </div>
                </div>
                ${_htmlObsCampo('et4-obs', 'Mensagem ao Técnico', 'Instruções ou informações adicionais para o técnico...')}
                <div class="etapa-acoes">
                    <button type="submit" class="btn-etapa btn-etapa-primary">
                        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Comunicar Técnico
                    </button>
                </div>
            </form>`;

        setTimeout(() => {
            document.getElementById('form-et4')?.addEventListener('submit', e => {
                e.preventDefault();
                const sel  = document.getElementById('et4-tec');
                const nome = sel.options[sel.selectedIndex]?.dataset.nome || '';
                const user = sel.options[sel.selectedIndex]?.dataset.usuario || '';
                const data = document.getElementById('et4-data').value;
                const hora = document.getElementById('et4-hora').value;
                const obs  = document.getElementById('et4-obs').value.trim();
                if (sel.value && data && hora) {
                    this.chamado.selecionarTecnicoEtapa4(user, nome, obs, this.usuario);
                    const et = this.chamado._getEtapa(4);
                    if (et) { et.dados.dataAvaliacao = data; et.dados.horaAvaliacao = hora; }
                    window.gerenciadorChamados.atualizarChamado(this.chamado);
                    this.render();
                }
            });
        }, 0);

        return div;
    }

    // =========================================================================
    // ETAPA 5 — AVALIAÇÃO TÉCNICA (subetapas 5.1 e 5.2)
    // =========================================================================
    _renderEt5(etapa) {
        const div = document.createElement('div');
        const w = document.createElement('div');
        w.className = 'subetapas-container';
        (etapa.subetapas || []).forEach(s => w.appendChild(this._renderSub(s)));
        div.appendChild(w);
        return div;
    }

    _renderSub51(sub) {
        const div = document.createElement('div');
        if (sub.status === 'CONCLUIDA') {
            const d = sub.dados || {};
            div.innerHTML = `
                ${d.dataInicio ? `<div class="dado-item"><span class="dado-label">Data:</span><span class="dado-valor">${this.fmtD(d.dataInicio)}</span></div>` : ''}
                ${d.horaInicio ? `<div class="dado-item"><span class="dado-label">Horário:</span><span class="dado-valor">${d.horaInicio}</span></div>` : ''}
                ${_htmlObsLeitura(d.observacao || d.observacaoInicio)}
                ${sub.conclusao ? `<p class="etapa-conclusao-info">Registrado por <strong>${sub.conclusao.usuario}</strong> em ${this.fmtDH(sub.conclusao.dataHora)}</p>` : ''}`;
            return div;
        }
        if (!['TECNICO', 'ADMIN'].includes(this.usuario.perfil)) {
            div.innerHTML = '<p class="etapa-aguardando">Aguardando início da avaliação pelo Técnico...</p>';
            return div;
        }
        div.innerHTML = `
            <form class="etapa-form" id="form-s51">
                <div class="etapa-form-row2">
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Data</label>
                        <input type="date" class="form-input-etapa" id="s51-data" required>
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Horário</label>
                        <input type="time" class="form-input-etapa" id="s51-hora" required>
                    </div>
                </div>
                ${_htmlObsCampo('s51-obs', 'Observação', 'Condições iniciais, acessos necessários...')}
                <div class="etapa-acoes">
                    <button type="submit" class="btn-etapa btn-etapa-primary">
                        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Registrar Início da Avaliação
                    </button>
                </div>
            </form>`;
        setTimeout(() => {
            document.getElementById('form-s51')?.addEventListener('submit', e => {
                e.preventDefault();
                const data = document.getElementById('s51-data').value;
                const hora = document.getElementById('s51-hora').value;
                const obs  = document.getElementById('s51-obs').value.trim();
                if (data && hora) {
                    this.chamado.concluirSubetapa51(data, hora, obs, this.usuario);
                    window.gerenciadorChamados.atualizarChamado(this.chamado);
                    this.render();
                }
            });
        }, 0);
        return div;
    }

    _renderSub52(sub) {
        const div = document.createElement('div');
        if (sub.status === 'CONCLUIDA') {
            const d = sub.dados || {};
            div.innerHTML = `
                ${d.dataTermino          ? `<div class="dado-item"><span class="dado-label">Data:</span><span class="dado-valor">${this.fmtD(d.dataTermino)}</span></div>` : ''}
                ${d.horaTermino          ? `<div class="dado-item"><span class="dado-label">Horário:</span><span class="dado-valor">${d.horaTermino}</span></div>` : ''}
                ${d.diagnostico          ? `<div class="dado-item"><span class="dado-label">Diagnóstico:</span><span class="dado-valor">${d.diagnostico.replace(/\n/g,'<br>')}</span></div>` : ''}
                ${d.materiaisNecessarios ? `<div class="dado-item"><span class="dado-label">Materiais Necessários:</span><span class="dado-valor">${d.materiaisNecessarios}</span></div>` : ''}
                ${_htmlObsLeitura(d.observacao)}
                ${sub.conclusao ? `<p class="etapa-conclusao-info">Registrado por <strong>${sub.conclusao.usuario}</strong> em ${this.fmtDH(sub.conclusao.dataHora)}</p>` : ''}`;
            return div;
        }
        if (!['TECNICO', 'ADMIN'].includes(this.usuario.perfil)) {
            div.innerHTML = '<p class="etapa-aguardando">Aguardando término da avaliação pelo Técnico...</p>';
            return div;
        }
        div.innerHTML = `
            <form class="etapa-form" id="form-s52">
                <div class="etapa-form-row2">
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Data</label>
                        <input type="date" class="form-input-etapa" id="s52-data" required>
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Horário</label>
                        <input type="time" class="form-input-etapa" id="s52-hora" required>
                    </div>
                </div>
                <div class="form-group-etapa">
                    <label class="form-label-etapa required">Diagnóstico Técnico</label>
                    <textarea class="form-textarea-etapa" id="s52-diag" rows="4" required
                        placeholder="Descreva o problema identificado e a causa..."></textarea>
                </div>
                <div class="form-group-etapa">
                    <label class="form-label-etapa">Materiais / Peças Necessárias</label>
                    <textarea class="form-textarea-etapa" id="s52-mat" rows="2"
                        placeholder="Liste os materiais necessários para o reparo..."></textarea>
                </div>
                ${_htmlObsCampo('s52-obs', 'Observação', 'Informações adicionais sobre a avaliação...')}
                <div class="etapa-acoes">
                    <button type="submit" class="btn-etapa btn-etapa-primary">
                        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Registrar Término da Avaliação
                    </button>
                </div>
            </form>`;
        setTimeout(() => {
            document.getElementById('form-s52')?.addEventListener('submit', e => {
                e.preventDefault();
                const data = document.getElementById('s52-data').value;
                const hora = document.getElementById('s52-hora').value;
                const diag = document.getElementById('s52-diag').value.trim();
                const mat  = document.getElementById('s52-mat').value.trim();
                const obs  = document.getElementById('s52-obs').value.trim();
                if (data && hora && diag) {
                    this.chamado.concluirSubetapa52(data, hora, diag, mat, obs, this.usuario);
                    window.gerenciadorChamados.atualizarChamado(this.chamado);
                    this.render();
                }
            });
        }, 0);
        return div;
    }

    // =========================================================================
    // ETAPA 6 — VERIFICAÇÃO DE ESTOQUE
    // =========================================================================
    _renderEt6(etapa) {
        const div = document.createElement('div');
        const et5 = this.chamado.etapas.find(e => e.numero === 5);
        const s52 = et5?.subetapas?.find(s => Math.abs(s.numero - 5.2) < 0.001);
        if (s52?.status === 'CONCLUIDA' && s52.dados?.diagnostico) {
            div.innerHTML = _htmlContexto('Diagnóstico da Avaliação (5.2)', [
                ['Problema', s52.dados.diagnostico],
                s52.dados.materiaisNecessarios ? ['Materiais necessários', s52.dados.materiaisNecessarios] : null,
            ].filter(Boolean));
        }

        if (etapa.status === 'CONCLUIDA') {
            const d = etapa.dados || {};
            div.innerHTML += `
                <div class="dado-item">
                    <span class="dado-label">Tem estoque disponível?</span>
                    <span class="dado-valor">${d.temEstoque === 'SIM' ? '✓ Sim — prossegue para programação' : '✗ Não — inicia processo de compra'}</span>
                </div>
                ${_htmlObsLeitura(d.observacao)}`;
            return div;
        }

        if (!['TECNICO', 'ADMIN'].includes(this.usuario.perfil)) {
            div.innerHTML += '<p class="etapa-aguardando">Aguardando verificação de estoque pelo Técnico...</p>';
            return div;
        }

        div.innerHTML += `
            <form class="etapa-form" id="form-et6">
                <div class="form-group-etapa">
                    <label class="form-label-etapa required">Tem estoque disponível?</label>
                    <select class="form-select-etapa" id="et6-estoque" required>
                        <option value="">Selecione...</option>
                        <option value="SIM">Sim — há estoque, não precisa comprar</option>
                        <option value="NAO">Não — é necessário comprar</option>
                    </select>
                </div>
                ${_htmlObsCampo('et6-obs', 'Observação', 'Itens disponíveis, localização no estoque, ou justificativa da compra...')}
                <div class="etapa-acoes">
                    <button type="submit" class="btn-etapa btn-etapa-primary">
                        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Confirmar Verificação
                    </button>
                </div>
            </form>`;

        setTimeout(() => {
            document.getElementById('form-et6')?.addEventListener('submit', e => {
                e.preventDefault();
                const estoque = document.getElementById('et6-estoque').value;
                const obs     = document.getElementById('et6-obs').value.trim();
                if (estoque) {
                    this.chamado.concluirEtapa6VerificacaoEstoque(estoque, obs, this.usuario);
                    window.gerenciadorChamados.atualizarChamado(this.chamado);
                    this.render();
                }
            });
        }, 0);

        return div;
    }

    // =========================================================================
    // ETAPA 7 — PROCESSO DE COMPRA (subetapas 7.1, 7.2, 7.3)
    // =========================================================================
    _renderEt7(etapa) {
        const div = document.createElement('div');
        const w = document.createElement('div');
        w.className = 'subetapas-container';
        (etapa.subetapas || []).forEach(s => w.appendChild(this._renderSub(s)));
        div.appendChild(w);
        return div;
    }

    _renderSub71(sub) {
        const div = document.createElement('div');
        if (sub.status === 'CONCLUIDA') {
            const d = sub.dados || {};
            div.innerHTML = `
                ${d.itens         ? `<div class="dado-item"><span class="dado-label">Itens:</span><span class="dado-valor">${d.itens.replace(/\n/g,'<br>')}</span></div>` : ''}
                ${d.justificativa ? `<div class="dado-item"><span class="dado-label">Justificativa:</span><span class="dado-valor">${d.justificativa}</span></div>` : ''}
                ${d.urgencia      ? `<div class="dado-item"><span class="dado-label">Urgência:</span><span class="dado-valor">${d.urgencia}</span></div>` : ''}
                ${_htmlObsLeitura(d.observacao)}
                ${sub.conclusao ? `<p class="etapa-conclusao-info">Por <strong>${sub.conclusao.usuario}</strong> em ${this.fmtDH(sub.conclusao.dataHora)}</p>` : ''}`;
            return div;
        }
        if (!['ADMINISTRATIVO', 'ADMIN'].includes(this.usuario.perfil)) {
            div.innerHTML = '<p class="etapa-aguardando">Aguardando solicitação de compra pela Administração...</p>';
            return div;
        }
        div.innerHTML = `
            <form class="etapa-form" id="form-s71">
                <div class="form-group-etapa">
                    <label class="form-label-etapa required">Itens a Comprar</label>
                    <textarea class="form-textarea-etapa" id="s71-itens" required rows="3"
                        placeholder="Liste os itens, quantidades e especificações..."></textarea>
                </div>
                <div class="form-group-etapa">
                    <label class="form-label-etapa required">Justificativa</label>
                    <textarea class="form-textarea-etapa" id="s71-just" required rows="2"
                        placeholder="Justifique a necessidade da compra..."></textarea>
                </div>
                <div class="form-group-etapa">
                    <label class="form-label-etapa required">Urgência</label>
                    <select class="form-select-etapa" id="s71-urg" required>
                        <option value="">Selecione...</option>
                        <option value="Baixa">Baixa</option>
                        <option value="Média">Média</option>
                        <option value="Alta">Alta</option>
                        <option value="Urgente">Urgente</option>
                    </select>
                </div>
                ${_htmlObsCampo('s71-obs', 'Observação', 'Informações adicionais sobre a solicitação...')}
                <div class="etapa-acoes">
                    <button type="submit" class="btn-etapa btn-etapa-primary">
                        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Enviar Solicitação
                    </button>
                </div>
            </form>`;
        setTimeout(() => {
            document.getElementById('form-s71')?.addEventListener('submit', e => {
                e.preventDefault();
                const itens = document.getElementById('s71-itens').value.trim();
                const just  = document.getElementById('s71-just').value.trim();
                const urg   = document.getElementById('s71-urg').value;
                const obs   = document.getElementById('s71-obs').value.trim();
                if (itens && just && urg) {
                    this.chamado.concluirSubetapa71(itens, just, urg, obs, this.usuario);
                    window.gerenciadorChamados.atualizarChamado(this.chamado);
                    this.render();
                }
            });
        }, 0);
        return div;
    }

    _renderSub72(sub) {
        const div = document.createElement('div');
        if (sub.status === 'CONCLUIDA') {
            const d = sub.dados || {};
            div.innerHTML = `
                ${d.numeroPedido ? `<div class="dado-item"><span class="dado-label">Nº Pedido:</span><span class="dado-valor">${d.numeroPedido}</span></div>` : ''}
                ${d.fornecedor   ? `<div class="dado-item"><span class="dado-label">Fornecedor:</span><span class="dado-valor">${d.fornecedor}</span></div>` : ''}
                ${d.valorTotal   ? `<div class="dado-item"><span class="dado-label">Valor Total:</span><span class="dado-valor" style="color:#10b981;font-weight:700;">R$ ${d.valorTotal}</span></div>` : ''}
                ${_htmlObsLeitura(d.observacao)}
                ${sub.conclusao ? `<p class="etapa-conclusao-info">Por <strong>${sub.conclusao.usuario}</strong> em ${this.fmtDH(sub.conclusao.dataHora)}</p>` : ''}`;
            return div;
        }
        if (!['COMPRADOR', 'ADMINISTRATIVO', 'ADMIN'].includes(this.usuario.perfil)) {
            div.innerHTML = '<p class="etapa-aguardando">Aguardando pedido de compra pelo Comprador...</p>';
            return div;
        }
        div.innerHTML = `
            <form class="etapa-form" id="form-s72">
                <div class="form-group-etapa">
                    <label class="form-label-etapa">Número do Pedido</label>
                    <input type="text" class="form-input-etapa" id="s72-num" placeholder="Ex: PC-2026-001">
                </div>
                <div class="form-group-etapa">
                    <label class="form-label-etapa required">Fornecedor</label>
                    <input type="text" class="form-input-etapa" id="s72-forn" required placeholder="Nome do fornecedor">
                </div>
                <div class="form-group-etapa">
                    <label class="form-label-etapa required">Valor Total (R$)</label>
                    <input type="number" step="0.01" class="form-input-etapa" id="s72-val" required placeholder="0,00">
                </div>
                ${_htmlObsCampo('s72-obs', 'Observação', 'Condições de pagamento, prazo, informações adicionais...')}
                ${_htmlUpload('s72-anx', 's72-anx-nm', 'Cotação / Pedido (Opcional)')}
                <div class="etapa-acoes">
                    <button type="submit" class="btn-etapa btn-etapa-primary">
                        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Registrar Pedido
                    </button>
                </div>
            </form>`;
        setTimeout(() => {
            _bindFileLabel('s72-anx', 's72-anx-nm');
            const fi = document.getElementById('s72-anx');
            document.getElementById('form-s72')?.addEventListener('submit', e => {
                e.preventDefault();
                const num  = document.getElementById('s72-num').value.trim();
                const forn = document.getElementById('s72-forn').value.trim();
                const val  = document.getElementById('s72-val').value;
                const obs  = document.getElementById('s72-obs').value.trim();
                if (forn && val) {
                    lerArquivosBase64(fi).then(anx => {
                        this.chamado.concluirSubetapa72(num, forn, val, obs, anx, this.usuario);
                        window.gerenciadorChamados.atualizarChamado(this.chamado);
                        this.render();
                    });
                }
            });
        }, 0);
        return div;
    }

    _renderSub73(sub) {
        const div = document.createElement('div');
        if (sub.status === 'CONCLUIDA') {
            const d = sub.dados || {};
            div.innerHTML = `
                ${d.dataEntrega  ? `<div class="dado-item"><span class="dado-label">Data de Entrega:</span><span class="dado-valor">${this.fmtD(d.dataEntrega)}</span></div>` : ''}
                ${d.horaEntrega  ? `<div class="dado-item"><span class="dado-label">Horário:</span><span class="dado-valor">${d.horaEntrega}</span></div>` : ''}
                ${d.localEntrega ? `<div class="dado-item"><span class="dado-label">Local:</span><span class="dado-valor">${d.localEntrega}</span></div>` : ''}
                ${_htmlObsLeitura(d.observacao)}
                ${sub.conclusao ? `<p class="etapa-conclusao-info">Por <strong>${sub.conclusao.usuario}</strong> em ${this.fmtDH(sub.conclusao.dataHora)}</p>` : ''}`;
            return div;
        }
        if (!['COMPRADOR', 'ADMINISTRATIVO', 'ADMIN'].includes(this.usuario.perfil)) {
            div.innerHTML = '<p class="etapa-aguardando">Aguardando programação da entrega...</p>';
            return div;
        }
        div.innerHTML = `
            <form class="etapa-form" id="form-s73">
                <div class="etapa-form-row2">
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Data de Entrega</label>
                        <input type="date" class="form-input-etapa" id="s73-data" required>
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa">Horário</label>
                        <input type="time" class="form-input-etapa" id="s73-hora">
                    </div>
                </div>
                <div class="form-group-etapa">
                    <label class="form-label-etapa required">Local de Entrega</label>
                    <input type="text" class="form-input-etapa" id="s73-local" required placeholder="Ex: Almoxarifado, Recepção...">
                </div>
                ${_htmlObsCampo('s73-obs', 'Observação', 'Instruções de entrega, contato no local...')}
                <div class="etapa-acoes">
                    <button type="submit" class="btn-etapa btn-etapa-primary">
                        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Confirmar Entrega
                    </button>
                </div>
            </form>`;
        setTimeout(() => {
            document.getElementById('form-s73')?.addEventListener('submit', e => {
                e.preventDefault();
                const data  = document.getElementById('s73-data').value;
                const hora  = document.getElementById('s73-hora').value;
                const local = document.getElementById('s73-local').value.trim();
                const obs   = document.getElementById('s73-obs').value.trim();
                if (data && local) {
                    this.chamado.concluirSubetapa73(data, hora, local, obs, this.usuario);
                    window.gerenciadorChamados.atualizarChamado(this.chamado);
                    this.render();
                }
            });
        }, 0);
        return div;
    }

    // =========================================================================
    // ETAPA 8 — RECEBIMENTO DE MERCADORIA
    // =========================================================================
    _renderEt8(etapa) {
        const div = document.createElement('div');
        const et7 = this.chamado.etapas.find(e => e.numero === 7);
        const s73 = et7?.subetapas?.find(s => Math.abs(s.numero - 7.3) < 0.001);
        if (s73?.status === 'CONCLUIDA') {
            div.innerHTML = _htmlContexto('Entrega Programada (7.3)', [
                ['Data / Hora', `${this.fmtD(s73.dados.dataEntrega)}${s73.dados.horaEntrega ? ' às ' + s73.dados.horaEntrega : ''}`],
                ['Local', s73.dados.localEntrega],
            ]);
        }

        if (etapa.status === 'CONCLUIDA') {
            const d = etapa.dados || {};
            div.innerHTML += `
                ${d.dataRecebimento ? `<div class="dado-item"><span class="dado-label">Data de Recebimento:</span><span class="dado-valor">${this.fmtD(d.dataRecebimento)}</span></div>` : ''}
                ${d.numeroNF        ? `<div class="dado-item"><span class="dado-label">Nº da NF:</span><span class="dado-valor">${d.numeroNF}</span></div>` : ''}
                ${_htmlObsLeitura(d.observacao)}`;
            return div;
        }

        if (!['ADMINISTRATIVO', 'ADMIN'].includes(this.usuario.perfil)) {
            div.innerHTML += '<p class="etapa-aguardando">Aguardando recebimento da mercadoria...</p>';
            return div;
        }

        div.innerHTML += `
            <form class="etapa-form" id="form-et8">
                <div class="form-group-etapa">
                    <label class="form-label-etapa required">Data de Recebimento</label>
                    <input type="date" class="form-input-etapa" id="et8-data" required>
                </div>
                <div class="form-group-etapa">
                    <label class="form-label-etapa">Número da Nota Fiscal</label>
                    <input type="text" class="form-input-etapa" id="et8-nf" placeholder="Ex: NF 000123">
                </div>
                ${_htmlObsCampo('et8-obs', 'Observação', 'Condições do recebimento, divergências, itens com problema...')}
                ${_htmlUpload('et8-foto', 'et8-foto-nm', 'Fotos do Recebimento (Opcional)', 'image/*', true)}
                <div class="etapa-acoes">
                    <button type="submit" class="btn-etapa btn-etapa-primary">
                        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Confirmar Recebimento
                    </button>
                </div>
            </form>`;

        setTimeout(() => {
            _bindFileLabel('et8-foto', 'et8-foto-nm');
            const fi = document.getElementById('et8-foto');
            document.getElementById('form-et8')?.addEventListener('submit', e => {
                e.preventDefault();
                const data = document.getElementById('et8-data').value;
                const nf   = document.getElementById('et8-nf').value.trim();
                const obs  = document.getElementById('et8-obs').value.trim();
                if (data) {
                    lerArquivosBase64(fi).then(fotos => {
                        this.chamado.concluirEtapa8(data, nf, obs, fotos, this.usuario);
                        window.gerenciadorChamados.atualizarChamado(this.chamado);
                        this.render();
                    });
                }
            });
        }, 0);

        return div;
    }

    // =========================================================================
    // ETAPA 9 — PROGRAMAR O SERVIÇO
    // =========================================================================
    _renderEt9(etapa) {
        const div = document.createElement('div');

        if (etapa.status === 'CONCLUIDA') {
            const d = etapa.dados || {};
            div.innerHTML = `
                ${d.dataServico        ? `<div class="dado-item"><span class="dado-label">Data do Serviço:</span><span class="dado-valor">${this.fmtD(d.dataServico)}</span></div>` : ''}
                ${d.horaServico        ? `<div class="dado-item"><span class="dado-label">Horário:</span><span class="dado-valor">${d.horaServico}</span></div>` : ''}
                ${d.tecnicoResponsavel ? `<div class="dado-item"><span class="dado-label">Técnico Responsável:</span><span class="dado-valor">${d.tecnicoResponsavel}</span></div>` : ''}
                ${_htmlObsLeitura(d.observacao)}`;
            return div;
        }

        if (!['ADMINISTRATIVO', 'ADMIN'].includes(this.usuario.perfil)) {
            div.innerHTML = '<p class="etapa-aguardando">Aguardando programação do serviço pela Administração...</p>';
            return div;
        }

        div.innerHTML = `
            <form class="etapa-form" id="form-et9">
                <div class="etapa-form-row2">
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Data do Serviço</label>
                        <input type="date" class="form-input-etapa" id="et9-data" required>
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Horário</label>
                        <input type="time" class="form-input-etapa" id="et9-hora" required>
                    </div>
                </div>
                <div class="form-group-etapa">
                    <label class="form-label-etapa required">Técnico Responsável</label>
                    <input type="text" class="form-input-etapa" id="et9-tec" required placeholder="Nome do técnico">
                </div>
                ${_htmlObsCampo('et9-obs', 'Observação', 'Instruções ao técnico, acessos necessários...')}
                <div class="etapa-acoes">
                    <button type="submit" class="btn-etapa btn-etapa-primary">
                        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Confirmar Programação
                    </button>
                </div>
            </form>`;

        setTimeout(() => {
            document.getElementById('form-et9')?.addEventListener('submit', e => {
                e.preventDefault();
                const data = document.getElementById('et9-data').value;
                const hora = document.getElementById('et9-hora').value;
                const tec  = document.getElementById('et9-tec').value.trim();
                const obs  = document.getElementById('et9-obs').value.trim();
                if (data && hora && tec) {
                    this.chamado.concluirEtapa9(data, hora, tec, obs, this.usuario);
                    window.gerenciadorChamados.atualizarChamado(this.chamado);
                    this.render();
                }
            });
        }, 0);

        return div;
    }

    // =========================================================================
    // ETAPA 10 — EXECUÇÃO DA MANUTENÇÃO (subetapas 10.1 e 10.2)
    // =========================================================================
    _renderEt10(etapa) {
        const div = document.createElement('div');
        const w = document.createElement('div');
        w.className = 'subetapas-container';
        (etapa.subetapas || []).forEach(s => w.appendChild(this._renderSub(s)));
        div.appendChild(w);
        return div;
    }

    _renderSub101(sub) {
        const div = document.createElement('div');
        if (sub.status === 'CONCLUIDA') {
            const d = sub.dados || {};
            div.innerHTML = `
                ${d.dataInicio ? `<div class="dado-item"><span class="dado-label">Data:</span><span class="dado-valor">${this.fmtD(d.dataInicio)}</span></div>` : ''}
                ${d.horaInicio ? `<div class="dado-item"><span class="dado-label">Horário:</span><span class="dado-valor">${d.horaInicio}</span></div>` : ''}
                ${_htmlObsLeitura(d.observacao)}
                ${sub.conclusao ? `<p class="etapa-conclusao-info">Por <strong>${sub.conclusao.usuario}</strong> em ${this.fmtDH(sub.conclusao.dataHora)}</p>` : ''}`;
            return div;
        }
        if (!['TECNICO', 'ADMIN'].includes(this.usuario.perfil)) {
            div.innerHTML = '<p class="etapa-aguardando">Aguardando início do serviço pelo Técnico...</p>';
            return div;
        }
        div.innerHTML = `
            <form class="etapa-form" id="form-s101">
                <div class="etapa-form-row2">
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Data</label>
                        <input type="date" class="form-input-etapa" id="s101-data" required>
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Horário</label>
                        <input type="time" class="form-input-etapa" id="s101-hora" required>
                    </div>
                </div>
                ${_htmlObsCampo('s101-obs', 'Observação', 'Condições iniciais do local, equipamentos em uso...')}
                ${_htmlUpload('s101-foto', 's101-foto-nm', 'Fotos — Estado Inicial (Opcional)', 'image/*', true)}
                <div class="etapa-acoes">
                    <button type="submit" class="btn-etapa btn-etapa-primary">
                        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Registrar Início do Serviço
                    </button>
                </div>
            </form>`;
        setTimeout(() => {
            _bindFileLabel('s101-foto', 's101-foto-nm');
            const fi = document.getElementById('s101-foto');
            document.getElementById('form-s101')?.addEventListener('submit', e => {
                e.preventDefault();
                const data = document.getElementById('s101-data').value;
                const hora = document.getElementById('s101-hora').value;
                const obs  = document.getElementById('s101-obs').value.trim();
                if (data && hora) {
                    lerArquivosBase64(fi).then(fotos => {
                        this.chamado.concluirSubetapa101(data, hora, fotos, obs, this.usuario);
                        window.gerenciadorChamados.atualizarChamado(this.chamado);
                        this.render();
                    });
                }
            });
        }, 0);
        return div;
    }

    _renderSub102(sub) {
        const div = document.createElement('div');
        if (sub.status === 'CONCLUIDA') {
            const d = sub.dados || {};
            div.innerHTML = `
                ${d.dataTermino      ? `<div class="dado-item"><span class="dado-label">Data:</span><span class="dado-valor">${this.fmtD(d.dataTermino)}</span></div>` : ''}
                ${d.horaTermino      ? `<div class="dado-item"><span class="dado-label">Horário:</span><span class="dado-valor">${d.horaTermino}</span></div>` : ''}
                ${d.descricaoServico ? `<div class="dado-item"><span class="dado-label">O que foi feito:</span><span class="dado-valor">${d.descricaoServico.replace(/\n/g,'<br>')}</span></div>` : ''}
                ${d.materiaisUsados  ? `<div class="dado-item"><span class="dado-label">Materiais Utilizados:</span><span class="dado-valor">${d.materiaisUsados}</span></div>` : ''}
                ${_htmlObsLeitura(d.observacao)}
                ${sub.conclusao ? `<p class="etapa-conclusao-info">Por <strong>${sub.conclusao.usuario}</strong> em ${this.fmtDH(sub.conclusao.dataHora)}</p>` : ''}`;
            return div;
        }
        if (!['TECNICO', 'ADMIN'].includes(this.usuario.perfil)) {
            div.innerHTML = '<p class="etapa-aguardando">Aguardando término do serviço pelo Técnico...</p>';
            return div;
        }
        div.innerHTML = `
            <form class="etapa-form" id="form-s102">
                <div class="etapa-form-row2">
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Data</label>
                        <input type="date" class="form-input-etapa" id="s102-data" required>
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Horário</label>
                        <input type="time" class="form-input-etapa" id="s102-hora" required>
                    </div>
                </div>
                <div class="form-group-etapa">
                    <label class="form-label-etapa required">Descrição do Serviço Executado</label>
                    <textarea class="form-textarea-etapa" id="s102-desc" required rows="4"
                        placeholder="Descreva detalhadamente o que foi feito..."></textarea>
                </div>
                <div class="form-group-etapa">
                    <label class="form-label-etapa">Materiais Utilizados</label>
                    <textarea class="form-textarea-etapa" id="s102-mat" rows="2"
                        placeholder="Liste materiais e peças utilizados..."></textarea>
                </div>
                ${_htmlObsCampo('s102-obs', 'Observação', 'Pendências, recomendações, observações finais...')}
                ${_htmlUpload('s102-foto', 's102-foto-nm', 'Fotos — Após o Serviço (Opcional)', 'image/*', true)}
                <div class="etapa-acoes">
                    <button type="submit" class="btn-etapa btn-etapa-success">
                        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Concluir Execução
                    </button>
                </div>
            </form>`;
        setTimeout(() => {
            _bindFileLabel('s102-foto', 's102-foto-nm');
            const fi = document.getElementById('s102-foto');
            document.getElementById('form-s102')?.addEventListener('submit', e => {
                e.preventDefault();
                const data = document.getElementById('s102-data').value;
                const hora = document.getElementById('s102-hora').value;
                const desc = document.getElementById('s102-desc').value.trim();
                const mat  = document.getElementById('s102-mat').value.trim();
                const obs  = document.getElementById('s102-obs').value.trim();
                if (data && hora && desc) {
                    lerArquivosBase64(fi).then(fotos => {
                        this.chamado.concluirSubetapa102(data, hora, desc, mat, fotos, obs, this.usuario);
                        window.gerenciadorChamados.atualizarChamado(this.chamado);
                        this.render();
                    });
                }
            });
        }, 0);
        return div;
    }

    // =========================================================================
    // ETAPA 11 — CONFERÊNCIA DO GESTOR
    // =========================================================================
    _renderEt11(etapa) {
        const div = document.createElement('div');

        if (etapa.status === 'CONCLUIDA') {
            const d = etapa.dados || {};
            div.innerHTML = `
                <div class="dado-item">
                    <span class="dado-label">Decisão:</span>
                    <span class="dado-valor" style="color:#10b981;font-weight:700;">✓ Aprovado pelo Gestor</span>
                </div>
                ${_htmlObsLeitura(d.parecer || d.observacao, 'Parecer do Gestor')}`;
            return div;
        }

        if (!['ADMIN'].includes(this.usuario.perfil)) {
            div.innerHTML = '<p class="etapa-aguardando">Aguardando conferência do Gestor...</p>';
            return div;
        }

        div.innerHTML = `
            <p style="font-size:13px;color:#374151;margin-bottom:16px;">Revise a execução e aprove para liberar a finalização pelo solicitante.</p>
            <form class="etapa-form" id="form-et11">
                ${_htmlObsCampo('et11-obs', 'Parecer do Gestor', 'Aprovações, ressalvas sobre o serviço executado...')}
                <div class="etapa-acoes">
                    <button type="submit" class="btn-etapa btn-etapa-success">
                        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Aprovar Conferência
                    </button>
                </div>
            </form>`;

        setTimeout(() => {
            document.getElementById('form-et11')?.addEventListener('submit', e => {
                e.preventDefault();
                const obs = document.getElementById('et11-obs').value.trim();
                this.chamado.aprovarEtapa11(obs, this.usuario);
                window.gerenciadorChamados.atualizarChamado(this.chamado);
                this.render();
            });
        }, 0);

        return div;
    }

    // =========================================================================
    // ETAPA 12 — FINALIZAR O CHAMADO
    // =========================================================================
    _renderEt12(etapa) {
        const div = document.createElement('div');

        if (etapa.status === 'CONCLUIDA') {
            const d = etapa.dados || {};
            div.innerHTML = `
                <div class="dado-item">
                    <span class="dado-label">Confirmação:</span>
                    <span class="dado-valor" style="color:#10b981;font-weight:700;">✓ Serviço Confirmado — Chamado Finalizado</span>
                </div>
                ${d.avaliacao ? `<div class="dado-item"><span class="dado-label">Avaliação:</span><span class="dado-valor">${'⭐'.repeat(parseInt(d.avaliacao))} (${d.avaliacao}/5)</span></div>` : ''}
                ${_htmlObsLeitura(d.observacaoFinal || d.observacao, 'Comentário Final')}`;
            return div;
        }

        if (!['SOLICITANTE', 'ADMIN'].includes(this.usuario.perfil)) {
            div.innerHTML = '<p class="etapa-aguardando">Aguardando confirmação do Solicitante para finalizar o chamado...</p>';
            return div;
        }

        div.innerHTML = `
            <p style="color:#374151;font-size:13px;margin-bottom:16px;">
                Confirme que o serviço foi executado corretamente e o problema foi resolvido.
            </p>
            <form class="etapa-form" id="form-et12">
                <div class="form-group-etapa">
                    <label class="form-label-etapa">Avaliação do Atendimento</label>
                    <select class="form-select-etapa" id="et12-aval">
                        <option value="">Selecione...</option>
                        <option value="1">⭐ Muito Ruim</option>
                        <option value="2">⭐⭐ Ruim</option>
                        <option value="3">⭐⭐⭐ Regular</option>
                        <option value="4">⭐⭐⭐⭐ Bom</option>
                        <option value="5">⭐⭐⭐⭐⭐ Excelente</option>
                    </select>
                </div>
                ${_htmlObsCampo('et12-obs', 'Comentário Final (Opcional)', 'Algum comentário sobre o atendimento ou o serviço realizado?')}
                <div class="etapa-acoes">
                    <button type="submit" class="btn-etapa btn-etapa-success">
                        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Confirmar e Finalizar Chamado
                    </button>
                </div>
            </form>`;

        setTimeout(() => {
            document.getElementById('form-et12')?.addEventListener('submit', e => {
                e.preventDefault();
                if (confirm('Confirma que o problema foi resolvido e deseja finalizar o chamado?')) {
                    const aval = document.getElementById('et12-aval').value;
                    const obs  = document.getElementById('et12-obs').value.trim();
                    this.chamado.concluirEtapa12('SATISFEITO', aval, obs, this.usuario);
                    window.gerenciadorChamados.atualizarChamado(this.chamado);
                    this.render();
                    alert('Chamado finalizado com sucesso! Obrigado pelo feedback.');
                }
            });
        }, 0);

        return div;
    }


    // =========================================================================
    // ROTEADOR DE SUBETAPAS
    // =========================================================================
    _renderSub(sub) {
        const card = document.createElement('div');
        card.className = `subetapa-card ${sub.expandida ? 'expandida' : ''}`;
        card.innerHTML = `
            <div class="subetapa-header" onclick="window.toggleSubetapa('${sub.numero}')">
                <div style="display:flex;align-items:center;gap:10px;">
                    <div class="etapa-numero" style="width:30px;height:30px;font-size:11px;">${sub.numero}</div>
                    <span class="subetapa-titulo">${sub.titulo}</span>
                </div>
                <span class="etapa-status ${sub.status === 'CONCLUIDA' ? 'concluida' : 'em-andamento'}">${sub.status === 'CONCLUIDA' ? 'Concluída' : 'Em Andamento'}</span>
            </div>`;

        if (sub.expandida) {
            const c = document.createElement('div');
            c.style.padding = '16px';
            const n = sub.numero;
            let fn = null;
            if      (Math.abs(n - 5.1)  < 0.001) fn = () => this._renderSub51(sub);
            else if (Math.abs(n - 5.2)  < 0.001) fn = () => this._renderSub52(sub);
            else if (Math.abs(n - 7.1)  < 0.001) fn = () => this._renderSub71(sub);
            else if (Math.abs(n - 7.2)  < 0.001) fn = () => this._renderSub72(sub);
            else if (Math.abs(n - 7.3)  < 0.001) fn = () => this._renderSub73(sub);
            else if (Math.abs(n - 10.1) < 0.001) fn = () => this._renderSub101(sub);
            else if (Math.abs(n - 10.2) < 0.001) fn = () => this._renderSub102(sub);
            if (fn) c.appendChild(fn());
            card.appendChild(c);
        }

        return card;
    }


    // =========================================================================
    // ABA FORMULÁRIO — painel de dados estruturados acumulados
    // =========================================================================
    renderFormularioDados() {
        const div = document.createElement('div');
        div.className = 'formulario-dados-acumulados';
        const etapas = this.chamado.etapas || [];
        const blocos = [];

        const campo = (l, v) => v ? `<div class="dado-item"><span class="dado-label">${l}:</span><span class="dado-valor">${v}</span></div>` : null;
        const bloco = (num, titulo, campos) => {
            const linhas = campos.filter(Boolean).join('');
            return linhas ? `<div class="form-dados-bloco"><div class="form-dados-bloco-titulo"><span class="form-dados-num">${num}</span> ${titulo}</div>${linhas}</div>` : null;
        };

        const et1 = etapas.find(e => e.numero === 1);
        if (et1?.status === 'CONCLUIDA') blocos.push(bloco(1, 'Abertura do Chamado', [
            campo('Unidade / Local', et1.dados.unidade),
            campo('Tipo de Manutenção', et1.dados.tipoManutencao),
            campo('E-mail', et1.dados.email),
            campo('Contato', et1.dados.contato),
        ]));

        const et2 = etapas.find(e => e.numero === 2);
        if (et2?.status === 'CONCLUIDA') blocos.push(bloco(2, 'Agendamento da Avaliação', [
            campo('Data', this.fmtD(et2.dados.dataAgendamento)),
            campo('Horário', et2.dados.horaAgendamento),
        ]));

        const et3 = etapas.find(e => e.numero === 3);
        if (et3?.status === 'CONCLUIDA') blocos.push(bloco(3, 'Confirmação da Avaliação', [
            campo('Decisão', et3.dados.decisao === 'APROVADO'
                ? '<span style="color:#10b981;font-weight:600;">✓ Confirmado</span>'
                : '<span style="color:#ef4444;font-weight:600;">✗ Reprovado</span>'),
        ]));

        const et4 = etapas.find(e => e.numero === 4);
        const et5 = etapas.find(e => e.numero === 5);
        const sub51 = et5?.subetapas?.find(s => s.numero === 5.1);
        const sub52 = et5?.subetapas?.find(s => s.numero === 5.2);
        if (et4 && (et4.status === 'CONCLUIDA' || et4.status === 'AGUARDANDO_CONFIRMACAO')) {
            // Nome do técnico: cascata de fallbacks
            const _tecUsuario = et4.dados?.tecnicoUsuario || '';
            const _usuariosLS = JSON.parse(localStorage.getItem('usuarios') || '[]');
            const _tecObj = _tecUsuario ? _usuariosLS.find(u => u.usuario === _tecUsuario) : null;
            const nomeTecnico = et4.dados?.tecnicoNome
                || sub51?.dados?.tecnicoNome
                || sub52?.dados?.tecnicoNome
                || _tecObj?.nomeCompleto
                || (this.chamado?.historicoEventos || []).find(ev => ev.tipo === 'TECNICO_COMUNICADO')?.dados?.dados?.tecnicoNome
                || _tecUsuario
                || '—';
            blocos.push(bloco(4, 'Técnico Designado', [
                campo('Técnico', nomeTecnico),
            ]));
        }
        if (et5 && et5.status === 'CONCLUIDA') {
            blocos.push(bloco(5, 'Avaliação Técnica', [
                sub51?.dados?.dataInicio  ? campo('Início da Avaliação',  this.fmtD(sub51.dados.dataInicio)  + ' às ' + sub51.dados.horaInicio)  : null,
                sub52?.dados?.dataTermino ? campo('Término da Avaliação', this.fmtD(sub52.dados.dataTermino) + ' às ' + sub52.dados.horaTermino) : null,
                sub52?.dados?.diagnostico ? campo('Diagnóstico', sub52.dados.diagnostico) : null,
            ].filter(Boolean)));
        }

        const et6 = etapas.find(e => e.numero === 6);
        if (et6?.status === 'CONCLUIDA' && (et6.dados.temEstoque === true || et6.dados.temEstoque === 'SIM')) blocos.push(bloco(6, 'Verificação de Estoque', [
            campo('Resultado', '✓ Tem estoque'),
        ]));

        const et9 = etapas.find(e => e.numero === 9);
        if (et9?.status === 'CONCLUIDA') blocos.push(bloco(9, 'Programação do Serviço', [
            campo('Data', this.fmtD(et9.dados.dataServico)),
            campo('Horário', et9.dados.horaServico),
            campo('Técnico', et9.dados.tecnicoResponsavel),
        ]));

        const filtrados = blocos.filter(Boolean);
        div.innerHTML = filtrados.length > 0
            ? filtrados.join('')
            : '<p style="color:#9ca3af;font-size:13px;font-style:italic;padding:8px 0;">Nenhum dado registrado ainda.</p>';

        return div;
    }


    // =========================================================================
    // UTILITÁRIOS
    // =========================================================================
    fmtD(data) {
        if (!data) return '-';
        const d = new Date(data);
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    }

    fmtDH(data) {
        if (!data) return '-';
        const d = new Date(data);
        return `${this.fmtD(data)} às ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }

    // Aliases para compatibilidade com código legado
    formatarData(d)     { return this.fmtD(d); }
    formatarDataHora(d) { return this.fmtDH(d); }

    // Alias público exigido pelo script.js
    criarConteudo(etapa) { return this._criarConteudo(etapa); }
}


// =============================================================================
// FUNÇÕES GLOBAIS PARA TOGGLE
// =============================================================================
window.toggleEtapa = function (numero) {
    const c = window.chamadoAtual;
    if (c) { c.toggleEtapa(numero); window.gerenciadorChamados.atualizarChamado(c); window.renderizadorAtual.render(); }
};

window.toggleSubetapa = function (numero) {
    const c = window.chamadoAtual;
    if (c) { c.toggleEtapa(parseFloat(numero)); window.gerenciadorChamados.atualizarChamado(c); window.renderizadorAtual.render(); }
};

window.RenderizadorEtapas = RenderizadorEtapas;
window.lerArquivosBase64  = lerArquivosBase64;