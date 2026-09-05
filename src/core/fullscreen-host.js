// @ts-check

// Use longhands because assigning a shorthand destroys partial declarations
// that cannot be reconstructed from the shorthand value during restoration.
const BOX_STYLE_PROPERTIES = [
    "marginTop", "marginRight", "marginBottom", "marginLeft",
    "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight",
    "overflowX", "overflowY", "overscrollBehaviorX", "overscrollBehaviorY"
];
const DOCUMENT_STYLE_PROPERTIES = BOX_STYLE_PROPERTIES.filter((property) => !["maxWidth", "maxHeight"].includes(property));
const BODY_STYLE_PROPERTIES = [...DOCUMENT_STYLE_PROPERTIES, "position", "top", "right", "bottom", "left", "touchAction"];
const PARENT_STYLE_PROPERTIES = [...BODY_STYLE_PROPERTIES, "maxWidth", "maxHeight"];
const CANVAS_STYLE_PROPERTIES = ["display", "width", "height", "maxWidth", "maxHeight", "touchAction"];

/** @param {any} root @param {any} configuredParent */
function resolveParent(root, configuredParent) {
    const documentLike = root && root.document;
    if (typeof configuredParent === "string" && documentLike) {
        return documentLike.getElementById(configuredParent) || documentLike.querySelector(configuredParent);
    }
    return configuredParent && typeof configuredParent === "object" ? configuredParent : null;
}

/** @param {string} property */
function cssName(property) {
    return property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/** @param {any} element @param {string} property */
function readStyle(element, property) {
    if (!element?.style) return null;
    const name = cssName(property);
    return {
        value: String(element.style.getPropertyValue(name) || ""),
        priority: String(element.style.getPropertyPriority(name) || "")
    };
}

/** @param {any} element @param {string} property @param {string} value */
function writeStyle(element, property, value) {
    if (element?.style) element.style.setProperty(cssName(property), value);
}

/** @param {any} root @param {any} configuredParent */
export function createFullscreenHost(root, configuredParent) {
    /** @type {Map<any, Map<string, { value: string, priority: string } | null>>} */
    const touched = new Map();
    let restored = false;

    /** @param {any} element @param {string[]} properties @param {Record<string, string>} values */
    function apply(element, properties, values) {
        if (!element?.style) return;
        let records = touched.get(element);
        if (!records) {
            records = new Map();
            touched.set(element, records);
        }
        // Read every untouched declaration before the first write. A style
        // setter, observer, or browser normalization may affect another
        // declaration synchronously.
        for (const property of properties) {
            if (!records.has(property)) records.set(property, readStyle(element, property));
        }
        for (const property of properties) {
            writeStyle(element, property, values[property] ?? "");
        }
    }

    const documentLike = root?.document;
    if (documentLike) {
        // Resolve selectors before mutating documentElement or body so an
        // invalid configured selector cannot leave a partially applied host.
        const parent = resolveParent(root, configuredParent);
        apply(documentLike.documentElement, DOCUMENT_STYLE_PROPERTIES, {
            marginTop: "0", marginRight: "0", marginBottom: "0", marginLeft: "0",
            paddingTop: "0", paddingRight: "0", paddingBottom: "0", paddingLeft: "0",
            width: "100%", height: "100%", minWidth: "100%", minHeight: "100%",
            overflowX: "hidden", overflowY: "hidden",
            overscrollBehaviorX: "none", overscrollBehaviorY: "none"
        });
        apply(documentLike.body, BODY_STYLE_PROPERTIES, {
            marginTop: "0", marginRight: "0", marginBottom: "0", marginLeft: "0",
            paddingTop: "0", paddingRight: "0", paddingBottom: "0", paddingLeft: "0",
            width: "100%", height: "100%", minWidth: "100%", minHeight: "100%",
            overflowX: "hidden", overflowY: "hidden",
            overscrollBehaviorX: "none", overscrollBehaviorY: "none",
            position: "fixed", top: "0", right: "0", bottom: "0", left: "0", touchAction: "none"
        });
        apply(parent, PARENT_STYLE_PROPERTIES, {
            marginTop: "0", marginRight: "0", marginBottom: "0", marginLeft: "0",
            paddingTop: "0", paddingRight: "0", paddingBottom: "0", paddingLeft: "0",
            width: "100vw", height: "100vh", minWidth: "0", minHeight: "0",
            maxWidth: "100vw", maxHeight: "100vh", overflowX: "hidden", overflowY: "hidden",
            overscrollBehaviorX: "none", overscrollBehaviorY: "none",
            position: "fixed", top: "0", right: "0", bottom: "0", left: "0", touchAction: "none"
        });
    }

    return {
        /** @param {any} game */
        applyGame(game) {
            const canvas = game?.canvas;
            const parent = canvas?.parentElement;
            apply(parent, PARENT_STYLE_PROPERTIES, {
                marginTop: "0", marginRight: "0", marginBottom: "0", marginLeft: "0",
                paddingTop: "0", paddingRight: "0", paddingBottom: "0", paddingLeft: "0",
                width: "100vw", height: "100vh", minWidth: "0", minHeight: "0",
                maxWidth: "100vw", maxHeight: "100vh", overflowX: "hidden", overflowY: "hidden",
                overscrollBehaviorX: "none", overscrollBehaviorY: "none",
                position: "fixed", top: "0", right: "0", bottom: "0", left: "0", touchAction: "none"
            });
            apply(canvas, CANVAS_STYLE_PROPERTIES, {
                display: "block", width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", touchAction: "none"
            });
        },
        restore() {
            if (restored) return false;
            restored = true;
            for (const [element, records] of touched) {
                for (const [property, original] of records) {
                    const name = cssName(property);
                    if (original?.value) element.style.setProperty(name, original.value, original.priority);
                    else element.style.removeProperty(name);
                }
            }
            touched.clear();
            return true;
        }
    };
}
