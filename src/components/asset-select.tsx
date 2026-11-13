"use client";

/* eslint-disable @next/next/no-img-element -- local static SVG placeholders, no optimisation needed */
import { useState } from "react";
import { NativeSelect } from "@/components/ui/input";
import { assetLabel } from "@/lib/assets";

interface AssetSelectProps {
  id: string;
  name: string;
  assets: readonly string[];
  defaultValue: string | null;
  /** Label of the empty option, e.g. "Standardbild". */
  emptyLabel: string;
  fallbackPreview: string;
  onValueChange?: (value: string) => void;
}

/** Picks an existing static asset (no uploads) and shows a small preview. */
export function AssetSelect({ id, name, assets, defaultValue, emptyLabel, fallbackPreview, onValueChange }: AssetSelectProps) {
  const [value, setValue] = useState(defaultValue ?? "");
  // Keep a stored path selectable even if the file is no longer in the catalog.
  const options = value && !assets.includes(value) ? [value, ...assets] : assets;
  return (
    <div className="flex items-center gap-3">
      <img
        src={value || fallbackPreview}
        alt=""
        className="size-12 shrink-0 rounded-md border border-border bg-surface-2 object-cover"
      />
      <NativeSelect
        id={id}
        name={name}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          onValueChange?.(event.target.value);
        }}
      >
        <option value="">{emptyLabel}</option>
        {options.map((path) => (
          <option key={path} value={path}>
            {assetLabel(path)}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
