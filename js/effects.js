(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    Arquimago.initParticles = function () {
        var layer = document.getElementById("particles-layer");
        if (!layer || layer.childElementCount) return;
        for (var i = 0; i < 40; i++) {
            var p = document.createElement("span");
            p.className = "ambient-particle";
            p.style.left = Math.random() * 100 + "%";
            p.style.top = Math.random() * 100 + "%";
            p.style.animationDelay = Math.random() * 8 + "s";
            p.style.animationDuration = 6 + Math.random() * 8 + "s";
            layer.appendChild(p);
        }
    };

    Arquimago.showNotification = function (text, type) {
        var layer = document.getElementById("notification-layer");
        if (!layer) return;
        var item = document.createElement("div");
        item.className = "notification" + (type ? " notification--" + type : "");
        item.textContent = text;
        layer.appendChild(item);
        requestAnimationFrame(function () { item.classList.add("show"); });
        setTimeout(function () {
            item.classList.remove("show");
            setTimeout(function () { item.remove(); }, 400);
        }, 2400);
    };

    Arquimago.showXpPopup = function (amount, anchorEl) {
        var layer = document.getElementById("fx-layer");
        if (!layer) return;
        var pop = document.createElement("div");
        pop.className = "fx-xp-pop";
        pop.textContent = "+" + amount + " XP";
        if (anchorEl) {
            var rect = anchorEl.getBoundingClientRect();
            pop.style.left = rect.left + rect.width / 2 + "px";
            pop.style.top = rect.top + "px";
        } else {
            pop.style.left = "50%";
            pop.style.top = "40%";
        }
        layer.appendChild(pop);
        Arquimago.spawnBurst(anchorEl || document.body, 8);
        setTimeout(function () { pop.remove(); }, 1200);
    };

    Arquimago.spawnBurst = function (el, count) {
        var layer = document.getElementById("fx-layer");
        if (!layer) return;
        var rect = el.getBoundingClientRect ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        for (var i = 0; i < count; i++) {
            var p = document.createElement("span");
            p.className = "fx-burst";
            p.style.left = cx + "px";
            p.style.top = cy + "px";
            var angle = (Math.PI * 2 * i) / count;
            p.style.setProperty("--bx", Math.cos(angle) * 60 + "px");
            p.style.setProperty("--by", Math.sin(angle) * 60 + "px");
            layer.appendChild(p);
            setTimeout(function (node) { node.remove(); }, 800, p);
        }
    };

    Arquimago.showLevelUp = function (level, onDone) {
        var overlay = document.getElementById("levelup-overlay");
        if (!overlay) { if (onDone) onDone(); return; }

        overlay.hidden = false;
        overlay.innerHTML =
            '<div class="levelup-backdrop"></div>' +
            '<div class="levelup-particles"></div>' +
            '<div class="levelup-content">' +
            '<div class="levelup-pre">LEVEL UP</div>' +
            '<div class="levelup-number">Nível ' + level + '</div>' +
            '<div class="levelup-sub">' + Arquimago.getTitleForLevel(level) + '</div>' +
            '</div>';

        var particles = overlay.querySelector(".levelup-particles");
        for (var i = 0; i < 30; i++) {
            var p = document.createElement("span");
            p.className = "levelup-particle";
            p.style.left = Math.random() * 100 + "%";
            p.style.top = Math.random() * 100 + "%";
            p.style.animationDelay = Math.random() * 0.5 + "s";
            particles.appendChild(p);
        }

        overlay.classList.add("active");
        Arquimago.playLevelUp();

        setTimeout(function () {
            overlay.classList.remove("active");
            overlay.classList.add("out");
            setTimeout(function () {
                overlay.hidden = true;
                overlay.classList.remove("out");
                overlay.innerHTML = "";
                if (onDone) onDone();
            }, 600);
        }, 2800);
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
