"use client";

import { assetConditions, assetStatuses, type AssetCondition, type AssetStatus } from "@labtrack/shared";
import { Plus } from "lucide-react";
import type { FormEvent } from "react";

import { formatLabel } from "@/lib/admin/format";
import type { AssetFormState, CategoryRow, FormErrors, LocationRow } from "@/lib/admin/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AssetForm({
  categories,
  errors,
  form,
  isSaving,
  locations,
  onChange,
  onSubmit,
  submitLabel = "Create asset"
}: {
  categories: CategoryRow[];
  errors: FormErrors;
  form: AssetFormState;
  isSaving: boolean;
  locations: LocationRow[];
  onChange: (form: AssetFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel?: string;
}) {
  return (
    <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="asset-name">Asset name</Label>
        <Input
          aria-invalid={Boolean(errors.name)}
          id="asset-name"
          name="name"
          onChange={(event) => onChange({ ...form, name: event.target.value })}
          value={form.name}
        />
        {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="asset-image">Asset image</Label>
        <Input
          accept="image/jpeg,image/png,image/webp"
          aria-invalid={Boolean(errors.imageFile)}
          id="asset-image"
          name="imageFile"
          onChange={() => onChange({ ...form })}
          type="file"
        />
        {errors.imageFile ? <p className="text-xs text-destructive">{errors.imageFile}</p> : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category">Category</Label>
        <input name="categoryId" type="hidden" value={form.categoryId} />
        <Select onValueChange={(value) => onChange({ ...form, categoryId: value })} value={form.categoryId || undefined}>
          <SelectTrigger aria-invalid={Boolean(errors.categoryId)} className="w-full" id="category">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.categoryId ? <p className="text-xs text-destructive">{errors.categoryId}</p> : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="location">Location</Label>
        <input name="locationId" type="hidden" value={form.locationId} />
        <Select onValueChange={(value) => onChange({ ...form, locationId: value })} value={form.locationId || undefined}>
          <SelectTrigger aria-invalid={Boolean(errors.locationId)} className="w-full" id="location">
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.locationId ? <p className="text-xs text-destructive">{errors.locationId}</p> : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="condition">Condition</Label>
        <input name="condition" type="hidden" value={form.condition} />
        <Select
          onValueChange={(value) => onChange({ ...form, condition: value as AssetCondition })}
          value={form.condition}
        >
          <SelectTrigger className="w-full" id="condition">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {assetConditions.map((condition) => (
              <SelectItem key={condition} value={condition}>
                {formatLabel(condition)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="status">Status</Label>
        <input name="status" type="hidden" value={form.status} />
        <Select onValueChange={(value) => onChange({ ...form, status: value as AssetStatus })} value={form.status}>
          <SelectTrigger className="w-full" id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {assetStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {formatLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          onChange={(event) => onChange({ ...form, notes: event.target.value })}
          rows={3}
          value={form.notes}
        />
      </div>
      <div className="-mx-6 -mb-6 flex justify-end border-t bg-muted/40 px-6 py-3 sm:col-span-2">
        <Button disabled={isSaving} type="submit">
          <Plus className="size-4" />
          {isSaving ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
