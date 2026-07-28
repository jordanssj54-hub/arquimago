(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    var BG_IMAGE = "assets/illustrations/journey-valley.png";

    function createHistoryIntro(onComplete) {
        var disposed = false;

        function cleanup() {
            if (disposed) return;
            disposed = true;
            document.removeEventListener("keydown", onKey);
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("touchstart", onClick);
        }

        function onKey(e) {
            if (e.repeat) return;
            dismiss();
        }
        function onClick() { dismiss(); }

        var overlay = document.createElement("div");
        overlay.className = "history-intro-overlay";
        overlay.innerHTML =
            '<div class="history-intro-bg" style="background-image:url(\'' + BG_IMAGE + '\')"></div>' +
            '<div class="history-intro-vignette"></div>' +
            '<div class="history-intro-content">' +
                '<h1 class="history-intro-title">O Arquimago</h1>' +
                '<div class="history-intro-divider"></div>' +
                '<p class="history-intro-subtitle">' +
                    "&ldquo;A magia jamais escolhe os mais fortes.<br>" +
                    "Ela desperta naqueles capazes de enfrentar a própria escuridão.&rdquo;" +
                '</p>' +
                '<p class="history-intro-prompt">Pressione qualquer tecla ou clique para iniciar sua jornada</p>' +
            '</div>';

        document.body.appendChild(overlay);

        document.body.classList.add("intro-active");

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                if (!disposed) overlay.classList.add("active");
            });
        });

        function dismiss() {
            if (!overlay.classList.contains("active") || overlay.classList.contains("fading-out")) return;
            cleanup();
            overlay.classList.add("fading-out");
            setTimeout(function () {
                overlay.remove();
                document.body.classList.remove("intro-active");
                if (onComplete) onComplete();
            }, 480);
        }

        setTimeout(function () {
            document.addEventListener("keydown", onKey);
            document.addEventListener("mousedown", onClick);
            document.addEventListener("touchstart", onClick);
        }, 600);

        return { destroy: cleanup };
    }

    Arquimago.createHistoryIntro = createHistoryIntro;

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
