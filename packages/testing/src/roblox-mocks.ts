/**
 * Roblox API mocks for Node.js/Vitest testing.
 * These simulate Roblox globals that don't exist in Node.js.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createMockDataStoreService, MockDataStoreService } from "./datastore-mock";

// ── Singleton mock services (created lazily, reset on unmock) ────────

let _dssInstance: MockDataStoreService | undefined;

function _mockDataStoreService(): MockDataStoreService {
  if (!_dssInstance) {
    _dssInstance = createMockDataStoreService();
  }
  return _dssInstance;
}

let _guidCounter = 0;
function _mockHttpService() {
  return {
    _service: "HttpService",
    GenerateGUID(wrapInCurlyBraces = true) {
      _guidCounter++;
      const id = `00000000-0000-0000-0000-${String(_guidCounter).padStart(12, "0")}`;
      return wrapInCurlyBraces ? `{${id}}` : id;
    },
    JSONEncode(value: unknown) {
      return JSON.stringify(value);
    },
    JSONDecode(input: string) {
      return JSON.parse(input);
    },
  };
}

const _messagingSubscriptions = new Map<
  string,
  Array<(msg: { Data: unknown; Sent: number }) => void>
>();

function _mockMessagingService() {
  return {
    _service: "MessagingService",
    PublishAsync(topic: string, message: unknown) {
      const subs = _messagingSubscriptions.get(topic);
      if (subs) {
        for (const cb of subs) {
          cb({ Data: message, Sent: Math.floor(Date.now() / 1000) });
        }
      }
    },
    SubscribeAsync(topic: string, callback: (message: { Data: unknown; Sent: number }) => void) {
      if (!_messagingSubscriptions.has(topic)) {
        _messagingSubscriptions.set(topic, []);
      }
      _messagingSubscriptions.get(topic)!.push(callback);
      return { Disconnect: () => {} };
    },
  };
}

const _mockPlayers = new Map<number, any>();

function _mockPlayersService() {
  return {
    _service: "Players",
    GetPlayerByUserId(userId: number) {
      return _mockPlayers.get(userId);
    },
    /** Test helper: register a mock player so GetPlayerByUserId can find them. */
    _addPlayer(player: any) {
      _mockPlayers.set(player.UserId, player);
    },
    _removePlayer(userId: number) {
      _mockPlayers.delete(userId);
    },
    _reset() {
      _mockPlayers.clear();
    },
  };
}

/**
 * Get the mock DataStoreService instance (for direct test inspection).
 * Only available after mockRobloxGlobals() has been called.
 */
export function getMockDataStoreService(): MockDataStoreService {
  return _mockDataStoreService();
}

/**
 * Reset all mock service state (DataStoreService, MessagingService, Players, etc.).
 * Call in `beforeEach` for clean tests.
 */
export function resetMockServices(): void {
  _dssInstance?._reset();
  _dssInstance = undefined;
  _guidCounter = 0;
  _messagingSubscriptions.clear();
  _mockPlayers.clear();
}

/**
 * Mock for Roblox's os.clock() - returns seconds since script start.
 * Starts at 60s offset to simulate a server that has been running for a while,
 * avoiding false negatives on cooldown-based anti-spam checks.
 */
const CLOCK_OFFSET = 60; // seconds
let mockClockStart = Date.now() - CLOCK_OFFSET * 1000;

export function osClock(): number {
  return (Date.now() - mockClockStart) / 1000;
}

/**
 * Reset the mock clock to simulate script restart.
 */
export function resetMockClock(): void {
  mockClockStart = Date.now();
}

/**
 * Set mock clock to a specific value (in seconds).
 */
export function setMockClock(seconds: number): void {
  mockClockStart = Date.now() - seconds * 1000;
}

/**
 * Mock for Roblox's os.time() - returns Unix timestamp.
 */
