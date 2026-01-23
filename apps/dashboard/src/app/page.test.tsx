/**
 * Unit tests for the dashboard app.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "./page";
import RootLayout from "./layout";

describe("Page", () => {
  it("renders the dashboard heading", () => {
    render(<Page />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeDefined();
    expect(heading.textContent).toBe("rbx-game-platform dashboard");
  });

  it("renders the scaffold message", () => {
    render(<Page />);

    const message = screen.getByText(/RBAC \+ audit log foundations/i);
    expect(message).toBeDefined();
  });

  it("uses main element for content", () => {
    render(<Page />);

    const main = document.querySelector("main");
    expect(main).toBeDefined();
  });
});

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
