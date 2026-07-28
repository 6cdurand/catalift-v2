import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

import { StartOnTodayDialog } from "../StartOnTodayDialog";

const onOpenChange = vi.fn();
const onCancel = vi.fn();
const onConfirm = vi.fn();

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof StartOnTodayDialog>> = {},
) {
  return render(
    <StartOnTodayDialog
      open
      sessionDate="2026-07-30"
      onOpenChange={onOpenChange}
      onCancel={onCancel}
      onConfirm={onConfirm}
      {...overrides}
    />,
  );
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe("StartOnTodayDialog", () => {
  it("renders v1's copy verbatim, minus the calendar_events re-date clause", () => {
    renderDialog();

    expect(screen.getByText("Start Workout Today?")).toBeDefined();
    expect(
      screen.getByText(
        "This session is scheduled for Thursday, Jul 30. Start the workout now?",
      ),
    ).toBeDefined();
    // v1 :2210 promised "The session date will be updated to today" — v2 has no
    // calendar_events row to re-date, so that clause must NOT be here.
    expect(screen.queryByText(/date will be updated/i)).toBeNull();
  });

  it("offers exactly Cancel and Start Now", () => {
    renderDialog();

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDefined();
    expect(screen.getByRole("button", { name: /Start Now/ })).toBeDefined();
  });

  it("reports cancel and confirm separately", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Start Now/ }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when closed", () => {
    renderDialog({ open: false });

    expect(screen.queryByText("Start Workout Today?")).toBeNull();
  });

  it("survives a null date without crashing", () => {
    renderDialog({ sessionDate: null });

    expect(screen.getByText(/Start the workout now\?/)).toBeDefined();
  });
});
