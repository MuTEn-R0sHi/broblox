/**
 * Shared Roblox runtime type declarations for roblox-ts packages.
 *
 * This file declares Lua/Roblox globals that roblox-ts provides at compile time
 * but need ambient declarations for editor support and vitest.
 * Individual packages should NOT redeclare these — import this file via tsconfig.
 *
 * For Roblox service-specific types (e.g., UserInputService, TweenService),
 * declare those locally in the file that uses them, or cast at the call site:
 *   const uis = game.GetService("UserInputService") as UserInputService;
 */

// ============================================================================
// Roblox Game Global
// ============================================================================

/** The global `game` object. Use `as` casts for service-specific APIs. */
declare const game: {
  GetService(name: string): unknown;
  /** Gets a custom attribute value. */
  GetAttribute(name: string): unknown;
  /** Sets a custom attribute value. */
  SetAttribute(name: string, value: unknown): void;
  /** Binds a callback to run before shutdown. */
  BindToClose(callback: () => void): void;
  /** The unique identifier for this game server instance. */
  JobId: string;
  /** The place ID of the current game. */
  PlaceId: number;
};

// ============================================================================
// Lua Built-in Functions
// ============================================================================

/** Lua protected call — catches errors and returns [success, result]. */
declare function pcall<T>(fn: () => T): LuaTuple<[boolean, T]>;

/** Lua type checking (roblox-ts `typeIs`). */
declare function typeIs(value: unknown, typeName: string): boolean;

/** Lua `select` — returns arguments after `index`, or count with "#". */
declare function select<T>(index: number | "#", ...args: T[]): T;

/** Lua `tostring` — converts a value to its string representation. */
declare function tostring(value: unknown): string;

/** Lua `tonumber` — converts a value to a number, or undefined if it can't. */
declare function tonumber(value: unknown, base?: number): number | undefined;

/** Lua `error` — throws an error. */
declare function error(message: string): never;

/** Lua `warn` — prints a warning to stdout. */
declare function warn(...args: unknown[]): void;

// ============================================================================
// Lua Standard Libraries
// ============================================================================

/** Lua `os` library (subset used by roblox-ts). */
declare const os: {
  time(): number;
  clock(): number;
};

/** Lua `math` library. */
declare const math: {
  floor(n: number): number;
  ceil(n: number): number;
  abs(n: number): number;
  min(...values: number[]): number;
  max(...values: number[]): number;
  pow(base: number, exp: number): number;
  random(): number;
  random(m: number): number;
  random(m: number, n: number): number;
  sin(x: number): number;
  cos(x: number): number;
  sqrt(x: number): number;
  log(x: number, base?: number): number;
  exp(x: number): number;
  clamp(value: number, min: number, max: number): number;
  huge: number;
  pi: number;
};

/** Lua `string` library (called on string values). */
declare const string: {
  upper(s: string): string;
  lower(s: string): string;
  format(fmt: string, ...args: unknown[]): string;
  rep(s: string, n: number): string;
  len(s: string): number;
  sub(s: string, i: number, j?: number): string;
  byte(s: string, i?: number): number;
  char(...codes: number[]): string;
  find(s: string, pattern: string): [number | undefined];
  match(s: string, pattern: string): string | undefined;
};

/** Lua `print` global. */
declare const print: (...args: unknown[]) => void;

// ============================================================================
// Roblox Task Library
// ============================================================================

/** Roblox thread handle returned by task.spawn / coroutine.create. */
type thread = { readonly __nominal_thread: unique symbol };

/** Roblox `task` scheduler library. */
declare const task: {
  spawn(fn: () => void): thread;
  delay(seconds: number, fn: () => void): thread;
  wait(seconds?: number): number;
  defer(fn: () => void): thread;
  cancel(thread?: thread): void;
};

// ============================================================================
// Roblox Iteration
// ============================================================================

/** Lua `pairs()` — iterates key/value pairs of a table. */
declare function pairs<T extends object>(obj: T): IterableIterator<[keyof T, T[keyof T]]>;

// ============================================================================
// Roblox DataStore Interfaces
// ============================================================================

/** Roblox DataStore API. */
interface DataStore {
  GetAsync(key: string): unknown;
  SetAsync(key: string, value: unknown): void;
  UpdateAsync(key: string, callback: (old: unknown) => unknown): unknown;
}

/** Roblox DataStoreService API. */
interface DataStoreService {
  GetDataStore(name: string): DataStore;
}

