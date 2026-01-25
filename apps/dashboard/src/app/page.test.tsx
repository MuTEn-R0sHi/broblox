/**
 * Unit tests for the dashboard app.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RootLayout from "./layout";

// Page is an async redirect-only component, tested via integration tests
// Here we just test the layout component

describe("RootLayout", () => {
  it("renders children correctly", () => {
    render(
      <RootLayout>
        <div data-testid="child">Test Child</div>
      </RootLayout>
    );

    const child = screen.getByTestId("child");
    expect(child).toBeDefined();
    expect(child.textContent).toBe("Test Child");
  });

  it("sets lang attribute to en", () => {
    render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );

    const html = document.querySelector("html");
    expect(html?.getAttribute("lang")).toBe("en");
  });
});
