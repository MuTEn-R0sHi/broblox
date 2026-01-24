/**
 * UI Creation Utilities
 *
 * Helper functions for creating UI elements.
 */

import {
  SizeSpec,
  PositionSpec,
  AnchorSpec,
  ColorSpec,
  PaddingSpec,
  StrokeSpec,
  ListLayoutProps,
  GridLayoutProps,
} from "./types";
import { toColor3 } from "./theme";

// ============================================================================
// Size & Position
// ============================================================================

/**
 * Create a UDim2 from a size spec.
 */
export function size(spec: SizeSpec): UDim2 {
  return new UDim2(spec.xScale ?? 0, spec.xOffset ?? 0, spec.yScale ?? 0, spec.yOffset ?? 0);
}

/**
 * Create a UDim2 from a position spec.
 */
export function position(spec: PositionSpec): UDim2 {
  return new UDim2(spec.xScale ?? 0, spec.xOffset ?? 0, spec.yScale ?? 0, spec.yOffset ?? 0);
}

/**
 * Create a Vector2 anchor point.
 */
export function anchor(spec: AnchorSpec): Vector2 {
  return new Vector2(spec.x, spec.y);
}

/**
 * Shorthand for absolute size.
 */
export function px(width: number, height?: number): UDim2 {
  return new UDim2(0, width, 0, height ?? width);
}

/**
 * Shorthand for relative size.
 */
export function scale(xScale: number, yScale?: number): UDim2 {
  return new UDim2(xScale, 0, yScale ?? xScale, 0);
}

/**
 * Full size (100% x 100%).
 */
export function fullSize(): UDim2 {
  return new UDim2(1, 0, 1, 0);
}

/**
 * Center anchor point.
 */
export function centerAnchor(): Vector2 {
  return new Vector2(0.5, 0.5);
}

/**
 * Center position.
 */
export function centerPosition(): UDim2 {
  return new UDim2(0.5, 0, 0.5, 0);
}

// ============================================================================
// Frame Creation
// ============================================================================

/**
 * Create a basic frame.
 */
export function createFrame(props?: {
  name?: string;
  size?: UDim2;
  position?: UDim2;
  anchorPoint?: Vector2;
  backgroundColor?: ColorSpec;
  backgroundTransparency?: number;
  borderSizePixel?: number;
  parent?: Instance;
}): Frame {
  const frame = new Instance("Frame");
  frame.Name = props?.name ?? "Frame";
  frame.Size = props?.size ?? new UDim2(0, 100, 0, 100);
  frame.Position = props?.position ?? new UDim2(0, 0, 0, 0);
  frame.AnchorPoint = props?.anchorPoint ?? new Vector2(0, 0);
  frame.BackgroundColor3 = props?.backgroundColor
    ? toColor3(props.backgroundColor)
    : new Color3(1, 1, 1);
  frame.BackgroundTransparency = props?.backgroundTransparency ?? 0;
  frame.BorderSizePixel = props?.borderSizePixel ?? 0;

  if (props?.parent) {
    frame.Parent = props.parent;
  }

  return frame;
}

/**
 * Create a text label.
 */
export function createLabel(props: {
  text: string;
  name?: string;
  size?: UDim2;
  position?: UDim2;
  anchorPoint?: Vector2;
  textColor?: ColorSpec;
  textSize?: number;
  textXAlignment?: Enum.TextXAlignment;
  textYAlignment?: Enum.TextYAlignment;
  font?: Enum.Font;
  textWrapped?: boolean;
  richText?: boolean;
  parent?: Instance;
}): TextLabel {
  const label = new Instance("TextLabel");
  label.Name = props.name ?? "Label";
  label.Text = props.text;
  label.Size = props.size ?? new UDim2(0, 100, 0, 30);
  label.Position = props.position ?? new UDim2(0, 0, 0, 0);
  label.AnchorPoint = props.anchorPoint ?? new Vector2(0, 0);
  label.TextColor3 = props.textColor ? toColor3(props.textColor) : new Color3(1, 1, 1);
  label.TextSize = props.textSize ?? 14;
  label.TextXAlignment = props.textXAlignment ?? Enum.TextXAlignment.Left;
  label.TextYAlignment = props.textYAlignment ?? Enum.TextYAlignment.Center;
  label.Font = props.font ?? Enum.Font.GothamMedium;
  label.TextWrapped = props.textWrapped ?? false;
  label.RichText = props.richText ?? false;
  label.BackgroundTransparency = 1;
  label.BorderSizePixel = 0;

  if (props.parent) {
    label.Parent = props.parent;
  }

  return label;
}

