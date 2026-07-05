import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Ensure each test starts with a clean DOM — without this, components
// rendered in one test can leak into the next test's assertions.
afterEach(() => {
  cleanup();
});
