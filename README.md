# Palestinian Automotive Showroom (TypeScript)

Frontend dashboard for a showroom selling Chery, OMODA and JAECOO vehicles. Built with TypeScript in strict mode, HTML, CSS and Bootstrap 5. No framework. Data comes from a JSON Server REST API.

## Run it

```bash
npm install
npm run build
npm run api
npm run web
```

Open `http://localhost:5500`. The API runs on `http://localhost:3000`.

## Features

- Totals for all, available, reserved and sold vehicles
- Vehicle cards with image, brand, model, year, price, color, transmission, fuel type and status
- Add, edit, delete and view details, with validation
- Change status from the details dialog (PATCH)
- Search by brand or model, filter by brand, status and price range, sort by price or year
- Loading state, readable API errors and a Try again button

When a vehicle has no image link, a car picture in the vehicle color is generated.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/vehicles` | List vehicles |
| GET | `/vehicles/:id` | One vehicle |
| POST | `/vehicles` | Create |
| PUT | `/vehicles/:id` | Replace |
| PATCH | `/vehicles/:id` | Update status |
| DELETE | `/vehicles/:id` | Delete |

## TypeScript concepts used

| Concept | Where |
| --- | --- |
| Interfaces, optional and readonly properties | `Vehicle`, `VehicleSpecs`, `Entity` (`readonly id`, `imageUrl?`) |
| Nested structures | `Vehicle.specs` |
| Type aliases, union and literal types | `Brand`, `VehicleStatus`, `Transmission`, `FuelType` derived from `as const` arrays |
| Explicit parameter and return types | every function in `src/` |
| Callbacks | `countBy(items, getKey)`, `Predicate<T>` |
| Type narrowing and type guards | `isBrand`, `isStatus`, `isTransmission`, `isFuelType` |
| Discriminated unions | `ViewState` (loading, error, ready), `ApiResult<T>`, `ParseResult<T>` |
| Generics | `request<T>`, `createRepository<T, TInput>`, `findById<T extends Entity>`, `sortBy<T, K extends keyof T>`, `byId<T>` |
| Utility types | `Omit` (`VehicleInput`), `Partial` (`VehicleUpdate`, `FieldErrors`), `Pick` (`StatusUpdate`), `Record` (`STATUS_LABELS`), `Readonly` (`VehicleListItem`), `Extract`, `Exclude` |
| keyof | `SortField = Extract<keyof Vehicle, 'price' \| 'year'>`, `sortBy` |
| Exhaustive checking with never | `assertNever` in `describeStatus` and `renderVehicles` |
| Typed API service | `Repository<Vehicle, VehicleInput>` |
| Type-safe DOM | `byId<T extends HTMLElement>`, typed form fields |

## Structure

```
src/types.ts      types and interfaces
src/utils.ts      generic helpers
src/vehicles.ts   filtering, sorting, totals, validation
src/api.ts        typed REST client
src/ui.ts         DOM rendering
src/main.ts       state and events
```
