"use client";

import { Building2, DoorOpen, MapPin } from "lucide-react";

import { EmptyState, StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import type { LocationRow } from "@/lib/admin/types";

export function RoomManagementPanel({
  disabled,
  locations,
  onUpdate
}: {
  disabled: boolean;
  locations: LocationRow[];
  onUpdate: (location: LocationRow, isRoom: boolean, isReservable: boolean) => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <header className="flex items-start gap-3 border-b px-5 py-4">
        <span className="mt-0.5 flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <DoorOpen className="size-4" />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">Room borrowing availability</h2>
          <p className="text-[13px] text-muted-foreground">A location can remain in the asset register without appearing as a borrowable room.</p>
        </div>
      </header>

      {locations.length ? (
        <ul className="divide-y">
          {locations.map((location) => {
            const isRoom = location.location_type === "room";
            return (
              <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center" key={location.id}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground">
                  {isRoom ? <Building2 className="size-4" /> : <MapPin className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{location.name}</p>
                  <p className="text-xs text-muted-foreground">{isRoom ? "Shown in the mobile room catalog" : "Asset location only"}</p>
                </div>
                <StatusBadge status={isRoom ? (location.is_reservable ? "available" : "unavailable") : "location_only"} />
                <div className="flex flex-wrap gap-2">
                  {isRoom ? (
                    <>
                      <Button disabled={disabled} onClick={() => onUpdate(location, true, !location.is_reservable)} size="sm" type="button" variant="outline">
                        Mark {location.is_reservable ? "unavailable" : "available"}
                      </Button>
                      <Button disabled={disabled} onClick={() => onUpdate(location, false, false)} size="sm" type="button" variant="ghost">
                        Location only
                      </Button>
                    </>
                  ) : (
                    <Button disabled={disabled} onClick={() => onUpdate(location, true, true)} size="sm" type="button">
                      Make borrowable room
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="p-5">
          <EmptyState description="Add locations in Catalog first." icon={DoorOpen} label="No locations yet" />
        </div>
      )}
    </section>
  );
}
