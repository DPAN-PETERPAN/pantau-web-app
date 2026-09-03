"use client";

import { useEffect, useState } from "react";
import type { CategoryDef } from "./types";

export function useCategories() {
  const [categories, setCategories] = useState<CategoryDef[]>([]);

  function reload() {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories ?? []));
  }

  useEffect(() => {
    reload();
  }, []);

  const byCode: Record<string, CategoryDef> = {};
  for (const c of categories) byCode[c.code] = c;

  return { categories, byCode, reload };
}
