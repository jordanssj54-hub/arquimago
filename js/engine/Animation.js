const WALK_SEQUENCE = [1, 2, 3, 2];

export function createAnimation(speed) {
    let state = "idle_down";
    let frameIndex = 0;
    let timer = 0;
    const animSpeed = Math.max(0.01, speed);

    function getSequence() {
        return state.startsWith("idle") ? [0] : WALK_SEQUENCE;
    }

    function getSpriteFrame() {
        const seq = getSequence();
        return seq[frameIndex] || 0;
    }

    function update(dt) {
        const seq = getSequence();
        if (seq.length <= 1) return;

        timer += dt;
        if (timer >= animSpeed) {
            timer -= animSpeed;
            frameIndex++;
            if (frameIndex >= seq.length) {
                frameIndex = 0;
            }
        }
    }

    function setState(newState) {
        if (state === newState) return;
        state = newState;
        frameIndex = 0;
        timer = 0;
    }

    function getState() {
        return state;
    }

    return {
        update,
        setState,
        getState,
        getSpriteFrame,
    };
}