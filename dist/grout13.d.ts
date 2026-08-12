export interface Grout13BridgeOptions {
    preset?: "pixel";
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
    frames: Record<string, unknown> | Map<string, unknown> | unknown[];
}

export interface Grout13CompiledFrame {
    name?: string;
    filename?: string;
    key?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    sourceWidth?: number;
    sourceHeight?: number;
    sourceSize?: { w?: number; h?: number; width?: number; height?: number };
    trim?: { x?: number; y?: number; width?: number; height?: number; w?: number; h?: number };
    pivot?: { x: number; y: number };
    [key: string]: unknown;
}

export interface Grout13CompiledAtlas {
    payload: unknown[];
    atlas?: {
        width: number;
        height: number;
        rgba?: ArrayLike<number>;
        frames?: Grout13CompiledFrame[];
        [key: string]: unknown;
    };
    frames?: Grout13CompiledFrame[];
    frameOrder?: string[];
    frameIndexMap?: Record<string, number>;
    runtimeContract?: Record<string, unknown>;
    bytes?: { payload?: number; [key: string]: unknown };
    [key: string]: unknown;
}

export interface Grout13AssetRecord {
    key: string;
    width: number;
    height: number;
    frameNames: string[];
    frameCount: number;
    frameMap: Record<string, unknown>;
    payload?: unknown[];
    payloadBytes: number;
    runtimeContract?: Record<string, unknown>;
    asset: unknown;
    decoded: Grout13DecodedAtlas;
    source: object;
    frames: Record<string, unknown>;
    hasFrame(frame: string | number): boolean;
}

export interface Grout13Module {
    compileGrout13Atlas(assets: unknown[], options?: Record<string, unknown>): Grout13CompiledAtlas;
    decodeGrout13Atlas(payload: unknown[], options?: Record<string, unknown>): Grout13DecodedAtlas;
    getGrout13PayloadBytes?(payload: unknown[]): number;
}

export interface Grout13Bridge {
    compile(assets: unknown[], options?: Record<string, unknown> | Grout13BridgeOptions): Grout13CompiledAtlas;
    addPayload(key: string, payload: unknown[], options?: Grout13BridgeOptions): Grout13AssetRecord;
    addCompiled(key: string, compiled: Grout13CompiledAtlas, options?: Grout13BridgeOptions): Grout13AssetRecord;
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
