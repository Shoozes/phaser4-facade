// @ts-check

/**
 * Mulberry32 PRNG. Does not replace Math.random globally.
 * @param {number} [seed]
 */
export function createSeededRng(seed) {
    let state = normalizeSeed(seed);

    function next() {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    return {
        /** @param {number} [nextSeed] */
        seed(nextSeed) {
            state = normalizeSeed(nextSeed);
            return this;
        },
        getState() {
            return state >>> 0;
        },
        next,
        /**
         * @param {number} max
         */
        random(max) {
            return next() * Number(max);
        },
        /**
         * @param {number} min
         * @param {number} max
         */
        randomRange(min, max) {
            return Number(min) + next() * (Number(max) - Number(min));
        },
        /**
         * @param {number} max
         */
        irandom(max) {
            return Math.floor(next() * (Number(max) + 1));
        },
        /**
         * @param {number} min
         * @param {number} max
         */
        irandomRange(min, max) {
            return Math.floor(Number(min) + next() * (Number(max) - Number(min) + 1));
        },
        /**
         * @param {...unknown} items
         */
        choose(...items) {
            if (items.length <= 0) return undefined;
            return items[Math.floor(next() * items.length)];
        }
    };
}

/**
 * @param {unknown} seed
 * @returns {number}
 */
function normalizeSeed(seed) {
    if (seed === undefined || seed === null || seed === "") {
        return (Math.floor(Math.random() * 0xffffffff) || 1) >>> 0;
    }
    const numeric = Number(seed);
    if (!Number.isFinite(numeric)) {
        // Stable string hash
        const text = String(seed);
        let hash = 2166136261;
        for (let i = 0; i < text.length; i += 1) {
            hash ^= text.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return (hash || 1) >>> 0;
    }
    return (Math.floor(numeric) || 1) >>> 0;
}