/** Roblox HttpService API. */
interface HttpService {
  GenerateGUID(wrapInCurlyBraces?: boolean): string;
  JSONEncode(value: unknown): string;
  JSONDecode(input: string): unknown;
  RequestAsync(options: {
    Url: string;
    Method?: string;
    Headers?: Record<string, string>;
    Body?: string;
  }): { Success: boolean; StatusCode: number; Body: string };
}

/** Roblox MessagingService API. */
interface MessagingService {
  PublishAsync(topic: string, message: unknown): void;
  SubscribeAsync(
    topic: string,
    callback: (message: { Data: unknown; Sent: number }) => void
  ): RBXScriptConnection;
}

// ============================================================================
// Roblox Value Types
// ============================================================================

/** 2D scale + offset pair used for UI sizing / positioning. */
declare class UDim2 {
  constructor(xScale: number, xOffset: number, yScale: number, yOffset: number);
  readonly X: UDim;
  readonly Y: UDim;
  Lerp(goal: UDim2, alpha: number): UDim2;
}

/** Single-axis scale + offset value. */
declare class UDim {
  constructor(scale: number, offset: number);
  readonly Scale: number;
  readonly Offset: number;
}

/** 2D vector used for anchor points, positions, etc. */
declare class Vector2 {
  constructor(x: number, y: number);
  readonly X: number;
  readonly Y: number;
  readonly Magnitude: number;
}

/** RGB colour value (each channel 0-1). */
declare class Color3 {
  constructor();
  readonly R: number;
  readonly G: number;
  readonly B: number;
  static fromRGB(r: number, g: number, b: number): Color3;
  static fromHSV(h: number, s: number, v: number): Color3;
  Lerp(goal: Color3, alpha: number): Color3;
}

/** Tween timing descriptor. */
declare class TweenInfo {
  constructor(
    time?: number,
    easingStyle?: EnumItem,
    easingDirection?: EnumItem,
    repeatCount?: number,
    reverses?: boolean,
    delayTime?: number
  );
}

/** A running or completed tween. */
interface Tween {
  Play(): void;
  Cancel(): void;
  Pause(): void;
  readonly Completed: RBXScriptSignal;
}

// ============================================================================
// Roblox Instance Hierarchy
// ============================================================================

/** Base class for all Roblox objects. */
interface Instance {
  Name: string;
  Parent: Instance | undefined;
  ClassName: string;
  Destroy(): void;
  Clone(): this;
  FindFirstChild(name: string, recursive?: boolean): Instance | undefined;
  FindFirstChildOfClass(className: string): Instance | undefined;
  GetChildren(): Instance[];
  IsA(className: string): boolean;
  SetAttribute(name: string, value: unknown): void;
  GetAttribute(name: string): unknown;
  WaitForChild(name: string, timeout?: number): Instance;
}

/** Constructor for creating new Roblox instances. */
declare const Instance: {
  new <T extends keyof CreatableInstances>(className: T): CreatableInstances[T];
};

/** Map of instance class names to their types. */
interface CreatableInstances {
  Frame: Frame;
  TextLabel: TextLabel;
  TextButton: TextButton;
  ScrollingFrame: ScrollingFrame;
  ImageLabel: ImageLabel;
  ImageButton: ImageButton;
  UICorner: UICorner;
  UIPadding: UIPadding;
  UIStroke: UIStroke;
  UIListLayout: UIListLayout;
  UIGridLayout: UIGridLayout;
  ScreenGui: ScreenGui;
}

// ============================================================================
// Roblox GUI Objects
// ============================================================================

/** Base class for all 2D GUI elements. */
interface GuiObject extends Instance {
  Size: UDim2;
  Position: UDim2;
  AnchorPoint: Vector2;
  BackgroundColor3: Color3;
  BackgroundTransparency: number;
  BorderSizePixel: number;
  Visible: boolean;
  ZIndex: number;
  LayoutOrder: number;
  AutomaticSize: EnumItem;
  ClipsDescendants: boolean;
  Active: boolean;
  MouseButton1Click: RBXScriptSignal;
  MouseEnter: RBXScriptSignal;
  MouseLeave: RBXScriptSignal;
}

/** Blank rectangular container. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Frame extends GuiObject {}

/** Read-only text display. */
interface TextLabel extends GuiObject {
  Text: string;
  TextColor3: Color3;
  TextSize: number;
  Font: EnumItem;
  TextWrapped: boolean;
  TextTruncate: EnumItem;
  TextXAlignment: EnumItem;
  TextYAlignment: EnumItem;
  TextTransparency: number;
  RichText: boolean;
}