/**
 * Create a text button.
 */
export function createButton(props: {
  text: string;
  name?: string;
  size?: UDim2;
  position?: UDim2;
  anchorPoint?: Vector2;
  backgroundColor?: ColorSpec;
  textColor?: ColorSpec;
  textSize?: number;
  font?: Enum.Font;
  onClick?: () => void;
  parent?: Instance;
}): TextButton {
  const button = new Instance("TextButton");
  button.Name = props.name ?? "Button";
  button.Text = props.text;
  button.Size = props.size ?? new UDim2(0, 120, 0, 40);
  button.Position = props.position ?? new UDim2(0, 0, 0, 0);
  button.AnchorPoint = props.anchorPoint ?? new Vector2(0, 0);
  button.BackgroundColor3 = props.backgroundColor
    ? toColor3(props.backgroundColor)
    : new Color3(0.2, 0.4, 0.8);
  button.TextColor3 = props.textColor ? toColor3(props.textColor) : new Color3(1, 1, 1);
  button.TextSize = props.textSize ?? 14;
  button.Font = props.font ?? Enum.Font.GothamMedium;
  button.BorderSizePixel = 0;
  button.AutoButtonColor = true;

  if (props.onClick) {
    button.MouseButton1Click.Connect(props.onClick);
  }

  if (props.parent) {
    button.Parent = props.parent;
  }

  return button;
}

/**
 * Create an image label.
 */
export function createImage(props: {
  image: string;
  name?: string;
  size?: UDim2;
  position?: UDim2;
  anchorPoint?: Vector2;
  imageColor?: ColorSpec;
  imageTransparency?: number;
  scaleType?: Enum.ScaleType;
  parent?: Instance;
}): ImageLabel {
  const img = new Instance("ImageLabel");
  img.Name = props.name ?? "Image";
  img.Image = props.image;
  img.Size = props.size ?? new UDim2(0, 100, 0, 100);
  img.Position = props.position ?? new UDim2(0, 0, 0, 0);
  img.AnchorPoint = props.anchorPoint ?? new Vector2(0, 0);
  img.ImageColor3 = props.imageColor ? toColor3(props.imageColor) : new Color3(1, 1, 1);
  img.ImageTransparency = props.imageTransparency ?? 0;
  img.ScaleType = props.scaleType ?? Enum.ScaleType.Stretch;
  img.BackgroundTransparency = 1;
  img.BorderSizePixel = 0;

  if (props.parent) {
    img.Parent = props.parent;
  }

  return img;
}

/**
 * Create a scrolling frame.
 */
export function createScrollFrame(props?: {
  name?: string;
  size?: UDim2;
  position?: UDim2;
  anchorPoint?: Vector2;
  canvasSize?: UDim2;
  scrollBarThickness?: number;
  scrollingDirection?: Enum.ScrollingDirection;
  backgroundColor?: ColorSpec;
  backgroundTransparency?: number;
  parent?: Instance;
}): ScrollingFrame {
  const scroll = new Instance("ScrollingFrame");
  scroll.Name = props?.name ?? "ScrollFrame";
  scroll.Size = props?.size ?? new UDim2(1, 0, 1, 0);
  scroll.Position = props?.position ?? new UDim2(0, 0, 0, 0);
  scroll.AnchorPoint = props?.anchorPoint ?? new Vector2(0, 0);
  scroll.CanvasSize = props?.canvasSize ?? new UDim2(0, 0, 0, 0);
  scroll.ScrollBarThickness = props?.scrollBarThickness ?? 6;
  scroll.ScrollingDirection = props?.scrollingDirection ?? Enum.ScrollingDirection.Y;
  scroll.BackgroundColor3 = props?.backgroundColor
    ? toColor3(props.backgroundColor)
    : new Color3(0, 0, 0);
  scroll.BackgroundTransparency = props?.backgroundTransparency ?? 1;
  scroll.BorderSizePixel = 0;
  scroll.AutomaticCanvasSize = Enum.AutomaticSize.Y;

  if (props?.parent) {
    scroll.Parent = props.parent;
  }

  return scroll;
}

// ============================================================================
// Modifiers
// ============================================================================

/**
 * Add corner radius to an element.
 */
