import type { Entity, SortDirection } from './types.js';

export const assertNever = (value: never): never => {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
};

export const findById = <T extends Entity>(items: readonly T[], id: number): T | undefined =>
  items.find((item) => item.id === id);

export const sortBy = <T, K extends keyof T>(items: readonly T[], key: K, direction: SortDirection): T[] =>
  [...items].sort((a, b) => {
    const left = a[key];
    const right = b[key];
    if (left === right) return 0;
    const result = left < right ? -1 : 1;
    return direction === 'asc' ? result : -result;
  });

export const countBy = <T, K extends PropertyKey>(
  items: readonly T[],
  getKey: (item: T) => K,
): Partial<Record<K, number>> =>
  items.reduce<Partial<Record<K, number>>>((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

export const formatPrice = (value: number): string => `$${value.toLocaleString('en-US')}`;

export const formatMileage = (value: number): string => (value === 0 ? 'New' : `${value.toLocaleString('en-US')} km`);

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[char] ?? char;
  });
