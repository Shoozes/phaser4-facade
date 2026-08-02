declare module "phaser" {
    const Phaser: {
        Game: new (...args: unknown[]) => unknown;
        Scene: new (...args: unknown[]) => unknown;
    };
    export default Phaser;
}

declare function installGMRuntime(
    root: typeof globalThis,
    Phaser: {
        Game: new (...args: unknown[]) => unknown;
        Scene: new (...args: unknown[]) => unknown;
    }
): void;
