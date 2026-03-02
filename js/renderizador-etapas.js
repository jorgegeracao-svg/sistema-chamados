// ==================== RENDERIZADOR DE ETAPAS ==================== //

// Converte arquivos de um <input type="file"> para base64.
// Retorna Promise com array de { nome, tipo, tamanho, dados } ou [] se vazio.
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

class RenderizadorEtapas {
    constructor(containerId, chamado, usuario) {
        this.container = document.getElementById(containerId);
        this.chamado = chamado;
        this.usuario = usuario;
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = '';

        if (this.chamado.status === 'FINALIZADO') {
            this.container.appendChild(this.criarBannerFinalizado());
        }

        const etapasContainer = document.createElement('div');
        etapasContainer.className = 'etapas-container';

        this.chamado.etapas.forEach(etapa => {
            etapasContainer.appendChild(this.renderEtapa(etapa));
        });

        this.container.appendChild(etapasContainer);
    }

    criarBannerFinalizado() {
        const banner = document.createElement('div');
        banner.className = 'chamado-finalizado-banner';
        banner.innerHTML = `
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>Chamado Finalizado com Sucesso!</span>
        `;
        return banner;
    }

    renderEtapa(etapa) {
        const card = document.createElement('div');
        card.className = `etapa-card ${etapa.expandida ? 'expandida' : ''} ${etapa.status === 'CONCLUIDA' ? 'concluida' : ''}`;
        card.dataset.etapaNumero = etapa.numero;
        card.appendChild(this.criarHeader(etapa));
        card.appendChild(this.criarConteudo(etapa));
        return card;
    }

    criarHeader(etapa) {
        const header = document.createElement('div');
        header.className = 'etapa-header';

        const categoriaLabel = {
            'SOLICITANTE': 'Solicitante',
            'ADMINISTRATIVO': 'Administração',
            'TECNICO': 'Técnico',
            'COMPRADOR': 'Comprador',
            'GESTOR': 'Gestor'
        }[etapa.categoria] || etapa.categoria;

        header.innerHTML = `
            <div class="etapa-header-left">
                <div class="etapa-numero">${etapa.numero}</div>
                <div class="etapa-info">
                    <div class="etapa-titulo">${etapa.titulo}</div>
                    <div class="etapa-meta">
                        <span class="etapa-status ${etapa.status === 'CONCLUIDA' ? 'concluida' : 'em-andamento'}">
                            ${etapa.status === 'CONCLUIDA' ? 'Concluída' : 'Em Andamento'}
                        </span>
                        <span class="etapa-categoria">Responsável: ${categoriaLabel}</span>
                    </div>
                    ${etapa.conclusao ? `
                        <div class="etapa-conclusao">
                            <strong>${etapa.conclusao.usuario}</strong> • ${this.formatarDataHora(etapa.conclusao.dataHora)}
                        </div>
                    ` : ''}
                </div>
            </div>
            <button class="etapa-toggle" onclick="window.toggleEtapa(${etapa.numero})">
                <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
        `;
        return header;
    }

    criarConteudo(etapa) {
        const conteudo = document.createElement('div');
        conteudo.className = 'etapa-conteudo';
        const inner = document.createElement('div');
        inner.className = 'etapa-conteudo-inner';

        const renderMap = {
            1: () => this.renderEtapa1(etapa),
            2: () => this.renderEtapa2(etapa),
            3: () => this.renderEtapa3(etapa),
            4: () => this.renderEtapa4(etapa),
            5: () => this.renderEtapa5(etapa),
            6: () => this.renderEtapa6(etapa),
            7: () => this.renderEtapa7(etapa),
            8: () => this.renderEtapa8(etapa),
            9: () => this.renderEtapa9(etapa)
        };

        // Garante que o número seja inteiro para funcionar como chave do mapa
        const renderFn = renderMap[parseInt(etapa.numero)];
        if (renderFn) inner.appendChild(renderFn());

        conteudo.appendChild(inner);
        return conteudo;
    }

    // ==================== ETAPA 1 - ABERTURA DO CHAMADO ====================
    renderEtapa1(etapa) {
        const div = document.createElement('div');
        div.innerHTML = `
            <div class="dado-item">
                <span class="dado-label">Observação:</span>
                <span class="dado-valor">${etapa.dados.observacao || '-'}</span>
            </div>
        `;
        return div;
    }

