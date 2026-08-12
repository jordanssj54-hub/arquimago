(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    var SLIDE_INTERVAL = 6000;
    var INDEX_KEY = "arquimago_slideshow_index_v1";

    /* ============================================================
       Coleção de slides.
       Para adicionar novas ilustrações, basta incluir um novo item
       nesta lista (image + título + frase). O componente se adapta
       automaticamente ao número de slides.
       ============================================================ */
    Arquimago.SLIDES = [
        {
            image: "assets/illustrations/entrada-da-masmorra.png",
            title: "Entrada da Masmorra",
            quote: "Todo grande caminho começa com um passo."
        },
        {
            image: "assets/illustrations/journey-valley.png",
            title: "Vale da Jornada",
            quote: "A jornada também faz parte da conquista."
        }
    ];

    var currentIndex = loadIndex();
    var timer = null;

    function loadIndex() {
        try {
            var i = parseInt(localStorage.getItem(INDEX_KEY), 10);
            return isFinite(i) ? i : 0;
        } catch (e) {
            return 0;
        }
    }

    function saveIndex(i) {
        try {
            localStorage.setItem(INDEX_KEY, String(i));
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

    function slideHtml(slide, index, initial) {
        return '<div class="home-slide' + (index === initial ? " is-active" : "") + '" data-home-slide="' + index + '"' +
            ' aria-hidden="' + (index === initial ? "false" : "true") + '">' +
            '<img class="home-slide__img" src="' + esc(slide.image) + '" alt="' + esc(slide.title || "") + '" loading="lazy">' +
            '<div class="home-slide__scrim"></div>' +
            '<div class="home-slide__copy">' +
            '<span class="home-slide__label">✦ Frase do dia</span>' +
            '<blockquote class="home-slide__quote">' + esc(slide.quote || "") + '</blockquote>' +
            (slide.title ? '<span class="home-slide__place">' + esc(slide.title) + '</span>' : "") +
            '</div>' +
            '</div>';
    }

    Arquimago.slideshowCardHtml = function () {
        var slides = Arquimago.SLIDES || [];
        if (!slides.length) return "";
        var initial = ((currentIndex % slides.length) + slides.length) % slides.length;
        var dots = slides.map(function (s, i) {
            return '<button type="button" class="home-slideshow__dot' + (i === initial ? " is-active" : "") + '"' +
                ' data-home-slide-to="' + i + '" aria-label="Slide ' + (i + 1) + '"' +
                ' aria-current="' + (i === initial ? "true" : "false") + '"></button>';
        }).join("");
        return '<section class="panel home-slideshow" aria-label="Ilustração e frase do dia">' +
            '<div class="home-slideshow__stage">' +
            '<div class="home-slides__track">' + slides.map(function (s, i) { return slideHtml(s, i, initial); }).join("") + '</div>' +
            '</div>' +
            '<div class="home-slideshow__nav">' + dots + '</div>' +
            '</section>';
    };

    function showSlide(card, index) {
        var slides = card.querySelectorAll(".home-slide");
        if (!slides.length) return;
        var n = slides.length;
        var idx = ((index % n) + n) % n;
        slides.forEach(function (s, i) {
            s.classList.toggle("is-active", i === idx);
            s.setAttribute("aria-hidden", i === idx ? "false" : "true");
        });
        card.querySelectorAll(".home-slideshow__dot").forEach(function (dot, i) {
            dot.classList.toggle("is-active", i === idx);
            dot.setAttribute("aria-current", i === idx ? "true" : "false");
        });
        currentIndex = idx;
        saveIndex(idx);
    }

    function restart(card) {
        if (timer) clearInterval(timer);
        timer = setInterval(function () {
            showSlide(card, currentIndex + 1);
        }, SLIDE_INTERVAL);
    }

    Arquimago.initSlideshow = function () {
        var card = document.querySelector(".home-slideshow");
        if (!card) return;
        if (timer) clearInterval(timer);
        timer = null;

        showSlide(card, currentIndex);

        card.querySelectorAll(".home-slideshow__dot").forEach(function (dot) {
            dot.addEventListener("click", function () {
                if (Arquimago.playClick) Arquimago.playClick();
                showSlide(card, parseInt(dot.getAttribute("data-home-slide-to"), 10));
                restart(card);
            });
        });

        restart(card);
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
