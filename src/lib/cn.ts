type ClassValue = string | false | null | undefined | 0;

/** Joins truthy class names. Deliberately tiny — no merging semantics. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
