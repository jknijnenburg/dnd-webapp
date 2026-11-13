"use client";

import { useState } from "react";
import { Field } from "@/components/action-form";
import { Input } from "@/components/ui/input";

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Name + URL slug; the slug follows the name until it is edited by hand. */
export function NameSlugFields({ defaultName = "", defaultSlug = "" }: { defaultName?: string; defaultSlug?: string }) {
  const [slug, setSlug] = useState(defaultSlug);
  const [touched, setTouched] = useState(defaultSlug !== "");
  return (
    <>
      <Field name="name" label="Name">
        <Input
          id="name"
          name="name"
          defaultValue={defaultName}
          required
          maxLength={80}
          onChange={(e) => {
            if (!touched) setSlug(slugify(e.target.value));
          }}
        />
      </Field>
      <Field name="slug" label="URL-Slug" hint={`Adresse der Kampagne: /campaigns/${slug || "…"}`}>
        <Input
          id="slug"
          name="slug"
          value={slug}
          required
          maxLength={60}
          autoCapitalize="none"
          spellCheck={false}
          onChange={(e) => {
            setTouched(true);
            setSlug(e.target.value);
          }}
        />
      </Field>
    </>
  );
}
