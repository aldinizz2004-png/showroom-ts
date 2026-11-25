export const BRANDS = ['Chery', 'OMODA', 'JAECOO'] as const;
export const STATUSES = ['available', 'reserved', 'sold'] as const;
export const TRANSMISSIONS = ['Automatic', 'Manual', 'CVT', 'DCT'] as const;
export const FUEL_TYPES = ['Petrol', 'Hybrid', 'Electric', 'Diesel'] as const;

export type Brand = (typeof BRANDS)[number];
export type VehicleStatus = (typeof STATUSES)[number];
export type Transmission = (typeof TRANSMISSIONS)[number];
export type FuelType = (typeof FUEL_TYPES)[number];

export interface Entity {
  readonly id: number;
}

export interface VehicleSpecs {
  transmission: Transmission;
  fuelType: FuelType;
  mileage: number;
}

export interface Vehicle extends Entity {
  brand: Brand;
  model: string;
  year: number;
  price: number;
  color: string;
  status: VehicleStatus;
  specs: VehicleSpecs;
  imageUrl?: string;
  description?: string;
}

export type VehicleInput = Omit<Vehicle, 'id'>;
export type VehicleUpdate = Partial<VehicleInput>;
export type StatusUpdate = Pick<Vehicle, 'status'>;
export type VehicleListItem = Readonly<Pick<Vehicle, 'id' | 'brand' | 'model' | 'year' | 'price' | 'status'>>;

export type SortField = Extract<keyof Vehicle, 'price' | 'year'>;
export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  field: SortField;
  direction: SortDirection;
}

export interface VehicleFilters {
  search: string;
  brand: Brand | 'all';
  status: VehicleStatus | 'all';
  minPrice: number | null;
  maxPrice: number | null;
  sort: SortOption;
}

export type VehicleTotals = Record<VehicleStatus, number> & { total: number };

export type ApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: string; readonly status: number | null };

export type ViewState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'ready'; readonly vehicles: readonly Vehicle[] };

export interface VehicleDraft {
  brand: string;
  model: string;
  year: string;
  price: string;
  color: string;
  transmission: string;
  fuelType: string;
  status: string;
  mileage: string;
  imageUrl: string;
  description: string;
}

export type FieldName = Exclude<keyof VehicleDraft, 'description'>;
export type FieldErrors = Partial<Record<FieldName, string>>;

export type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: FieldErrors };

export type MessageKind = 'success' | 'danger';
export type Predicate<T> = (item: T) => boolean;
