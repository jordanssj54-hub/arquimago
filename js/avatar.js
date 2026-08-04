(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    /* ============================================================
       Componente reutilizável <PlayerAvatar />
       Camadas:
         Layer 1 — foto do personagem (escolhida pela galeria)
         Layer 2 — moldura de assets/frames (sempre acima da foto)
       Nenhuma tela referencia a moldura diretamente: tudo passa
       por aqui, permitindo trocar a moldura em um único lugar.
       ============================================================ */

    var FRAME_DIR = "assets/frames";

    var FRAME_FILES = {
        default: "frame-avatar-default.png",
        arcane: "frame-avatar-arcane.png"
    };

    var TEMPLATE_FRAME = {
        default: "default",
        arcane: "arcane",
        "arcane-ancient": "arcane",
        "arcane-forest": "arcane",
        "arcane-royal": "arcane",
        "arcane-alchemist": "arcane",
        "arcane-celestial": "arcane",
        "arcane-crystal": "arcane",
        "arcane-druid": "arcane",
        "arcane-library": "arcane",
        "arcane-sanctuary": "arcane"
    };

    /* Enquadramento do retrato dentro da moldura.
       scale  → zoom da foto (1 = tamanho original)
       x      → deslocamento horizontal em px
       y      → deslocamento vertical em px
       inset  → quanto a foto é encolhida em relação ao quadrado
                (0.10 = 10%), mantendo a borda da foto sob a moldura
       Ajuste aqui para refinar o retrato de cada moldura/avatar. */
    var AVATAR_FRAMING = {
        default: { scale: 1.15, x: 0, y: 0, inset: 0.10 },
        arcane: { scale: 1.15, x: 0, y: 0, inset: 0.10 }
    };

    function getAvatarFraming(id) {
        return AVATAR_FRAMING[id] || AVATAR_FRAMING.default;
    }

    function applyAvatarFraming(wrap, id) {
        var f = getAvatarFraming(id);
        wrap.style.setProperty("--avatar-scale", f.scale);
        wrap.style.setProperty("--avatar-x", f.x + "px");
        wrap.style.setProperty("--avatar-y", f.y + "px");
        wrap.style.setProperty("--avatar-inset", f.inset * 100 + "%");
    }

    Arquimago.getActiveFrameId = function () {
        var template = (Arquimago.state && Arquimago.state.template) || "default";
        return TEMPLATE_FRAME[template] || FRAME_FILES[template] || "default";
    };

    Arquimago.getPlayerFrameSrc = function () {
        var id = Arquimago.getActiveFrameId();
        return FRAME_DIR + "/" + (FRAME_FILES[id] || FRAME_FILES.default);
    };

    Arquimago.getPlayerAvatar = function () {
        var id = Arquimago.getActiveFrameId();
        var f = getAvatarFraming(id);
        return '<div class="player-avatar" data-frame-id="' + id + '" ' +
            'style="--avatar-scale:' + f.scale + ';--avatar-x:' + f.x + 'px;--avatar-y:' + f.y + 'px;--avatar-inset:' + f.inset * 100 + '%">' +
            Arquimago.getMageImage() +
            '<img class="player-avatar__frame" src="' + Arquimago.getPlayerFrameSrc() + '" alt="" draggable="false" aria-hidden="true">' +
            '</div>';
    };

    Arquimago.refreshPlayerFrames = function () {
        var id = Arquimago.getActiveFrameId();
        var src = Arquimago.getPlayerFrameSrc();
        document.querySelectorAll(".player-avatar").forEach(function (wrap) {
            wrap.setAttribute("data-frame-id", id);
            applyAvatarFraming(wrap, id);
            var frame = wrap.querySelector(".player-avatar__frame");
            if (frame) {
                frame.removeAttribute("data-fallback");
                frame.src = src;
            }
        });
    };

    Arquimago.refreshPlayerPhotos = function () {
        var src = Arquimago.getMageImageSrc();
        document.querySelectorAll(".player-avatar .mage-avatar-img").forEach(function (img) {
            img.src = src;
        });
    };

    /* Fallback automático: se a moldura ativa não existir em disco
       (ex.: frame-avatar-arcane.png ainda não adicionado), usa a
       moldura default para nunca exibir imagem quebrada. */
    document.addEventListener("error", function (e) {
        var target = e.target;
        if (!target || !target.classList || !target.classList.contains("player-avatar__frame")) return;
        if (target.getAttribute("data-fallback") === "1") return;
        target.setAttribute("data-fallback", "1");
        target.src = FRAME_DIR + "/" + FRAME_FILES.default;
    }, true);

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