export function addCorner(parent: GuiObject, radius?: number): UICorner {
  const corner = new Instance("UICorner");
  corner.CornerRadius = new UDim(0, radius ?? 8);
  corner.Parent = parent;
  return corner;
}

/**
 * Add padding to an element.
 */
export function addPadding(parent: GuiObject, padding: PaddingSpec): UIPadding {
  const pad = new Instance("UIPadding");
  pad.PaddingTop = new UDim(0, padding.top ?? 0);
  pad.PaddingBottom = new UDim(0, padding.bottom ?? 0);
  pad.PaddingLeft = new UDim(0, padding.left ?? 0);
  pad.PaddingRight = new UDim(0, padding.right ?? 0);
  pad.Parent = parent;
  return pad;
}

/**
 * Add stroke/border to an element.
 */
export function addStroke(parent: GuiObject, stroke: StrokeSpec): UIStroke {
  const uiStroke = new Instance("UIStroke");
  uiStroke.Color = stroke.color ? toColor3(stroke.color) : new Color3(1, 1, 1);
  uiStroke.Thickness = stroke.thickness ?? 1;
  uiStroke.Transparency = stroke.transparency ?? 0;
  uiStroke.Parent = parent;
  return uiStroke;
}

/**
 * Add list layout to a container.
 */
export function addListLayout(parent: GuiObject, props?: ListLayoutProps): UIListLayout {
  const layout = new Instance("UIListLayout");
  layout.FillDirection =
    props?.direction === "Horizontal" ? Enum.FillDirection.Horizontal : Enum.FillDirection.Vertical;
  layout.Padding = new UDim(0, props?.padding ?? 0);
  layout.HorizontalAlignment =
    props?.horizontalAlignment === "Right"
      ? Enum.HorizontalAlignment.Right
      : props?.horizontalAlignment === "Center"
        ? Enum.HorizontalAlignment.Center
        : Enum.HorizontalAlignment.Left;
  layout.VerticalAlignment =
    props?.verticalAlignment === "Bottom"
      ? Enum.VerticalAlignment.Bottom
      : props?.verticalAlignment === "Center"
        ? Enum.VerticalAlignment.Center
        : Enum.VerticalAlignment.Top;
  layout.SortOrder = props?.sortOrder === "Name" ? Enum.SortOrder.Name : Enum.SortOrder.LayoutOrder;
  layout.Parent = parent;
  return layout;
}

/**
 * Add grid layout to a container.
 */
export function addGridLayout(parent: GuiObject, props?: GridLayoutProps): UIGridLayout {
  const layout = new Instance("UIGridLayout");
  layout.CellSize = props?.cellSize ? size(props.cellSize) : new UDim2(0, 100, 0, 100);
  layout.CellPadding = props?.cellPadding ? size(props.cellPadding) : new UDim2(0, 4, 0, 4);
  layout.FillDirection =
    props?.fillDirection === "Vertical"
      ? Enum.FillDirection.Vertical
      : Enum.FillDirection.Horizontal;
  layout.HorizontalAlignment =
    props?.horizontalAlignment === "Right"
      ? Enum.HorizontalAlignment.Right
      : props?.horizontalAlignment === "Center"
        ? Enum.HorizontalAlignment.Center
        : Enum.HorizontalAlignment.Left;
  layout.VerticalAlignment =
    props?.verticalAlignment === "Bottom"
      ? Enum.VerticalAlignment.Bottom
      : props?.verticalAlignment === "Center"
        ? Enum.VerticalAlignment.Center
        : Enum.VerticalAlignment.Top;
  layout.SortOrder = props?.sortOrder === "Name" ? Enum.SortOrder.Name : Enum.SortOrder.LayoutOrder;
  layout.Parent = parent;
  return layout;
}

/**
 * Add size constraint.
 */
export function addSizeConstraint(
  parent: GuiObject,
  props: {
    minSize?: Vector2;
    maxSize?: Vector2;
  }
): UISizeConstraint {
  const constraint = new Instance("UISizeConstraint");
  constraint.MinSize = props.minSize ?? new Vector2(0, 0);
  constraint.MaxSize = props.maxSize ?? new Vector2(math.huge, math.huge);
  constraint.Parent = parent;
  return constraint;
}

/**
 * Add aspect ratio constraint.
 */
export function addAspectRatio(parent: GuiObject, ratio: number): UIAspectRatioConstraint {
  const constraint = new Instance("UIAspectRatioConstraint");
  constraint.AspectRatio = ratio;
  constraint.Parent = parent;
  return constraint;
}
