"use client";

import { useTranslation } from "@/components/providers/translation-provider";
import type { Nutrition } from "@/types/product";

interface NutritionTableProps {
  nutrition: Nutrition;
}

interface NutritionRow {
  key: keyof Nutrition;
  label: string;
  unit: string;
}

function formatValue(value: number | null, unit: string, locale: string, fallback: string): string {
  if (value === null) return fallback;

  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(value);

  return `${formatted} ${unit}`;
}

export function NutritionTable({ nutrition }: NutritionTableProps) {
  const { dictionary, locale } = useTranslation();

  const rows: NutritionRow[] = [
    { key: "energyKcal", label: dictionary.nutrition.energy, unit: "kcal" },
    { key: "fat", label: dictionary.nutrition.fat, unit: "g" },
    { key: "saturatedFat", label: dictionary.nutrition.saturatedFat, unit: "g" },
    { key: "carbohydrates", label: dictionary.nutrition.carbohydrates, unit: "g" },
    { key: "sugars", label: dictionary.nutrition.sugars, unit: "g" },
    { key: "fiber", label: dictionary.nutrition.fiber, unit: "g" },
    { key: "protein", label: dictionary.nutrition.protein, unit: "g" },
    { key: "salt", label: dictionary.nutrition.salt, unit: "g" },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="pb-3 text-left text-xs text-muted-foreground">
          {dictionary.nutrition.per100g}
        </caption>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-border last:border-b-0">
              <th scope="row" className="py-2 pr-4 text-left font-normal text-muted-foreground">
                {row.label}
              </th>
              <td className="py-2 text-right font-medium tabular-nums">
                {formatValue(
                  nutrition[row.key],
                  row.unit,
                  locale,
                  dictionary.nutrition.notProvided
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
