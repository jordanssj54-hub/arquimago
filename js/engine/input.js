export function createInputController(mobileControlsEl) {
    const state = { up: false, down: false, left: false, right: false, action: false, magic: false, pause: false };
    const justPressed = { action: false, magic: false, pause: false };

    function onKeyDown(e) {
        switch (e.code) {
            case "ArrowUp": case "KeyW": state.up = true; e.preventDefault(); break;
            case "ArrowDown": case "KeyS": state.down = true; e.preventDefault(); break;
            case "ArrowLeft": case "KeyA": state.left = true; e.preventDefault(); break;
            case "ArrowRight": case "KeyD": state.right = true; e.preventDefault(); break;
            case "Space": case "KeyJ": case "Enter": state.action = true; justPressed.action = true; e.preventDefault(); break;
            case "KeyK": case "ShiftLeft": state.magic = true; justPressed.magic = true; e.preventDefault(); break;
            case "Escape": case "KeyP": state.pause = true; justPressed.pause = true; e.preventDefault(); break;
        }
    }

    function onKeyUp(e) {
        switch (e.code) {
            case "ArrowUp": case "KeyW": state.up = false; break;
            case "ArrowDown": case "KeyS": state.down = false; break;
            case "ArrowLeft": case "KeyA": state.left = false; break;
            case "ArrowRight": case "KeyD": state.right = false; break;
            case "Space": case "KeyJ": case "Enter": state.action = false; break;
            case "KeyK": case "ShiftLeft": state.magic = false; break;
            case "Escape": case "KeyP": state.pause = false; break;
        }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    if (mobileControlsEl) {
        const btns = [
            { dir: "up", label: "\u25B2" },
            { dir: "down", label: "\u25BC" },
            { dir: "left", label: "\u25C0" },
            { dir: "right", label: "\u25B6" },
            { dir: "action", label: "\u2716" },
            { dir: "magic", label: "\u2726" },
        ];
        btns.forEach(b => {
            const btn = document.createElement("button");
            btn.className = "history-control";
            btn.textContent = b.label;
            btn.setAttribute("aria-label", b.dir);
            const evStart = () => {
                if (b.dir === "action") { state.action = true; justPressed.action = true; }
                else if (b.dir === "magic") { state.magic = true; justPressed.magic = true; }
                else state[b.dir] = true;
            };
            const evEnd = () => {
                if (b.dir === "action") state.action = false;
                else if (b.dir === "magic") state.magic = false;
                else state[b.dir] = false;
            };
            btn.addEventListener("touchstart", e => { e.preventDefault(); evStart(); });
            btn.addEventListener("touchend", e => { e.preventDefault(); evEnd(); });
            btn.addEventListener("mousedown", evStart);
            btn.addEventListener("mouseup", evEnd);
            btn.addEventListener("mouseleave", evEnd);
            mobileControlsEl.appendChild(btn);
        });
    }

    function consumeJustPressed() {
        const jp = { ...justPressed };
        justPressed.action = false;
        justPressed.magic = false;
        justPressed.pause = false;
        return jp;
    }

    function destroy() {
        document.removeEventListener("keydown", onKeyDown);
        document.removeEventListener("keyup", onKeyUp);
    }

    return { state, consumeJustPressed, destroy };
}
