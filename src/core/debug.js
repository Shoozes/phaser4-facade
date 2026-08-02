// @ts-check

/**
 * @param {unknown} message
 * @param {{ log?: (message?: unknown, ...optionalParams: unknown[]) => void }} [logger]
 */
export function logDebugMessage(message, logger = console) {
    if (logger && typeof logger.log === "function") {
        logger.log(message);
    }
}
