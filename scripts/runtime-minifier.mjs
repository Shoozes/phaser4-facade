import { transform } from "esbuild";

/**
 * Parse and minify JavaScript without rewriting source text with regular
 * expressions. The global runtime bundle is a plain browser script, so top
 * level names remain unmangled while compression stays enabled.
 *
 * @param {string} source
 * @param {string} fileName
 */
export async function minifyJavaScript(source, fileName = "runtime.js") {
    const result = await transform(source, {
        sourcefile: fileName,
        loader: "js",
        minify: true,
        legalComments: "none",
        target: "es2020"
    });
    return `${String(result.code || "").trim()}\n`;
}
