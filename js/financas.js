(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    var MES_KEY = "arquimago_financas_mes_v1";

    var CATEGORIAS = ["Moradia", "Energia", "Internet", "Assinaturas", "Alimentação", "Transporte", "Cartão", "Banco", "Academia", "Compras", "Outros"];

    var MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    var MESES_ABR = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

    var TIPO_LABEL = { unica: "Única", recorrente: "Recorrente", parcelada: "Parcelada" };

    var selectedMes = loadMesPref();

    function loadMesPref() {
        try {
            var raw = localStorage.getItem(MES_KEY);
            if (raw && /^\d{4}-\d{2}$/.test(raw)) return raw;
        } catch (e) {}
        return mesAtual();
    }

    function saveMesPref() {
        try {
            localStorage.setItem(MES_KEY, selectedMes);
        } catch (e) {}
    }

    function esc(v) {
        return String(v == null ? "" : v)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function pad2(n) {
        n = Number(n);
        return n < 10 ? "0" + n : String(n);
    }

    function mesAtual() {
        return todayKey().slice(0, 7);
    }

    function todayKey() {
        var d = new Date();
        return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
    }

    function shiftMes(mes, delta) {
        var p = mes.split("-");
        var idx = (parseInt(p[0], 10) * 12) + (parseInt(p[1], 10) - 1) + delta;
        var y = Math.floor(idx / 12);
        var m = (idx % 12) + 1;
        return y + "-" + pad2(m);
    }

    function mesLabel(mes) {
        var p = mes.split("-");
        var idx = Math.max(0, Math.min(11, parseInt(p[1], 10) - 1));
        return MESES[idx] + " " + p[0];
    }

    function dataBadge(data) {
        if (!data || typeof data !== "string") return "—";
        var p = data.split("-");
        var day = parseInt(p[2], 10);
        var mon = Math.max(0, Math.min(11, parseInt(p[1], 10) - 1));
        return pad2(day) + " " + MESES_ABR[mon];
    }

    function clampDia(v) {
        v = parseInt(v, 10);
        if (!isFinite(v)) return 1;
        return Math.max(1, Math.min(31, v));
    }

    function formatMoney(v) {
        v = Math.round((Number(v) || 0) * 100) / 100;
        try {
            return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } catch (e) {
            var s = v.toFixed(2).replace(".", ",");
            return "R$ " + (Arquimago.formatNumber ? Arquimago.formatNumber(parseInt(s.replace(/[^\d-]/g, ""), 10)) : s) + s.replace(/^-?[\d.]+/, "").replace(",", ",");
        }
    }

    function getFin(state) {
        state = state || Arquimago.state;
        if (!state.financas || typeof state.financas !== "object") state.financas = {};
        var fin = state.financas;
        if (!Array.isArray(fin.despesas)) fin.despesas = [];
        if (!Array.isArray(fin.transacoes)) fin.transacoes = [];
        if (typeof fin.cartaoLimite !== "number" || !isFinite(fin.cartaoLimite)) fin.cartaoLimite = 0;
        return fin;
    }

    function recalcBalances(state) {
        var fin = getFin(state);
        var saldo = Number(fin.saldoInicial) || 0;
        var guardado = Number(fin.guardadoInicial) || 0;
        var list = fin.transacoes.slice().sort(function (a, b) {
            if (a.data !== b.data) return a.data < b.data ? -1 : 1;
            return (a.seq || 0) - (b.seq || 0);
        });
        list.forEach(function (t) {
            var v = Number(t.valor) || 0;
            switch (t.tipo) {
                case "entrada": saldo += v; break;
                case "saida": saldo -= v; break;
                case "guardado_entrada": guardado += v; break;
                case "guardado_saida": guardado -= v; break;
                case "transferencia_saldo_guardado": saldo -= v; guardado += v; break;
                case "transferencia_guardado_saldo": guardado -= v; saldo += v; break;
            }
            t.saldoApos = saldo;
            t.guardadoApos = guardado;
        });
        fin.saldo = saldo;
        fin.guardado = guardado;
    }

    function addTransacao(state, opts) {
        var fin = getFin(state);
        var t = {
            id: "t_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
            seq: Date.now() + Math.random(),
            data: opts.data || todayKey(),
            tipo: opts.tipo,
            nome: String(opts.nome || ""),
            valor: Math.max(0, Number(opts.valor) || 0),
            categoria: opts.categoria || "",
            origem: opts.origem || "manual",
            despesaId: opts.despesaId || null,
            mes: opts.mes || null
        };
        fin.transacoes.push(t);
        recalcBalances(state);
        return t;
    }

    function findDespesaById(state, id) {
        var fin = getFin(state);
        for (var i = 0; i < fin.despesas.length; i++) {
            if (fin.despesas[i].id === id) return fin.despesas[i];
        }
        return null;
    }

    function findPagamento(d, mes) {
        var list = d.pagamentos || [];
        for (var i = 0; i < list.length; i++) {
            if (list[i].mes === mes) return list[i];
        }
        return null;
    }

    function findParcela(d, mes) {
        var list = d.parcelas || [];
        for (var i = 0; i < list.length; i++) {
            if (list[i].mes === mes) return list[i];
        }
        return null;
    }

    function allParcelasPagas(d) {
        var list = d.parcelas || [];
        for (var i = 0; i < list.length; i++) {
            if (list[i].status !== "paga") return false;
        }
        return true;
    }

    function defaultNomeMov(tipo) {
        switch (tipo) {
            case "entrada": return "Entrada";
            case "saida": return "Saída";
            case "guardado_entrada": return "Depósito no guardado";
            case "guardado_saida": return "Retirada do guardado";
            case "transferencia_saldo_guardado": return "Transferência para guardado";
            case "transferencia_guardado_saldo": return "Transferência para saldo";
            default: return "Movimentação";
        }
    }

    Arquimago.normalizeFinancas = function (state) {
        var fin = getFin(state);
        if (typeof fin.saldoInicial !== "number" || !isFinite(fin.saldoInicial)) fin.saldoInicial = 0;
        if (typeof fin.guardadoInicial !== "number" || !isFinite(fin.guardadoInicial)) fin.guardadoInicial = 0;
        fin.despesas.forEach(function (d) {
            d.nome = String(d.nome || "");
            d.valor = Math.max(0, Number(d.valor) || 0);
            d.diaVencimento = clampDia(d.diaVencimento);
            if (!d.categoria || CATEGORIAS.indexOf(d.categoria) === -1) d.categoria = "Outros";
            if (d.tipo !== "recorrente" && d.tipo !== "parcelada") d.tipo = "unica";
            if (!/^\d{4}-\d{2}$/.test(d.mesInicial)) d.mesInicial = mesAtual();
            if (d.tipo === "recorrente") d.pagamentos = Array.isArray(d.pagamentos) ? d.pagamentos : [];
            if (d.tipo === "parcelada") {
                d.parcelas = Array.isArray(d.parcelas) ? d.parcelas : [];
                d.parcelasTotal = Math.max(1, Number(d.parcelasTotal) || 1);
                d.concluida = !!d.concluida;
            }
        });
        fin.transacoes.forEach(function (t) {
            t.valor = Math.max(0, Number(t.valor) || 0);
            if (["entrada", "saida", "guardado_entrada", "guardado_saida", "transferencia_saldo_guardado", "transferencia_guardado_saldo"].indexOf(t.tipo) === -1) t.tipo = "entrada";
            if (!t.nome) t.nome = defaultNomeMov(t.tipo);
            if (!t.data) t.data = todayKey();
        });
        recalcBalances(state);
        return state;
    };

    /* ============================================================
       Instâncias de despesa em um mês
       ============================================================ */
    function getInstancia(d, mes) {
        if (d.tipo === "unica") {
            if (d.mesInicial !== mes) return null;
            return {
                id: d.id, despesa: d, mes: mes, nome: d.nome, valor: d.valor,
                dia: d.diaVencimento, categoria: d.categoria, tipo: d.tipo,
                observacao: d.observacao,
                paga: !!d.pago, transacaoId: d.transacaoId || null,
                parcelaNumero: null, parcelaTotal: null
            };
        }
        if (d.tipo === "recorrente") {
            if (mes < d.mesInicial) return null;
            var pag = findPagamento(d, mes);
            return {
                id: d.id, despesa: d, mes: mes, nome: d.nome, valor: d.valor,
                dia: d.diaVencimento, categoria: d.categoria, tipo: d.tipo,
                observacao: d.observacao,
                paga: !!pag, transacaoId: pag ? pag.transacaoId : null,
                parcelaNumero: null, parcelaTotal: null
            };
        }
        var p = findParcela(d, mes);
        if (!p) return null;
        return {
            id: d.id, despesa: d, mes: mes, nome: d.nome, valor: d.valor,
            dia: d.diaVencimento, categoria: d.categoria, tipo: d.tipo,
            observacao: d.observacao,
            paga: p.status === "paga", transacaoId: p.transacaoId || null,
            parcelaNumero: p.numero, parcelaTotal: d.parcelasTotal
        };
    }

    function despesasDoMes(mes) {
        var fin = getFin(Arquimago.state);
        var out = [];
        fin.despesas.forEach(function (d) {
            var inst = getInstancia(d, mes);
            if (inst) out.push(inst);
        });
        out.sort(function (a, b) {
            if (a.dia !== b.dia) return a.dia - b.dia;
            return a.nome < b.nome ? -1 : (a.nome > b.nome ? 1 : 0);
        });
        return out;
    }

    Arquimago.getDespesasDoMes = despesasDoMes;

    function estadoDeVencimento(mes, dia) {
        var hoje = new Date();
        var cur = hoje.getFullYear() + "-" + pad2(hoje.getMonth() + 1);
        if (mes === cur) {
            var diff = dia - hoje.getDate();
            if (diff < 0) return "vencido";
            if (diff <= 3) return "proximo";
            return "futuro";
        }
        if (mes < cur) return "vencido";
        return "futuro";
    }

    function estadoItem(inst) {
        if (inst.paga) return { cls: "pago", text: "✓ Pago" };
        var est = estadoDeVencimento(inst.mes, inst.dia);
        if (est === "vencido") return { cls: "vencido", text: "⚠ Atrasado" };
        if (est === "proximo") return { cls: "proximo", text: "Próximo do vencimento" };
        return { cls: "futuro", text: "Pendente" };
    }

    function resumoMes(mes) {
        var inst = despesasDoMes(mes);
        var aPagar = 0;
        var jaPago = 0;
        inst.forEach(function (i) {
            if (i.paga) jaPago += i.valor;
            else aPagar += i.valor;
        });
        var receitas = 0;
        getFin(Arquimago.state).transacoes.forEach(function (t) {
            if (t.tipo === "entrada" && t.data && t.data.indexOf(mes) === 0) receitas += Number(t.valor) || 0;
        });
        return { aPagar: aPagar, jaPago: jaPago, total: aPagar + jaPago, receitas: receitas, saldo: getFin(Arquimago.state).saldo, cartaoLimite: getFin(Arquimago.state).cartaoLimite };
    }

    function cartaoData(mes) {
        var fin = getFin(Arquimago.state);
        var limite = Number(fin.cartaoLimite) || 0;
        var gasto = 0;
        despesasDoMes(mes).forEach(function (i) {
            if (i.categoria === "Cartão") gasto += i.valor;
        });
        var disponivel = Math.max(0, limite - gasto);
        var pct = limite > 0 ? Math.min(100, Math.round((gasto / limite) * 100)) : 0;
        return { limite: limite, gasto: gasto, disponivel: disponivel, pct: pct };
    }

    function historicoLista() {
        return getFin(Arquimago.state).transacoes.slice().sort(function (a, b) {
            if (a.data !== b.data) return a.data < b.data ? 1 : -1;
            return (b.seq || 0) - (a.seq || 0);
        });
    }

    function tipoInfo(t) {
        switch (t.tipo) {
            case "entrada": return { icon: "🟢", label: "Entrada", cls: "entrada" };
            case "saida": return { icon: "🔴", label: "Saída", cls: "saida" };
            case "guardado_entrada": return { icon: "💎", label: "Guardado · depósito", cls: "guardado" };
            case "guardado_saida": return { icon: "💎", label: "Guardado · retirada", cls: "guardado" };
            case "transferencia_saldo_guardado": return { icon: "🔵", label: "Transferência · para guardado", cls: "transferencia" };
            case "transferencia_guardado_saldo": return { icon: "🔵", label: "Transferência · para saldo", cls: "transferencia" };
            default: return { icon: "⚪", label: "Movimentação", cls: "" };
        }
    }

    function valorSinal(t) {
        switch (t.tipo) {
            case "entrada":
            case "transferencia_guardado_saldo":
            case "guardado_entrada": return "+ " + formatMoney(t.valor);
            default: return "- " + formatMoney(t.valor);
        }
    }

    /* ============================================================
       Ações financeiras
       ============================================================ */
    Arquimago.criarDespesa = function (opts) {
        var state = Arquimago.state;
        var fin = getFin(state);
        var nome = String(opts.nome || "").trim();
        if (!nome) return null;
        var valor = Math.max(0, Number(opts.valor) || 0);
        if (!valor) return null;

        var d = {
            id: "d_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
            nome: nome,
            valor: valor,
            diaVencimento: clampDia(opts.diaVencimento),
            tipo: opts.tipo === "parcelada" ? "parcelada" : (opts.tipo === "recorrente" ? "recorrente" : "unica"),
            categoria: CATEGORIAS.indexOf(opts.categoria) !== -1 ? opts.categoria : "Outros",
            observacao: String(opts.observacao || ""),
            mesInicial: /^\d{4}-\d{2}$/.test(opts.mes) ? opts.mes : mesAtual(),
            criadaEm: Date.now()
        };

        if (d.tipo === "recorrente") {
            d.pagamentos = [];
        }
        if (d.tipo === "parcelada") {
            var total = Math.max(2, Math.min(48, parseInt(opts.parcelasTotal, 10) || 2));
            d.parcelasTotal = total;
            d.parcelas = [];
            for (var i = 0; i < total; i++) {
                d.parcelas.push({ numero: i + 1, mes: shiftMes(d.mesInicial, i), status: "pendente", transacaoId: null });
            }
            d.concluida = false;
        }

        fin.despesas.push(d);
        recalcBalances(state);
        Arquimago.saveState(state);
        return d;
    };

    Arquimago.atualizarDespesa = function (id, opts) {
        var state = Arquimago.state;
        var fin = getFin(state);
        var d = findDespesaById(state, id);
        if (!d) return null;
        var valorAntes = d.valor;

        d.nome = String(opts.nome || "").trim() || d.nome;
        d.valor = Math.max(0, Number(opts.valor) || 0);
        d.diaVencimento = clampDia(opts.diaVencimento != null ? opts.diaVencimento : d.diaVencimento);
        if (CATEGORIAS.indexOf(opts.categoria) !== -1) d.categoria = opts.categoria;
        d.observacao = String(opts.observacao || "");

        if (d.valor !== valorAntes) {
            fin.transacoes.forEach(function (t) {
                if (t.origem === "despesa" && t.despesaId === d.id) t.valor = d.valor;
            });
        }
        recalcBalances(state);
        Arquimago.saveState(state);
        return d;
    };

    Arquimago.excluirDespesa = function (id) {
        var state = Arquimago.state;
        var fin = getFin(state);
        var idx = -1;
        for (var i = 0; i < fin.despesas.length; i++) {
            if (fin.despesas[i].id === id) {
                idx = i;
                break;
            }
        }
        if (idx === -1) return false;
        fin.despesas.splice(idx, 1);
        recalcBalances(state);
        Arquimago.saveState(state);
        return true;
    };

    Arquimago.pagarDespesa = function (id, mes) {
        var state = Arquimago.state;
        var fin = getFin(state);
        var d = findDespesaById(state, id);
        if (!d) return false;

        var transacao = null;
        if (d.tipo === "unica") {
            if (d.pago) return false;
            transacao = addTransacao(state, {
                tipo: "saida", nome: d.nome, valor: d.valor, categoria: d.categoria,
                origem: "despesa", despesaId: d.id, mes: mes
            });
            d.pago = true;
            d.transacaoId = transacao.id;
            d.pagoMes = mes;
            d.pagoEm = todayKey();
        } else if (d.tipo === "recorrente") {
            if (findPagamento(d, mes)) return false;
            transacao = addTransacao(state, {
                tipo: "saida", nome: d.nome, valor: d.valor, categoria: d.categoria,
                origem: "despesa", despesaId: d.id, mes: mes
            });
            d.pagamentos.push({ mes: mes, transacaoId: transacao.id, data: todayKey() });
        } else {
            var p = findParcela(d, mes);
            if (!p || p.status === "paga") return false;
            transacao = addTransacao(state, {
                tipo: "saida", nome: d.nome, valor: d.valor, categoria: d.categoria,
                origem: "despesa", despesaId: d.id, mes: mes
            });
            p.status = "paga";
            p.transacaoId = transacao.id;
            p.pagoEm = todayKey();
            if (allParcelasPagas(d)) d.concluida = true;
        }

        recalcBalances(state);
        Arquimago.saveState(state);
        return true;
    };

    Arquimago.desfazerPagamento = function (id, mes) {
        var state = Arquimago.state;
        var fin = getFin(state);
        var d = findDespesaById(state, id);
        if (!d) return false;

        var transacaoId = null;
        if (d.tipo === "unica") {
            if (!d.pago) return false;
            transacaoId = d.transacaoId;
            d.pago = false;
            d.transacaoId = null;
            d.pagoMes = null;
            d.pagoEm = null;
        } else if (d.tipo === "recorrente") {
            var pag = findPagamento(d, mes);
            if (!pag) return false;
            transacaoId = pag.transacaoId;
            d.pagamentos = d.pagamentos.filter(function (p) { return p.mes !== mes; });
        } else {
            var p = findParcela(d, mes);
            if (!p || p.status !== "paga") return false;
            transacaoId = p.transacaoId;
            p.status = "pendente";
            p.transacaoId = null;
            d.concluida = false;
        }

        fin.transacoes = fin.transacoes.filter(function (t) { return t.id !== transacaoId; });
        recalcBalances(state);
        Arquimago.saveState(state);
        return true;
    };

    Arquimago.registrarMovimentacao = function (opts) {
        var state = Arquimago.state;
        var fin = getFin(state);
        var valid = ["entrada", "saida", "guardado_entrada", "guardado_saida", "transferencia_saldo_guardado", "transferencia_guardado_saldo"];
        if (valid.indexOf(opts.tipo) === -1) return { ok: false, motivo: "invalido" };
        var valor = Math.max(0, Number(opts.valor) || 0);
        if (!valor) return { ok: false, motivo: "valor" };

        if ((opts.tipo === "guardado_saida" || opts.tipo === "transferencia_guardado_saldo") && valor > fin.guardado) {
            return { ok: false, motivo: "guardado" };
        }

        addTransacao(state, {
            tipo: opts.tipo,
            nome: String(opts.nome || "").trim() || defaultNomeMov(opts.tipo),
            valor: valor,
            categoria: opts.categoria || "",
            origem: "manual",
            data: /^\d{4}-\d{2}-\d{2}$/.test(opts.data) ? opts.data : todayKey()
        });
        recalcBalances(state);
        Arquimago.saveState(state);
        return { ok: true };
    };

    Arquimago.zerarFinancas = function () {
        var state = Arquimago.state;
        var fin = getFin(state);
        fin.saldoInicial = 0;
        fin.guardadoInicial = 0;
        fin.transacoes = [];
        fin.despesas.forEach(function (d) {
            if (d.tipo === "unica") {
                d.pago = false;
                d.transacaoId = null;
                d.pagoMes = null;
                d.pagoEm = null;
            } else if (d.tipo === "recorrente") {
                d.pagamentos = [];
            } else if (d.tipo === "parcelada") {
                (d.parcelas || []).forEach(function (p) {
                    p.status = "pendente";
                    p.transacaoId = null;
                    p.pagoEm = null;
                });
                d.concluida = false;
            }
        });
        recalcBalances(state);
        Arquimago.saveState(state);
        return true;
    };

    Arquimago.updateTopCrystals = function () {
        var fin = getFin(Arquimago.state);
        var saldoEl = document.getElementById("topCrystalSaldo");
        var guardadoEl = document.getElementById("topCrystalGuardado");
        if (saldoEl) saldoEl.textContent = formatMoney(fin.saldo);
        if (guardadoEl) guardadoEl.textContent = formatMoney(fin.guardado);
    };

    /* ============================================================
       Modais
       ============================================================ */
    function openFinModal(title, bodyHtml, bind) {
        var modal = document.createElement("div");
        modal.className = "modal financas-modal";
        modal.innerHTML =
            '<div class="modal-backdrop" data-close-fin-modal></div>' +
            '<div class="modal-panel financas-modal-panel">' +
            '<button type="button" class="modal-close-button" data-close-fin-modal aria-label="Fechar"><img src="assets/ui/icons/icon-close.png" alt=""></button>' +
            '<h3>' + esc(title) + '</h3>' +
            bodyHtml +
            '</div>';
        document.body.appendChild(modal);

        function close() {
            document.removeEventListener("keydown", onKey);
            modal.remove();
        }
        function onKey(e) {
            if (e.key === "Escape") close();
        }
        modal.querySelectorAll("[data-close-fin-modal]").forEach(function (el) {
            el.addEventListener("click", close);
        });
        document.addEventListener("keydown", onKey);
        if (bind) bind(modal, close);
        return modal;
    }

    function categoriaOptions(selected) {
        return CATEGORIAS.map(function (c) {
            return '<option value="' + esc(c) + '"' + (c === selected ? " selected" : "") + '>' + esc(c) + '</option>';
        }).join("");
    }

    function openDespesaModal(existing) {
        var edit = !!existing;
        var d = existing || {};
        var html =
            '<form class="fin-form" id="finDespForm" autocomplete="off">' +
            '<div class="fin-form__field"><label for="finDespNome">Nome da despesa</label>' +
            '<input type="text" id="finDespNome" maxlength="60" autocomplete="off" spellcheck="false" value="' + esc(d.nome || "") + '" placeholder="Ex.: Spotify" required>' +
            '</div>' +
            '<div class="fin-form__row">' +
            '<div class="fin-form__field"><label for="finDespValor">Valor (R$)</label>' +
            '<input type="number" id="finDespValor" min="0.01" step="0.01" inputmode="decimal" value="' + esc(d.valor != null ? d.valor : "") + '" required>' +
            '</div>' +
            '<div class="fin-form__field"><label for="finDespDia">Dia de vencimento</label>' +
            '<input type="number" id="finDespDia" min="1" max="31" inputmode="numeric" value="' + esc(d.diaVencimento || 1) + '" required>' +
            '</div>' +
            '</div>' +
            '<div class="fin-form__row">' +
            '<div class="fin-form__field"><label for="finDespTipo">Tipo</label>' +
            '<select id="finDespTipo"' + (edit ? ' disabled' : '') + '>' +
            '<option value="unica"' + (d.tipo === "unica" || !d.tipo ? " selected" : "") + '>Única</option>' +
            '<option value="recorrente"' + (d.tipo === "recorrente" ? " selected" : "") + '>Mensal / Recorrente</option>' +
            '<option value="parcelada"' + (d.tipo === "parcelada" ? " selected" : "") + '>Parcelada</option>' +
            '</select>' +
            '</div>' +
            '<div class="fin-form__field" id="finDespParcelasWrap">' +
            '<label for="finDespParcelas">Quantidade de parcelas</label>' +
            '<input type="number" id="finDespParcelas" min="2" max="48" inputmode="numeric" value="' + esc(d.parcelasTotal || 2) + '"' + (edit && d.tipo === "parcelada" ? ' disabled' : '') + '>' +
            '<p class="fin-form__hint">O valor informado é o valor de cada parcela.</p>' +
            '</div>' +
            '</div>' +
            '<div class="fin-form__field"><label for="finDespCat">Categoria</label>' +
            '<select id="finDespCat">' + categoriaOptions(d.categoria || "Outros") + '</select>' +
            '</div>' +
            '<div class="fin-form__field"><label for="finDespObs">Observação (opcional)</label>' +
            '<input type="text" id="finDespObs" maxlength="120" autocomplete="off" spellcheck="false" value="' + esc(d.observacao || "") + '">' +
            '</div>' +
            '<div class="fin-form__actions">' +
            '<button type="submit" class="btn-primary compact">' + (edit ? "Salvar" : "Criar despesa") + '</button>' +
            '<button type="button" class="btn-secondary compact" data-close-fin-modal>Cancelar</button>' +
            '</div>' +
            '</form>';

        openFinModal(edit ? "Editar despesa" : "Nova despesa", html, function (modal, close) {
            var tipo = modal.querySelector("#finDespTipo");
            var parcelasWrap = modal.querySelector("#finDespParcelasWrap");
            function toggleParcelas() {
                if (!parcelasWrap) return;
                parcelasWrap.style.display = (tipo && tipo.value === "parcelada") ? "" : "none";
            }
            if (tipo && !tipo.disabled) {
                tipo.addEventListener("change", toggleParcelas);
            }
            toggleParcelas();

            modal.querySelector("#finDespForm").addEventListener("submit", function (e) {
                e.preventDefault();
                var nome = modal.querySelector("#finDespNome").value.trim();
                var valor = parseFloat(modal.querySelector("#finDespValor").value.replace(",", "."));
                var dia = parseInt(modal.querySelector("#finDespDia").value, 10);
                var tipoVal = tipo ? tipo.value : (d.tipo || "unica");
                var parcelasTotal = modal.querySelector("#finDespParcelas").value;
                var cat = modal.querySelector("#finDespCat").value;
                var obs = modal.querySelector("#finDespObs").value.trim();

                if (!nome || !valor || valor <= 0) {
                    Arquimago.showNotification("Informe um nome e um valor válido.", "boss");
                    return;
                }

                if (edit) {
                    Arquimago.atualizarDespesa(d.id, {
                        nome: nome, valor: valor, diaVencimento: dia, categoria: cat, observacao: obs
                    });
                    Arquimago.showNotification("Despesa atualizada.", "xp");
                } else {
                    Arquimago.criarDespesa({
                        nome: nome, valor: valor, diaVencimento: dia, tipo: tipoVal,
                        parcelasTotal: parseInt(parcelasTotal, 10), categoria: cat,
                        observacao: obs, mes: selectedMes
                    });
                    Arquimago.showNotification("Despesa criada.", "xp");
                }
                close();
                Arquimago.renderFinancas();
            });
        });
    }

    function openMovimentacaoModal(presetTipo) {
        var html =
            '<form class="fin-form" id="finMovForm" autocomplete="off">' +
            '<div class="fin-form__field"><label for="finMovTipo">Tipo de movimentação</label>' +
            '<select id="finMovTipo">' +
            '<option value="entrada"' + (presetTipo === "entrada" ? " selected" : "") + '>Entrada · adicionar ao saldo</option>' +
            '<option value="saida"' + (presetTipo === "saida" ? " selected" : "") + '>Saída · retirar do saldo</option>' +
            '<option value="transferencia_saldo_guardado"' + (presetTipo === "transferencia_saldo_guardado" ? " selected" : "") + '>Transferir saldo → guardado</option>' +
            '<option value="transferencia_guardado_saldo"' + (presetTipo === "transferencia_guardado_saldo" ? " selected" : "") + '>Transferir guardado → saldo</option>' +
            '<option value="guardado_entrada"' + (presetTipo === "guardado_entrada" ? " selected" : "") + '>Adicionar dinheiro ao guardado</option>' +
            '<option value="guardado_saida"' + (presetTipo === "guardado_saida" ? " selected" : "") + '>Retirar dinheiro do guardado</option>' +
            '</select>' +
            '<p class="fin-form__hint">Adicionar/retirar do guardado não altera o saldo. Para mover valores entre saldo e guardado, use as transferências.</p>' +
            '</div>' +
            '<div class="fin-form__row">' +
            '<div class="fin-form__field"><label for="finMovNome">Nome</label>' +
            '<input type="text" id="finMovNome" maxlength="60" autocomplete="off" spellcheck="false" placeholder="Ex.: Pagamento recebido">' +
            '</div>' +
            '<div class="fin-form__field"><label for="finMovValor">Valor (R$)</label>' +
            '<input type="number" id="finMovValor" min="0.01" step="0.01" inputmode="decimal" required>' +
            '</div>' +
            '</div>' +
            '<div class="fin-form__field"><label for="finMovData">Data</label>' +
            '<input type="date" id="finMovData" value="' + esc(todayKey()) + '">' +
            '</div>' +
            '<div class="fin-form__actions">' +
            '<button type="submit" class="btn-primary compact">Registrar</button>' +
            '<button type="button" class="btn-secondary compact" data-close-fin-modal>Cancelar</button>' +
            '</div>' +
            '</form>';

        openFinModal("Movimentação", html, function (modal, close) {
            modal.querySelector("#finMovForm").addEventListener("submit", function (e) {
                e.preventDefault();
                var tipo = modal.querySelector("#finMovTipo").value;
                var nome = modal.querySelector("#finMovNome").value.trim();
                var valor = parseFloat(modal.querySelector("#finMovValor").value.replace(",", "."));
                var data = modal.querySelector("#finMovData").value;

                if (!valor || valor <= 0) {
                    Arquimago.showNotification("Informe um valor válido.", "boss");
                    return;
                }

                var r = Arquimago.registrarMovimentacao({ tipo: tipo, nome: nome, valor: valor, data: data });
                if (!r.ok) {
                    if (r.motivo === "guardado") {
                        Arquimago.showNotification("Saldo insuficiente no guardado.", "boss");
                    } else {
                        Arquimago.showNotification("Não foi possível registrar.", "boss");
                    }
                    return;
                }
                Arquimago.showNotification("Movimentação registrada.", "xp");
                close();
                Arquimago.renderFinancas();
            });
        });
    }

    function openConfirmDesfazer(id, mes) {
        var d = findDespesaById(Arquimago.state, id);
        if (!d) return;
        var inst = getInstancia(d, mes);
        if (!inst) return;

        var html =
            '<p class="financas-confirm__text">Desfazer o pagamento de <strong>' + esc(inst.nome) + '</strong>?</p>' +
            '<div class="financas-confirm__value">' + formatMoney(inst.valor) + ' será devolvido ao saldo.</div>' +
            '<div class="financas-confirm__actions">' +
            '<button type="button" class="btn-primary compact" data-confirm-fin-desfazer>Desfazer pagamento</button>' +
            '<button type="button" class="btn-secondary compact" data-close-fin-modal>Cancelar</button>' +
            '</div>';

        openFinModal("Desfazer pagamento", html, function (modal, close) {
            modal.querySelector("[data-confirm-fin-desfazer]").addEventListener("click", function () {
                var ok = Arquimago.desfazerPagamento(id, mes);
                close();
                if (ok) Arquimago.showNotification("Pagamento desfeito.", "xp");
                else Arquimago.showNotification("Nenhum pagamento encontrado.", "boss");
                Arquimago.renderFinancas();
            });
        });
    }

    function openConfirmExcluir(id) {
        var d = findDespesaById(Arquimago.state, id);
        if (!d) return;

        var html =
            '<p class="financas-confirm__text">Excluir a despesa <strong>' + esc(d.nome) + '</strong>?</p>' +
            '<p class="financas-confirm__note">Os pagamentos já realizados permanecem no histórico e o saldo não é alterado.</p>' +
            '<div class="financas-confirm__actions">' +
            '<button type="button" class="btn-primary compact is-danger" data-confirm-fin-excluir>Excluir</button>' +
            '<button type="button" class="btn-secondary compact" data-close-fin-modal>Cancelar</button>' +
            '</div>';

        openFinModal("Excluir despesa", html, function (modal, close) {
            modal.querySelector("[data-confirm-fin-excluir]").addEventListener("click", function () {
                Arquimago.excluirDespesa(id);
                close();
                Arquimago.showNotification("Despesa excluída.", "xp");
                Arquimago.renderFinancas();
            });
        });
    }

    function openConfirmZerar() {
        var html =
            '<p class="financas-confirm__text">Apagar todo o <strong>histórico financeiro</strong> e zerar o <strong>saldo</strong> e a <strong>poupança</strong>?</p>' +
            '<p class="financas-confirm__note">Os pagamentos de despesas serão desfeitos. As despesas cadastradas permanecem. Esta ação não pode ser desfeita.</p>' +
            '<div class="financas-confirm__actions">' +
            '<button type="button" class="btn-primary compact is-danger" data-confirm-fin-zerar>Zerar finanças</button>' +
            '<button type="button" class="btn-secondary compact" data-close-fin-modal>Cancelar</button>' +
            '</div>';

        openFinModal("Zerar finanças", html, function (modal, close) {
            modal.querySelector("[data-confirm-fin-zerar]").addEventListener("click", function () {
                Arquimago.zerarFinancas();
                close();
                Arquimago.showNotification("Finanças zeradas.", "xp");
                Arquimago.renderFinancas();
            });
        });
    }

    /* ============================================================
       Renderização
       ============================================================ */
    /* ============================================================
       Widgets da Home (saldo, guardado, cartão, despesas)
       ============================================================ */
    function finWidgetHeader(title, icon, hint) {
        return '<div class="panel-header home-fin-widget__head">' +
            '<h3>' + (icon ? '<span class="home-fin-widget__icon" aria-hidden="true">' + icon + '</span>' : "") + esc(title) + '</h3>' +
            (hint ? '<span>' + esc(hint) + '</span>' : "") +
            '</div>';
    }

    Arquimago.saldoWidgetHtml = function () {
        var fin = getFin(Arquimago.state);
        return '<section class="panel home-fin-widget home-fin-widget--saldo">' +
            finWidgetHeader("Saldo", "💎") +
            '<div class="home-fin-widget__value">' + formatMoney(fin.saldo) + '</div>' +
            '<button type="button" class="btn-secondary compact home-fin-widget__open" data-fin-open="financas">Abrir finanças ›</button>' +
            '</section>';
    };

    Arquimago.guardadoWidgetHtml = function () {
        var fin = getFin(Arquimago.state);
        return '<section class="panel home-fin-widget home-fin-widget--guardado">' +
            finWidgetHeader("Guardado", "🔵") +
            '<div class="home-fin-widget__value">' + formatMoney(fin.guardado) + '</div>' +
            '<button type="button" class="btn-secondary compact home-fin-widget__open" data-fin-open="financas">Abrir finanças ›</button>' +
            '</section>';
    };

    Arquimago.cartaoWidgetHtml = function () {
        var data = cartaoData(mesAtual());
        if (!data.limite) {
            return '<section class="panel home-fin-widget home-fin-widget--cartao">' +
                finWidgetHeader("Cartão de Crédito", "💳") +
                '<p class="home-fin-widget__empty">Defina o limite do seu cartão nas finanças para acompanhar aqui.</p>' +
                '<button type="button" class="btn-secondary compact home-fin-widget__open" data-fin-open="financas">Configurar cartão ›</button>' +
                '</section>';
        }
        return '<section class="panel home-fin-widget home-fin-widget--cartao">' +
            finWidgetHeader("Cartão de Crédito", "💳") +
            '<div class="home-fin-widget__bar">' +
            '<span class="home-fin-widget__bar-fill" style="width:' + data.pct + '%"></span>' +
            '</div>' +
            '<div class="home-fin-widget__values">' +
            '<span><small>Usado</small><strong class="is-gasto">' + formatMoney(data.gasto) + '</strong></span>' +
            '<span><small>Limite</small><strong>' + formatMoney(data.limite) + '</strong></span>' +
            '<span><small>Disponível</small><strong class="is-disponivel">' + formatMoney(data.disponivel) + '</strong></span>' +
            '</div>' +
            '<button type="button" class="btn-secondary compact home-fin-widget__open" data-fin-open="financas">Ver finanças ›</button>' +
            '</section>';
    };

    Arquimago.despesasWidgetHtml = function () {
        var mes = mesAtual();
        var inst = despesasDoMes(mes);
        if (!inst.length) {
            return '<section class="panel home-fin-widget home-fin-widget--despesas">' +
                finWidgetHeader("Despesas de " + MESES_ABR[parseInt(mes.split("-")[1], 10) - 1], "📅") +
                '<p class="home-fin-widget__empty">Nenhuma despesa cadastrada para ' + mesLabel(mes) + '.</p>' +
                '<button type="button" class="btn-secondary compact home-fin-widget__open" data-fin-open="financas">Adicionar despesa ›</button>' +
                '</section>';
        }
        var rows = inst.slice(0, 6).map(function (i) {
            var est = estadoItem(i);
            return '<div class="home-fin-row is-' + est.cls + '">' +
                '<span class="home-fin-row__dia"><b>' + pad2(i.dia) + '</b><small>Dia</small></span>' +
                '<span class="home-fin-row__copy"><strong>' + esc(i.nome) + '</strong><small>' + esc(i.categoria) + (i.parcelaNumero ? " · " + i.parcelaNumero + "/" + i.parcelaTotal : "") + '</small></span>' +
                '<span class="home-fin-row__valor">' + formatMoney(i.valor) + '</span>' +
                '<span class="home-fin-row__status is-' + est.cls + '">' + (i.paga ? "✓" : "•") + '</span>' +
                '</div>';
        }).join("");
        return '<section class="panel home-fin-widget home-fin-widget--despesas">' +
            finWidgetHeader("Despesas · vence", "📅") +
            '<div class="home-fin-widget__list">' + rows + '</div>' +
            '<button type="button" class="btn-secondary compact home-fin-widget__open" data-fin-open="financas">Ver todas ›</button>' +
            '</section>';
    };

    function despesaRowHtml(inst) {
        var est = estadoItem(inst);
        var parc = inst.parcelaNumero ? '<span class="fin-row__parcela">' + inst.parcelaNumero + '/' + inst.parcelaTotal + '</span>' : "";
        var tipoLabel = TIPO_LABEL[inst.tipo] || inst.tipo;

        var check = '<label class="fin-check" title="' + (inst.paga ? "Desfazer pagamento" : "Marcar como paga") + '">' +
            '<input type="checkbox" class="fin-check__input"' + (inst.paga ? " checked" : "") +
            ' data-fin-check="' + esc(inst.id) + '" data-fin-mes="' + esc(inst.mes) + '"' +
            ' aria-label="Marcar ' + esc(inst.nome) + ' como paga">' +
            '</label>';

        var actions =
            '<button type="button" class="fin-action" data-fin-editar="' + esc(inst.id) + '" title="Editar">✎</button>' +
            '<button type="button" class="fin-action is-danger" data-fin-excluir="' + esc(inst.id) + '" title="Excluir">🗑</button>';

        return '<div class="fin-row is-' + est.cls + '">' +
            '<div class="fin-row__nome">' + check +
            '<div class="fin-row__nome-text"><strong>' + (inst.categoria === "Banco" ? '<span class="fin-row__banco" title="Despesa de banco">🏦</span>' : "") + esc(inst.nome) + '</strong>' +
            '<small>' + esc(inst.categoria) + ' · ' + esc(tipoLabel) + parc + '</small></div>' +
            '</div>' +
            '<div class="fin-row__dia" title="Vence no dia ' + inst.dia + '"><b>' + pad2(inst.dia) + '</b><i>Dia</i></div>' +
            '<div class="fin-row__valor">' + formatMoney(inst.valor) + '</div>' +
            '<div class="fin-row__status is-' + est.cls + '">' + est.text + '</div>' +
            '<div class="fin-row__acoes">' + actions + '</div>' +
            '</div>';
    }

    function despesasTableHtml(mes) {
        var inst = despesasDoMes(mes);
        if (!inst.length) {
            return '<div class="financas-empty">Nenhuma despesa para ' + mesLabel(mes) + '.</div>';
        }
        var html = '<div class="fin-table" role="table" aria-label="Despesas de ' + mesLabel(mes) + '">';
        html += '<div class="fin-row fin-row--head" role="row">' +
            '<span><i class="fin-row__head-check" aria-hidden="true"></i>Despesa</span>' +
            '<span>Vencimento</span>' +
            '<span>Valor</span>' +
            '<span>Status</span>' +
            '</div>';
        inst.forEach(function (i) {
            html += despesaRowHtml(i);
        });
        html += '</div>';
        return html;
    }

    function historicoHtml() {
        var lista = historicoLista();
        if (!lista.length) {
            return '<div class="financas-empty">Nenhuma movimentação registrada ainda.</div>';
        }
        var html = '<div class="fin-historico">';
        lista.forEach(function (t) {
            var info = tipoInfo(t);
            var aposTipo = (t.tipo === "guardado_entrada" || t.tipo === "guardado_saida") ? "Guardado após" : "Saldo após";
            var aposValor = (t.tipo === "guardado_entrada" || t.tipo === "guardado_saida")
                ? formatMoney(t.guardadoApos) : formatMoney(t.saldoApos);
            html += '<div class="fin-hist">' +
                '<div class="fin-hist__data">' + dataBadge(t.data) + '</div>' +
                '<div class="fin-hist__icon" aria-hidden="true">' + info.icon + '</div>' +
                '<div class="fin-hist__copy"><strong>' + esc(t.nome) + '</strong>' +
                '<small>' + info.label + (t.categoria ? " · " + esc(t.categoria) : "") + '</small></div>' +
                '<div class="fin-hist__valor is-' + info.cls + '">' + valorSinal(t) + '</div>' +
                '<div class="fin-hist__apos"><small>' + aposTipo + '</small><strong>' + aposValor + '</strong></div>' +
                '</div>';
        });
        html += '</div>';
        return html;
    }

    function bindFinancas(container) {
        var mesAnterior = container.querySelector("#finMesAnterior");
        var mesProximo = container.querySelector("#finMesProximo");
        if (mesAnterior) {
            mesAnterior.addEventListener("click", function () {
                Arquimago.playClick();
                selectedMes = shiftMes(selectedMes, -1);
                saveMesPref();
                Arquimago.renderFinancas();
            });
        }
        if (mesProximo) {
            mesProximo.addEventListener("click", function () {
                Arquimago.playClick();
                selectedMes = shiftMes(selectedMes, 1);
                saveMesPref();
                Arquimago.renderFinancas();
            });
        }

        container.querySelectorAll("[data-fin-saldo-action]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                Arquimago.playClick();
                openMovimentacaoModal(btn.getAttribute("data-fin-saldo-action"));
            });
        });

        var novaDespesa = container.querySelector("#finNovaDespesa");
        if (novaDespesa) {
            novaDespesa.addEventListener("click", function () {
                Arquimago.playClick();
                openDespesaModal(null);
            });
        }
        var novaMov = container.querySelector("#finNovaMovimentacao");
        if (novaMov) {
            novaMov.addEventListener("click", function () {
                Arquimago.playClick();
                openMovimentacaoModal(null);
            });
        }
        var finZerar = container.querySelector("#finZerar");
        if (finZerar) {
            finZerar.addEventListener("click", function () {
                Arquimago.playClick();
                openConfirmZerar();
            });
        }

        container.querySelectorAll("[data-fin-check]").forEach(function (input) {
            input.addEventListener("change", function () {
                var id = input.getAttribute("data-fin-check");
                var mes = input.getAttribute("data-fin-mes");
                if (input.checked) {
                    Arquimago.playClick();
                    var ok = Arquimago.pagarDespesa(id, mes);
                    if (ok) {
                        Arquimago.showNotification("Pagamento registrado.", "xp");
                        Arquimago.spawnBurst && Arquimago.spawnBurst(document.body, 6);
                    } else {
                        input.checked = false;
                        Arquimago.showNotification("Não foi possível pagar.", "boss");
                    }
                    Arquimago.renderFinancas();
                } else {
                    input.checked = true;
                    Arquimago.playClick();
                    openConfirmDesfazer(id, mes);
                }
            });
        });
        container.querySelectorAll("[data-fin-editar]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                Arquimago.playClick();
                var d = findDespesaById(Arquimago.state, btn.getAttribute("data-fin-editar"));
                if (d) openDespesaModal(d);
            });
        });
        container.querySelectorAll("[data-fin-excluir]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                Arquimago.playClick();
                openConfirmExcluir(btn.getAttribute("data-fin-excluir"));
            });
        });
    }

    Arquimago.renderFinancas = function () {
        var container = document.getElementById("financas");
        if (!container || !Arquimago.state) return;

        var state = Arquimago.state;
        recalcBalances(state);
        var fin = getFin(state);
        var resumo = resumoMes(selectedMes);

        var html = '<div class="financas-page">';

        html += '<div class="financas-balances">';

        html += '<section class="panel financas-balance is-saldo">' +
            '<div class="financas-balance__head">' +
            '<span class="financas-balance__icon" aria-hidden="true">💎</span>' +
            '<div><span class="section-label">Saldo Disponível</span></div>' +
            '</div>' +
            '<div class="financas-balance__value" id="finSaldo">' + formatMoney(fin.saldo) + '</div>' +
            '<div class="financas-balance__actions">' +
            '<button type="button" class="btn-secondary compact" data-fin-saldo-action="entrada">+ Adicionar</button>' +
            '<button type="button" class="btn-secondary compact" data-fin-saldo-action="saida">− Retirar</button>' +
            '<button type="button" class="btn-secondary compact" data-fin-saldo-action="transferencia_saldo_guardado">⇄ Guardado</button>' +
            '</div>' +
            '</section>';

        html += '<section class="panel financas-balance is-guardado">' +
            '<div class="financas-balance__head">' +
            '<span class="financas-balance__icon" aria-hidden="true">💎</span>' +
            '<div><span class="section-label">Guardado</span></div>' +
            '</div>' +
            '<div class="financas-balance__value" id="finGuardado">' + formatMoney(fin.guardado) + '</div>' +
            '<div class="financas-balance__actions">' +
            '<button type="button" class="btn-secondary compact" data-fin-saldo-action="guardado_entrada">+ Guardar</button>' +
            '<button type="button" class="btn-secondary compact" data-fin-saldo-action="guardado_saida">− Retirar</button>' +
            '<button type="button" class="btn-secondary compact" data-fin-saldo-action="transferencia_guardado_saldo">⇄ Saldo</button>' +
            '</div>' +
            '</section>';

        html += '</div>';

        html += '<div class="financas-toolbar">' +
            '<div class="financas-month">' +
            '<button type="button" class="financas-month__btn" id="finMesAnterior" aria-label="Mês anterior">‹</button>' +
            '<span class="financas-month__label" id="finMesLabel">' + mesLabel(selectedMes) + '</span>' +
            '<button type="button" class="financas-month__btn" id="finMesProximo" aria-label="Próximo mês">›</button>' +
            '</div>' +
            '<div class="financas-toolbar__actions">' +
            '<button type="button" class="btn-primary compact" id="finNovaDespesa">＋ Nova despesa</button>' +
            '<button type="button" class="btn-secondary compact" id="finNovaMovimentacao">＋ Movimentação</button>' +
            '<button type="button" class="btn-secondary compact" id="finZerar">⟲ Zerar finanças</button>' +
            '</div>' +
            '</div>';

        html += '<section class="panel financas-summary">' +
            '<div class="panel-header"><h3>Resumo de ' + mesLabel(selectedMes) + '</h3><span>Período selecionado</span></div>' +
            '<div class="financas-summary__grid">' +
            '<div class="financas-summary__item"><span>Receitas do mês</span><strong class="is-positivo">' + formatMoney(resumo.receitas) + '</strong></div>' +
            '<div class="financas-summary__item"><span>Despesas do mês</span><strong class="is-negativo">' + formatMoney(resumo.total) + '</strong></div>' +
            '<div class="financas-summary__item"><span>A pagar</span><strong>' + formatMoney(resumo.aPagar) + '</strong></div>' +
            '<div class="financas-summary__item"><span>Já pago</span><strong>' + formatMoney(resumo.jaPago) + '</strong></div>' +
            '<div class="financas-summary__item is-destaque"><span>Saldo atual</span><strong>' + formatMoney(resumo.saldo) + '</strong></div>' +
            '</div>' +
            '</section>';

        html += '<section class="panel financas-despesas">' +
            '<div class="panel-header"><h3>Despesas de ' + mesLabel(selectedMes) + '</h3><span>' + despesasDoMes(selectedMes).length + ' registro(s)</span></div>' +
            despesasTableHtml(selectedMes) +
            '<p class="financas-despesas__note">Despesas pendentes ou atrasadas não descontam do saldo. O desconto acontece apenas ao marcar o checkbox de pagamento.</p>' +
            '</section>';

        html += '<section class="panel financas-historico">' +
            '<div class="panel-header"><h3>Histórico financeiro</h3><span>Mais recentes primeiro</span></div>' +
            historicoHtml() +
            '</section>';

        html += '</div>';

        container.innerHTML = html;
        bindFinancas(container);
        Arquimago.updateTopCrystals();
    };

    /* ============================================================
       Widgets móveis da Home (finanças)
       ============================================================ */
    function bindFinOpen(el) {
        el.querySelectorAll("[data-fin-open]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                if (Arquimago.playClick) Arquimago.playClick();
                var id = btn.getAttribute("data-fin-open");
                var tab = document.querySelector('.tab[data-screen="' + id + '"]');
                if (tab) tab.click();
            });
        });
    }

    if (Arquimago.homeWidgets) {
        Arquimago.homeWidgets.register({
            id: "fin-despesas",
            title: "Despesas · finanças",
            defaultSize: "wide",
            sizes: ["medium", "wide", "full"],
            render: function () { return Arquimago.despesasWidgetHtml(); },
            afterRender: function (ctx, el) { bindFinOpen(el); }
        });

        Arquimago.homeWidgets.register({
            id: "fin-saldo",
            title: "Saldo · finanças",
            defaultSize: "medium",
            sizes: ["small", "medium", "wide"],
            render: function () { return Arquimago.saldoWidgetHtml(); },
            afterRender: function (ctx, el) { bindFinOpen(el); },
            visibleByDefault: false
        });

        Arquimago.homeWidgets.register({
            id: "fin-guardado",
            title: "Guardado · finanças",
            defaultSize: "medium",
            sizes: ["small", "medium", "wide"],
            render: function () { return Arquimago.guardadoWidgetHtml(); },
            afterRender: function (ctx, el) { bindFinOpen(el); },
            visibleByDefault: false
        });

        Arquimago.homeWidgets.register({
            id: "fin-cartao",
            title: "Cartão de Crédito · finanças",
            defaultSize: "wide",
            sizes: ["medium", "wide", "full"],
            render: function () { return Arquimago.cartaoWidgetHtml(); },
            afterRender: function (ctx, el) { bindFinOpen(el); },
            visibleByDefault: false
        });
    }

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
