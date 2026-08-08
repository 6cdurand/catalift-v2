// P-06-L1 — header badges (inventory rows 5 + 6).
//
// v2 rendered a binary Active/Inactive badge, so an invited client (`pending`)
// and a dropped one (`archived`) both read as "Inactive". The live CHECK
// constraint permits four values; all four must be distinguishable.

import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ClientStatusBadges } from "../_components/ClientStatusBadges";
import { CLIENT_STATUSES } from "../_lib/client-status";

afterEach(() => cleanup());

describe("ClientStatusBadges", () => {
  it.each([
    ["active", "Active"],
    ["inactive", "Inactive"],
    ["pending", "Pending"],
    ["archived", "Archived"],
  ])("maps DB status %s to the label %s", (status, label) => {
    render(<ClientStatusBadges status={status} />);
    expect(screen.getByTestId("badge-client-status").textContent).toBe(label);
  });

  it("covers every status the CHECK constraint allows", () => {
    // If a migration widens the constraint, this fails until the label map grows.
    for (const status of CLIENT_STATUSES) {
      cleanup();
      render(<ClientStatusBadges status={status} />);
      expect(screen.getByTestId("badge-client-status").textContent).not.toBe(status);
    }
  });

  it("also renders the Pending Signup badge for a pending link", () => {
    render(<ClientStatusBadges status="pending" />);
    expect(screen.getByTestId("badge-pending-signup").textContent).toBe(
      "Pending Signup",
    );
  });

  it.each(["active", "inactive", "archived"])(
    "does not render Pending Signup for %s",
    (status) => {
      render(<ClientStatusBadges status={status} />);
      expect(screen.queryByTestId("badge-pending-signup")).toBeNull();
    },
  );

  it("renders an unknown status verbatim rather than lying about it", () => {
    render(<ClientStatusBadges status="paused" />);
    expect(screen.getByTestId("badge-client-status").textContent).toBe("paused");
  });

  it("never renders a clickable status control (row 6 is blocked, B16)", () => {
    // A trainer cannot re-activate a link — only the client can
    // (trainer_clients_guard_activate). A one-way toggle is a trap, so the badge
    // must stay read-only until the re-activation path is designed.
    const { container } = render(<ClientStatusBadges status="active" />);
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });
});
