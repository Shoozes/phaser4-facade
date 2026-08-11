import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";

function read(filePath) {
    return fs.readFileSync(filePath, "utf8");
}

/**
 * Bundle a runtime entry through esbuild while keeping local source paths
 * stable between the public package and private snapshots.
 *
 * @param {{ root: string, contents: string, sourcefile: string, format: "esm" | "iife", externalPhaser?: boolean }} options
 */
export async function bundleRuntimeSource(options) {
    const root = path.resolve(options.root);
    const sourceRoot = path.join(root, "src");
    const runtimeNamespace = "phaser4-facade-runtime";
    const result = await build({
        absWorkingDir: root,
        bundle: true,
        format: options.format,
        legalComments: "none",
        platform: "browser",
        plugins: [{
            name: "local-runtime-source",
            setup(pluginBuild) {
                pluginBuild.onResolve({ filter: /.*/ }, (args) => {
                    if (options.externalPhaser && args.path === "phaser") {
                        return { external: true, path: args.path };
                    }
                    if (!args.path.startsWith(".")) return { external: true, path: args.path };
                    const importer = path.isAbsolute(args.importer)
                        ? args.importer
                        : path.resolve(root, args.importer || options.sourcefile);
                    const resolved = path.resolve(path.dirname(importer), args.path);
                    if (!resolved.startsWith(`${sourceRoot}${path.sep}`)) {
                        throw new Error(`runtime build cannot resolve outside src/: ${args.path}`);
                    }
                    return {
                        namespace: runtimeNamespace,
                        path: path.relative(root, resolved).replaceAll(path.sep, "/")
                    };
                });
                pluginBuild.onLoad({ filter: /.*/, namespace: runtimeNamespace }, (args) => ({
                    contents: read(path.resolve(root, args.path)),
                    loader: "js",
                    resolveDir: path.dirname(path.resolve(root, args.path))
                }));
            }
        }],
        stdin: {
            contents: String(options.contents).replace(/\r\n/g, "\n").replace(/\r/g, "\n"),
            loader: "js",
            resolveDir: ".",
            sourcefile: options.sourcefile
        },
        target: "es2020",
        write: false
    });
    const output = result.outputFiles?.[0]?.text;
    if (typeof output !== "string" || output.length === 0) {
        throw new Error(`esbuild produced no output for ${options.sourcefile}.`);
    }
    return output;
}
