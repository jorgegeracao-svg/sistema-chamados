// =============================================================================
// ABA-MENSAGENS.JS — Renderização da aba Mensagens na tela de detalhes
//
// ARQUITETURA: mapa declarativo ETAPAS_INLINE_CONFIG
//   Cada etapa define seus campos e ações como dados.
//   Os motores _buildFormularioInlineHTML e _bindFormularioInlineEvents
//   lêem essa config e nunca precisam ser editados para novas etapas.
//
// Para adicionar/alterar uma etapa: edite apenas ETAPAS_INLINE_CONFIG.
// =============================================================================

(function () {

    // =========================================================================
    // MAPA DECLARATIVO DE ETAPAS INLINE
    // =========================================================================
    //
    // Cada chave é o número da etapa (string para suportar '4_aguardando' etc.)
    // Propriedades:
    //   campos  : Array de { id, tipo, label, placeholder?, obrigatorio?, opcoesFn? }
    //   intro   : string opcional renderizado acima dos campos
    //   botoes  : Array de { id, label, estilo ('submit'|'cancel'), acao }
    //
    // Tipos de campo suportados:
    //   'date' | 'time' | 'textarea' | 'select-fn'
    //   'select-fn' usa opcoesFn() para gerar as <option>s
    //
    // Ações: string com o nome de uma função em ACOES_ETAPA (definidas abaixo)
    // =========================================================================

    const ETAPAS_INLINE_CONFIG = {

        // ── Etapa 2: Agendamento da Avaliação ────────────────────────────────
        2: {
            campos: [
                { id: 'inlineDataAgendamento', tipo: 'date',     label: 'Data do Agendamento',       obrigatorio: true  },
                { id: 'inlineHoraAgendamento', tipo: 'time',     label: 'Horário',                   obrigatorio: true  },
                { id: 'inlineObservacao',       tipo: 'textarea', label: 'Mensagem ao Solicitante',   placeholder: 'Instruções ou observações para o solicitante confirmar o agendamento...' },
            ],
            botoes: [
                { id: 'btnInlineAvancar', label: 'Confirmar Agendamento', estilo: 'submit', acao: 'concluirEtapa2' },
            ],
        },

        // ── Etapa 3: Confirmação da Avaliação ────────────────────────────────
        // Renderização especial via buildFn — exibe data/hora da Et.2 e campos
        // condicionais de reprovação. Ver _buildEtapa3HTML e ACOES_ETAPA.
        3: { _custom: true },

        // ── Etapa 4: Comunicar o Técnico (ADM seleciona) ─────────────────────
        4: {
            campos: [
                { id: 'inlineTecnico',         tipo: 'select-fn', label: 'Técnico Responsável',  obrigatorio: true, opcoesFn: _opcoesListaTecnicos },
                { id: 'inlineDataAvaliacao',   tipo: 'date',      label: 'Data da Avaliação',    obrigatorio: true  },
                { id: 'inlineHoraAvaliacao',   tipo: 'time',      label: 'Horário',              obrigatorio: true  },
                { id: 'inlineObservacao',       tipo: 'textarea',  label: 'Mensagem ao Técnico'  },
            ],
            botoes: [
                { id: 'btnInlineComunicarTecnico', label: 'Comunicar Técnico', estilo: 'submit', acao: 'selecionarTecnicoEtapa4' },
            ],
        },

        // ── Etapa 4 (aguardando confirmação do técnico) ───────────────────────
        '4_aguardando': {
            intro: 'Você foi designado como técnico para este chamado. Confirme o recebimento para prosseguir.',
            campos: [],
            botoes: [
                { id: 'btnInlineConfirmarTecnico', label: 'Confirmar recebimento', estilo: 'submit', acao: 'confirmarTecnicoEtapa4' },
            ],
        },

        // ── Etapa 6: Verificação de Estoque ──────────────────────────────────
        6: {
            intro: 'O material necessário para execução do serviço está disponível no estoque?',
            campos: [
                { id: 'inlineObservacao', tipo: 'textarea', label: 'Observação', placeholder: 'Descreva os materiais verificados...' },
            ],
            botoes: [
                { id: 'btnInlineEstoqueNao', label: 'Não — Solicitar compra',  estilo: 'cancel', acao: 'estoqueNao' },
                { id: 'btnInlineEstoqueSim', label: 'Sim — Programar serviço', estilo: 'submit', acao: 'estoqueSim' },
            ],
        },

        // ── Etapa 11: Conferência do Gestor ──────────────────────────────────
        11: {
            campos: [
                { id: 'inlineObservacao', tipo: 'textarea', label: 'Parecer do Gestor', obrigatorio: true, placeholder: 'Descreva sua avaliação do serviço executado...' },
            ],
            botoes: [
                { id: 'btnInlineAvancar', label: 'Aprovar execução', estilo: 'submit', acao: 'aprovarEtapa11' },
            ],
        },

        // ── Padrão: qualquer outra etapa ativa ───────────────────────────────
        _default: {
            campos: [
                { id: 'inlineObservacao', tipo: 'textarea', label: 'Observação', obrigatorio: true, placeholder: 'Descreva a ação realizada nesta etapa...' },
            ],
            botoes: [
                { id: 'btnInlineAvancar', label: 'Avançar Chamado', estilo: 'submit', acao: 'concluirGenerica' },
            ],
        },
    };


    // =========================================================================
    // AÇÕES DAS ETAPAS
    // Cada função recebe (wrapper, chamado, etapa) e executa a lógica de negócio
    // =========================================================================

    const ACOES_ETAPA = {

        concluirEtapa2(wrapper, chamado) {
            const data = _val(wrapper, '#inlineDataAgendamento');
            const hora = _val(wrapper, '#inlineHoraAgendamento');
            const obs  = _val(wrapper, '#inlineObservacao');
            if (_exigir(wrapper, '#inlineDataAgendamento', !data)) return;
            if (_exigir(wrapper, '#inlineHoraAgendamento', !hora)) return;
            _commitChamado(chamado, c => c.concluirEtapa2(data, hora, obs, window.usuarioAtual));
        },

        aprovarEtapa3(wrapper, chamado) {
            _commitChamado(chamado, c => c.confirmarEtapa3(true, '', window.usuarioAtual));
        },

        reprovarEtapa3(wrapper, chamado) {
            const motivo = _val(wrapper, '#inlineMotivo');
            if (_exigir(wrapper, '#inlineMotivo', !motivo)) return;
            _commitChamado(chamado, c => c.confirmarEtapa3(false, motivo, window.usuarioAtual));
        },

        selecionarTecnicoEtapa4(wrapper, chamado) {
            const sel        = wrapper.querySelector('#inlineTecnico');
            const tecUsuario = sel?.value;
            const tecNome    = sel?.options[sel.selectedIndex]?.dataset.nome || '';
            const data       = _val(wrapper, '#inlineDataAvaliacao');
            const hora       = _val(wrapper, '#inlineHoraAvaliacao');
            const obs        = _val(wrapper, '#inlineObservacao');
            if (_exigir(wrapper, '#inlineTecnico',       !tecUsuario)) return;
            if (_exigir(wrapper, '#inlineDataAvaliacao', !data))       return;
            if (_exigir(wrapper, '#inlineHoraAvaliacao', !hora))       return;
            _commitChamado(chamado, c => {
                c.selecionarTecnicoEtapa4(tecUsuario, tecNome, obs, window.usuarioAtual);
                const etapaObj = c._getEtapa(4);
                if (etapaObj) { etapaObj.dados.dataAvaliacao = data; etapaObj.dados.horaAvaliacao = hora; }
            });
        },

        confirmarTecnicoEtapa4(wrapper, chamado) {
            _commitChamado(chamado, c => c.tecnicoConfirmarEtapa4(window.usuarioAtual));
        },

        estoqueSim(wrapper, chamado) {
            const obs = _val(wrapper, '#inlineObservacao');
            _commitChamado(chamado, c => c.concluirEtapa6VerificacaoEstoque(true, obs, window.usuarioAtual));
        },

        estoqueNao(wrapper, chamado) {
            const obs = _val(wrapper, '#inlineObservacao');
            _commitChamado(chamado, c => c.concluirEtapa6VerificacaoEstoque(false, obs, window.usuarioAtual));
        },

        aprovarEtapa11(wrapper, chamado) {
            const parecer = _val(wrapper, '#inlineObservacao');
            if (_exigir(wrapper, '#inlineObservacao', !parecer)) return;
            _commitChamado(chamado, c => c.aprovarEtapa11(parecer, window.usuarioAtual));
        },

        concluirGenerica(wrapper, chamado, etapa) {
            const obs = _val(wrapper, '#inlineObservacao');
            if (_exigir(wrapper, '#inlineObservacao', !obs)) return;
            _concluirEtapaGenerica(chamado, etapa, obs);
        },
    };


    // =========================================================================
    // MOTOR — RESOLVE QUAL CONFIG USAR PARA UMA DADA ETAPA
    // =========================================================================

    function _resolverConfig(etapa) {
        if (etapa.numero === 4 && etapa.status === 'AGUARDANDO_CONFIRMACAO') {
            return ETAPAS_INLINE_CONFIG['4_aguardando'];
        }
        return ETAPAS_INLINE_CONFIG[etapa.numero] || ETAPAS_INLINE_CONFIG['_default'];
    }


    // =========================================================================
    // MOTOR — GERAR HTML A PARTIR DA CONFIG
    // =========================================================================

    function _buildFormularioInlineHTML(etapa, chamado) {
        const cfg = _resolverConfig(etapa);

        // Etapas com renderização totalmente customizada
        if (cfg._custom) {
            if (etapa.numero === 3) return _buildEtapa3HTML(chamado);
        }

        let html = '';

        if (cfg.intro) {
            html += '<p style="font-size:13px;color:var(--color-gray-700);margin-bottom:12px;">' + cfg.intro + '</p>';
        }

        cfg.campos.forEach(campo => {
            html += '<div class="form-group" style="margin-bottom:14px;">';
            html += '<label class="form-label">' + campo.label + '</label>';

            if (campo.tipo === 'date' || campo.tipo === 'time') {
                html += '<input type="' + campo.tipo + '" id="' + campo.id + '" class="form-input" '
                      + 'style="width:100%;padding:10px 14px;border:1px solid var(--color-gray-300);border-radius:8px;font-size:14px;font-family:inherit;">';

            } else if (campo.tipo === 'textarea') {
                html += '<textarea id="' + campo.id + '" class="form-textarea" rows="3"'
                      + (campo.placeholder ? ' placeholder="' + campo.placeholder + '"' : '') + '></textarea>';

            } else if (campo.tipo === 'select-fn') {
                const opcoes = campo.opcoesFn ? campo.opcoesFn() : '';
                html += '<select id="' + campo.id + '" class="form-input"><option value="">Selecione...</option>' + opcoes + '</select>';
            }

            html += '</div>';
        });

        html += '<div style="display:flex;gap:10px;justify-content:flex-end;">';
        cfg.botoes.forEach(btn => {
            const cls = btn.estilo === 'cancel' ? 'btn-cancel' : 'btn-submit';
            html += '<button id="' + btn.id + '" class="' + cls + '">' + btn.label + '</button>';
        });
        html += '</div>';

        return html;
    }


    // =========================================================================
    // ETAPA 3 — HTML CUSTOMIZADO
    // Mostra data/hora agendada + botões Aprovar/Reprovar.
    // Campos de reprovação aparecem só ao clicar Reprovar.
    // =========================================================================

    const MOTIVOS_REPROVACAO = [
        'Data não me atende',
        'Horário não me atende',
        'Preciso remarcar para outra semana',
        'Conflito com outra atividade',
        'Problema resolvido — cancelar avaliação',
        'Outro motivo',
    ];

    function _buildEtapa3HTML(chamado) {
        // Busca os dados da etapa 2 (data e hora agendada)
        const etapa2 = (chamado.etapas || []).find(e => e.numero === 2);
        const dataRaw = etapa2?.dados?.dataAgendamento || '';
        const hora    = etapa2?.dados?.horaAgendamento || '';
        const dataFmt = dataRaw ? _fmtData(dataRaw) : '—';
        const dataHoraStr = dataFmt + (hora ? ' às ' + hora : '');

        const opcoesMotivo = MOTIVOS_REPROVACAO.map((m, i) =>
            '<option value="' + m + '">' + m + '</option>'
        ).join('');

        return (
            // Bloco: data/hora agendada
            '<div style="display:flex;align-items:center;gap:10px;background:var(--color-primary-light,#e8f4fb);border:1px solid var(--color-primary,#0095db);border-radius:8px;padding:12px 16px;margin-bottom:18px;">'
            +   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary,#0095db)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">'
            +     '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'
            +   '</svg>'
            +   '<div>'
            +     '<span style="font-size:11px;font-weight:600;color:var(--color-primary,#0095db);text-transform:uppercase;letter-spacing:.5px;">Agendado para</span>'
            +     '<div style="font-size:16px;font-weight:700;color:var(--color-gray-900,#111);">' + dataHoraStr + '</div>'
            +   '</div>'
            + '</div>'

            // Botões principais
            + '<div id="etapa3BotoesIniciais" style="display:flex;gap:10px;justify-content:flex-end;">'
            +   '<button id="btnEtapa3Reprovar" style="display:inline-flex;align-items:center;gap:6px;padding:9px 18px;background:#fff;border:1.5px solid #ef4444;color:#ef4444;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:background .15s;">'
            +     '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
            +     'Reprovar'
            +   '</button>'
            +   '<button id="btnEtapa3Aprovar" style="display:inline-flex;align-items:center;gap:6px;padding:9px 18px;background:#16a34a;border:none;color:#fff;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:background .15s;">'
            +     '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
            +     'Aprovar data e horário'
            +   '</button>'
            + '</div>'

            // Painel de reprovação (oculto inicialmente)
            + '<div id="etapa3PainelReprovar" style="display:none;margin-top:16px;border-top:1px solid var(--color-gray-200,#e5e7eb);padding-top:16px;">'
            +   '<div class="form-group" style="margin-bottom:12px;">'
            +     '<label class="form-label">Motivo da reprovação</label>'
            +     '<select id="inlineMotivoCombo" class="form-input"><option value="">Selecione o motivo...</option>' + opcoesMotivo + '</select>'
            +   '</div>'
            +   '<div class="form-group" style="margin-bottom:14px;">'
            +     '<label class="form-label">Observação adicional</label>'
            +     '<textarea id="inlineObsReprovar" class="form-textarea" rows="2" placeholder="Detalhe o motivo ou deixe em branco se o motivo acima já for suficiente..."></textarea>'
            +   '</div>'
            +   '<div style="display:flex;gap:10px;justify-content:flex-end;">'
            +     '<button id="btnEtapa3CancelarReprovar" style="padding:8px 16px;background:#fff;border:1px solid var(--color-gray-300,#d1d5db);border-radius:8px;font-size:13px;font-weight:600;color:var(--color-gray-700,#374151);cursor:pointer;">Voltar</button>'
            +     '<button id="btnEtapa3ConfirmarReprovar" style="padding:8px 18px;background:#ef4444;border:none;color:#fff;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Confirmar reprovação</button>'
            +   '</div>'
            + '</div>'
        );
    }

    /** Bind específico dos eventos da etapa 3 */
    function _bindEtapa3Events(wrapper, chamado) {
        const btnAprovar          = wrapper.querySelector('#btnEtapa3Aprovar');
        const btnReprovar         = wrapper.querySelector('#btnEtapa3Reprovar');
        const painelReprovar      = wrapper.querySelector('#etapa3PainelReprovar');
        const botoesIniciais      = wrapper.querySelector('#etapa3BotoesIniciais');
        const btnCancelarReprovar = wrapper.querySelector('#btnEtapa3CancelarReprovar');
        const btnConfirmarReprovar= wrapper.querySelector('#btnEtapa3ConfirmarReprovar');

        // Aprovar
        btnAprovar?.addEventListener('click', () => {
            _commitChamado(chamado, c => c.confirmarEtapa3(true, '', window.usuarioAtual));
        });

        // Mostrar painel de reprovação
        btnReprovar?.addEventListener('click', () => {
            botoesIniciais.style.display = 'none';
            painelReprovar.style.display = 'block';
            wrapper.querySelector('#inlineMotivoCombo')?.focus();
        });

        // Voltar (esconder painel)
        btnCancelarReprovar?.addEventListener('click', () => {
            painelReprovar.style.display = 'none';
            botoesIniciais.style.display = 'flex';
        });

        // Confirmar reprovação
        btnConfirmarReprovar?.addEventListener('click', () => {
            const motivo = wrapper.querySelector('#inlineMotivoCombo')?.value || '';
            const obs    = (wrapper.querySelector('#inlineObsReprovar')?.value || '').trim();

            if (!motivo) {
                const el = wrapper.querySelector('#inlineMotivoCombo');
                if (el) { el.style.borderColor = 'var(--color-danger,#ef4444)'; el.focus(); }
                return;
            }

            const motivoFinal = obs ? motivo + ' — ' + obs : motivo;
            _commitChamado(chamado, c => c.confirmarEtapa3(false, motivoFinal, window.usuarioAtual));
        });
    }


    // =========================================================================
    // MOTOR — BIND DE EVENTOS A PARTIR DA CONFIG
    // =========================================================================

    function _bindFormularioInlineEvents(wrapper, chamado, etapa) {
        // Etapas com bind totalmente customizado
        if (etapa.numero === 3) {
            _bindEtapa3Events(wrapper, chamado);
            return;
        }

        const cfg = _resolverConfig(etapa);
        cfg.botoes.forEach(btn => {
            const el = wrapper.querySelector('#' + btn.id);
            if (!el) return;
            const fn = ACOES_ETAPA[btn.acao];
            if (!fn) { console.warn('[aba-mensagens] Ação não encontrada:', btn.acao); return; }
            el.addEventListener('click', () => fn(wrapper, chamado, etapa));
        });
    }


    // =========================================================================
    // HELPERS INTERNOS
    // =========================================================================

    /** Lê e faz trim do valor de um campo pelo seletor */
    function _val(wrapper, seletor) {
        return (wrapper.querySelector(seletor)?.value || '').trim();
    }

    /** Aplica borda vermelha e foca o campo se a condição for verdadeira. Retorna a condição. */
    function _exigir(wrapper, seletor, condicao) {
        if (condicao) {
            const el = wrapper.querySelector(seletor);
            if (el) { el.style.borderColor = 'var(--color-danger)'; el.focus(); }
        }
        return condicao;
    }

    /** Reidrata e persiste o chamado, depois re-renderiza os detalhes */
    function _commitChamado(chamado, mutacao) {
        const c = window.reidratarChamado(window.gerenciadorChamados.chamados.find(x => x.id == chamado.id));
        mutacao(c);
        window.gerenciadorChamados.atualizarChamado(c);
        window.reRenderizarDetalhes(c.id);
    }

    /** Gera as <option>s de técnicos a partir do localStorage */
    function _opcoesListaTecnicos() {
        const todos = JSON.parse(localStorage.getItem('usuarios') || '[]');
        return todos
            .filter(u => u.status !== 'Desligado' && u.status !== 'Inativo'
                      && (u.perfil === 'TECNICO' || u.perfil === 'ADMIN'))
            .map(t =>
                '<option value="' + t.usuario + '" data-nome="' + t.nomeCompleto + '">'
                + t.nomeCompleto + ' (' + t.usuario + ')'
                + '</option>'
            ).join('');
    }


    // =========================================================================
    // RENDERIZAÇÃO PRINCIPAL
    // =========================================================================

    function renderMensagens(chamado) {
        const container = document.getElementById('historyMessages');
        if (!container) return;
        container.innerHTML = '';

        // ── Fonte de verdade: historicoEventos (imutável, acumula tudo)
        // Fallback para chamados antigos: monta eventos a partir das etapas concluídas
        const eventos = _resolverEventos(chamado);

        const badgeEl = document.getElementById('badgeMensagens');
        if (badgeEl) badgeEl.textContent = eventos.length;

        if (eventos.length === 0) {
            const vazio = document.createElement('p');
            vazio.style.cssText = 'color:var(--color-gray-400);font-size:14px;font-style:italic;padding:20px 0;';
            vazio.textContent = 'Nenhuma ação registrada ainda.';
            container.appendChild(vazio);
        }

        const slWrapper = document.createElement('div');
        slWrapper.className = 'msg-sl-list';

        eventos.forEach(ev => slWrapper.appendChild(_buildEventoItem(ev)));

        container.appendChild(slWrapper);
        _renderFormularioInline(chamado, container);
    }


    // =========================================================================
    // RESOLVER EVENTOS — usa historicoEventos se disponível,
    // senão gera fallback a partir das etapas concluídas (chamados antigos)
    // =========================================================================

    function _resolverEventos(chamado) {
        if (chamado.historicoEventos && chamado.historicoEventos.length) {
            return chamado.historicoEventos;
        }

        // Fallback: etapas e subetapas concluídas → evento sintético ETAPA_CONCLUIDA
        const eventos = [];
        (chamado.etapas || []).forEach(etapa => {
            if (etapa.status === 'CONCLUIDA' && etapa.conclusao) {
                eventos.push({
                    tipo: 'ETAPA_CONCLUIDA',
                    dados: { numero: etapa.numero, titulo: etapa.titulo, categoria: etapa.categoria, dados: etapa.dados || {} },
                    usuario: etapa.conclusao.usuario,
                    dataHora: etapa.conclusao.dataHora
                });
            }
            (etapa.subetapas || []).forEach(sub => {
                if (sub.status === 'CONCLUIDA' && sub.conclusao) {
                    eventos.push({
                        tipo: 'ETAPA_CONCLUIDA',
                        dados: { numero: sub.numero, titulo: sub.titulo, categoria: sub.categoria, dados: sub.dados || {}, isSub: true },
                        usuario: sub.conclusao.usuario,
                        dataHora: sub.conclusao.dataHora
                    });
                }
            });
        });

        // Ordenar por data
        eventos.sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));
        return eventos;
    }


    // =========================================================================
    // CARD DE EVENTO
    // =========================================================================

    const _TIPO_CONFIG = {
        ETAPA_CONCLUIDA:  { cor: '#16a34a', icone: 'check',    prefixo: 'ETAPA' },
        REPROVADO:        { cor: '#ef4444', icone: 'x',        prefixo: 'REPROVADO' },
        REMARCADO:        { cor: '#f59e0b', icone: 'clock',    prefixo: 'REMARCADO' },
        TECNICO_COMUNICADO: { cor: '#0095db', icone: 'user',   prefixo: 'COMUNICADO' },
    };

    function _buildEventoItem(ev) {
        const cfg      = _TIPO_CONFIG[ev.tipo] || _TIPO_CONFIG.ETAPA_CONCLUIDA;
        const d        = ev.dados || {};
        const label    = (window.CATEGORIA_LABEL || {})[d.categoria] || d.categoria || '';
        const badgeClass = _badgeClasses[d.categoria] || 'badge-admin';
        const isSub    = !!d.isSub;
        const campos   = _extrairCamposEvento(ev);
        const uid      = 'ev-' + String(Math.random()).slice(2, 8);

        // Título do card
        let titulo = '';
        if (ev.tipo === 'ETAPA_CONCLUIDA') {
            titulo = 'ETAPA ' + d.numero + ' — ' + (d.titulo || '').toUpperCase();
        } else if (ev.tipo === 'REPROVADO') {
            titulo = '⚠️ ETAPA ' + d.numero + ' — REPROVADO PELO SOLICITANTE';
        } else if (ev.tipo === 'REMARCADO') {
            titulo = '🔄 ETAPA ' + d.numero + ' — REMARCADO PARA NOVO AGENDAMENTO';
        } else if (ev.tipo === 'TECNICO_COMUNICADO') {
            titulo = 'ETAPA ' + d.numero + ' — ' + (d.titulo || '').toUpperCase() + ' (AGUARDANDO CONFIRMAÇÃO)';
        }

        const item = document.createElement('div');
        item.className = 'msg-sl-item' + (isSub ? ' msg-sl-sub' : '');

        // Cor do dot baseada no tipo
        const dotStyle = 'background:' + cfg.cor + ';border-color:' + cfg.cor + ';';

        const header = document.createElement('div');
        header.className = 'msg-sl-header';
        header.innerHTML =
            '<div class="msg-sl-left">'
            +   '<div class="msg-sl-dot" style="' + dotStyle + '">'
            +     _buildIconeSvg(cfg.icone)
            +   '</div>'
            +   '<div class="msg-sl-info">'
            +     '<span class="msg-sl-name">' + titulo + '</span>'
            +   '</div>'
            + '</div>'
            + '<button class="msg-sl-btn" aria-label="Expandir">'
            +   'detalhes'
            +   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>'
            + '</button>';

        const body = document.createElement('div');
        body.className = 'msg-sl-body collapsed';
        body.id = uid;

        const camposHTML = campos.map(c =>
            '<p class="msg-ticket-conteudo-linha"><strong>' + c.label + ':</strong> ' + c.valor + '</p>'
        ).join('');

        const fotoEvUsuario = (typeof getFotoUsuario === 'function') ? getFotoUsuario(ev.usuario) : null;
        const iniciaisEvUsuario = (ev.usuario || '?').trim().split(' ').filter(Boolean)
            .reduce((acc, p, i, arr) => i === 0 || i === arr.length - 1 ? acc + p[0] : acc, '').toUpperCase().slice(0, 2);
        const avatarEvHTML = fotoEvUsuario
            ? '<img src="' + fotoEvUsuario + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';

        body.innerHTML =
            '<div class="msg-ticket-remetente">'
            +   '<div class="msg-ticket-avatar" style="' + (fotoEvUsuario ? 'padding:0;overflow:hidden;' : '') + '">'
            +     avatarEvHTML
            +   '</div>'
            +   '<div class="msg-ticket-remetente-info">'
            +     '<span class="msg-ticket-remetente-nome">' + ev.usuario + '</span>'
            +     '<span class="msg-ticket-remetente-unidade">' + label + '</span>'
            +   '</div>'
            +   (label ? '<span class="msg-ticket-perfil-badge ' + badgeClass + '">' + label.toUpperCase() + '</span>' : '')
            + '</div>'
            + '<div class="msg-ticket-divider"></div>'
            + '<div class="msg-ticket-conteudo">'
            +   camposHTML
            +   '<span class="msg-ticket-data-rodape">' + formatarDataHora(ev.dataHora) + '</span>'
            + '</div>';

        item.appendChild(header);
        item.appendChild(body);

        header.querySelector('.msg-sl-btn').addEventListener('click', function () {
            const isCollapsed = body.classList.contains('collapsed');
            body.classList.toggle('collapsed', !isCollapsed);
            this.classList.toggle('open', isCollapsed);
        });

        return item;
    }

    function _buildIconeSvg(tipo) {
        const base = 'class="msg-sl-chk" viewBox="0 0 24 24"';
        if (tipo === 'check')  return '<svg ' + base + '><polyline points="20 6 9 17 4 12"/></svg>';
        if (tipo === 'x')      return '<svg ' + base + '><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        if (tipo === 'clock')  return '<svg ' + base + '><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
        if (tipo === 'user')   return '<svg ' + base + '><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        return '<svg ' + base + '><polyline points="20 6 9 17 4 12"/></svg>';
    }


    // =========================================================================
    // EXTRAÇÃO DE CAMPOS POR EVENTO
    // =========================================================================

    function _extrairCamposEvento(ev) {
        const campos = [];
        const add = (label, valor) => { if (valor) campos.push({ label, valor }); };
        const d = ev.dados || {};
        const dd = d.dados || {};

        if (ev.tipo === 'REPROVADO' || ev.tipo === 'REMARCADO') {
            add('MOTIVO', d.motivo);
            return campos;
        }

        if (ev.tipo === 'TECNICO_COMUNICADO') {
            add('TÉCNICO', d.dados?.tecnicoNome || d.dados?.tecnicoUsuario);
            add('MENSAGEM', d.dados?.observacao);
            return campos;
        }

        // ETAPA_CONCLUIDA — delega para extração por número
        return _extrairCamposMensagem(d.numero, dd, d);
    }


    // =========================================================================
    // ITEM ESTILO MODELO 3
    // =========================================================================

    const _badgeClasses = {
        SOLICITANTE:    'badge-solicitante',
        TECNICO:        'badge-tecnico',
        ADMINISTRATIVO: 'badge-administrativo',
        COMPRADOR:      'badge-comprador',
        GESTOR:         'badge-admin',
    };


    // =========================================================================
    // FORMULÁRIO INLINE DA ETAPA ATIVA
    // =========================================================================

    function _renderFormularioInline(chamado, container) {
        const etapa = window.getEtapaAtiva(chamado);
        if (!etapa || chamado.status === 'FINALIZADO') return;

        const pode        = window.podeAtenderEtapa(etapa, window.usuarioAtual.perfil);
        const responsavel = (window.CATEGORIA_LABEL || {})[etapa.categoria] || etapa.categoria;

        // Bloco de reprovações — visível para TODOS os perfis
        const blocoReprovacoes = _buildBlocoReprovacoes(etapa);

        const wrapper = document.createElement('div');
        wrapper.className = 'msg-ticket-wrapper';

        if (pode) {
            // Etapa 3 (confirmação de data): sem collapse — data e botões já visíveis
            const semCollapse = etapa.numero === 3;

            const isRemarcacao = !!blocoReprovacoes;
            const badgeRemarcacao = isRemarcacao
                ? '<span style="font-size:10px;font-weight:700;color:#dc2626;background:#fef2f2;border:1px solid #fca5a5;border-radius:4px;padding:2px 7px;white-space:nowrap;">⚠️ REMARCAÇÃO</span>'
                : '';
            const subtexto = isRemarcacao
                ? 'Reprovado pelo solicitante — reagende'
                : 'Sua ação é necessária';

            const headerAcao = semCollapse
                ? ''   // sem botão "Atender" — conteúdo já expandido
                : '<div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">'
                  +   badgeRemarcacao
                  +   '<button class="msg-ticket-detalhes-btn" id="btnAtenderChamado">'
                  +     'Atender'
                  +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="msg-ticket-chevron"><polyline points="6 9 12 15 18 9"/></svg>'
                  +   '</button>'
                  + '</div>';

            const fotoAtual = (typeof getFotoUsuario === 'function') ? getFotoUsuario(window.usuarioAtual?.usuario) : null;
            const iniciaisAtual = (window.usuarioAtual?.nomeCompleto || window.usuarioAtual?.usuario || '?')
                .trim().split(' ').filter(Boolean)
                .reduce((acc, p, i, arr) => i === 0 || i === arr.length - 1 ? acc + p[0] : acc, '').toUpperCase().slice(0, 2);
            const avatarAtualHTML = fotoAtual
                ? '<img src="' + fotoAtual + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
                : iniciaisAtual;
            const avatarAtualStyle = fotoAtual ? 'padding:0;overflow:hidden;font-size:0;' : '';

            wrapper.innerHTML =
                '<div class="msg-ticket-card" id="cardFormularioInline">'
                + '<div class="msg-ticket-header"' + (semCollapse ? ' style="cursor:default;"' : ' id="areaAtenderBtn"') + '>'
                +   '<div class="msg-ticket-header-esq">'
                +     '<div class="msg-ticket-num" style="' + avatarAtualStyle + '">' + avatarAtualHTML + '</div>'
                +     '<div class="msg-ticket-header-info">'
                +       '<span class="msg-ticket-subtexto">' + subtexto + '</span>'
                +       '<span class="msg-ticket-titulo">ETAPA ' + etapa.numero + ' — ' + etapa.titulo.toUpperCase() + '</span>'
                +     '</div>'
                +   '</div>'
                +   headerAcao
                + '</div>'
                + (blocoReprovacoes ? '<div style="padding:12px 16px 0;">' + blocoReprovacoes + '</div>' : '')
                + '<div class="msg-ticket-body' + (semCollapse ? '' : ' collapsed') + '" id="areaFormularioAtender">'
                +   '<div style="padding:16px;">'
                +     _buildFormularioInlineHTML(etapa, chamado)
                +   '</div>'
                + '</div>'
                + '</div>';

            container.appendChild(wrapper);

            if (!semCollapse) {
                const btnAtender = wrapper.querySelector('#btnAtenderChamado');
                const areaForm   = wrapper.querySelector('#areaFormularioAtender');

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
            }

            _bindFormularioInlineEvents(wrapper, chamado, etapa);

        } else {
            wrapper.innerHTML =
                '<div class="msg-ticket-card aguardando">'
                + '<div class="msg-ticket-header" style="cursor:default;">'
                +   '<div class="msg-ticket-header-esq">'
                +     '<div class="msg-ticket-num">' + etapa.numero + '</div>'
                +     '<div class="msg-ticket-header-info">'
                +       '<span class="msg-ticket-titulo">Etapa ' + etapa.numero + ' — ' + etapa.titulo + '</span>'
                +       '<span class="msg-ticket-subtexto">Responsável: ' + responsavel + '</span>'
                +     '</div>'
                +   '</div>'
                +   '<span style="display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:var(--color-gray-400);flex-shrink:0;white-space:nowrap;">'
                +     '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
                +     'Aguardando'
                +   '</span>'
                + '</div>'
                + (blocoReprovacoes ? '<div style="padding:0 16px 12px;">' + blocoReprovacoes + '</div>' : '')
                + '</div>';
            container.appendChild(wrapper);
        }
    }


    // =========================================================================
    // BLOCO VISUAL DE REPROVAÇÕES — reutilizado em todos os perfis
    // Retorna HTML string ou '' se não houver reprovações
    // =========================================================================

    function _buildBlocoReprovacoes(etapa) {
        const reps = etapa.historicoReprovacoes;
        if (!reps || !reps.length) return '';

        return '<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px 14px;margin-bottom:4px;">'
            + '<p style="font-size:11px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:.5px;margin:0 0 8px 0;">'
            +   '⚠️ ' + (reps.length === 1 ? 'Reprovado pelo solicitante' : reps.length + 'x reprovado pelo solicitante')
            + '</p>'
            + reps.map(function(r, i) {
                return '<div style="' + (i > 0 ? 'margin-top:8px;padding-top:8px;border-top:1px solid #fecaca;' : '') + '">'
                    + '<span style="font-size:13px;font-weight:600;color:#7f1d1d;display:block;">' + r.motivo + '</span>'
                    + '<span style="font-size:11px;color:#9ca3af;">' + r.usuario + ' · ' + formatarDataHora(r.dataHora) + '</span>'
                    + '</div>';
            }).join('')
            + '</div>';
    }


    // =========================================================================
    // CONCLUIR ETAPA GENÉRICA (fallback para etapas sem config específica)
    // =========================================================================

    function _concluirEtapaGenerica(chamado, etapa, observacao) {
        const c = window.reidratarChamado(window.gerenciadorChamados.chamados.find(x => x.id == chamado.id));
        const n = etapa.numero;

        if      (n === 2)    c.concluirEtapa2('', '', observacao, window.usuarioAtual);
        else if (n === 4)    c.selecionarTecnicoEtapa4('', '', observacao, window.usuarioAtual);
        else if (n === 5.1)  c.concluirSubetapa51('', '', observacao, window.usuarioAtual);
        else if (n === 5.2)  c.concluirSubetapa52('', '', '', '', observacao, window.usuarioAtual);
        else if (n === 6)    c.concluirEtapa6VerificacaoEstoque(true, observacao, window.usuarioAtual);
        else if (n === 7.1)  c.concluirSubetapa71([], observacao, 'NORMAL', observacao, window.usuarioAtual);
        else if (n === 7.2)  c.concluirSubetapa72('', '', 0, observacao, [], window.usuarioAtual);
        else if (n === 7.3)  c.concluirSubetapa73('', '', '', observacao, window.usuarioAtual);
        else if (n === 8)    c.concluirEtapa8('', '', observacao, [], window.usuarioAtual);
        else if (n === 9)    c.concluirEtapa9('', '', '', observacao, window.usuarioAtual);
        else if (n === 10.1) c.concluirSubetapa101('', '', [], observacao, window.usuarioAtual);
        else if (n === 10.2) c.concluirSubetapa102('', '', '', '', [], observacao, window.usuarioAtual);
        else if (n === 11)   c.aprovarEtapa11(observacao, window.usuarioAtual);
        else if (n === 12)   c.concluirEtapa12('SATISFEITO', 5, observacao, window.usuarioAtual);

        const etapaObj = c._getEtapa ? c._getEtapa(n) : null;
        if (etapaObj && etapaObj.dados && !etapaObj.dados.observacao) {
            etapaObj.dados.observacao = observacao;
        }

        window.gerenciadorChamados.atualizarChamado(c);
        window.reRenderizarDetalhes(c.id);
    }


    // =========================================================================
    // EXTRAÇÃO DE CAMPOS PARA EXIBIÇÃO NAS MENSAGENS
    // =========================================================================

    function _extrairCamposMensagem(numeroEtapa, d, msgObj) {
        const campos = [];
        const add = (label, valor) => { if (valor) campos.push({ label, valor }); };

        switch (numeroEtapa) {
            case 1:   add('OBSERVAÇÃO', d.observacao); break;
            case 2:
                if (d.dataAgendamento) add('OBSERVAÇÃO', d.observacao);
                add('DATA AGENDADA', _fmtData(d.dataAgendamento) + (d.horaAgendamento ? ' às ' + d.horaAgendamento : ''));
                break;
            case 3:
                add('DECISÃO', d.decisao === 'APROVADO' ? '✅ Aprovado' : d.decisao || '');
                break;
            case 4:
                add('TÉCNICO RESPONSÁVEL', d.tecnicoNome);
                if (d.dataAvaliacao) add('DATA DA AVALIAÇÃO', _fmtData(d.dataAvaliacao) + (d.horaAvaliacao ? ' às ' + d.horaAvaliacao : ''));
                add('MENSAGEM AO TÉCNICO', d.observacao);
                add('SELECIONADO POR', d.selecionadoPor);
                break;
            case 5:    add('OBSERVAÇÃO', d.observacao); break;
            case 5.1:
                if (d.dataInicio) add('INÍCIO', _fmtData(d.dataInicio) + (d.horaInicio ? ' às ' + d.horaInicio : ''));
                add('OBSERVAÇÃO', d.observacao);
                break;
            case 5.2:
                add('DIAGNÓSTICO', d.diagnostico);
                add('MATERIAIS NECESSÁRIOS', d.materiaisNecessarios);
                add('OBSERVAÇÃO', d.observacao);
                break;
            case 6:
                add('ESTOQUE DISPONÍVEL', d.temEstoque ? '✅ Sim' : '❌ Não — Compra necessária');
                add('OBSERVAÇÃO', d.observacao);
                break;
            case 7.1:
                add('URGÊNCIA', d.urgencia);
                add('JUSTIFICATIVA', d.justificativa);
                add('OBSERVAÇÃO', d.observacao);
                break;
            case 7.2:
                add('Nº DO PEDIDO', d.numeroPedido);
                add('FORNECEDOR', d.fornecedor);
                if (d.valorTotal) add('VALOR TOTAL', 'R$ ' + Number(d.valorTotal).toFixed(2));
                add('OBSERVAÇÃO', d.observacao);
                break;
            case 7.3:
                if (d.dataEntrega) add('ENTREGA PREVISTA', _fmtData(d.dataEntrega) + (d.horaEntrega ? ' às ' + d.horaEntrega : ''));
                add('LOCAL DE ENTREGA', d.localEntrega);
                add('OBSERVAÇÃO', d.observacao);
                break;
            case 8:
                if (d.dataRecebimento) add('DATA DE RECEBIMENTO', _fmtData(d.dataRecebimento));
                add('Nº DA NOTA FISCAL', d.numeroNF);
                add('OBSERVAÇÃO', d.observacao);
                break;
            case 9:
                if (d.dataServico) add('DATA DO SERVIÇO', _fmtData(d.dataServico) + (d.horaServico ? ' às ' + d.horaServico : ''));
                add('TÉCNICO RESPONSÁVEL', d.tecnicoResponsavel);
                add('OBSERVAÇÃO', d.observacao);
                break;
            case 10.1:
                if (d.dataInicio) add('INÍCIO DO SERVIÇO', _fmtData(d.dataInicio) + (d.horaInicio ? ' às ' + d.horaInicio : ''));
                add('OBSERVAÇÃO', d.observacao);
                break;
            case 10.2:
                add('SERVIÇO EXECUTADO', d.descricaoServico);
                add('MATERIAIS UTILIZADOS', d.materiaisUsados);
                add('OBSERVAÇÃO', d.observacao);
                break;
            case 11:
                add('DECISÃO', d.decisao === 'APROVADO' ? '✅ Aprovado' : d.decisao || '');
                add('PARECER DO GESTOR', d.parecer);
                break;
            case 12:
                add('AVALIAÇÃO', d.avaliacao ? '⭐'.repeat(Number(d.avaliacao)) : '');
                add('OBSERVAÇÃO FINAL', d.observacaoFinal);
                break;
            default:   add('STATUS', 'Etapa concluída.');
        }

        return campos;
    }

    function _fmtData(str) {
        if (!str) return '';
        const d = new Date(str + 'T00:00:00');
        return String(d.getDate()).padStart(2, '0') + '/'
             + String(d.getMonth() + 1).padStart(2, '0') + '/'
             + d.getFullYear();
    }


    // =========================================================================
    // EXPOSIÇÃO GLOBAL
    // =========================================================================
    window.renderMensagens = renderMensagens;

})();