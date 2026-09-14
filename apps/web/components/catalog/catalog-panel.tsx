"use client";

import { Check, FolderTree, MapPin, Pencil, Plus, Trash2, X, type LucideIcon } from "lucide-react";
import { useState, type FormEvent } from "react";

import { EmptyState } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { AssetView, CatalogKind, CategoryRow, LocationRow } from "@/lib/admin/types";

type CatalogItem = { id: string; name: string };

export function CatalogPanel({
  assets,
  categories,
  categoryName,
  disabled,
  locationName,
  locations,
  onCategoryNameChange,
  onCreateCategory,
  onCreateLocation,
  onDelete,
  onLocationNameChange,
  onRename
}: {
  assets: AssetView[];
  categories: CategoryRow[];
  categoryName: string;
  disabled: boolean;
  locationName: string;
  locations: LocationRow[];
  onCategoryNameChange: (value: string) => void;
  onCreateCategory: (event: FormEvent<HTMLFormElement>) => void;
  onCreateLocation: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: (kind: CatalogKind, id: string) => void;
  onLocationNameChange: (value: string) => void;
  onRename: (kind: CatalogKind, id: string, name: string) => Promise<boolean>;
}) {
  const [pendingDelete, setPendingDelete] = useState<{ kind: CatalogKind; item: CatalogItem } | null>(null);
  const usage = (kind: CatalogKind, id: string) =>
    assets.filter((asset) => (kind === "category" ? asset.categoryId : asset.locationId) === id).length;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <CatalogList
        description="Group equipment by type for filtering and reports."
        disabled={disabled}
        icon={FolderTree}
        inputId="category-name"
        items={categories}
        onChange={onCategoryNameChange}
        onDelete={(item) => setPendingDelete({ kind: "category", item })}
        onRename={(id, name) => onRename("category", id, name)}
        onSubmit={onCreateCategory}
        placeholder="e.g. Laptops, Projectors"
        title="Asset categories"
        usage={(id) => usage("category", id)}
        value={categoryName}
      />
      <CatalogList
        description="Rooms and labs where equipment lives or can be booked."
        disabled={disabled}
        icon={MapPin}
        inputId="location-name"
        items={locations}
        onChange={onLocationNameChange}
        onDelete={(item) => setPendingDelete({ kind: "location", item })}
        onRename={(id, name) => onRename("location", id, name)}
        onSubmit={onCreateLocation}
        placeholder="e.g. Computer Lab 2"
        title="Locations"
        usage={(id) => usage("location", id)}
        value={locationName}
      />

      <Dialog onOpenChange={(open) => !open && setPendingDelete(null)} open={Boolean(pendingDelete)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {pendingDelete?.kind}?</DialogTitle>
            <DialogDescription>
              “{pendingDelete?.item.name}” will be removed. Items still used by assets or borrowing records cannot be deleted — move those
              assets first.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setPendingDelete(null)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button
              disabled={disabled}
              onClick={() => {
                if (pendingDelete) {
                  onDelete(pendingDelete.kind, pendingDelete.item.id);
                  setPendingDelete(null);
                }
              }}
              type="button"
              variant="destructive"
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CatalogList({
  description,
  disabled,
  icon: Icon,
  inputId,
  items,
  onChange,
  onDelete,
  onRename,
  onSubmit,
  placeholder,
  title,
  usage,
  value
}: {
  description: string;
  disabled: boolean;
  icon: LucideIcon;
  inputId: string;
  items: CatalogItem[];
  onChange: (value: string) => void;
  onDelete: (item: CatalogItem) => void;
  onRename: (id: string, name: string) => Promise<boolean>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  placeholder: string;
  title: string;
  usage: (id: string) => number;
  value: string;
}) {
  const [editing, setEditing] = useState<CatalogItem | null>(null);

  async function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editing?.name.trim()) {
      return;
    }

    if (await onRename(editing.id, editing.name)) {
      setEditing(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <header className="flex items-start gap-3 border-b px-5 py-4">
        <span className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-4" />
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground tabular">{items.length}</span>
          </div>
          <p className="text-[13px] text-muted-foreground">{description}</p>
        </div>
      </header>

      <form className="flex gap-2 border-b bg-muted/30 px-5 py-3" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor={inputId}>
          {title} name
        </label>
        <Input className="bg-background" id={inputId} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
        <Button disabled={disabled || !value.trim()} type="submit">
          <Plus className="size-4" />
          Add
        </Button>
      </form>

      {items.length ? (
        <ul className="max-h-[480px] divide-y overflow-y-auto">
          {items.map((item) => (
            <li className="flex min-h-12 items-center gap-2 px-5 py-2 text-sm" key={item.id}>
              {editing?.id === item.id ? (
                <form className="flex flex-1 items-center gap-2" onSubmit={(event) => void handleRename(event)}>
                  <Input
                    aria-label={`Rename ${item.name}`}
                    autoFocus
                    className="h-8"
                    maxLength={120}
                    onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                    onKeyDown={(event) => event.key === "Escape" && setEditing(null)}
                    value={editing.name}
                  />
                  <Button aria-label="Save name" disabled={disabled || !editing.name.trim()} size="icon" type="submit" variant="ghost">
                    <Check className="size-4" />
                  </Button>
                  <Button aria-label="Cancel rename" onClick={() => setEditing(null)} size="icon" type="button" variant="ghost">
                    <X className="size-4" />
                  </Button>
                </form>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular">{usage(item.id)} assets</span>
                  <Button aria-label={`Rename ${item.name}`} disabled={disabled} onClick={() => setEditing(item)} size="icon" type="button" variant="ghost">
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    aria-label={`Delete ${item.name}`}
                    className="text-destructive hover:text-destructive"
                    disabled={disabled}
                    onClick={() => onDelete(item)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-5">
          <EmptyState icon={Icon} label={`No ${title.toLowerCase()} yet`} />
        </div>
      )}
    </section>
  );
}
