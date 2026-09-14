"use client";

import { bookingStatuses, getBookingWorkflowActions } from "@labtrack/shared";
import { CalendarClock, ClipboardList, DoorOpen, Laptop } from "lucide-react";
import { useState } from "react";

import { EmptyState, Initials, StatusBadge } from "@/components/admin/ui";
import { FilterTabs, countStatuses } from "@/components/admin/filter-tabs";
import { Button } from "@/components/ui/button";
import { formatBookingResource, formatShortDate } from "@/lib/admin/format";
import type { AssetView, BookingRow, LocationRow, ProfileRow } from "@/lib/admin/types";

export function BookingAdminPanel({
  assets,
  bookings,
  disabled,
  locations,
  onApprove,
  onCancel,
  onCheckout,
  onReject,
  onReturn,
  profiles
}: {
  assets: AssetView[];
  bookings: BookingRow[];
  disabled: boolean;
  locations: LocationRow[];
  onApprove: (booking: BookingRow) => void;
  onCancel: (booking: BookingRow) => void;
  onCheckout: (booking: BookingRow) => void;
  onReject: (booking: BookingRow) => void;
  onReturn: (booking: BookingRow) => void;
  profiles: ProfileRow[];
}) {
  const [filter, setFilter] = useState("all");
  const visible = filter === "all" ? bookings : bookings.filter((booking) => booking.status === filter);

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <header className="border-b px-4 pt-3">
        <FilterTabs counts={countStatuses(bookings.map((booking) => booking.status), bookingStatuses)} onChange={setFilter} total={bookings.length} value={filter} />
      </header>

      {visible.length ? (
        <ul className="divide-y">
          {visible.map((booking) => {
            const borrower = profiles.find((profile) => profile.id === booking.instructor_id);
            const actions = getBookingWorkflowActions(booking.status);
            const ResourceIcon = booking.resource_type === "room" ? DoorOpen : Laptop;

            return (
              <li className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/40 lg:flex-row lg:items-center" key={booking.id}>
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground">
                    <ResourceIcon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{formatBookingResource(booking, assets, locations)}</p>
                      <StatusBadge status={booking.status} />
                    </div>
                    <p className="line-clamp-1 text-sm text-muted-foreground">{booking.purpose}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Initials className="size-5 text-[9px]" name={borrower?.full_name} />
                        {borrower?.full_name ?? "Unknown borrower"}
                      </span>
                      <span className="flex items-center gap-1.5 font-mono tabular">
                        <CalendarClock className="size-3.5" />
                        {formatShortDate(booking.requested_start_at)} → {formatShortDate(booking.requested_end_at)}
                      </span>
                    </div>
                    {booking.decision_notes ? (
                      <p className="border-l-2 pl-2 text-xs text-muted-foreground italic">{booking.decision_notes}</p>
                    ) : null}
                  </div>
                </div>

                {actions.length ? (
                  <div className="flex flex-wrap gap-2 pl-12 lg:justify-end lg:pl-0">
                    {actions.includes("reject") ? (
                      <Button disabled={disabled} onClick={() => onReject(booking)} size="sm" type="button" variant="ghost">
                        Reject
                      </Button>
                    ) : null}
                    {actions.includes("cancel") ? (
                      <Button disabled={disabled} onClick={() => onCancel(booking)} size="sm" type="button" variant="ghost">
                        Cancel
                      </Button>
                    ) : null}
                    {actions.includes("approve") ? (
                      <Button disabled={disabled} onClick={() => onApprove(booking)} size="sm" type="button">
                        Approve
                      </Button>
                    ) : null}
                    {actions.includes("checkout") ? (
                      <Button disabled={disabled} onClick={() => onCheckout(booking)} size="sm" type="button">
                        Check out
                      </Button>
                    ) : null}
                    {actions.includes("return") ? (
                      <Button disabled={disabled} onClick={() => onReturn(booking)} size="sm" type="button" variant="outline">
                        Mark returned
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="p-4">
          <EmptyState
            description={filter === "all" ? "Requests from the mobile app will appear here." : "No requests match this status."}
            icon={ClipboardList}
            label="No borrowing requests"
          />
        </div>
      )}
    </section>
  );
}