export function osTime(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Mock for Roblox's typeOf() function.
 */
export function typeOf(value: unknown): string {
  if (value === null || value === undefined) {
    return "nil";
  }
  if (Array.isArray(value)) {
    return "table";
  }
  const t = typeof value;
  if (t === "object") {
    return "table";
  }
  return t;
}

/**
 * Mock for Roblox's tostring() function.
 */
export function tostring(value: unknown): string {
  return String(value);
}

/**
 * Mock for Roblox's tonumber() function.
 * Supports optional base parameter (e.g. tonumber("FF", 16)).
 */
export function tonumber(value: unknown, base?: number): number | undefined {
  if (base !== undefined) {
    const n = parseInt(String(value), base);
    return Number.isNaN(n) ? undefined : n;
  }
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

/**
 * Mock math module matching Roblox's math API.
 */
export const math = {
  min: Math.min,
  max: Math.max,
  floor: Math.floor,
  ceil: Math.ceil,
  abs: Math.abs,
  sqrt: Math.sqrt,
  random: (a?: number, b?: number): number => {
    if (a !== undefined && b !== undefined) {
      return Math.floor(Math.random() * (b - a + 1)) + a;
    }
    if (a !== undefined) {
      return Math.floor(Math.random() * a) + 1;
    }
    return Math.random();
  },
  huge: Infinity,
  pi: Math.PI,
  log: Math.log,
  exp: Math.exp,
  pow: Math.pow,
  sin: Math.sin,
  cos: Math.cos,
  rad: (deg: number): number => (deg * Math.PI) / 180,
  deg: (rad: number): number => (rad * 180) / Math.PI,
  clamp: (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
  },
};

/**
 * Minimal Roblox `string` library mock.
 * Covers string.format / string.lower / string.upper etc.
 */
export const luaString = {
  format: (fmt: string, ...args: unknown[]): string => {
    // Very simplified sprintf — handles %d, %f, %s, %x, and %.Nf
    let i = 0;
    return fmt.replace(/%([+-]?\d*(?:\.\d+)?[dfsxXeEgGqo%])/g, (match) => {
      if (match === "%%") return "%";
      const arg = args[i++];
      const spec = match.slice(-1);
      if (spec === "d" || spec === "x" || spec === "X" || spec === "o") {
        const n = Number(arg);
        if (spec === "x") return Math.floor(n).toString(16);
        if (spec === "X") return Math.floor(n).toString(16).toUpperCase();
        if (spec === "o") return Math.floor(n).toString(8);
        return String(Math.floor(n));
      }
      if (spec === "f" || spec === "e" || spec === "E" || spec === "g" || spec === "G") {
        const n = Number(arg);
        const precMatch = match.match(/\.(\d+)/);
        const prec = precMatch ? Number(precMatch[1]) : 6;
        return n.toFixed(prec);
      }
      return String(arg);
    });
  },
  lower: (s: string) => s.toLowerCase(),
  upper: (s: string) => s.toUpperCase(),
  len: (s: string) => s.length,
  rep: (s: string, n: number) => s.repeat(n),
  sub: (s: string, i: number, j?: number) => {
    const start = i - 1;
    if (j === undefined) return s.slice(start);
    return s.slice(start, j);
  },
  byte: (s: string, i = 1) => s.charCodeAt(i - 1),
  char: (...codes: number[]) => String.fromCharCode(...codes),
  find: (s: string, pattern: string) => {
    const idx = s.indexOf(pattern);
    if (idx === -1) return [undefined];
    return [idx + 1];
  },
  match: (s: string, pattern: string) => {
    const m = s.match(pattern);
    return m ? m[0] : undefined;
  },
};

/**
 * Install Roblox globals on the global object for tests.
 * Call this in beforeAll() or at the top of test files.
 *
 * This is the **single source of truth** for all Roblox/roblox-ts runtime
 * polyfills.  `test-setup.ts` simply calls `mockRobloxGlobals()` — do NOT
 * add polyfills there.
 */
export function mockRobloxGlobals(): void {
  const g = globalThis as any;

  // ── Array polyfills (roblox-ts) ────────────────────────────────────────

  const arrProto = Array.prototype as any;

  // .size() → .length
  if (!arrProto.size) {
    arrProto.size = function (this: unknown[]) {
      return this.length;
    };
  }

  // .remove(index) — removes element at index
  if (!arrProto.remove) {
    arrProto.remove = function (this: unknown[], index: number) {
      return this.splice(index, 1)[0];
    };
  }

  // .clear() — empties the array
  if (!arrProto.clear) {
    arrProto.clear = function (this: unknown[]) {
      this.length = 0;
    };
  }

  // .sort() — Lua table.sort comparators return boolean (true = a before b),
  // but JS Array.sort expects a numeric comparator.
  {
    const nativeSort = Array.prototype.sort;
    arrProto.sort = function (this: unknown[], compareFn?: (...args: unknown[]) => unknown) {
      if (!compareFn) return nativeSort.call(this);
      return nativeSort.call(this, (a: unknown, b: unknown) => {
        const r = compareFn(a, b);
        if (typeof r === "boolean") {
          if (r) return -1;
          const rev = compareFn(b, a);
          if (rev) return 1;
          return 0;
        }
        return r as number;
      });
    };
  }

  // ── String polyfills (roblox-ts method-call style: s.lower()) ─────────

  const strProto = String.prototype as any;

  if (!strProto.size) {
    strProto.size = function (this: string) {
      return this.length;
    };
  }

  if (!strProto.byte) {
    strProto.byte = function (this: string, i: number) {
      return [this.charCodeAt(i - 1)];
    };
  }

  // Must override — JS String.prototype.find() has different semantics
  strProto.find = function (this: string, pattern: string) {
    const idx = this.indexOf(pattern);
    if (idx === -1) return [undefined];
    return [idx + 1]; // 1-indexed
  };

  // Must override — JS has deprecated String.prototype.sub() that wraps in <sub>
  strProto.sub = function (this: string, i: number, j?: number) {
    const start = i - 1;
    if (j === undefined) return this.slice(start);
    return this.slice(start, j);
  };

  if (!strProto.lower) {
    strProto.lower = function (this: string) {
      return this.toLowerCase();
    };
  }

  if (!strProto.upper) {
    strProto.upper = function (this: string) {
      return this.toUpperCase();
    };
  }

  // ── Lua globals ────────────────────────────────────────────────────────

  g.os = {
    clock: osClock,
    time: osTime,
  };

  g.typeOf = typeOf;
  g.tostring = tostring;
  g.tonumber = tonumber;
  g.math = math;
  g.string = luaString;

  // roblox-ts intrinsic: typeIs(value, typeName) → typeof value === typeName
  g.typeIs = (value: unknown, typeName: string): boolean => {
    if (typeName === "table") return typeof value === "object" && value !== null;
    if (typeName === "nil") return value === undefined || value === null;
    return typeof value === typeName;
  };

  // pairs() — iterates key/value pairs of a table (object)
  if (!g.pairs) {
    g.pairs = function* (obj: Record<string, unknown>) {
      for (const [k, v] of Object.entries(obj)) {
        yield [k, v];
      }
    };
  }

  // Mock print/warn
  g.print = console.log;
  g.warn = console.warn;

  // Mock pcall — supports passing extra arguments like Lua's pcall(fn, arg1, ...)
  g.pcall = <T>(fn: (...args: unknown[]) => T, ...args: unknown[]): [true, T] | [false, string] => {
    try {
      return [true, fn(...args)];
    } catch (e) {
      return [false, String(e)];
    }
  };

  // Mock error
  g.error = (message: string): never => {
    throw new Error(message);
  };

  // Mock Roblox task library
  g.task = {
    spawn: (fn: () => void) => {
      fn();
    },
    delay: (_seconds: number, fn: () => void) => {
      fn();
    },
    wait: (_seconds?: number) => {
      // No-op in tests
    },
    defer: (fn: () => void) => {
      fn();
    },
    cancel: () => {
      // No-op
    },
  };

  // Mock Roblox `game` global — with TweenService support
  g.game = {
    GetService: (name: string) => {
      if (name === "TweenService") {
        return {
          _service: name,
          Create: (instance: any, _tweenInfo: any, properties: Record<string, unknown>) => {
            const tween = {
              Play: () => {
                // Apply properties immediately in tests
                for (const [k, v] of Object.entries(properties)) {
                  instance[k] = v;
                }
              },
              Cancel: () => {},
              Pause: () => {},
              Completed: {
                Connect: (cb: () => void) => {
                  cb();
                  return { Disconnect: () => {} };
                },
                Wait: () => {},
              },
            };
            return tween;
          },
        };
      }
      if (name === "DataStoreService") {
        return _mockDataStoreService();
      }
      if (name === "HttpService") {
        return _mockHttpService();
      }
      if (name === "MessagingService") {
        return _mockMessagingService();
      }
      if (name === "Players") {
        return _mockPlayersService();
      }
      return { _service: name };
    },
    JobId: "test-job-id",
    PlaceId: 0,
  };

  // ── Roblox Value Types ────────────────────────────────────────────────

  // UDim
  g.UDim = class UDim {
    Scale: number;
    Offset: number;
    constructor(scale: number, offset: number) {
      this.Scale = scale;
      this.Offset = offset;
    }
  };

  // UDim2
  g.UDim2 = class UDim2 {
    X: any;
    Y: any;
    constructor(xScale: number, xOffset: number, yScale: number, yOffset: number) {
      this.X = new g.UDim(xScale, xOffset);
      this.Y = new g.UDim(yScale, yOffset);
    }
    Lerp(goal: any, alpha: number) {
      return new g.UDim2(
        this.X.Scale + (goal.X.Scale - this.X.Scale) * alpha,
        this.X.Offset + (goal.X.Offset - this.X.Offset) * alpha,
        this.Y.Scale + (goal.Y.Scale - this.Y.Scale) * alpha,
        this.Y.Offset + (goal.Y.Offset - this.Y.Offset) * alpha
      );
    }
  };

  // Vector2
  g.Vector2 = class Vector2 {
    X: number;
    Y: number;
    constructor(x: number, y: number) {
      this.X = x;
      this.Y = y;
    }
    get Magnitude() {
      return Math.sqrt(this.X * this.X + this.Y * this.Y);
    }
  };

  // Color3
  g.Color3 = class Color3 {
    R: number;
    G: number;
    B: number;
    constructor(r: number = 0, g: number = 0, b: number = 0) {
      this.R = r;
      this.G = g;
      this.B = b;
    }
    static fromRGB(r: number, g: number, b: number) {
      const c = new Color3();
      c.R = r / 255;
      c.G = g / 255;
      c.B = b / 255;
      return c;
    }
    static fromHSV(_h: number, _s: number, _v: number) {
      return new Color3();
    }
    Lerp(goal: any, alpha: number) {
      const c = new Color3();
      c.R = this.R + (goal.R - this.R) * alpha;
      c.G = this.G + (goal.G - this.G) * alpha;
      c.B = this.B + (goal.B - this.B) * alpha;
      return c;
    }
  };

  // TweenInfo
  g.TweenInfo = class TweenInfo {
    Time: number;
    EasingStyle: any;
    EasingDirection: any;
    RepeatCount: number;
    Reverses: boolean;
    DelayTime: number;
    constructor(
      time = 1,
      easingStyle?: any,
      easingDirection?: any,
      repeatCount = 0,
      reverses = false,
      delayTime = 0
    ) {
      this.Time = time;
      this.EasingStyle = easingStyle;
      this.EasingDirection = easingDirection;
      this.RepeatCount = repeatCount;
      this.Reverses = reverses;
      this.DelayTime = delayTime;
    }
  };

  // ── Roblox Enum Namespace ─────────────────────────────────────────────

  const enumItem = (name: string, value: number) => ({ Name: name, Value: value });

  g.Enum = {
    Font: {
      GothamBold: enumItem("GothamBold", 0),
      GothamMedium: enumItem("GothamMedium", 1),
      Gotham: enumItem("Gotham", 2),
      SourceSans: enumItem("SourceSans", 3),
      SourceSansBold: enumItem("SourceSansBold", 4),
    },
    TextXAlignment: {
      Left: enumItem("Left", 0),
      Center: enumItem("Center", 1),
      Right: enumItem("Right", 2),
    },
    TextYAlignment: {
      Top: enumItem("Top", 0),
      Center: enumItem("Center", 1),
      Bottom: enumItem("Bottom", 2),
    },
    HorizontalAlignment: {
      Left: enumItem("Left", 0),
      Center: enumItem("Center", 1),
      Right: enumItem("Right", 2),
    },
    VerticalAlignment: {
      Top: enumItem("Top", 0),
      Center: enumItem("Center", 1),
      Bottom: enumItem("Bottom", 2),
    },
    SortOrder: {
      LayoutOrder: enumItem("LayoutOrder", 0),
      Name: enumItem("Name", 1),
    },
    FillDirection: {
      Horizontal: enumItem("Horizontal", 0),
      Vertical: enumItem("Vertical", 1),
    },
    AutomaticSize: {
      None: enumItem("None", 0),
      X: enumItem("X", 1),
      Y: enumItem("Y", 2),
      XY: enumItem("XY", 3),
    },
    ScaleType: {
      Stretch: enumItem("Stretch", 0),
      Slice: enumItem("Slice", 1),
      Tile: enumItem("Tile", 2),
      Fit: enumItem("Fit", 3),
      Crop: enumItem("Crop", 4),
    },
    ScrollingDirection: {
      X: enumItem("X", 0),
      Y: enumItem("Y", 1),
      XY: enumItem("XY", 2),
    },
    EasingStyle: {
      Linear: enumItem("Linear", 0),
      Quad: enumItem("Quad", 1),
      Cubic: enumItem("Cubic", 2),
      Back: enumItem("Back", 3),
      Bounce: enumItem("Bounce", 4),
      Elastic: enumItem("Elastic", 5),
    },
    EasingDirection: {
      In: enumItem("In", 0),
      Out: enumItem("Out", 1),
      InOut: enumItem("InOut", 2),
    },
    ApplyStrokeMode: {
      Contextual: enumItem("Contextual", 0),
      Border: enumItem("Border", 1),
    },
  };

  // ── Roblox Instance Mock ──────────────────────────────────────────────

  /**
   * Mock Instance constructor. Creates objects that behave like Roblox
   * Instances: Parent tracking, GetChildren(), Destroy(), etc.
   */
  const createMockSignal = () => {
    const callbacks: Array<(...args: unknown[]) => void> = [];
    return {
      Connect: (cb: (...args: unknown[]) => void) => {
        callbacks.push(cb);
        return {
          Disconnect: () => {
            /* no-op */
          },
        };
      },
      Wait: () => {},
      _fire: (...args: unknown[]) => callbacks.forEach((cb) => cb(...args)),
    };
  };

  g.Instance = function MockInstance(className: string) {
    const children: any[] = [];
    const attributes: Record<string, unknown> = {};

    const instance: any = {
      ClassName: className,
      Name: className,
      Rotation: 0,
      Destroy: () => {
        // Remove from parent's children
        if (_parent && _parent.__children) {
          const idx = _parent.__children.indexOf(instance);
          if (idx >= 0) _parent.__children.splice(idx, 1);
        }
        _parent = undefined;
      },
      Clone: () => {
        const clone = new g.Instance(className);
        clone.Name = instance.Name;
        return clone;
      },
      FindFirstChild: (name: string, recursive = false): any => {
        for (const child of children) {
          if (child.Name === name) return child;
          if (recursive) {
            const found = child.FindFirstChild(name, true);
            if (found) return found;
          }
        }
        return undefined;
      },
      FindFirstChildOfClass: (cn: string): any => {
        return children.find((c: any) => c.ClassName === cn);
      },
      GetChildren: () => [...children],
      IsA: (cn: string) => className === cn,
      SetAttribute: (name: string, value: unknown) => {
        attributes[name] = value;
      },
      GetAttribute: (name: string) => attributes[name],
      WaitForChild: (name: string) => instance.FindFirstChild(name),

      // GuiObject defaults
      Size: new g.UDim2(0, 100, 0, 100),
      Position: new g.UDim2(0, 0, 0, 0),
      AnchorPoint: new g.Vector2(0, 0),
      BackgroundColor3: new g.Color3(),
      BackgroundTransparency: 0,
      BorderSizePixel: 0,
      Visible: true,
      ZIndex: 1,
      LayoutOrder: 0,
      ClipsDescendants: false,
      Active: false,

      // TextLabel / TextButton
      Text: "",
      TextColor3: new g.Color3(),
      TextSize: 14,
      Font: g.Enum.Font.Gotham,
      TextWrapped: false,
      TextTruncate: enumItem("None", 0),
      TextXAlignment: g.Enum.TextXAlignment.Left,
      TextYAlignment: g.Enum.TextYAlignment.Top,
      TextTransparency: 0,
      RichText: false,
      AutoButtonColor: false,

      // ScrollingFrame
      CanvasSize: new g.UDim2(0, 0, 0, 0),
      ScrollBarThickness: 12,
      ScrollBarImageTransparency: 0,
      ScrollingDirection: g.Enum.ScrollingDirection.XY,
      AutomaticCanvasSize: g.Enum.AutomaticSize.None,

      // ImageLabel / ImageButton
      Image: "",
      ImageColor3: new g.Color3(),
      ImageTransparency: 0,
      ScaleType: g.Enum.ScaleType.Stretch,
      AutomaticSize: g.Enum.AutomaticSize.None,

      // UICorner
      CornerRadius: new g.UDim(0, 0),

      // UIPadding
      PaddingTop: new g.UDim(0, 0),
      PaddingBottom: new g.UDim(0, 0),
      PaddingLeft: new g.UDim(0, 0),
      PaddingRight: new g.UDim(0, 0),

      // UIStroke
      Thickness: 0,
      Color: new g.Color3(),
      Transparency: 0,
      ApplyStrokeMode: g.Enum.ApplyStrokeMode.Contextual,

      // UIListLayout
      SortOrder: g.Enum.SortOrder.LayoutOrder,
      FillDirection: g.Enum.FillDirection.Vertical,
      HorizontalAlignment: g.Enum.HorizontalAlignment.Left,
      VerticalAlignment: g.Enum.VerticalAlignment.Top,
      Padding: new g.UDim(0, 0),

      // UIGridLayout
      CellSize: new g.UDim2(0, 100, 0, 100),
      CellPadding: new g.UDim2(0, 5, 0, 5),
      FillDirectionMaxCells: 0,
      StartCorner: enumItem("TopLeft", 0),

      // ScreenGui
      ResetOnSpawn: true,
      IgnoreGuiInset: false,
      DisplayOrder: 0,
      Enabled: true,

      // Signals
      MouseButton1Click: createMockSignal(),
      MouseEnter: createMockSignal(),
      MouseLeave: createMockSignal(),

      // Internal child tracking
      __children: children,
    };

    // Intercept Parent assignment to maintain child lists
    let _parent: any = undefined;
    Object.defineProperty(instance, "Parent", {
      get: () => _parent,
      set: (newParent: any) => {
        // Remove from old parent
        if (_parent && _parent.__children) {
          const idx = _parent.__children.indexOf(instance);
          if (idx >= 0) _parent.__children.splice(idx, 1);
        }
        _parent = newParent;
        // Add to new parent
        if (newParent && newParent.__children) {
          newParent.__children.push(instance);
        }
      },
      enumerable: true,
      configurable: true,
    });

    return instance;
  };
}

/**
 * Remove Roblox globals from the global object.
 * Call this in afterAll() if needed.
 */
export function unmockRobloxGlobals(): void {
  const g = globalThis as any;
  delete g.os;
  delete g.typeOf;
  delete g.typeIs;
  delete g.tostring;
  delete g.tonumber;
  delete g.math;
  delete g.string;
  delete g.print;
  delete g.warn;
  delete g.pcall;
  delete g.error;
  delete g.pairs;
  delete g.task;
  delete g.game;
  delete g.UDim;
  delete g.UDim2;
  delete g.Vector2;
  delete g.Color3;
  delete g.TweenInfo;
  delete g.Enum;
  delete g.Instance;
}
