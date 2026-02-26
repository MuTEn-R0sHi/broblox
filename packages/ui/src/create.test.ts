import { describe, it, expect } from "vitest";

// ============================================================================
// create.ts — UI Creation Utilities
// ============================================================================

import {
  size,
  position,
  anchor,
  px,
  scale,
  fullSize,
  centerAnchor,
  centerPosition,
  createFrame,
  createLabel,
  createButton,
  createImage,
  createScrollFrame,
  addCorner,
  addPadding,
  addStroke,
  addListLayout,
  addGridLayout,
  addSizeConstraint,
  addAspectRatio,
} from "./create";

describe("size helpers", () => {
  it("size() creates UDim2 from spec", () => {
    const s = size({ xScale: 0.5, xOffset: 10, yScale: 1, yOffset: 0 });
    expect(s).toBeInstanceOf(UDim2);
  });

  it("size() defaults missing values to 0", () => {
    const s = size({ xOffset: 50 });
    expect(s).toBeInstanceOf(UDim2);
  });

  it("position() creates UDim2 from spec", () => {
    const p = position({ xScale: 0.5, yScale: 0.5 });
    expect(p).toBeInstanceOf(UDim2);
  });

  it("anchor() creates Vector2", () => {
    const a = anchor({ x: 0.5, y: 0.5 });
    expect(a).toBeInstanceOf(Vector2);
    expect(a.X).toBe(0.5);
    expect(a.Y).toBe(0.5);
  });

  it("px() creates absolute size UDim2", () => {
    const p = px(100, 50);
    expect(p).toBeInstanceOf(UDim2);
  });

  it("px() with one arg uses same value for both axes", () => {
    const p = px(64);
    expect(p).toBeInstanceOf(UDim2);
  });

  it("scale() creates relative size UDim2", () => {
    const s = scale(0.5, 0.8);
    expect(s).toBeInstanceOf(UDim2);
  });

  it("scale() with one arg uses same value for both axes", () => {
    const s = scale(1);
    expect(s).toBeInstanceOf(UDim2);
  });

  it("fullSize() returns 1,0,1,0 UDim2", () => {
    const f = fullSize();
    expect(f).toBeInstanceOf(UDim2);
  });

  it("centerAnchor() returns (0.5, 0.5) Vector2", () => {
    const a = centerAnchor();
    expect(a).toBeInstanceOf(Vector2);
    expect(a.X).toBe(0.5);
    expect(a.Y).toBe(0.5);
  });

  it("centerPosition() returns centered UDim2", () => {
    const p = centerPosition();
    expect(p).toBeInstanceOf(UDim2);
  });
});

describe("createFrame", () => {
  it("creates a Frame instance", () => {
    const frame = createFrame();
    expect(frame.ClassName).toBe("Frame");
    expect(frame.Name).toBe("Frame");
  });

  it("applies custom props", () => {
    const frame = createFrame({
      name: "MyFrame",
      backgroundTransparency: 0.5,
      borderSizePixel: 2,
    });
    expect(frame.Name).toBe("MyFrame");
    expect(frame.BackgroundTransparency).toBe(0.5);
    expect(frame.BorderSizePixel).toBe(2);
  });

  it("sets parent when provided", () => {
    const parent = createFrame({ name: "Parent" });
    const child = createFrame({ name: "Child", parent });
    expect(child.Parent).toBe(parent);
  });

  it("defaults to zero border", () => {
    const frame = createFrame();
    expect(frame.BorderSizePixel).toBe(0);
  });
});

describe("createLabel", () => {
  it("creates a TextLabel instance", () => {
    const label = createLabel({ text: "Hello" });
    expect(label.ClassName).toBe("TextLabel");
    expect(label.Text).toBe("Hello");
    expect(label.Name).toBe("Label");
  });

  it("applies custom props", () => {
    const label = createLabel({
      text: "Test",
      name: "MyLabel",
      textSize: 24,
      textWrapped: true,
      richText: true,
    });
    expect(label.Name).toBe("MyLabel");
    expect(label.TextSize).toBe(24);
    expect(label.TextWrapped).toBe(true);
    expect(label.RichText).toBe(true);
  });

  it("defaults to transparent background", () => {
    const label = createLabel({ text: "X" });
    expect(label.BackgroundTransparency).toBe(1);
  });
});

describe("createButton", () => {
  it("creates a TextButton instance", () => {
    const btn = createButton({ text: "Click" });
    expect(btn.ClassName).toBe("TextButton");
    expect(btn.Text).toBe("Click");
    expect(btn.Name).toBe("Button");
  });

  it("applies custom props", () => {
    const btn = createButton({
      text: "Go",
      name: "GoBtn",
      textSize: 18,
    });
    expect(btn.Name).toBe("GoBtn");
    expect(btn.TextSize).toBe(18);
  });

  it("enables auto button color", () => {
    const btn = createButton({ text: "X" });
    expect(btn.AutoButtonColor).toBe(true);
  });
});

