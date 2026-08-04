export function createInputController(mobileControlsEl) {
    const state = {
        ax: 0, ay: 0,
        action: false, magic: false, special: false, pause: false
    };
    const justPressed = { action: false, magic: false, special: false, pause: false };

    function isEditableTarget(e) {
        const t = e.target;
        if (!t || !t.tagName) return false;
        const tag = t.tagName;
        return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!t.isContentEditable;
    }

    function onKeyDown(e) {
        if (isEditableTarget(e)) return;
        switch (e.code) {
            case "ArrowUp": case "KeyW": state.ay = -1; e.preventDefault(); break;
            case "ArrowDown": case "KeyS": state.ay = 1; e.preventDefault(); break;
            case "ArrowLeft": case "KeyA": state.ax = -1; e.preventDefault(); break;
            case "ArrowRight": case "KeyD": state.ax = 1; e.preventDefault(); break;
            case "Space": case "KeyJ": case "Enter":
                state.action = true; justPressed.action = true; e.preventDefault(); break;
            case "KeyK": case "ShiftLeft":
                state.magic = true; justPressed.magic = true; e.preventDefault(); break;
            case "KeyL": case "KeyE":
                state.special = true; justPressed.special = true; e.preventDefault(); break;
            case "Escape": case "KeyP":
                state.pause = true; justPressed.pause = true; e.preventDefault(); break;
        }
    }

    function onKeyUp(e) {
        if (isEditableTarget(e)) return;
        switch (e.code) {
            case "ArrowUp": case "KeyW": if (state.ay < 0) state.ay = 0; break;
            case "ArrowDown": case "KeyS": if (state.ay > 0) state.ay = 0; break;
            case "ArrowLeft": case "KeyA": if (state.ax < 0) state.ax = 0; break;
            case "ArrowRight": case "KeyD": if (state.ax > 0) state.ax = 0; break;
            case "Space": case "KeyJ": case "Enter": state.action = false; break;
            case "KeyK": case "ShiftLeft": state.magic = false; break;
            case "KeyL": case "KeyE": state.special = false; break;
            case "Escape": case "KeyP": state.pause = false; break;
        }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    if (mobileControlsEl) {
        const container = document.createElement("div");
        container.className = "hud-controls-container";

        const stickZone = document.createElement("div");
        stickZone.className = "joystick-zone";
        stickZone.innerHTML = '<div class="joystick-base"><div class="joystick-thumb" id="joystickThumb"></div></div>';

        const btnZone = document.createElement("div");
        btnZone.className = "action-buttons-zone";

        const triBtn = document.createElement("button");
        triBtn.className = "action-btn action-triangle";
        triBtn.setAttribute("aria-label", "special");
        triBtn.innerHTML = '<span class="btn-icon-triangle">&#9650;</span><span class="btn-label">Acao</span>';

        const cirBtn = document.createElement("button");
        cirBtn.className = "action-btn action-circle";
        cirBtn.setAttribute("aria-label", "magic");
        cirBtn.innerHTML = '<span class="btn-icon-circle">&#9679;</span><span class="btn-label">Esquiva</span>';

        btnZone.appendChild(cirBtn);
        btnZone.appendChild(triBtn);
        container.appendChild(stickZone);
        container.appendChild(btnZone);
        mobileControlsEl.appendChild(container);

        let stickActive = false;

        function getStickCenter() {
            const base = stickZone.querySelector(".joystick-base");
            if (!base) return null;
            const r = base.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2, radius: r.width / 2 };
        }

        function handleStickMove(clientX, clientY) {
            const sb = getStickCenter();
            if (!sb) return;
            let dx = clientX - sb.x;
            let dy = clientY - sb.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxR = sb.radius * 0.6;
            if (dist > maxR) {
                dx = (dx / dist) * maxR;
                dy = (dy / dist) * maxR;
            }
            const thumb = document.getElementById("joystickThumb");
            if (thumb) {
                thumb.style.transform = "translate(" + dx + "px, " + dy + "px)";
            }
            const norm = Math.min(1, dist / maxR);
            if (dist > 8) {
                state.ax = (dx / dist) * norm;
                state.ay = (dy / dist) * norm;
            } else {
                state.ax = 0;
                state.ay = 0;
            }
        }

        function handleStickEnd() {
            stickActive = false;
            state.ax = 0;
            state.ay = 0;
            const thumb = document.getElementById("joystickThumb");
            if (thumb) {
                thumb.style.transform = "translate(0px, 0px)";
            }
        }

        function onPointerDown(e) {
            if (stickActive) return;
            stickActive = true;
            const pt = (e.touches && e.touches[0]) || e.changedTouches?.[0] || e;
            handleStickMove(pt.clientX, pt.clientY);
            e.preventDefault();
        }

        function onPointerMove(e) {
            if (!stickActive) return;
            const pt = (e.touches && e.touches[0]) || e;
            handleStickMove(pt.clientX, pt.clientY);
            e.preventDefault();
        }

        function onPointerUp(e) {
            if (!stickActive) return;
            handleStickEnd();
            e.preventDefault();
        }

        stickZone.addEventListener("touchstart", onPointerDown, { passive: false });
        stickZone.addEventListener("mousedown", onPointerDown);
        document.addEventListener("touchmove", onPointerMove, { passive: false });
        document.addEventListener("mousemove", onPointerMove);
        document.addEventListener("touchend", onPointerUp, { passive: false });
        document.addEventListener("mouseup", onPointerUp);
        document.addEventListener("touchcancel", onPointerUp, { passive: false });
        document.addEventListener("mouseleave", function (e) {
            if (stickActive && !e.relatedTarget) handleStickEnd();
        });

        function setupButton(btn, key, isJustPressed) {
            function evStart(e) {
                e.preventDefault();
                state[key] = true;
                if (isJustPressed) justPressed[key] = true;
                btn.classList.add("pressed");
            }
            function evEnd(e) {
                e.preventDefault();
                state[key] = false;
                btn.classList.remove("pressed");
            }
            btn.addEventListener("touchstart", evStart, { passive: false });
            btn.addEventListener("touchend", evEnd, { passive: false });
            btn.addEventListener("touchcancel", evEnd, { passive: false });
            btn.addEventListener("mousedown", evStart);
            btn.addEventListener("mouseup", evEnd);
            btn.addEventListener("mouseleave", evEnd);
        }

        setupButton(triBtn, "special", true);
        setupButton(cirBtn, "magic", true);
    }

    function consumeJustPressed() {
        const jp = {
            action: justPressed.action,
            magic: justPressed.magic,
            special: justPressed.special,
            pause: justPressed.pause,
        };
        justPressed.action = false;
        justPressed.magic = false;
        justPressed.special = false;
        justPressed.pause = false;
        return jp;
    }

    function destroy() {
        document.removeEventListener("keydown", onKeyDown);
        document.removeEventListener("keyup", onKeyUp);
    }

    return { state, consumeJustPressed, destroy };
}