/** Clickable text element. */
interface TextButton extends GuiObject {
  Text: string;
  TextColor3: Color3;
  TextSize: number;
  Font: EnumItem;
  TextWrapped: boolean;
  TextXAlignment: EnumItem;
  TextYAlignment: EnumItem;
  TextTransparency: number;
  AutoButtonColor: boolean;
  MouseButton1Click: RBXScriptSignal;
}

/** Scrollable container. */
interface ScrollingFrame extends GuiObject {
  CanvasSize: UDim2;
  ScrollBarThickness: number;
  ScrollBarImageTransparency: number;
  ScrollingDirection: EnumItem;
  AutomaticCanvasSize: EnumItem;
}

/** Static image display. */
interface ImageLabel extends GuiObject {
  Image: string;
  ImageColor3: Color3;
  ImageTransparency: number;
  ScaleType: EnumItem;
}

/** Clickable image element. */
interface ImageButton extends GuiObject {
  Image: string;
  ImageColor3: Color3;
  ImageTransparency: number;
  ScaleType: EnumItem;
  MouseButton1Click: RBXScriptSignal;
}

/** Top-level GUI container. */
interface ScreenGui extends Instance {
  ResetOnSpawn: boolean;
  IgnoreGuiInset: boolean;
  DisplayOrder: number;
  Enabled: boolean;
}

// ============================================================================
// Roblox UI Layout & Decoration Instances
// ============================================================================

interface UICorner extends Instance {
  CornerRadius: UDim;
}

interface UIPadding extends Instance {
  PaddingTop: UDim;
  PaddingBottom: UDim;
  PaddingLeft: UDim;
  PaddingRight: UDim;
}

interface UIStroke extends Instance {
  Thickness: number;
  Color: Color3;
  Transparency: number;
  ApplyStrokeMode: EnumItem;
}

interface UIListLayout extends Instance {
  SortOrder: EnumItem;
  FillDirection: EnumItem;
  HorizontalAlignment: EnumItem;
  VerticalAlignment: EnumItem;
  Padding: UDim;
}

interface UIGridLayout extends Instance {
  SortOrder: EnumItem;
  CellSize: UDim2;
  CellPadding: UDim2;
  FillDirection: EnumItem;
  FillDirectionMaxCells: number;
  HorizontalAlignment: EnumItem;
  VerticalAlignment: EnumItem;
  StartCorner: EnumItem;
}

// ============================================================================
// Roblox Signals
// ============================================================================

interface RBXScriptSignal {
  Connect(callback: (...args: unknown[]) => void): RBXScriptConnection;
  Wait(): unknown;
}

/** A single enum item (e.g. Enum.Font.GothamBold). */
type EnumItem = { Name: string; Value: number };

// ============================================================================
// Roblox Enum Namespace
// ============================================================================

declare const Enum: {
  Font: {
    GothamBold: EnumItem;
    GothamMedium: EnumItem;
    Gotham: EnumItem;
    SourceSans: EnumItem;
    SourceSansBold: EnumItem;
  };
  TextXAlignment: {
    Left: EnumItem;
    Center: EnumItem;
    Right: EnumItem;
  };
  TextYAlignment: {
    Top: EnumItem;
    Center: EnumItem;
    Bottom: EnumItem;
  };
  HorizontalAlignment: {
    Left: EnumItem;
    Center: EnumItem;
    Right: EnumItem;
  };
  VerticalAlignment: {
    Top: EnumItem;
    Center: EnumItem;
    Bottom: EnumItem;
  };
  SortOrder: {
    LayoutOrder: EnumItem;
    Name: EnumItem;
  };
  FillDirection: {
    Horizontal: EnumItem;
    Vertical: EnumItem;
  };
  AutomaticSize: {
    None: EnumItem;
    X: EnumItem;
    Y: EnumItem;
    XY: EnumItem;
  };
  ScaleType: {
    Stretch: EnumItem;
    Slice: EnumItem;
    Tile: EnumItem;
    Fit: EnumItem;
    Crop: EnumItem;
  };
  ScrollingDirection: {
    X: EnumItem;
    Y: EnumItem;
    XY: EnumItem;
  };
  EasingStyle: {
    Linear: EnumItem;
    Quad: EnumItem;
    Cubic: EnumItem;
    Back: EnumItem;
    Bounce: EnumItem;
    Elastic: EnumItem;
  };
  EasingDirection: {
    In: EnumItem;
    Out: EnumItem;
    InOut: EnumItem;
  };
  ApplyStrokeMode: {
    Contextual: EnumItem;
    Border: EnumItem;
  };
};