describe("createImage", () => {
  it("creates an ImageLabel instance", () => {
    const img = createImage({ image: "rbxassetid://123" });
    expect(img.ClassName).toBe("ImageLabel");
    expect(img.Image).toBe("rbxassetid://123");
    expect(img.Name).toBe("Image");
  });

  it("defaults to transparent background", () => {
    const img = createImage({ image: "rbxassetid://123" });
    expect(img.BackgroundTransparency).toBe(1);
  });
});

describe("createScrollFrame", () => {
  it("creates a ScrollingFrame instance", () => {
    const scroll = createScrollFrame();
    expect(scroll.ClassName).toBe("ScrollingFrame");
    expect(scroll.Name).toBe("ScrollFrame");
  });

  it("applies custom props", () => {
    const scroll = createScrollFrame({
      name: "MyScroll",
      scrollBarThickness: 10,
    });
    expect(scroll.Name).toBe("MyScroll");
    expect(scroll.ScrollBarThickness).toBe(10);
  });

  it("defaults to zero border", () => {
    const scroll = createScrollFrame();
    expect(scroll.BorderSizePixel).toBe(0);
  });
});

// ============================================================================
// Modifiers
// ============================================================================

describe("addCorner", () => {
  it("adds a UICorner child to the parent", () => {
    const frame = createFrame();
    const corner = addCorner(frame, 12);
    expect(corner.ClassName).toBe("UICorner");
    expect(corner.Parent).toBe(frame);
  });

  it("defaults to radius 8", () => {
    const frame = createFrame();
    const corner = addCorner(frame);
    expect(corner.ClassName).toBe("UICorner");
  });
});

describe("addPadding", () => {
  it("adds a UIPadding child to the parent", () => {
    const frame = createFrame();
    const pad = addPadding(frame, { top: 10, bottom: 10, left: 5, right: 5 });
    expect(pad.ClassName).toBe("UIPadding");
    expect(pad.Parent).toBe(frame);
  });

  it("defaults missing padding values to 0", () => {
    const frame = createFrame();
    const pad = addPadding(frame, { top: 8 });
    expect(pad.ClassName).toBe("UIPadding");
  });
});

describe("addStroke", () => {
  it("adds a UIStroke child to the parent", () => {
    const frame = createFrame();
    const stroke = addStroke(frame, { thickness: 2 });
    expect(stroke.ClassName).toBe("UIStroke");
    expect(stroke.Thickness).toBe(2);
    expect(stroke.Parent).toBe(frame);
  });

  it("defaults thickness to 1", () => {
    const frame = createFrame();
    const stroke = addStroke(frame, {});
    expect(stroke.Thickness).toBe(1);
  });
});

describe("addListLayout", () => {
  it("adds a UIListLayout child to the parent", () => {
    const frame = createFrame();
    const layout = addListLayout(frame, { direction: "Vertical", padding: 8 });
    expect(layout.ClassName).toBe("UIListLayout");
    expect(layout.Parent).toBe(frame);
  });

  it("supports horizontal direction", () => {
    const frame = createFrame();
    const layout = addListLayout(frame, { direction: "Horizontal" });
    expect(layout.ClassName).toBe("UIListLayout");
  });

  it("supports alignment options", () => {
    const frame = createFrame();
    const layout = addListLayout(frame, {
      horizontalAlignment: "Center",
      verticalAlignment: "Bottom",
      sortOrder: "Name",
    });
    expect(layout.ClassName).toBe("UIListLayout");
  });
});

describe("addGridLayout", () => {
  it("adds a UIGridLayout child to the parent", () => {
    const frame = createFrame();
    const grid = addGridLayout(frame);
    expect(grid.ClassName).toBe("UIGridLayout");
    expect(grid.Parent).toBe(frame);
  });

  it("applies custom cell size and padding", () => {
    const frame = createFrame();
    const grid = addGridLayout(frame, {
      cellSize: { xOffset: 80, yOffset: 80 },
      cellPadding: { xOffset: 8, yOffset: 8 },
      fillDirection: "Vertical",
    });
    expect(grid.ClassName).toBe("UIGridLayout");
  });
});

describe("addSizeConstraint", () => {
  it("adds a UISizeConstraint child to the parent", () => {
    const frame = createFrame();
    const constraint = addSizeConstraint(frame, {
      minSize: new Vector2(50, 50),
    });
    expect(constraint.ClassName).toBe("UISizeConstraint");
    expect(constraint.Parent).toBe(frame);
  });
});

describe("addAspectRatio", () => {
  it("adds a UIAspectRatioConstraint child to the parent", () => {
    const frame = createFrame();
    const constraint = addAspectRatio(frame, 16 / 9);
    expect(constraint.ClassName).toBe("UIAspectRatioConstraint");
    expect(constraint.AspectRatio).toBeCloseTo(16 / 9);
    expect(constraint.Parent).toBe(frame);
  });
});
