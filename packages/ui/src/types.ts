/**
 * UI Types
 *
 * Type definitions for UI components.
 */

// ============================================================================
// Size & Position
// ============================================================================

/** Size specification - can be absolute, relative, or mixed */
export interface SizeSpec {
  xScale?: number;
  xOffset?: number;
  yScale?: number;
  yOffset?: number;
}

/** Position specification */
export interface PositionSpec {
  xScale?: number;
  xOffset?: number;
  yScale?: number;
  yOffset?: number;
}

/** Anchor point */
export interface AnchorSpec {
  x: number;
  y: number;
}

// ============================================================================
// Styling
// ============================================================================

/** Color definition */
export interface ColorSpec {
  r: number;
  g: number;
  b: number;
}

/** Padding specification */
export interface PaddingSpec {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

/** Corner radius */
export interface CornerSpec {
  radius?: number;
  /** Use relative radius (Scale) */
  relative?: boolean;
}

/** Border/stroke definition */
export interface StrokeSpec {
  color?: ColorSpec;
  thickness?: number;
  transparency?: number;
}

/** Gradient definition */
export interface GradientSpec {
  color1: ColorSpec;
  color2: ColorSpec;
  rotation?: number;
}

// ============================================================================
// Text Styling
// ============================================================================

/** Text alignment */
export type TextAlign = "Left" | "Center" | "Right";
export type TextYAlign = "Top" | "Center" | "Bottom";

/** Font weight */
export type FontWeight = "Regular" | "Medium" | "SemiBold" | "Bold";

/** Text style */
export interface TextStyleSpec {
  fontSize?: number;
  fontWeight?: FontWeight;
  textColor?: ColorSpec;
  textAlign?: TextAlign;
  textYAlign?: TextYAlign;
  textWrapped?: boolean;
  textScaled?: boolean;
  richText?: boolean;
}

// ============================================================================
// Component Base
// ============================================================================

/** Base properties for all components */
export interface BaseProps {
  name?: string;
  visible?: boolean;
  zIndex?: number;
  layoutOrder?: number;
}

/** Frame-like component properties */
export interface FrameProps extends BaseProps {
  size?: SizeSpec;
  position?: PositionSpec;
  anchor?: AnchorSpec;
  backgroundColor?: ColorSpec;
  backgroundTransparency?: number;
  borderColor?: ColorSpec;
  borderSize?: number;
  cornerRadius?: CornerSpec;
  padding?: PaddingSpec;
  clipsDescendants?: boolean;
}

/** Text component properties */
export interface TextProps extends BaseProps, TextStyleSpec {
  text: string;
  size?: SizeSpec;
  position?: PositionSpec;
  anchor?: AnchorSpec;
}

/** Button component properties */
export interface ButtonProps extends FrameProps {
  text?: string;
  textStyle?: TextStyleSpec;
  hoverColor?: ColorSpec;
  pressedColor?: ColorSpec;
  disabled?: boolean;
  onClick?: () => void;
}

/** Image component properties */
export interface ImageProps extends BaseProps {
  image: string;
  size?: SizeSpec;
  position?: PositionSpec;
  anchor?: AnchorSpec;
  imageColor?: ColorSpec;
  imageTransparency?: number;
  scaleType?: "Fit" | "Stretch" | "Crop" | "Tile";
}

/** Input field properties */
export interface InputProps extends FrameProps {
  placeholder?: string;
  text?: string;
  textStyle?: TextStyleSpec;
  multiLine?: boolean;
  clearOnFocus?: boolean;
  onChange?: (text: string) => void;
  onFocusLost?: (text: string, enterPressed: boolean) => void;
}

/** List/ScrollFrame properties */
export interface ListProps extends FrameProps {
  scrollDirection?: "Vertical" | "Horizontal";
  scrollBarThickness?: number;
  scrollBarColor?: ColorSpec;
  canvasSize?: SizeSpec;
}

// ============================================================================
// Layout
// ============================================================================

/** List layout direction */
export type LayoutDirection = "Vertical" | "Horizontal";

/** Layout alignment */
export type LayoutAlignment = "Top" | "Center" | "Bottom";

/** List layout properties */
export interface ListLayoutProps {
  direction?: LayoutDirection;
  padding?: number;
  horizontalAlignment?: "Left" | "Center" | "Right";
  verticalAlignment?: LayoutAlignment;
  sortOrder?: "LayoutOrder" | "Name";
}

/** Grid layout properties */
export interface GridLayoutProps {
  cellSize?: SizeSpec;
  cellPadding?: SizeSpec;
  startCorner?: "TopLeft" | "TopRight" | "BottomLeft" | "BottomRight";
  fillDirection?: LayoutDirection;
  horizontalAlignment?: "Left" | "Center" | "Right";
  verticalAlignment?: LayoutAlignment;
  sortOrder?: "LayoutOrder" | "Name";
}

// ============================================================================
// Animation
// ============================================================================

/** Tween easing style */
export type EasingStyle =
  | "Linear"
  | "Sine"
  | "Quad"
  | "Cubic"
  | "Quart"
  | "Quint"
  | "Exponential"
  | "Circular"
  | "Back"
  | "Elastic"
  | "Bounce";

/** Tween easing direction */
export type EasingDirection = "In" | "Out" | "InOut";

/** Animation/tween configuration */
export interface TweenConfig {
  duration?: number;
  easingStyle?: EasingStyle;
  easingDirection?: EasingDirection;
  repeatCount?: number;
  reverses?: boolean;
  delayTime?: number;
}

// ============================================================================
// Utility Types
// ============================================================================

/** UI element reference */
export type UIElement = Frame | TextLabel | TextButton | ImageLabel | ScrollingFrame;

/** Cleanup function */
export type Cleanup = () => void;
