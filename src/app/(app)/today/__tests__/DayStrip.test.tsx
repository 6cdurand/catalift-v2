import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

import { DayStrip } from "../DayStrip";

const WEEK_DAYS = [
  "2026-07-27",
  "2026-07-28",
  "2026-07-29",
  "2026-07-30",
  "2026-07-31",
  "2026-08-01",
  "2026-08-02",
];

const onSelectDate = vi.fn();
const onShiftWeek = vi.fn();
const onStepDay = vi.fn();
const onOpenCalendar = vi.fn();

function renderStrip(overrides: Partial<React.ComponentProps<typeof DayStrip>> = {}) {
  return render(
    <DayStrip
      weekDays={WEEK_DAYS}
      selectedDate="2026-07-28"
      today="2026-07-28"
      datesWithSessions={new Set(["2026-07-28", "2026-07-30"])}
      sessionCountsByDate={{ "2026-07-28": 2, "2026-07-30": 1 }}
      onSelectDate={onSelectDate}
      onShiftWeek={onShiftWeek}
      onStepDay={onStepDay}
      onOpenCalendar={onOpenCalendar}
      {...overrides}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("DayStrip", () => {
  it("renders 7 day pills, Mon → Sun", () => {
    renderStrip();

    const pills = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-pressed") !== null);

    expect(pills).toHaveLength(7);
    expect(screen.getByText("MON")).toBeDefined();
    expect(screen.getByText("SUN")).toBeDefined();
    expect(screen.getByText("27")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
  });

  it("renders a dot only on days that have sessions", () => {
    renderStrip();

    expect(screen.getByTestId("day-dot-2026-07-28")).toBeDefined();
    expect(screen.getByTestId("day-dot-2026-07-30")).toBeDefined();
    expect(screen.queryByTestId("day-dot-2026-07-29")).toBeNull();
  });

  it("keeps a same-size invisible spacer when a day has no sessions", () => {
    const { container } = renderStrip();
    const spacers = container.querySelectorAll(".bg-transparent");
    expect(spacers.length).toBe(5);
  });

  it("marks the selected day with the sky-500 fill and aria-pressed", () => {
    renderStrip();

    const selected = screen.getByRole("button", {
      name: /Tuesday 28 July, 2 sessions/,
    });
    expect(selected.getAttribute("aria-pressed")).toBe("true");
    expect(selected.className).toContain("bg-sky-500");
    expect(selected.className).toContain("text-white");
  });

  it("gives today (when not selected) the translucent sky treatment", () => {
    renderStrip({ selectedDate: "2026-07-30" });

    const todayPill = screen.getByRole("button", {
      name: /Tuesday 28 July/,
    });
    expect(todayPill.getAttribute("aria-pressed")).toBe("false");
    expect(todayPill.className).toContain("bg-sky-500/20");
    expect(todayPill.className).toContain("text-sky-400");
  });

  it("labels days with no sessions accessibly", () => {
    renderStrip();
    expect(
      screen.getByRole("button", { name: "Wednesday 29 July, no sessions" }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Thursday 30 July, 1 session" }),
    ).toBeDefined();
  });

  it("selects a day when its pill is tapped", () => {
    renderStrip();

    fireEvent.click(screen.getByRole("button", { name: /Friday 31 July/ }));

    expect(onSelectDate).toHaveBeenCalledWith("2026-07-31");
  });

  it("shifts the week with the chevrons", () => {
    renderStrip();

    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));
    expect(onShiftWeek).toHaveBeenCalledWith(-1);

    fireEvent.click(screen.getByRole("button", { name: "Next week" }));
    expect(onShiftWeek).toHaveBeenCalledWith(1);
  });

  it("routes to the calendar from the calendar button", () => {
    renderStrip();

    fireEvent.click(screen.getByRole("button", { name: "Open calendar" }));
    expect(onOpenCalendar).toHaveBeenCalledTimes(1);
  });

  it("steps forward one day on a left swipe", () => {
    renderStrip();
    const strip = screen.getByTestId("day-strip");

    fireEvent.touchStart(strip, { touches: [{ clientX: 200 }] });
    fireEvent.touchEnd(strip, { changedTouches: [{ clientX: 100 }] });

    expect(onStepDay).toHaveBeenCalledWith(1);
  });

  it("steps back one day on a right swipe", () => {
    renderStrip();
    const strip = screen.getByTestId("day-strip");

    fireEvent.touchStart(strip, { touches: [{ clientX: 100 }] });
    fireEvent.touchEnd(strip, { changedTouches: [{ clientX: 220 }] });

    expect(onStepDay).toHaveBeenCalledWith(-1);
  });

  it("ignores a touch that travels less than the swipe threshold", () => {
    renderStrip();
    const strip = screen.getByTestId("day-strip");

    fireEvent.touchStart(strip, { touches: [{ clientX: 100 }] });
    fireEvent.touchEnd(strip, { changedTouches: [{ clientX: 115 }] });

    expect(onStepDay).not.toHaveBeenCalled();
  });

  it("honours a caller-supplied testId (the trainer surface keeps its own)", () => {
    renderStrip({ testId: "trainer-day-strip" });

    expect(screen.getByTestId("trainer-day-strip")).toBeDefined();
    expect(screen.queryByTestId("day-strip")).toBeNull();
  });
});
