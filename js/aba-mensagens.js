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

        grupos.forEach(grupo => {
            const wrapper = document.createElement('div');
            wrapper.className = 'msg-ticket-wrapper';
            let html = '';
            if (grupo.etapa) html += _buildCardHTML(grupo.etapa, false);
            if (grupo.subs.length > 0) {
                html += '<div class="msg-ticket-subs">';
                grupo.subs.forEach(sub => { html += '<div class="msg-ticket-sub-item">' + _buildCardHTML(sub, true) + '</div>'; });
                html += '</div>';
            }
            wrapper.innerHTML = html;
            _bindToggle(wrapper);
            container.appendChild(wrapper);
        });

        _renderFormularioInline(chamado, container);
    }


    // =========================================================================
    // HTML DE UM CARD DE ETAPA
    // =========================================================================

    const _badgeClasses = {
        SOLICITANTE: 'badge-solicitante',
        TECNICO: 'badge-tecnico',
        ADMINISTRATIVO: 'badge-administrativo',
        COMPRADOR: 'badge-comprador',
        GESTOR: 'badge-admin'
    };

    function _buildCardHTML(msg, isSub) {
        const badgeClass = _badgeClasses[msg.categoria] || 'badge-admin';
        const label = (window.CATEGORIA_LABEL || {})[msg.categoria] || msg.categoria;
        const campos = _extrairCamposMensagem(msg.numero, msg.dados || {});
        const cardClass = isSub ? 'msg-ticket-card concluida msg-ticket-sub' : 'msg-ticket-card concluida';


        const camposHTML = campos.map(c => '<p class="msg-ticket-conteudo-linha"><strong>' + c.label + ':</strong> ' + c.valor + '</p>').join('');

        return '<div style="display:flex;flex-direction:column;">'
            + '<div class="' + cardClass + '">'
            + '<div class="msg-ticket-header msg-ticket-toggle">'
            + '<div class="msg-ticket-header-esq">'
            + '<div class="msg-ticket-num">' + msg.numero + '</div>'
            + '<div class="msg-ticket-header-info">'
            + '<span class="msg-ticket-subtexto">Etapa concluida</span>'
            + '<span class="msg-ticket-titulo">Etapa ' + msg.numero + ' - ' + msg.titulo + '</span>'
            + '</div>'
            + '</div>'
            + '<button class="msg-ticket-detalhes-btn msg-ticket-toggle" aria-label="Expandir">detalhes'
            + '<svg class="msg-ticket-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'
            + '<polyline points="18 15 12 9 6 15"></polyline></svg></button>'
            + '</div>'
            + '<div class="msg-ticket-body collapsed">'
            + '<div class="msg-ticket-remetente">'
            + '<div class="msg-ticket-avatar">'
            + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
            + '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>'
            + '<circle cx="12" cy="7" r="4"></circle></svg>'
            + '</div>'
            + '<div class="msg-ticket-remetente-info">'
            + '<span class="msg-ticket-remetente-nome">' + msg.conclusao.usuario + '</span>'
            + '<span class="msg-ticket-remetente-unidade">' + label + '</span>'
            + '</div>'
            + '<span class="msg-ticket-perfil-badge ' + badgeClass + '">' + label.toUpperCase() + '</span>'
            + '</div>'
            + '<div class="msg-ticket-divider"></div>'
            + '<div class="msg-ticket-conteudo">'
            + camposHTML
            + '<span class="msg-ticket-data-rodape">' + formatarDataHora(msg.conclusao.dataHora) + '</span>'
            + '</div>'
            + '</div>'
            + '</div>'
            + '</div>';
    }



    // =========================================================================
    // TOGGLE EXPAND / COLLAPSE
    // =========================================================================

    function _bindToggle(wrapper) {
        wrapper.querySelectorAll('.msg-ticket-card').forEach(card => {
            const body = card.querySelector('.msg-ticket-body');
            const chevron = card.querySelector('.msg-ticket-chevron');
            const btn = card.querySelector('.msg-ticket-detalhes-btn');
            const header = card.querySelector('.msg-ticket-header');

            // Corrige o estado inicial do chevron (body começa collapsed = fechado)
            if (chevron) chevron.style.transform = 'rotate(0deg)';

            function toggle(e) {
                e.stopPropagation();
                const isCollapsed = body.classList.contains('collapsed');
                body.classList.toggle('collapsed', !isCollapsed);
                if (chevron) chevron.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
            }

            // Apenas o botão e o header disparam o toggle (sem duplicar)
            btn?.addEventListener('click', toggle);
            header?.addEventListener('click', function (e) {
                // Só dispara se o clique não veio do botão
                if (!e.target.closest('.msg-ticket-detalhes-btn')) toggle(e);
            });
        });
    }


    // =========================================================================
    // FORMULARIO INLINE DA ETAPA ATIVA
    // =========================================================================

    function _renderFormularioInline(chamado, container) {
        const etapa = getEtapaAtiva(chamado);
        if (!etapa || chamado.status === 'FINALIZADO') return;

        const pode = podeAtenderEtapa(etapa, usuarioAtual.perfil);
        const responsavel = (window.CATEGORIA_LABEL || {})[etapa.categoria] || etapa.categoria;
        const badgeClass = _badgeClasses[etapa.categoria] || 'badge-admin';

        const wrapper = document.createElement('div');
        wrapper.className = 'msg-timeline-item';

        if (pode) {
            const isConfirmacao = etapa.numero === 3;
            const isEstoque = etapa.numero === 6;
            const isGestor = etapa.numero === 11;
            const isTecnicoConf = etapa.numero === 4 && etapa.status === 'AGUARDANDO_CONFIRMACAO';

            wrapper.innerHTML =
                '<div class="chamado-mensagem-card msg-card-ativo" id="cardFormularioInline" style="border-color:#d4b800;overflow:hidden;">'

                + '<div class="chamado-mensagem-header" style="background:#fffde7;border-bottom:1px solid #f0e000;">'
                + '<span class="msg-etapa-titulo" style="color:#7a6000;font-weight:600;">Etapa ' + etapa.numero + ' - ' + etapa.titulo + '</span>'
                + '<span class="chamado-mensagem-perfil-badge ' + badgeClass + '" style="margin-left:auto;">' + responsavel + '</span>'
                + '</div>'

                + '<div id="areaAtenderBtn" style="background:#fffde7;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:16px;">'
                + '<span style="font-size:14px;color:#9a7c00;font-style:italic;">Aguardando a sua ação.</span>'
                + '<button class="btn-submit" id="btnAtenderChamado" style="white-space:nowrap;flex-shrink:0;">Atender o Chamado</button>'
                + '</div>'

                + '<div class="chamado-mensagem-body" id="areaFormularioAtender" style="display:none;">'
                + _buildFormularioInlineHTML(etapa, isConfirmacao, isEstoque, isGestor, isTecnicoConf)
                + '</div>'

                + '</div>'

                + '<div id="areaCancelarAtender" style="display:none;margin-top:8px;">'
                + '<button class="btn-cancel" id="btnCancelarAtender">Cancelar</button>'
                + '</div>';

            container.appendChild(wrapper);

            wrapper.querySelector('#btnAtenderChamado').addEventListener('click', function () {
                wrapper.querySelector('#areaAtenderBtn').style.display = 'none';
                const areaForm = wrapper.querySelector('#areaFormularioAtender');
                areaForm.style.display = 'block';
                wrapper.querySelector('#areaCancelarAtender').style.display = 'block';
                areaForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                setTimeout(function () {
                    const primeiro = areaForm.querySelector('textarea, input, select');
                    if (primeiro) primeiro.focus();
                }, 300);
            });

            wrapper.querySelector('#btnCancelarAtender').addEventListener('click', function () {
                wrapper.querySelector('#areaFormularioAtender').style.display = 'none';
                wrapper.querySelector('#areaCancelarAtender').style.display = 'none';
                wrapper.querySelector('#areaAtenderBtn').style.display = 'flex';
            });

            _bindFormularioInlineEvents(wrapper, chamado, etapa, isConfirmacao, isEstoque, isGestor, isTecnicoConf);

        } else {
            wrapper.innerHTML =
                '<div class="chamado-mensagem-card">'
                + '<div class="chamado-mensagem-header">'
                + '<span class="msg-etapa-titulo">Etapa ' + etapa.numero + ' - ' + etapa.titulo + '</span>'
                + '<span class="chamado-mensagem-perfil-badge ' + badgeClass + '" style="margin-left:auto;">' + responsavel + '</span>'
                + '</div>'
                + '<div class="chamado-mensagem-body">'
                + '<p style="font-size:13px;color:var(--color-gray-500);font-style:italic;">Aguardando acao de: <strong style="color:var(--color-gray-700);">' + responsavel + '</strong></p>'
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
                u.status !== 'Desligado' &&
                u.status !== 'Inativo' &&
                (u.perfil === 'TECNICO' || u.perfil === 'ADMIN')
            );

            const opcoes = tecnicos.map(t =>
                '<option value="' + t.usuario + '" data-nome="' + t.nomeCompleto + '">' +
                t.nomeCompleto + ' (' + t.usuario + ')' +
                '</option>'
            ).join('');

            return '<div class="form-group" style="margin-bottom:14px;">'
                + '<label class="form-label">Técnico Responsável</label>'
                + '<select id="inlineTecnico" class="form-input">'
                + '<option value="">Selecione...</option>'
                + opcoes
                + '</select>'
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
                const obs = wrapper.querySelector('#inlineObservacao').value.trim();
                if (!data) { const el = wrapper.querySelector('#inlineDataAgendamento'); el.style.borderColor = 'var(--color-danger)'; el.focus(); return; }
                if (!hora) { const el = wrapper.querySelector('#inlineHoraAgendamento'); el.style.borderColor = 'var(--color-danger)'; el.focus(); return; }
                const c = reidratarChamado(window.gerenciadorChamados.chamados.find(x => x.id == chamado.id));
                c.concluirEtapa2(data, hora, obs, usuarioAtual);
                window.gerenciadorChamados.atualizarChamado(c);
                reRenderizarDetalhes(c.id);
            });
            return;
        }

        if (etapa.numero === 4 && !isTecnicoConf) {

            wrapper.querySelector('#btnInlineComunicarTecnico')
                .addEventListener('click', function () {

                    const tecnicoSelect = wrapper.querySelector('#inlineTecnico');
                    const tecnicoUsuario = tecnicoSelect.value;
                    const tecnicoNome = tecnicoSelect.options[tecnicoSelect.selectedIndex]?.dataset.nome || '';

                    const data = wrapper.querySelector('#inlineDataAvaliacao').value;
                    const hora = wrapper.querySelector('#inlineHoraAvaliacao').value;
                    const obs = wrapper.querySelector('#inlineObservacao').value.trim();

                    if (!tecnicoUsuario || !data || !hora) return;

                    const c = reidratarChamado(
                        window.gerenciadorChamados.chamados.find(x => x.id == chamado.id)
                    );

                    c.selecionarTecnicoEtapa4(
                        tecnicoUsuario,
                        tecnicoNome,
                        obs,
                        usuarioAtual
                    );

                    const etapaObj = c._getEtapa(4);
                    if (etapaObj) {
                        etapaObj.dados.dataAvaliacao = data;
                        etapaObj.dados.horaAvaliacao = hora;
                    }

                    window.gerenciadorChamados.atualizarChamado(c);
                    reRenderizarDetalhes(c.id);
                });

            return;
        }


        if (isTecnicoConf) {
            wrapper.querySelector('#btnInlineConfirmarTecnico').addEventListener('click', function () {
                const c = reidratarChamado(window.gerenciadorChamados.chamados.find(x => x.id == chamado.id));
                c.tecnicoConfirmarEtapa4(usuarioAtual);
                window.gerenciadorChamados.atualizarChamado(c);
                reRenderizarDetalhes(c.id);
            });
            return;
        }

        if (isConfirmacao) {
            wrapper.querySelector('#btnInlineAprovar').addEventListener('click', function () {
                const c = reidratarChamado(window.gerenciadorChamados.chamados.find(x => x.id == chamado.id));
                c.confirmarEtapa3(true, '', usuarioAtual);
                window.gerenciadorChamados.atualizarChamado(c);
                reRenderizarDetalhes(c.id);
            });
            wrapper.querySelector('#btnInlineReprovar').addEventListener('click', function () {
                const motivo = wrapper.querySelector('#inlineMotivo').value.trim();
                if (!motivo) { const el = wrapper.querySelector('#inlineMotivo'); el.style.borderColor = 'var(--color-danger)'; el.focus(); return; }
                const c = reidratarChamado(window.gerenciadorChamados.chamados.find(x => x.id == chamado.id));
                c.confirmarEtapa3(false, motivo, usuarioAtual);
                window.gerenciadorChamados.atualizarChamado(c);
                reRenderizarDetalhes(c.id);
            });
            return;
        }

        if (isEstoque) {
            wrapper.querySelector('#btnInlineEstoqueSim').addEventListener('click', function () {
                const obs = wrapper.querySelector('#inlineObservacao').value.trim();
                const c = reidratarChamado(window.gerenciadorChamados.chamados.find(x => x.id == chamado.id));
                c.concluirEtapa6(true, obs, usuarioAtual);
                window.gerenciadorChamados.atualizarChamado(c);
                reRenderizarDetalhes(c.id);
            });
            wrapper.querySelector('#btnInlineEstoqueNao').addEventListener('click', function () {
                const obs = wrapper.querySelector('#inlineObservacao').value.trim();
                const c = reidratarChamado(window.gerenciadorChamados.chamados.find(x => x.id == chamado.id));
                c.concluirEtapa6(false, obs, usuarioAtual);
                window.gerenciadorChamados.atualizarChamado(c);
                reRenderizarDetalhes(c.id);
            });
            return;
        }

        if (isGestor) {
            wrapper.querySelector('#btnInlineAvancar').addEventListener('click', function () {
                const parecer = wrapper.querySelector('#inlineObservacao').value.trim();
                if (!parecer) { wrapper.querySelector('#inlineObservacao').focus(); return; }
                const c = reidratarChamado(window.gerenciadorChamados.chamados.find(x => x.id == chamado.id));
                c.aprovarEtapa11(parecer, usuarioAtual);
                window.gerenciadorChamados.atualizarChamado(c);
                reRenderizarDetalhes(c.id);
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
        const c = reidratarChamado(window.gerenciadorChamados.chamados.find(x => x.id == chamado.id));
        const n = etapa.numero;

        if (n === 2) c.concluirEtapa2('', '', observacao, usuarioAtual);
        else if (n === 3) c.selecionarTecnicoEtapa4('', '', observacao, usuarioAtual);
        else if (n === 4) c.selecionarTecnicoEtapa4('', '', observacao, usuarioAtual);
        else if (n === 5.1) c.concluirSubetapa51('', '', observacao, usuarioAtual);
        else if (n === 5.2) c.concluirSubetapa52('', '', observacao, '', [], usuarioAtual);
        else if (n === 7.1) c.concluirSubetapa71([], observacao, 'NORMAL', usuarioAtual);
        else if (n === 7.2) c.concluirSubetapa72('', '', [], 0, observacao, null, usuarioAtual);
        else if (n === 7.3) c.concluirSubetapa73('', '', '', observacao, usuarioAtual);
        else if (n === 8) c.concluirEtapa8('', '', observacao, [], usuarioAtual);
        else if (n === 9) c.concluirEtapa9('', '', '', observacao, usuarioAtual);
        else if (n === 10.1) c.concluirSubetapa101('', '', [], observacao, usuarioAtual);
        else if (n === 10.2) c.concluirSubetapa102('', '', observacao, '', [], usuarioAtual);
        else if (n === 12) c.concluirEtapa12('SATISFEITO', 5, observacao, usuarioAtual);

        const etapaObj = c._getEtapa ? c._getEtapa(n) : null;
        if (etapaObj && etapaObj.dados && !etapaObj.dados.observacao) {
            etapaObj.dados.observacao = observacao;
        }

        window.gerenciadorChamados.atualizarChamado(c);
        reRenderizarDetalhes(c.id);
    }


    // =========================================================================
    // EXTRACAO DE CAMPOS
    // =========================================================================

    function _extrairCamposMensagem(numeroEtapa, d) {

        const campos = [];
        const add = (label, valor) => {
            if (valor) campos.push({ label, valor });
        };

        switch (numeroEtapa) {

            // ==========================
            // ETAPA 1 - ABERTURA
            // ==========================
            case 1:
                add('OBSERVACAO', d.observacao);
                break;

            // ==========================
            // ETAPA 2 - AGENDAMENTO
            // ==========================
            case 2:
                if (d.dataAgendamento)
                    add('OBSERVACAO', d.observacao);
                add('DATA AGENDADA',
                    _fmtData(d.dataAgendamento) +
                    (d.horaAgendamento ? ' às ' + d.horaAgendamento : '')
                );
                break;

            // ==========================
            // ETAPA 3 - x
            // ==========================
            case 3:
                add('OBSERVACAO', d.observacao);
                break;

            // ==========================
            // ETAPA 4 - x
            // ==========================
            case 4:
                add('TÉCNICO RESPONSÁVEL', d.tecnicoNome);

                if (d.dataAvaliacao)
                    add('DATA DA AVALIAÇÃO',
                        _fmtData(d.dataAvaliacao) +
                        (d.horaAvaliacao ? ' às ' + d.horaAvaliacao : '')
                    );

                add('MENSAGEM AO TÉCNICO', d.observacao);
                add('SELECIONADO POR', d.selecionadoPor);
                break;

            // ==========================
            // ETAPA 5 - x
            // ==========================
            case 5:
                add('OBSERVACAO', d.observacao);
                break;

            case 5.1:
                add('OBSERVACAO', d.observacao);
                break;

            case 5.2:
                add('DIAGNOSTICO', d.diagnostico);
                add('MATERIAIS NECESSARIOS', d.materiaisNecessarios);
                break;

            // ==========================
            // ETAPA 6 - x
            // ==========================
            case 6:
                add('OBSERVACAO', d.observacao);
                break;

            // ==========================
            // ETAPA 10.2 - EXECUÇÃO
            // ==========================
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


    // =========================================================================
    // EXPOSICAO GLOBAL
    // =========================================================================

    window.renderMensagens = renderMensagens;

})();