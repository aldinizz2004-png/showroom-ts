import { BRANDS, FUEL_TYPES, STATUSES, TRANSMISSIONS } from './types.js';
import type {
  Brand,
  FieldErrors,
  FuelType,
  ParseResult,
  SortOption,
  Transmission,
  Vehicle,
  VehicleDraft,
  VehicleFilters,
  VehicleInput,
  VehicleStatus,
  VehicleTotals,
} from './types.js';
import { assertNever, sortBy } from './utils.js';

export const STATUS_LABELS: Readonly<Record<VehicleStatus, string>> = {
  available: 'Available',
  reserved: 'Reserved',
  sold: 'Sold',
};

const isOneOf =
  <T extends string>(values: readonly T[]) =>
  (value: string): value is T =>
    (values as readonly string[]).includes(value);

export const isBrand = isOneOf<Brand>(BRANDS);
export const isStatus = isOneOf<VehicleStatus>(STATUSES);
export const isTransmission = isOneOf<Transmission>(TRANSMISSIONS);
export const isFuelType = isOneOf<FuelType>(FUEL_TYPES);

export const describeStatus = (status: VehicleStatus): string => {
  switch (status) {
    case 'available':
      return 'Ready for a test drive and sale.';
    case 'reserved':
      return 'A customer has reserved this vehicle.';
    case 'sold':
      return 'This vehicle has been sold.';
    default:
      return assertNever(status);
  }
};

export const nextStatuses = (status: VehicleStatus): VehicleStatus[] => STATUSES.filter((item) => item !== status);

const SORT_OPTIONS: Readonly<Record<string, SortOption>> = {
  'price-asc': { field: 'price', direction: 'asc' },
  'price-desc': { field: 'price', direction: 'desc' },
  'year-desc': { field: 'year', direction: 'desc' },
  'year-asc': { field: 'year', direction: 'asc' },
};

export const parseSort = (value: string): SortOption => SORT_OPTIONS[value] ?? { field: 'year', direction: 'desc' };

export const filterVehicles = (vehicles: readonly Vehicle[], filters: VehicleFilters): Vehicle[] => {
  const term = filters.search.trim().toLowerCase();
  const matches = vehicles.filter(({ brand, model, status, price }) => {
    if (term !== '' && !`${brand} ${model}`.toLowerCase().includes(term)) return false;
    if (filters.brand !== 'all' && brand !== filters.brand) return false;
    if (filters.status !== 'all' && status !== filters.status) return false;
    if (filters.minPrice !== null && price < filters.minPrice) return false;
    if (filters.maxPrice !== null && price > filters.maxPrice) return false;
    return true;
  });
  return sortBy(matches, filters.sort.field, filters.sort.direction);
};

export const computeTotals = (vehicles: readonly Vehicle[]): VehicleTotals => {
  const totals: VehicleTotals = { total: vehicles.length, available: 0, reserved: 0, sold: 0 };
  for (const { status } of vehicles) totals[status] += 1;
  return totals;
};

const parseNumber = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
};

export const parsePriceLimit = parseNumber;

export const parseDraft = (draft: VehicleDraft, now: Date = new Date()): ParseResult<VehicleInput> => {
  const errors: FieldErrors = {};
  const model = draft.model.trim();
  const color = draft.color.trim();
  const year = parseNumber(draft.year);
  const price = parseNumber(draft.price);
  const mileage = parseNumber(draft.mileage);
  const imageUrl = draft.imageUrl.trim();

  if (!isBrand(draft.brand)) errors.brand = 'Choose a brand.';
  if (model.length < 2) errors.model = 'Enter the model name.';
  if (year === null || !Number.isInteger(year) || year < 2000 || year > now.getFullYear() + 1) {
    errors.year = `Enter a year from 2000 to ${now.getFullYear() + 1}.`;
  }
  if (price === null || price <= 0) errors.price = 'Enter a price above 0.';
  if (color.length < 2) errors.color = 'Enter the color.';
  if (!isTransmission(draft.transmission)) errors.transmission = 'Choose a transmission.';
  if (!isFuelType(draft.fuelType)) errors.fuelType = 'Choose a fuel type.';
  if (!isStatus(draft.status)) errors.status = 'Choose a status.';
  if (mileage === null || !Number.isInteger(mileage) || mileage < 0) errors.mileage = 'Enter mileage, 0 or more.';
  if (imageUrl !== '' && !/^https?:\/\/\S+$/i.test(imageUrl)) errors.imageUrl = 'Enter a link starting with http or https.';

  if (
    Object.keys(errors).length > 0 ||
    !isBrand(draft.brand) ||
    !isTransmission(draft.transmission) ||
    !isFuelType(draft.fuelType) ||
    !isStatus(draft.status) ||
    year === null ||
    price === null ||
    mileage === null
  ) {
    return { ok: false, errors };
  }

  const description = draft.description.trim();
  return {
    ok: true,
    value: {
      brand: draft.brand,
      model,
      year,
      price,
      color,
      status: draft.status,
      specs: { transmission: draft.transmission, fuelType: draft.fuelType, mileage },
      imageUrl,
      description,
    },
  };
};
