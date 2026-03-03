// =============================================================================
// ABA-MENSAGENS.JS — Renderização da aba Mensagens na tela de detalhes
// =============================================================================

(function () {

    // =========================================================================
    // RENDERIZAÇÃO PRINCIPAL
    // =========================================================================

    function renderMensagens(chamado) {
        const container = document.getElementById('historyMessages');
        if (!container) return;
        container.innerHTML = '';

        const grupos = [];
        (chamado.etapas || []).forEach(etapa => {
            const subsConcluidas = (etapa.subetapas || []).filter(s => s.status === 'CONCLUIDA' && s.conclusao);
            if (etapa.status === 'CONCLUIDA' && etapa.conclusao) {
                grupos.push({ etapa: { ...etapa }, subs: subsConcluidas });
            } else if (subsConcluidas.length > 0) {
                grupos.push({ etapa: null, subs: subsConcluidas });
            }
        });

        const totalMsgs = grupos.reduce((acc, g) => acc + (g.etapa ? 1 : 0) + g.subs.length, 0);
        const badgeEl = document.getElementById('badgeMensagens');
        if (badgeEl) badgeEl.textContent = totalMsgs;

        if (grupos.length === 0) {
            const vazio = document.createElement('p');
            vazio.style.cssText = 'color:var(--color-gray-400);font-size:14px;font-style:italic;padding:20px 0;';
            vazio.textContent = 'Nenhuma etapa concluida ainda.';
            container.appendChild(vazio);
        }

        // Wrapper único — cards colados estilo Modelo 3
        const slWrapper = document.createElement('div');
        slWrapper.className = 'msg-sl-list';

        grupos.forEach(grupo => {
            if (grupo.etapa) {
                slWrapper.appendChild(_buildSlItem(grupo.etapa, false));
            }
            grupo.subs.forEach(sub => {
                slWrapper.appendChild(_buildSlItem(sub, true));
            });
        });

        container.appendChild(slWrapper);
        _renderFormularioInline(chamado, container);
    }


    // =========================================================================
    // ITEM ESTILO MODELO 3
    // =========================================================================

    const _badgeClasses = {
        SOLICITANTE:    'badge-solicitante',
        TECNICO:        'badge-tecnico',
        ADMINISTRATIVO: 'badge-administrativo',
        COMPRADOR:      'badge-comprador',
        GESTOR:         'badge-admin'
    };

    function _buildSlItem(msg, isSub) {
        const badgeClass = _badgeClasses[msg.categoria] || 'badge-admin';
        const label      = (window.CATEGORIA_LABEL || {})[msg.categoria] || msg.categoria;
        const campos     = _extrairCamposMensagem(msg.numero, msg.dados || {});
        const uid        = 'sl-detail-' + String(msg.numero).replace('.', '_');

        const item = document.createElement('div');
        item.className = 'msg-sl-item' + (isSub ? ' msg-sl-sub' : '');

        // ── HEADER (Modelo 3)
        const header = document.createElement('div');
        header.className = 'msg-sl-header';
        header.innerHTML =
            '<div class="msg-sl-left">'
            +   '<div class="msg-sl-dot">'
            +     '<svg class="msg-sl-chk" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'
            +   '</div>'
            +   '<div class="msg-sl-info">'
            +     '<span class="msg-sl-name">ETAPA ' + msg.numero + ' — ' + msg.titulo.toUpperCase() + '</span>'
            +   '</div>'
            + '</div>'
            + '<button class="msg-sl-btn" aria-label="Expandir">'
            +   'detalhes'
            +   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'
            +     '<polyline points="18 15 12 9 6 15"></polyline>'
            +   '</svg>'
            + '</button>';

        // ── BODY colapsável (conteúdo igual ao anterior)
        const body = document.createElement('div');
        body.className = 'msg-sl-body collapsed';
        body.id = uid;

        const camposHTML = campos.map(c =>
            '<p class="msg-ticket-conteudo-linha"><strong>' + c.label + ':</strong> ' + c.valor + '</p>'
        ).join('');

        body.innerHTML =
            '<div class="msg-ticket-remetente">'
            +   '<div class="msg-ticket-avatar">'
            +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
            +       '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>'
            +       '<circle cx="12" cy="7" r="4"></circle>'
            +     '</svg>'
            +   '</div>'
            +   '<div class="msg-ticket-remetente-info">'
            +     '<span class="msg-ticket-remetente-nome">' + msg.conclusao.usuario + '</span>'
            +     '<span class="msg-ticket-remetente-unidade">' + label + '</span>'
            +   '</div>'
            +   '<span class="msg-ticket-perfil-badge ' + badgeClass + '">' + label.toUpperCase() + '</span>'
            + '</div>'
            + '<div class="msg-ticket-divider"></div>'
            + '<div class="msg-ticket-conteudo">'
            +   camposHTML
            +   '<span class="msg-ticket-data-rodape">' + formatarDataHora(msg.conclusao.dataHora) + '</span>'
            + '</div>';

        item.appendChild(header);
        item.appendChild(body);

        // toggle expand/collapse
        header.querySelector('.msg-sl-btn').addEventListener('click', function () {
            const isCollapsed = body.classList.contains('collapsed');
            body.classList.toggle('collapsed', !isCollapsed);
            this.classList.toggle('open', isCollapsed);
        });

        return item;
    }


    // =========================================================================
    // FORMULARIO INLINE DA ETAPA ATIVA
    // =========================================================================

    function _renderFormularioInline(chamado, container) {
        const etapa = window.getEtapaAtiva(chamado);
        if (!etapa || chamado.status === 'FINALIZADO') return;

        const pode        = window.podeAtenderEtapa(etapa, window.usuarioAtual.perfil);
        const responsavel = (window.CATEGORIA_LABEL || {})[etapa.categoria] || etapa.categoria;
        const badgeClass  = _badgeClasses[etapa.categoria] || 'badge-admin';

        const wrapper = document.createElement('div');
        wrapper.className = 'msg-ticket-wrapper';

        if (pode) {
            const isConfirmacao = etapa.numero === 3;
            const isEstoque     = etapa.numero === 6;
            const isGestor      = etapa.numero === 11;
            const isTecnicoConf = etapa.numero === 4 && etapa.status === 'AGUARDANDO_CONFIRMACAO';

            wrapper.innerHTML =
                '<div class="msg-ticket-card" id="cardFormularioInline">'
                + '<div class="msg-ticket-header" id="areaAtenderBtn">'
                +   '<div class="msg-ticket-header-esq">'
                +     '<div class="msg-ticket-num">' + etapa.numero + '</div>'
                +     '<div class="msg-ticket-header-info">'
                +       '<span class="msg-ticket-subtexto">Sua ação é necessária</span>'
                +       '<span class="msg-ticket-titulo">ETAPA ' + etapa.numero + ' — ' + etapa.titulo.toUpperCase() + '</span>'
                +     '</div>'
                +   '</div>'
                +   '<div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">'
                +     '<button class="msg-ticket-detalhes-btn" id="btnAtenderChamado">'
                +       'Atender'
                +       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="msg-ticket-chevron"><polyline points="6 9 12 15 18 9"/></svg>'
                +     '</button>'
                +   '</div>'
                + '</div>'
                + '<div class="msg-ticket-body collapsed" id="areaFormularioAtender">'
                +   '<div style="padding:16px;">'
                +     _buildFormularioInlineHTML(etapa, isConfirmacao, isEstoque, isGestor, isTecnicoConf)
                +     '<div id="areaCancelarAtender" style="margin-top:12px;display:flex;justify-content:flex-end;">'
                +       '<button class="msg-ticket-detalhes-btn" id="btnCancelarAtender">Cancelar</button>'
                +     '</div>'
                +   '</div>'
                + '</div>'
                + '</div>';

            container.appendChild(wrapper);

            const btnAtender  = wrapper.querySelector('#btnAtenderChamado');
            const areaForm    = wrapper.querySelector('#areaFormularioAtender');
            const chevron     = btnAtender.querySelector('.msg-ticket-chevron');

            btnAtender.addEventListener('click', function () {
                const aberto = !areaForm.classList.contains('collapsed');
                if (aberto) {
                    areaForm.classList.add('collapsed');
                    btnAtender.innerHTML = 'Atender <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="msg-ticket-chevron"><polyline points="6 9 12 15 18 9"/></svg>';
                } else {
                    areaForm.classList.remove('collapsed');
                    btnAtender.innerHTML = 'Fechar <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="msg-ticket-chevron" style="transform:rotate(180deg)"><polyline points="6 9 12 15 18 9"/></svg>';
                    areaForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    setTimeout(function () {
                        const primeiro = areaForm.querySelector('textarea, input, select');
                        if (primeiro) primeiro.focus();
                    }, 300);
                }
            });

            wrapper.querySelector('#btnCancelarAtender').addEventListener('click', function () {
                areaForm.classList.add('collapsed');
                btnAtender.innerHTML = 'Atender <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="msg-ticket-chevron"><polyline points="6 9 12 15 18 9"/></svg>';
            });

            _bindFormularioInlineEvents(wrapper, chamado, etapa, isConfirmacao, isEstoque, isGestor, isTecnicoConf);

        } else {
            wrapper.innerHTML =
                '<div class="msg-ticket-card">'
                + '<div class="msg-ticket-header" style="cursor:default;">'
                +   '<div class="msg-ticket-header-esq">'
                +     '<div class="msg-ticket-num">' + etapa.numero + '</div>'
                +     '<div class="msg-ticket-header-info">'
                +       '<span class="msg-ticket-subtexto">Aguardando</span>'
                +       '<span class="msg-ticket-titulo">ETAPA ' + etapa.numero + ' — ' + etapa.titulo.toUpperCase() + '</span>'
                +     '</div>'
                +   '</div>'
                +   '<span class="chamado-mensagem-perfil-badge ' + badgeClass + '" style="display:none;">' + responsavel + '</span>'
                + '</div>'
                + '</div>';
            container.appendChild(wrapper);
        }
    }


    // =========================================================================
    // HTML DO FORMULARIO INLINE
    // =========================================================================

    function _buildFormularioInlineHTML(etapa, isConfirmacao, isEstoque, isGestor, isTecnicoConf) {

        if (isTecnicoConf) {
            return '<p style="font-size:13px;color:var(--color-gray-700);margin-bottom:16px;">Voce foi designado como tecnico para este chamado. Confirme o recebimento para prosseguir.</p>'
                + '<div style="display:flex;gap:10px;justify-content:flex-end;">'
                + '<button id="btnInlineConfirmarTecnico" class="btn-submit">Confirmar recebimento</button>'
                + '</div>';
        }

        if (etapa.numero === 2) {
            return '<div class="form-group" style="margin-bottom:14px;">'
                + '<label class="form-label">Data do Agendamento</label>'
                + '<input type="date" id="inlineDataAgendamento" class="form-input" style="width:100%;padding:10px 14px;border:1px solid var(--color-gray-300);border-radius:8px;font-size:14px;font-family:inherit;">'
                + '</div>'
                + '<div class="form-group" style="margin-bottom:14px;">'
                + '<label class="form-label">Horario</label>'
                + '<input type="time" id="inlineHoraAgendamento" class="form-input" style="width:100%;padding:10px 14px;border:1px solid var(--color-gray-300);border-radius:8px;font-size:14px;font-family:inherit;">'
                + '</div>'
                + '<div class="form-group" style="margin-bottom:16px;">'
                + '<label class="form-label">Mensagem ao Solicitante</label>'
                + '<textarea id="inlineObservacao" class="form-textarea" rows="3" placeholder="Instrucoes ou observacoes para o solicitante confirmar o agendamento..."></textarea>'
                + '</div>'
                + '<div style="display:flex;gap:10px;justify-content:flex-end;">'
                + '<button id="btnInlineAvancar" class="btn-submit">Confirmar Agendamento</button>'
                + '</div>';
        }

        if (isConfirmacao) {
            return '<div class="form-group" style="margin-bottom:12px;">'
                + '<label class="form-label">Motivo da reprovacao (obrigatorio se reprovar)</label>'
                + '<textarea id="inlineMotivo" class="form-textarea" rows="2" placeholder="Informe o motivo caso queira reprovar e remarcar..."></textarea>'
                + '</div>'
                + '<div style="display:flex;gap:10px;justify-content:flex-end;">'
                + '<button id="btnInlineReprovar" class="btn-cancel">Reprovar - Remarcar</button>'
                + '<button id="btnInlineAprovar" class="btn-submit">Confirmar agendamento</button>'
                + '</div>';
        }

        if (isEstoque) {
            return '<p style="font-size:13px;color:var(--color-gray-700);margin-bottom:12px;">O material necessario para execucao do servico esta disponivel no estoque?</p>'
                + '<div class="form-group" style="margin-bottom:12px;">'
                + '<label class="form-label">Observacao</label>'
                + '<textarea id="inlineObservacao" class="form-textarea" rows="2" placeholder="Descreva os materiais verificados..."></textarea>'
                + '</div>'
                + '<div style="display:flex;gap:10px;justify-content:flex-end;">'
                + '<button id="btnInlineEstoqueNao" class="btn-cancel">Nao - Solicitar compra</button>'
                + '<button id="btnInlineEstoqueSim" class="btn-submit">Sim - Programar servico</button>'
                + '</div>';
        }

        if (isGestor) {
            return '<div class="form-group" style="margin-bottom:12px;">'
                + '<label class="form-label">Parecer do Gestor</label>'
                + '<textarea id="inlineObservacao" class="form-textarea" rows="3" placeholder="Descreva sua avaliacao do servico executado..."></textarea>'
                + '</div>'
                + '<div style="display:flex;gap:10px;justify-content:flex-end;">'
                + '<button id="btnInlineAvancar" class="btn-submit">Aprovar execucao</button>'
                + '</div>';
        }

        if (etapa.numero === 4 && !isTecnicoConf) {
            const todosUsuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
            const tecnicos = todosUsuarios.filter(u =>
                u.status !== 'Desligado' && u.status !== 'Inativo' &&
                (u.perfil === 'TECNICO' || u.perfil === 'ADMIN')
            );
            const opcoes = tecnicos.map(t =>
                '<option value="' + t.usuario + '" data-nome="' + t.nomeCompleto + '">'
                + t.nomeCompleto + ' (' + t.usuario + ')'
                + '</option>'
            ).join('');

            return '<div class="form-group" style="margin-bottom:14px;">'
                + '<label class="form-label">Técnico Responsável</label>'
                + '<select id="inlineTecnico" class="form-input"><option value="">Selecione...</option>' + opcoes + '</select>'
                + '</div>'
                + '<div class="form-group" style="margin-bottom:14px;">'
                + '<label class="form-label">Data da Avaliação</label>'
                + '<input type="date" id="inlineDataAvaliacao" class="form-input">'
                + '</div>'
                + '<div class="form-group" style="margin-bottom:14px;">'
                + '<label class="form-label">Horário</label>'
                + '<input type="time" id="inlineHoraAvaliacao" class="form-input">'
                + '</div>'
                + '<div class="form-group" style="margin-bottom:16px;">'
                + '<label class="form-label">Mensagem ao Técnico</label>'
                + '<textarea id="inlineObservacao" class="form-textarea" rows="3"></textarea>'
                + '</div>'
                + '<div style="display:flex;gap:10px;justify-content:flex-end;">'
                + '<button id="btnInlineComunicarTecnico" class="btn-submit">Comunicar Técnico</button>'
                + '</div>';
        }

        return '<div class="form-group" style="margin-bottom:16px;">'
            + '<label class="form-label">Observacao</label>'
            + '<textarea id="inlineObservacao" class="form-textarea" rows="3" placeholder="Descreva a acao realizada nesta etapa..."></textarea>'
            + '</div>'
            + '<div style="display:flex;gap:10px;justify-content:flex-end;">'
            + '<button id="btnInlineAvancar" class="btn-submit">Avancar Chamado</button>'
            + '</div>';
    }


    // =========================================================================
    // EVENTOS DO FORMULARIO INLINE
    // =========================================================================

    function _bindFormularioInlineEvents(wrapper, chamado, etapa, isConfirmacao, isEstoque, isGestor, isTecnicoConf) {

        if (etapa.numero === 2) {
            wrapper.querySelector('#btnInlineAvancar').addEventListener('click', function () {
                const data = wrapper.querySelector('#inlineDataAgendamento').value;
                const hora = wrapper.querySelector('#inlineHoraAgendamento').value;
                const obs  = wrapper.querySelector('#inlineObservacao').value.trim();
                if (!data) { const el = wrapper.querySelector('#inlineDataAgendamento'); el.style.borderColor = 'var(--color-danger)'; el.focus(); return; }
                if (!hora) { const el = wrapper.querySelector('#inlineHoraAgendamento'); el.style.borderColor = 'var(--color-danger)'; el.focus(); return; }
                const c = window.reidratarChamado(window.gerenciadorChamados.chamados.find(x => x.id == chamado.id));
                c.concluirEtapa2(data, hora, obs, window.usuarioAtual);
                window.gerenciadorChamados.atualizarChamado(c);
                window.reRenderizarDetalhes(c.id);
            });
            return;
        }

        if (etapa.numero === 4 && !isTecnicoConf) {
            wrapper.querySelector('#btnInlineComunicarTecnico').addEventListener('click', function () {
                const sel        = wrapper.querySelector('#inlineTecnico');
                const tecUsuario = sel.value;
                const tecNome    = sel.options[sel.selectedIndex]?.dataset.nome || '';
                const data       = wrapper.querySelector('#inlineDataAvaliacao').value;
                const hora       = wrapper.querySelector('#inlineHoraAvaliacao').value;
                const obs        = wrapper.querySelector('#inlineObservacao').value.trim();
                if (!tecUsuario || !data || !hora) return;
                const c = window.reidratarChamado(window.gerenciadorChamados.chamados.find(x => x.id == chamado.id));
                c.selecionarTecnicoEtapa4(tecUsuario, tecNome, obs, window.usuarioAtual);
                const etapaObj = c._getEtapa(4);
                if (etapaObj) { etapaObj.dados.dataAvaliacao = data; etapaObj.dados.horaAvaliacao = hora; }
                window.gerenciadorChamados.atualizarChamado(c);
                window.reRenderizarDetalhes(c.id);
            });
            return;
        }

        if (isTecnicoConf) {
            wrapper.querySelector('#btnInlineConfirmarTecnico').addEventListener('click', function () {
                const c = window.reidratarChamado(window.gerenciadorChamados.chamados.find(x => x.id == chamado.id));
                c.tecnicoConfirmarEtapa4(window.usuarioAtual);
                window.gerenciadorChamados.atualizarChamado(c);
                window.reRenderizarDetalhes(c.id);
            });
            return;
        }

        if (isConfirmacao) {
            wrapper.querySelector('#btnInlineAprovar').addEventListener('click', function () {
                const c = window.reidratarChamado(window.gerenciadorChamados.chamados.find(x => x.id == chamado.id));
                c.confirmarEtapa3(true, '', window.usuarioAtual);
                window.gerenciadorChamados.atualizarChamado(c);
                window.reRenderizarDetalhes(c.id);
            });
            wrapper.querySelector('#btnInlineReprovar').addEventListener('click', function () {
                const motivo = wrapper.querySelector('#inlineMotivo').value.trim();
                if (!motivo) { const el = wrapper.querySelector('#inlineMotivo'); el.style.borderColor = 'var(--color-danger)'; el.focus(); return; }
                const c = window.reidratarChamado(window.gerenciadorChamados.chamados.find(x => x.id == chamado.id));
                c.confirmarEtapa3(false, motivo, window.usuarioAtual);
                window.gerenciadorChamados.atualizarChamado(c);
                window.reRenderizarDetalhes(c.id);
            });
            return;
        }

        if (isEstoque) {
            wrapper.querySelector('#btnInlineEstoqueSim').addEventListener('click', function () {
                const obs = wrapper.querySelector('#inlineObservacao').value.trim();
                const c = window.reidratarChamado(window.gerenciadorChamados.chamados.find(x => x.id == chamado.id));
                c.concluirEtapa6(true, obs, window.usuarioAtual);
                window.gerenciadorChamados.atualizarChamado(c);
                window.reRenderizarDetalhes(c.id);
            });
            wrapper.querySelector('#btnInlineEstoqueNao').addEventListener('click', function () {
                const obs = wrapper.querySelector('#inlineObservacao').value.trim();
                const c = window.reidratarChamado(window.gerenciadorChamados.chamados.find(x => x.id == chamado.id));
                c.concluirEtapa6(false, obs, window.usuarioAtual);
                window.gerenciadorChamados.atualizarChamado(c);
                window.reRenderizarDetalhes(c.id);
            });
            return;
        }

        if (isGestor) {
            wrapper.querySelector('#btnInlineAvancar').addEventListener('click', function () {
                const parecer = wrapper.querySelector('#inlineObservacao').value.trim();
                if (!parecer) { wrapper.querySelector('#inlineObservacao').focus(); return; }
                const c = window.reidratarChamado(window.gerenciadorChamados.chamados.find(x => x.id == chamado.id));
                c.aprovarEtapa11(parecer, window.usuarioAtual);
                window.gerenciadorChamados.atualizarChamado(c);
                window.reRenderizarDetalhes(c.id);
            });
            return;
        }

        wrapper.querySelector('#btnInlineAvancar').addEventListener('click', function () {
            const obs = wrapper.querySelector('#inlineObservacao').value.trim();
            if (!obs) { const el = wrapper.querySelector('#inlineObservacao'); el.style.borderColor = 'var(--color-danger)'; el.focus(); return; }
            _concluirEtapaGenerica(chamado, etapa, obs);
        });
    }


    // =========================================================================
    // CONCLUIR ETAPA GENERICA
    // =========================================================================

    function _concluirEtapaGenerica(chamado, etapa, observacao) {
        const c = window.reidratarChamado(window.gerenciadorChamados.chamados.find(x => x.id == chamado.id));
        const n = etapa.numero;

        if      (n === 2)    c.concluirEtapa2('', '', observacao, window.usuarioAtual);
        else if (n === 3)    c.selecionarTecnicoEtapa4('', '', observacao, window.usuarioAtual);
        else if (n === 4)    c.selecionarTecnicoEtapa4('', '', observacao, window.usuarioAtual);
        else if (n === 5.1)  c.concluirSubetapa51('', '', observacao, window.usuarioAtual);
        else if (n === 5.2)  c.concluirSubetapa52('', '', observacao, '', [], window.usuarioAtual);
        else if (n === 7.1)  c.concluirSubetapa71([], observacao, 'NORMAL', window.usuarioAtual);
        else if (n === 7.2)  c.concluirSubetapa72('', '', [], 0, observacao, null, window.usuarioAtual);
        else if (n === 7.3)  c.concluirSubetapa73('', '', '', observacao, window.usuarioAtual);
        else if (n === 8)    c.concluirEtapa8('', '', observacao, [], window.usuarioAtual);
        else if (n === 9)    c.concluirEtapa9('', '', '', observacao, window.usuarioAtual);
        else if (n === 10.1) c.concluirSubetapa101('', '', [], observacao, window.usuarioAtual);
        else if (n === 10.2) c.concluirSubetapa102('', '', observacao, '', [], window.usuarioAtual);
        else if (n === 12)   c.concluirEtapa12('SATISFEITO', 5, observacao, window.usuarioAtual);

        const etapaObj = c._getEtapa ? c._getEtapa(n) : null;
        if (etapaObj && etapaObj.dados && !etapaObj.dados.observacao) {
            etapaObj.dados.observacao = observacao;
        }

        window.gerenciadorChamados.atualizarChamado(c);
        window.reRenderizarDetalhes(c.id);
    }


    // =========================================================================
    // EXTRACAO DE CAMPOS
    // =========================================================================

    function _extrairCamposMensagem(numeroEtapa, d) {
        const campos = [];
        const add = (label, valor) => { if (valor) campos.push({ label, valor }); };

        switch (numeroEtapa) {
            case 1:
                add('OBSERVACAO', d.observacao);
                break;
            case 2:
                if (d.dataAgendamento) add('OBSERVACAO', d.observacao);
                add('DATA AGENDADA', _fmtData(d.dataAgendamento) + (d.horaAgendamento ? ' às ' + d.horaAgendamento : ''));
                break;
            case 3:
                add('OBSERVACAO', d.observacao);
                break;
            case 4:
                add('TÉCNICO RESPONSÁVEL', d.tecnicoNome);
                if (d.dataAvaliacao) add('DATA DA AVALIAÇÃO', _fmtData(d.dataAvaliacao) + (d.horaAvaliacao ? ' às ' + d.horaAvaliacao : ''));
                add('MENSAGEM AO TÉCNICO', d.observacao);
                add('SELECIONADO POR', d.selecionadoPor);
                break;
            case 5:   add('OBSERVACAO', d.observacao); break;
            case 5.1: add('OBSERVACAO', d.observacao); break;
            case 5.2:
                add('DIAGNOSTICO', d.diagnostico);
                add('MATERIAIS NECESSARIOS', d.materiaisNecessarios);
                break;
            case 6:   add('OBSERVACAO', d.observacao); break;
            case 10.2:
                add('SERVICO EXECUTADO', d.descricaoServico);
                add('MATERIAIS UTILIZADOS', d.materiaisUsados);
                break;
            default:
                add('STATUS', 'Etapa concluída.');
        }

        return campos;
    }

    function _fmtData(str) {
        if (!str) return '';
        const d = new Date(str + 'T00:00:00');
        return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    }

s
    // =========================================================================
    // EXPOSICAO GLOBAL
    // =========================================================================
    window.renderMensagens = renderMensagens;

})();