    // ==================== ETAPA 2 - AGENDAMENTO DA AVALIAÇÃO ====================
    renderEtapa2(etapa) {
        const div = document.createElement('div');

        if (etapa.status === 'CONCLUIDA') {
            div.innerHTML = etapa.dados.observacao ? `
                <div class="dado-item">
                    <span class="dado-label">Mensagem ao Solicitante:</span>
                    <span class="dado-valor">${etapa.dados.observacao}</span>
                </div>` : '<p style="color:#6b7280;font-style:italic;font-size:13px;">Sem mensagem adicional.</p>';
        } else if (['ADMINISTRATIVO', 'ADMIN'].includes(this.usuario.perfil)) {
            div.innerHTML += `
                <form class="etapa-form" id="form-etapa-2">
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Data do Agendamento</label>
                        <input type="date" class="form-input-etapa" id="dataAgendamento" required>
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Horário</label>
                        <input type="time" class="form-input-etapa" id="horaAgendamento" required>
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa">Mensagem para o Solicitante</label>
                        <textarea class="form-textarea-etapa" id="observacaoEtapa2" rows="3"
                            placeholder="Instruções ou observações para o solicitante confirmar o agendamento..."></textarea>
                    </div>
                    <div class="etapa-acoes">
                        <button type="submit" class="btn-etapa btn-etapa-primary">
                            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Confirmar Agendamento
                        </button>
                    </div>
                </form>
            `;
            setTimeout(() => {
                const form = document.getElementById('form-etapa-2');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        const dataAgendamento = document.getElementById('dataAgendamento').value;
                        const horaAgendamento = document.getElementById('horaAgendamento').value;
                        const observacao = document.getElementById('observacaoEtapa2').value.trim();
                        if (dataAgendamento && horaAgendamento) {
                            this.chamado.concluirEtapa2(dataAgendamento, horaAgendamento, observacao, this.usuario);
                            window.gerenciadorChamados.atualizarChamado(this.chamado);
                            this.render();
                        }
                    });
                }
            }, 0);
        } else {
            div.innerHTML += '<p style="color:#6b7280;font-style:italic;">Aguardando agendamento pela Administração...</p>';
        }
        return div;
    }

    // ==================== ETAPA 3 - CONFIRMAÇÃO DA AVALIAÇÃO (SOLICITANTE) ====================
    renderEtapa3(etapa) {
        const div = document.createElement('div');

        if (etapa.status === 'CONCLUIDA') {
            div.innerHTML = `
                <div class="dado-item">
                    <span class="dado-label">Decisão:</span>
                    <span class="dado-valor">${etapa.dados.decisao === 'APROVADO' ? '✓ Confirmado' : '✗ Reprovado'}</span>
                </div>
                ${etapa.dados.motivo ? `
                <div class="dado-item">
                    <span class="dado-label">Observação:</span>
                    <span class="dado-valor">${etapa.dados.motivo}</span>
                </div>` : ''}
            `;
        } else if (['SOLICITANTE', 'ADMIN'].includes(this.usuario.perfil)) {
            div.innerHTML += `
                <form class="etapa-form" id="form-etapa-3">
                    <div class="form-group-etapa et3-obs-container">
                        <label class="form-label-etapa">Observação</label>
                        <textarea class="form-textarea-etapa" id="motivoReprovacao" rows="3"
                            placeholder="Informe o motivo caso queira reprovar e remarcar o agendamento..."></textarea>
                    </div>
                    <div class="et3-acoes-container">
                        <button type="button" class="btn-etapa btn-etapa-danger" id="btnReprovarEt3">
                            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            Reprovar — Remarcar
                        </button>
                        <button type="submit" class="btn-etapa btn-etapa-success" id="btnAprovarEt3">
                            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Confirmar Agendamento
                        </button>
                    </div>
                </form>
            `;
            setTimeout(() => {
                const form = document.getElementById('form-etapa-3');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        this.chamado.confirmarEtapa3(true, '', this.usuario);
                        window.gerenciadorChamados.atualizarChamado(this.chamado);
                        this.render();
                    });
                    document.getElementById('btnReprovarEt3')?.addEventListener('click', () => {
                        const motivo = document.getElementById('motivoReprovacao').value.trim();
                        if (!motivo) {
                            document.getElementById('motivoReprovacao').focus();
                            document.getElementById('motivoReprovacao').style.borderColor = 'var(--color-danger)';
                            return;
                        }
                        this.chamado.confirmarEtapa3(false, motivo, this.usuario);
                        window.gerenciadorChamados.atualizarChamado(this.chamado);
                        this.render();
                    });
                }
            }, 0);
        } else {
            div.innerHTML += '<p style="color:#6b7280;font-style:italic;">Aguardando confirmação do solicitante...</p>';
        }
        return div;
    }

    // ==================== ETAPA 4 - COMUNICAR O TÉCNICO ====================
    renderEtapa4(etapa) {
        const div = document.createElement('div');

        if (etapa.status === 'CONCLUIDA' || etapa.status === 'AGUARDANDO_CONFIRMACAO') {
            div.innerHTML = etapa.dados.observacao ? `
                <div class="dado-item">
                    <span class="dado-label">Mensagem ao Técnico:</span>
                    <span class="dado-valor">${etapa.dados.observacao}</span>
                </div>` : '<p style="color:#6b7280;font-style:italic;font-size:13px;">Sem mensagem adicional.</p>';
            if (etapa.status === 'AGUARDANDO_CONFIRMACAO') {
                div.innerHTML += `<p style="margin-top:12px;font-size:13px;color:#92400e;font-style:italic;">⏳ Aguardando confirmação do técnico...</p>`;
            }
        } else if (['ADMINISTRATIVO', 'ADMIN'].includes(this.usuario.perfil)) {
            // Montar lista de técnicos do localStorage
            const todosUsuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
            const tecnicos = todosUsuarios.filter(u =>
                u.status !== 'Desligado' && u.status !== 'Inativo' &&
                (u.perfil === 'TECNICO' || u.perfil === 'ADMIN')
            );
            const opcoesSelect = tecnicos.map(t =>
                `<option value="${t.id}" data-nome="${t.nomeCompleto}" data-usuario="${t.usuario}">
                    ${t.nomeCompleto} (${t.usuario})
                </option>`
            ).join('');

            div.innerHTML += `
                <form class="etapa-form" id="form-etapa-4">
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Técnico Responsável</label>
                        <select class="form-select-etapa" id="tecnicoSelect" required>
                            <option value="">Selecione o técnico...</option>
                            ${opcoesSelect}
                        </select>
                    </div>
                    <div class="form-group-etapa" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        <div>
                            <label class="form-label-etapa required">Data da Avaliação</label>
                            <input type="date" class="form-input-etapa" id="dataAvaliacao" required>
                        </div>
                        <div>
                            <label class="form-label-etapa required">Horário</label>
                            <input type="time" class="form-input-etapa" id="horaAvaliacao" required>
                        </div>
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa">Mensagem ao Técnico</label>
                        <textarea class="form-textarea-etapa" id="observacaoEtapa4" rows="3"
                            placeholder="Instruções ou informações adicionais para o técnico..."></textarea>
                    </div>
                    <div class="etapa-acoes">
                        <button type="submit" class="btn-etapa btn-etapa-primary">
                            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Comunicar Técnico
                        </button>
                    </div>
                </form>
            `;
            setTimeout(() => {
                const form = document.getElementById('form-etapa-4');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        const select = document.getElementById('tecnicoSelect');
                        const tecnicoId = select.value;
                        const tecnicoNome = select.options[select.selectedIndex]?.dataset.nome || '';
                        const tecnicoUser = select.options[select.selectedIndex]?.dataset.usuario || '';
                        const dataAval = document.getElementById('dataAvaliacao').value;
                        const horaAval = document.getElementById('horaAvaliacao').value;
                        const observacao = document.getElementById('observacaoEtapa4').value.trim();
                        if (tecnicoId && dataAval && horaAval) {
                            // Persistir data/hora da avaliação nos dados da etapa antes de concluir
                            const etapaObj = this.chamado._getEtapa ? this.chamado._getEtapa(4) : null;
                            if (etapaObj) {
                                etapaObj.dados = { ...etapaObj.dados, dataAvaliacao: dataAval, horaAvaliacao: horaAval };
                            }
                            this.chamado.selecionarTecnicoEtapa4(tecnicoUser, tecnicoNome, observacao, this.usuario);
                            // Guardar data/hora após seleção (selecionarTecnicoEtapa4 sobrescreve dados)
                            const etapaAtualizada = this.chamado._getEtapa ? this.chamado._getEtapa(4) : null;
                            if (etapaAtualizada) {
                                etapaAtualizada.dados.dataAvaliacao = dataAval;
                                etapaAtualizada.dados.horaAvaliacao = horaAval;
                            }
                            window.gerenciadorChamados.atualizarChamado(this.chamado);
                            this.render();
                        }
                    });
                }
            }, 0);
        } else {
            div.innerHTML += '<p style="color:#6b7280;font-style:italic;">Aguardando comunicação do técnico...</p>';
        }
        return div;
    }

    // ==================== ETAPA 5 - PROCESSO DE COMPRA ====================
    renderEtapa5(etapa) {
        const div = document.createElement('div');
        div.innerHTML = '<h4 style="margin-bottom:16px;color:#374151;font-size:15px;font-weight:600;">Processo de Compra</h4>';

        const subetapasContainer = document.createElement('div');
        subetapasContainer.className = 'subetapas-container';

        if (etapa.subetapas && etapa.subetapas.length > 0) {
            etapa.subetapas.forEach(sub => {
                subetapasContainer.appendChild(this.renderSubetapa(sub));
            });
        }

        div.appendChild(subetapasContainer);
        return div;
    }

    renderSubetapa(subetapa) {
        const card = document.createElement('div');
        card.className = `subetapa-card ${subetapa.expandida ? 'expandida' : ''}`;

        card.innerHTML = `
            <div class="subetapa-header" onclick="window.toggleSubetapa('${subetapa.numero}')">
                <div style="display:flex;align-items:center;gap:10px;">
                    <div class="etapa-numero" style="width:36px;height:36px;font-size:13px;">${subetapa.numero}</div>
                    <span class="subetapa-titulo">${subetapa.titulo}</span>
                </div>
                <span class="etapa-status ${subetapa.status === 'CONCLUIDA' ? 'concluida' : 'em-andamento'}">
                    ${subetapa.status === 'CONCLUIDA' ? 'Concluída' : 'Em Andamento'}
                </span>
            </div>
        `;

        if (subetapa.expandida) {
            const conteudo = document.createElement('div');
            conteudo.style.padding = '16px';
            conteudo.appendChild(this.renderConteudoSubetapa(subetapa));
            card.appendChild(conteudo);
        }

        return card;
    }

    renderConteudoSubetapa(subetapa) {
        const num = subetapa.numero;
        if (Math.abs(num - 5.1) < 0.01) return this.renderSubetapa51(subetapa);
        if (Math.abs(num - 5.2) < 0.01) return this.renderSubetapa52(subetapa);
        if (Math.abs(num - 5.3) < 0.01) return this.renderSubetapa53(subetapa);

        const div = document.createElement('div');
        div.innerHTML = '<p style="color:#6b7280;font-style:italic;">Aguardando...</p>';
        return div;
    }

    // ---- 5.1 - SOLICITAÇÃO DE COMPRA ----
    renderSubetapa51(subetapa) {
        const div = document.createElement('div');

        if (subetapa.status === 'CONCLUIDA') {
            div.innerHTML = `
                <div class="dado-item"><span class="dado-label">Itens Solicitados:</span><span class="dado-valor">${subetapa.dados.itens}</span></div>
                <div class="dado-item"><span class="dado-label">Justificativa:</span><span class="dado-valor">${subetapa.dados.justificativa}</span></div>
                <div class="dado-item"><span class="dado-label">Urgência:</span><span class="dado-valor">${subetapa.dados.urgencia}</span></div>
                ${subetapa.conclusao ? `<p style="font-size:12px;color:#6b7280;margin-top:8px;">Concluído por <strong>${subetapa.conclusao.usuario}</strong> em ${this.formatarDataHora(subetapa.conclusao.dataHora)}</p>` : ''}
            `;
        } else if (['TECNICO', 'ADMIN'].includes(this.usuario.perfil)) {
            div.innerHTML = `
                <form class="etapa-form" id="form-sub-51">
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Itens a Comprar</label>
                        <textarea class="form-textarea-etapa" id="itensSolicitacao" required placeholder="Liste os itens necessários..."></textarea>
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Justificativa</label>
                        <textarea class="form-textarea-etapa" id="justificativaSolicitacao" required placeholder="Justifique a necessidade da compra..."></textarea>
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Urgência</label>
                        <select class="form-select-etapa" id="urgenciaSolicitacao" required>
                            <option value="">Selecione...</option>
                            <option value="Baixa">Baixa</option>
                            <option value="Média">Média</option>
                            <option value="Alta">Alta</option>
                            <option value="Urgente">Urgente</option>
                        </select>
                    </div>
                    <div class="etapa-acoes">
                        <button type="submit" class="btn-etapa btn-etapa-primary">
                            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Enviar Solicitação
                        </button>
                    </div>
                </form>
            `;
            setTimeout(() => {
                const form = document.getElementById('form-sub-51');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        const itens = document.getElementById('itensSolicitacao').value;
                        const justificativa = document.getElementById('justificativaSolicitacao').value;
                        const urgencia = document.getElementById('urgenciaSolicitacao').value;
                        if (itens && justificativa && urgencia) {
                            this.chamado.concluirSubetapa51(itens, justificativa, urgencia, this.usuario);
                            window.gerenciadorChamados.atualizarChamado(this.chamado);
                            this.render();
                        }
                    });
                }
            }, 0);
        } else {
            div.innerHTML = '<p style="color:#6b7280;font-style:italic;">Aguardando solicitação de compra pela Administração...</p>';
        }
        return div;
    }

    // ---- 5.2 - PEDIDO DE COMPRA ----
    renderSubetapa52(subetapa) {
        const div = document.createElement('div');

        if (subetapa.status === 'CONCLUIDA') {
            div.innerHTML = `
                <div class="dado-item"><span class="dado-label">Nº do Pedido:</span><span class="dado-valor">${subetapa.dados.numeroPedido || '-'}</span></div>
                <div class="dado-item"><span class="dado-label">Fornecedor:</span><span class="dado-valor">${subetapa.dados.fornecedor}</span></div>
                <div class="dado-item"><span class="dado-label">Valor Total:</span><span class="dado-valor" style="color:#10b981;font-weight:700;">R$ ${subetapa.dados.valorTotal}</span></div>
                ${subetapa.dados.observacao ? `<div class="dado-item"><span class="dado-label">Observação:</span><span class="dado-valor">${subetapa.dados.observacao}</span></div>` : ''}
                ${subetapa.conclusao ? `<p style="font-size:12px;color:#6b7280;margin-top:8px;">Concluído por <strong>${subetapa.conclusao.usuario}</strong> em ${this.formatarDataHora(subetapa.conclusao.dataHora)}</p>` : ''}
            `;
        } else if (['TECNICO', 'ADMIN'].includes(this.usuario.perfil)) {
            const etapa5 = this.chamado.etapas.find(e => e.numero === 5);
            const sub51 = etapa5 ? etapa5.subetapas.find(s => Math.abs(s.numero - 5.1) < 0.01) : null;

            let html = '';
            if (sub51) {
                html += `
                    <div class="etapa-dados-anteriores">
                        <h4>Itens da Solicitação (5.1)</h4>
                        <div class="dado-item"><span class="dado-valor">${sub51.dados.itens}</span></div>
                    </div>
                `;
            }
            html += `
                <form class="etapa-form" id="form-sub-52">
                    <div class="form-group-etapa">
                        <label class="form-label-etapa">Número do Pedido</label>
                        <input type="text" class="form-input-etapa" id="numeroPedido" placeholder="Ex: PC-2024-001">
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Fornecedor</label>
                        <input type="text" class="form-input-etapa" id="fornecedorPedido" required placeholder="Nome do fornecedor">
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Valor Total (R$)</label>
                        <input type="number" step="0.01" class="form-input-etapa" id="valorTotalPedido" required placeholder="0,00">
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa">Observação</label>
                        <textarea class="form-textarea-etapa" id="observacaoPedido" placeholder="Informações adicionais..."></textarea>
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa">Anexo (Cotação/Pedido)</label>
                        <div class="file-upload-etapa">
                            <label for="anexoPedido" class="file-upload-btn-etapa">
                                <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                Anexar Arquivo
                            </label>
                            <input type="file" id="anexoPedido" style="display:none;" accept=".pdf,.jpg,.png,.doc,.docx">
                            <span class="file-name-etapa" id="fileNamePedido">Nenhum arquivo</span>
                        </div>
                    </div>
                    <div class="etapa-acoes">
                        <button type="submit" class="btn-etapa btn-etapa-primary">
                            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Registrar Pedido de Compra
                        </button>
                    </div>
                </form>
            `;
            div.innerHTML = html;

            setTimeout(() => {
                const fileInput = document.getElementById('anexoPedido');
                const fileNameEl = document.getElementById('fileNamePedido');
                if (fileInput && fileNameEl) {
                    fileInput.addEventListener('change', () => {
                        fileNameEl.textContent = fileInput.files[0] ? fileInput.files[0].name : 'Nenhum arquivo';
                    });
                }
                const form = document.getElementById('form-sub-52');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        const numeroPedido = document.getElementById('numeroPedido').value;
                        const fornecedor = document.getElementById('fornecedorPedido').value;
                        const valorTotal = document.getElementById('valorTotalPedido').value;
                        const observacao = document.getElementById('observacaoPedido').value;
                        const fileInput = document.getElementById('anexoPedido');
                        if (fornecedor && valorTotal) {
                            lerArquivosBase64(fileInput).then(anexos => {
                                this.chamado.concluirSubetapa52(numeroPedido, fornecedor, [], valorTotal, observacao, anexos, this.usuario);
                                window.gerenciadorChamados.atualizarChamado(this.chamado);
                                this.render();
                            });
                        }
                    });
                }
            }, 0);
        } else {
            div.innerHTML = '<p style="color:#6b7280;font-style:italic;">Aguardando pedido de compra pelo Comprador...</p>';
        }
        return div;
    }

    // ---- 5.3 - PROGRAMAR ENTREGA ----
    renderSubetapa53(subetapa) {
        const div = document.createElement('div');

        if (subetapa.status === 'CONCLUIDA') {
            div.innerHTML = `
                <div class="dado-item"><span class="dado-label">Data de Entrega:</span><span class="dado-valor">${this.formatarData(subetapa.dados.dataEntrega)}</span></div>
                <div class="dado-item"><span class="dado-label">Horário:</span><span class="dado-valor">${subetapa.dados.horaEntrega || '-'}</span></div>
                <div class="dado-item"><span class="dado-label">Local de Entrega:</span><span class="dado-valor">${subetapa.dados.localEntrega}</span></div>
                ${subetapa.dados.observacao ? `<div class="dado-item"><span class="dado-label">Observação:</span><span class="dado-valor">${subetapa.dados.observacao}</span></div>` : ''}
                ${subetapa.conclusao ? `<p style="font-size:12px;color:#6b7280;margin-top:8px;">Concluído por <strong>${subetapa.conclusao.usuario}</strong> em ${this.formatarDataHora(subetapa.conclusao.dataHora)}</p>` : ''}
            `;
        } else if (['COMPRADOR', 'ADMINISTRATIVO', 'ADMIN'].includes(this.usuario.perfil)) {
            div.innerHTML = `
                <form class="etapa-form" id="form-sub-53">
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Data Programada de Entrega</label>
                        <input type="date" class="form-input-etapa" id="dataEntrega" required>
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa">Horário</label>
                        <input type="time" class="form-input-etapa" id="horaEntrega">
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Local de Entrega</label>
                        <input type="text" class="form-input-etapa" id="localEntrega" required placeholder="Ex: Almoxarifado, Recepção...">
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa">Observação</label>
                        <textarea class="form-textarea-etapa" id="observacaoEntrega" placeholder="Informações adicionais sobre a entrega..."></textarea>
                    </div>
                    <div class="etapa-acoes">
                        <button type="submit" class="btn-etapa btn-etapa-primary">
                            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Confirmar Programação de Entrega
                        </button>
                    </div>
                </form>
            `;
            setTimeout(() => {
                const form = document.getElementById('form-sub-53');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        const dataEntrega = document.getElementById('dataEntrega').value;
                        const horaEntrega = document.getElementById('horaEntrega').value;
                        const localEntrega = document.getElementById('localEntrega').value;
                        const observacao = document.getElementById('observacaoEntrega').value;
                        if (dataEntrega && localEntrega) {
                            this.chamado.concluirSubetapa53(dataEntrega, horaEntrega, localEntrega, observacao, this.usuario);
                            window.gerenciadorChamados.atualizarChamado(this.chamado);
                            this.render();
                        }
                    });
                }
            }, 0);
        } else {
            div.innerHTML = '<p style="color:#6b7280;font-style:italic;">Aguardando programação da entrega pelo Comprador...</p>';
        }
        return div;
    }

    // ==================== ETAPA 6 - RECEBIMENTO DE MERCADORIA ====================
    renderEtapa6(etapa) {
        const div = document.createElement('div');

        const etapa5 = this.chamado.etapas.find(e => e.numero === 5);
        const sub53 = etapa5 ? etapa5.subetapas.find(s => Math.abs(s.numero - 5.3) < 0.01) : null;

        if (sub53 && sub53.status === 'CONCLUIDA') {
            div.innerHTML = `
                <div class="etapa-dados-anteriores">
                    <h4>Entrega Programada</h4>
                    <div class="dado-item">
                        <span class="dado-label">Data:</span>
                        <span class="dado-valor">${this.formatarData(sub53.dados.dataEntrega)} ${sub53.dados.horaEntrega ? 'às ' + sub53.dados.horaEntrega : ''}</span>
                    </div>
                    <div class="dado-item">
                        <span class="dado-label">Local:</span>
                        <span class="dado-valor">${sub53.dados.localEntrega}</span>
                    </div>
                </div>
            `;
        }

        if (etapa.status === 'CONCLUIDA') {
            div.innerHTML += `
                <div class="dado-item"><span class="dado-label">Data de Recebimento:</span><span class="dado-valor">${this.formatarData(etapa.dados.dataRecebimento)}</span></div>
                <div class="dado-item"><span class="dado-label">Número da NF:</span><span class="dado-valor">${etapa.dados.numeroNF || '-'}</span></div>
                ${etapa.dados.observacao ? `<div class="dado-item"><span class="dado-label">Observação:</span><span class="dado-valor">${etapa.dados.observacao}</span></div>` : ''}
            `;
        } else if (['ADMINISTRATIVO', 'ADMIN'].includes(this.usuario.perfil)) {
            div.innerHTML += `
                <form class="etapa-form" id="form-etapa-6">
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Data de Recebimento</label>
                        <input type="date" class="form-input-etapa" id="dataRecebimento" required>
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa">Número da Nota Fiscal</label>
                        <input type="text" class="form-input-etapa" id="numeroNF" placeholder="Ex: NF 000123">
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa">Observação</label>
                        <textarea class="form-textarea-etapa" id="observacaoRecebimento" placeholder="Condições do recebimento, divergências, etc..."></textarea>
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa">Fotos do Recebimento (Opcional)</label>
                        <div class="file-upload-etapa">
                            <label for="fotosRecebimento" class="file-upload-btn-etapa">
                                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                Adicionar Fotos
                            </label>
                            <input type="file" id="fotosRecebimento" accept="image/*" multiple style="display:none;">
                            <span class="file-name-etapa" id="fileNameRecebimento">Nenhum arquivo</span>
                        </div>
                    </div>
                    <div class="etapa-acoes">
                        <button type="submit" class="btn-etapa btn-etapa-primary">
                            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Confirmar Recebimento
                        </button>
                    </div>
                </form>
            `;
            setTimeout(() => {
                const fileInput = document.getElementById('fotosRecebimento');
                const fileNameEl = document.getElementById('fileNameRecebimento');
                if (fileInput && fileNameEl) {
                    fileInput.addEventListener('change', () => {
                        fileNameEl.textContent = fileInput.files.length > 0 ? `${fileInput.files.length} foto(s) selecionada(s)` : 'Nenhum arquivo';
                    });
                }
                const form = document.getElementById('form-etapa-6');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        const dataRecebimento = document.getElementById('dataRecebimento').value;
                        const numeroNF = document.getElementById('numeroNF').value;
                        const observacao = document.getElementById('observacaoRecebimento').value;
                        const fileInput = document.getElementById('fotosRecebimento');
                        if (dataRecebimento) {
                            lerArquivosBase64(fileInput).then(fotos => {
                                this.chamado.concluirEtapa6(dataRecebimento, numeroNF, observacao, fotos, this.usuario);
                                window.gerenciadorChamados.atualizarChamado(this.chamado);
                                this.render();
                            });
                        }
                    });
                }
            }, 0);
        } else {
            div.innerHTML += '<p style="color:#6b7280;font-style:italic;">Aguardando recebimento da mercadoria...</p>';
        }
        return div;
    }

    // ==================== ETAPA 7 - PROGRAMAÇÃO DO SERVIÇO ====================
    renderEtapa7(etapa) {
        const div = document.createElement('div');

        if (etapa.status === 'CONCLUIDA') {
            div.innerHTML = `
                <div class="dado-item"><span class="dado-label">Data do Serviço:</span><span class="dado-valor">${this.formatarData(etapa.dados.dataServico)}</span></div>
                <div class="dado-item"><span class="dado-label">Horário:</span><span class="dado-valor">${etapa.dados.horaServico || '-'}</span></div>
                <div class="dado-item"><span class="dado-label">Técnico Responsável:</span><span class="dado-valor">${etapa.dados.tecnicoResponsavel}</span></div>
                ${etapa.dados.observacao ? `<div class="dado-item"><span class="dado-label">Observação:</span><span class="dado-valor">${etapa.dados.observacao}</span></div>` : ''}
            `;
        } else if (['ADMINISTRATIVO', 'ADMIN'].includes(this.usuario.perfil)) {
            div.innerHTML = `
                <form class="etapa-form" id="form-etapa-7">
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Data do Serviço</label>
                        <input type="date" class="form-input-etapa" id="dataServico" required>
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Horário</label>
                        <input type="time" class="form-input-etapa" id="horaServico" required>
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Técnico Responsável</label>
                        <input type="text" class="form-input-etapa" id="tecnicoResponsavel" required placeholder="Nome do técnico">
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa">Observação</label>
                        <textarea class="form-textarea-etapa" id="observacaoServico" placeholder="Informações adicionais..."></textarea>
                    </div>
                    <div class="etapa-acoes">
                        <button type="submit" class="btn-etapa btn-etapa-primary">
                            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Confirmar Programação
                        </button>
                    </div>
                </form>
            `;
            setTimeout(() => {
                const form = document.getElementById('form-etapa-7');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        const dataServico = document.getElementById('dataServico').value;
                        const horaServico = document.getElementById('horaServico').value;
                        const tecnico = document.getElementById('tecnicoResponsavel').value;
                        const observacao = document.getElementById('observacaoServico').value;
                        if (dataServico && horaServico && tecnico) {
                            this.chamado.concluirEtapa7(dataServico, horaServico, tecnico, observacao, this.usuario);
                            window.gerenciadorChamados.atualizarChamado(this.chamado);
                            this.render();
                        }
                    });
                }
            }, 0);
        } else {
            div.innerHTML = '<p style="color:#6b7280;font-style:italic;">Aguardando programação do serviço pela Administração...</p>';
        }
        return div;
    }

    // ==================== ETAPA 8 - EXECUÇÃO DA MANUTENÇÃO ====================
    renderEtapa8(etapa) {
        const div = document.createElement('div');

        const etapa7 = this.chamado.etapas.find(e => e.numero === 7);
        if (etapa7 && etapa7.status === 'CONCLUIDA') {
            div.innerHTML = `
                <div class="etapa-dados-anteriores">
                    <h4>Serviço Programado</h4>
                    <div class="dado-item"><span class="dado-label">Data/Hora:</span><span class="dado-valor">${this.formatarData(etapa7.dados.dataServico)} às ${etapa7.dados.horaServico}</span></div>
                    <div class="dado-item"><span class="dado-label">Técnico:</span><span class="dado-valor">${etapa7.dados.tecnicoResponsavel}</span></div>
                </div>
            `;
        }

        if (etapa.status === 'CONCLUIDA') {
            div.innerHTML += `
                <div class="dado-item"><span class="dado-label">Descrição do Serviço Executado:</span><span class="dado-valor">${etapa.dados.descricaoServico}</span></div>
                ${etapa.dados.materiaisUsados ? `<div class="dado-item"><span class="dado-label">Materiais Utilizados:</span><span class="dado-valor">${etapa.dados.materiaisUsados}</span></div>` : ''}
            `;
        } else if (['TECNICO', 'ADMIN'].includes(this.usuario.perfil)) {
            div.innerHTML += `
                <form class="etapa-form" id="form-etapa-8">
                    <div class="form-group-etapa">
                        <label class="form-label-etapa required">Descrição do Serviço Executado</label>
                        <textarea class="form-textarea-etapa" id="descricaoServico" required placeholder="Descreva detalhadamente o serviço executado..."></textarea>
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa">Materiais Utilizados</label>
                        <textarea class="form-textarea-etapa" id="materiaisUsados" placeholder="Liste os materiais e peças utilizados..."></textarea>
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa">Fotos (Opcional)</label>
                        <div class="file-upload-etapa">
                            <label for="fotosExecucao" class="file-upload-btn-etapa">
                                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                Adicionar Fotos
                            </label>
                            <input type="file" id="fotosExecucao" accept="image/*" multiple style="display:none;">
                            <span class="file-name-etapa" id="fileNameExecucao">Nenhum arquivo</span>
                        </div>
                    </div>
                    <div class="etapa-acoes">
                        <button type="submit" class="btn-etapa btn-etapa-primary">
                            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Concluir Execução
                        </button>
                    </div>
                </form>
            `;
            setTimeout(() => {
                const fileInput = document.getElementById('fotosExecucao');
                const fileNameEl = document.getElementById('fileNameExecucao');
                if (fileInput && fileNameEl) {
                    fileInput.addEventListener('change', () => {
                        fileNameEl.textContent = fileInput.files.length > 0 ? `${fileInput.files.length} foto(s)` : 'Nenhum arquivo';
                    });
                }
                const form = document.getElementById('form-etapa-8');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        const descricao = document.getElementById('descricaoServico').value;
                        const materiais = document.getElementById('materiaisUsados').value;
                        const fileInput = document.getElementById('fotosExecucao');
                        if (descricao) {
                            lerArquivosBase64(fileInput).then(fotos => {
                                this.chamado.concluirEtapa8(descricao, materiais, fotos, this.usuario);
                                window.gerenciadorChamados.atualizarChamado(this.chamado);
                                this.render();
                            });
                        }
                    });
                }
            }, 0);
        } else {
            div.innerHTML += '<p style="color:#6b7280;font-style:italic;">Aguardando execução da manutenção pelo Técnico...</p>';
        }
        return div;
    }

    // ==================== ETAPA 9 - FINALIZAÇÃO DO CHAMADO ====================
    renderEtapa9(etapa) {
        const div = document.createElement('div');

        if (etapa.status === 'CONCLUIDA') {
            div.innerHTML = `
                <div class="dado-item"><span class="dado-label">Confirmação:</span><span class="dado-valor" style="color:#10b981;font-weight:700;">✓ Problema Resolvido — Chamado Finalizado</span></div>
                ${etapa.dados.avaliacao ? `<div class="dado-item"><span class="dado-label">Avaliação:</span><span class="dado-valor">${'⭐'.repeat(parseInt(etapa.dados.avaliacao))}</span></div>` : ''}
                ${etapa.dados.observacaoFinal ? `<div class="dado-item"><span class="dado-label">Observação Final:</span><span class="dado-valor">${etapa.dados.observacaoFinal}</span></div>` : ''}
            `;
        } else if (['SOLICITANTE', 'ADMIN'].includes(this.usuario.perfil)) {
            div.innerHTML = `
                <form class="etapa-form" id="form-etapa-9">
                    <p style="color:#374151;margin-bottom:16px;">Confirme que o serviço foi executado corretamente e o problema foi resolvido para finalizar o chamado.</p>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa">Avaliação do Atendimento</label>
                        <select class="form-select-etapa" id="avaliacaoAtendimento">
                            <option value="">Selecione...</option>
                            <option value="1">⭐ Muito Ruim</option>
                            <option value="2">⭐⭐ Ruim</option>
                            <option value="3">⭐⭐⭐ Regular</option>
                            <option value="4">⭐⭐⭐⭐ Bom</option>
                            <option value="5">⭐⭐⭐⭐⭐ Excelente</option>
                        </select>
                    </div>
                    <div class="form-group-etapa">
                        <label class="form-label-etapa">Observação Final (Opcional)</label>
                        <textarea class="form-textarea-etapa" id="observacaoFinal" placeholder="Algum comentário sobre o atendimento?"></textarea>
                    </div>
                    <div class="etapa-acoes">
                        <button type="submit" class="btn-etapa btn-etapa-success">
                            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Confirmar e Finalizar Chamado
                        </button>
                    </div>
                </form>
            `;
            setTimeout(() => {
                const form = document.getElementById('form-etapa-9');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        if (confirm('Confirma que o problema foi resolvido e deseja finalizar o chamado?')) {
                            const avaliacao = document.getElementById('avaliacaoAtendimento').value;
                            const observacao = document.getElementById('observacaoFinal').value;
                            this.chamado.concluirEtapa9('CONFIRMADO', avaliacao, observacao, this.usuario);
                            window.gerenciadorChamados.atualizarChamado(this.chamado);
                            this.render();
                            alert('Chamado finalizado com sucesso! Obrigado pelo feedback.');
                        }
                    });
                }
            }, 0);
        } else {
            div.innerHTML = '<p style="color:#6b7280;font-style:italic;">Aguardando confirmação do Solicitante para finalizar o chamado...</p>';
        }
        return div;
    }

    // ==================== FORMULÁRIO — PAINEL ACUMULADO DE DADOS ====================
    // Exibe na aba "Formulário" todos os dados coletados nas etapas concluídas,
    // EXCETO observações/mensagens (que ficam no accordion de cada etapa).
    renderFormularioDados() {
        const div = document.createElement('div');
        div.className = 'formulario-dados-acumulados';

        const etapas = this.chamado.etapas || [];

        const blocos = [];

        // --- Etapa 1: dados de abertura ---
        const et1 = etapas.find(e => e.numero === 1);
        if (et1 && et1.status === 'CONCLUIDA') {
            const d = et1.dados;
            let html = `<div class="form-dados-bloco">
                <div class="form-dados-bloco-titulo">
                    <span class="form-dados-num">1</span> Abertura do Chamado
                </div>`;
            if (d.unidade)        html += `<div class="dado-item"><span class="dado-label">Unidade / Local:</span><span class="dado-valor">${d.unidade}</span></div>`;
            if (d.tipoManutencao) html += `<div class="dado-item"><span class="dado-label">Tipo de Manutenção:</span><span class="dado-valor">${d.tipoManutencao}</span></div>`;
            if (d.email)          html += `<div class="dado-item"><span class="dado-label">E-mail:</span><span class="dado-valor">${d.email}</span></div>`;
            if (d.contato)        html += `<div class="dado-item"><span class="dado-label">Contato:</span><span class="dado-valor">${d.contato}</span></div>`;
            html += `</div>`;
            blocos.push(html);
        }

        // --- Etapa 2: agendamento ---
        const et2 = etapas.find(e => e.numero === 2);
        if (et2 && et2.status === 'CONCLUIDA') {
            const d = et2.dados;
            let html = `<div class="form-dados-bloco">
                <div class="form-dados-bloco-titulo">
                    <span class="form-dados-num">2</span> Agendamento da Avaliação
                </div>`;
            if (d.dataAgendamento) html += `<div class="dado-item"><span class="dado-label">Data:</span><span class="dado-valor">${this.formatarData(d.dataAgendamento)}</span></div>`;
            if (d.horaAgendamento) html += `<div class="dado-item"><span class="dado-label">Horário:</span><span class="dado-valor">${d.horaAgendamento}</span></div>`;
            html += `</div>`;
            blocos.push(html);
        }

        // --- Etapa 3: confirmação ---
        const et3 = etapas.find(e => e.numero === 3);
        if (et3 && et3.status === 'CONCLUIDA') {
            const d = et3.dados;
            let html = `<div class="form-dados-bloco">
                <div class="form-dados-bloco-titulo">
                    <span class="form-dados-num">3</span> Confirmação da Avaliação
                </div>
                <div class="dado-item"><span class="dado-label">Decisão:</span>
                <span class="dado-valor" style="color:${d.decisao === 'APROVADO' ? '#10b981' : '#ef4444'};font-weight:600;">
                    ${d.decisao === 'APROVADO' ? '✓ Confirmado' : '✗ Reprovado'}
                </span></div>`;
            html += `</div>`;
            blocos.push(html);
        }

        // --- Etapa 4: técnico ---
        const et4 = etapas.find(e => e.numero === 4);
        if (et4 && (et4.status === 'CONCLUIDA' || et4.status === 'AGUARDANDO_CONFIRMACAO')) {
            const d = et4.dados;
            let html = `<div class="form-dados-bloco">
                <div class="form-dados-bloco-titulo">
                    <span class="form-dados-num">4</span> Técnico Designado
                </div>`;
            if (d.tecnicoNome)   html += `<div class="dado-item"><span class="dado-label">Técnico:</span><span class="dado-valor">${d.tecnicoNome}</span></div>`;
            if (d.dataAvaliacao) html += `<div class="dado-item"><span class="dado-label">Data da Avaliação:</span><span class="dado-valor">${this.formatarData(d.dataAvaliacao)}</span></div>`;
            if (d.horaAvaliacao) html += `<div class="dado-item"><span class="dado-label">Horário:</span><span class="dado-valor">${d.horaAvaliacao}</span></div>`;
            html += `</div>`;
            blocos.push(html);
        }

        if (blocos.length === 0) {
            div.innerHTML = '<p style="color:#9ca3af;font-size:13px;font-style:italic;padding:8px 0;">Nenhum dado registrado ainda.</p>';
        } else {
            div.innerHTML = blocos.join('');
        }

        return div;
    }

    // ==================== UTILITÁRIOS ====================
    formatarData(data) {
        if (!data) return '-';
        const d = new Date(data);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }

    formatarDataHora(data) {
        if (!data) return '-';
        const d = new Date(data);
        return `${this.formatarData(data)} às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
}

// ==================== FUNÇÕES GLOBAIS PARA TOGGLE ====================
window.toggleEtapa = function (numero) {
    const chamado = window.chamadoAtual;
    if (chamado) {
        chamado.toggleEtapa(numero);
        window.gerenciadorChamados.atualizarChamado(chamado);
        window.renderizadorAtual.render();
    }
};

window.toggleSubetapa = function (numero) {
    const chamado = window.chamadoAtual;
    if (chamado) {
        chamado.toggleEtapa(parseFloat(numero));
        window.gerenciadorChamados.atualizarChamado(chamado);
        window.renderizadorAtual.render();
    }
};

window.RenderizadorEtapas = RenderizadorEtapas;