export interface Grout13BridgeOptions {
    assetOptions?: { replace?: boolean; [key: string]: unknown };
    compileOptions?: Record<string, unknown>;
    decodeOptions?: Record<string, unknown>;
    replace?: boolean;
}

export interface Grout13DecodedAtlas {
    width: number;
    height: number;
    rgba?: ArrayLike<number>;
    canvas?: object;
    image?: object;
    source?: object;
    frames: Record<string, unknown> | Map<string, unknown>;
}

export interface Grout13AssetRecord {
    key: string;
    asset: unknown;
    decoded: Grout13DecodedAtlas;
    source: object;
    frames: Record<string, unknown> | Map<string, unknown>;
}

export interface Grout13CompiledAtlas {
    payload: unknown[];
    [key: string]: unknown;
}

export interface Grout13Module {
    compileGrout13Atlas(assets: unknown[], options?: Record<string, unknown>): Grout13CompiledAtlas;
    decodeGrout13Atlas(payload: unknown[], options?: Record<string, unknown>): Grout13DecodedAtlas;
}

export interface Grout13Bridge {
    compile(assets: unknown[], options?: Record<string, unknown>): Grout13CompiledAtlas;
    addPayload(key: string, payload: unknown[], options?: Grout13BridgeOptions): Grout13AssetRecord;
    addAtlas(key: string, assets: unknown[], options?: Grout13BridgeOptions): Grout13AssetRecord & {
        compiled: Grout13CompiledAtlas;
        payload: unknown[];
    };
}

export function installGrout13Bridge(gm: object, grout13: Grout13Module): Grout13Bridge;

declare global {
    interface GMFacade {
        readonly grout13: Grout13Bridge;
    }
}
