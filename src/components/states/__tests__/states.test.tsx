import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Dumbbell } from "lucide-react";
import { EmptyState } from "../EmptyState";
import { ErrorState } from "../ErrorState";
import { LoadingState, CardSkeleton, ListSkeleton } from "../LoadingState";

afterEach(cleanup);

describe("EmptyState", () => {
  it("renders title, description, icon and action", () => {
    render(
      <EmptyState
        icon={<Dumbbell />}
        title="No workouts yet"
        description="Start your first workout"
        action={<button>Start</button>}
      />,
    );
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByText("No workouts yet")).toBeTruthy();
    expect(screen.getByText("Start your first workout")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start" })).toBeTruthy();
  });

  it("renders coming-soon variant with roadmap badge", () => {
    render(
      <EmptyState
        icon={<Dumbbell />}
        title="Coming soon"
        variant="coming-soon"
      />,
    );
    expect(screen.getByText("Coming soon")).toBeTruthy();
    expect(screen.getByText("On the roadmap")).toBeTruthy();
  });
});

describe("ErrorState", () => {
  it("renders as an alert with default title", () => {
    render(<ErrorState />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Something went wrong")).toBeTruthy();
  });

  it("wires the retry button to onRetry", () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders no retry button without onRetry", () => {
    render(<ErrorState />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("LoadingState", () => {
  it("announces politely with a screen-reader label", () => {
    render(<LoadingState label="Loading workouts" />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(screen.getByText("Loading workouts")).toBeTruthy();
  });
});

describe("Skeletons", () => {
  it("ListSkeleton renders the requested number of rows", () => {
    const { container } = render(<ListSkeleton rows={5} />);
    const list = container.querySelector('[data-slot="list-skeleton"]');
    expect(list?.children.length).toBe(5);
  });

  it("CardSkeleton renders", () => {
    const { container } = render(<CardSkeleton />);
    expect(container.querySelector('[data-slot="card-skeleton"]')).toBeTruthy();
  });
});
