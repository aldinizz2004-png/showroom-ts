import { BRANDS, FUEL_TYPES, STATUSES, TRANSMISSIONS } from './types.js';
import type {
  FieldErrors,
  FieldName,
  MessageKind,
  Vehicle,
  VehicleDraft,
  VehicleStatus,
  VehicleTotals,
  ViewState,
} from './types.js';
import { STATUS_LABELS, describeStatus, nextStatuses } from './vehicles.js';
import { assertNever, escapeHtml, formatMileage, formatPrice } from './utils.js';

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
};

export const elements = {
  grid: byId<HTMLElement>('vehicleGrid'),
  count: byId<HTMLElement>('resultCount'),
  messages: byId<HTMLElement>('messages'),
  search: byId<HTMLInputElement>('searchInput'),
  brandFilter: byId<HTMLSelectElement>('brandFilter'),
  statusFilter: byId<HTMLSelectElement>('statusFilter'),
  minPrice: byId<HTMLInputElement>('minPrice'),
  maxPrice: byId<HTMLInputElement>('maxPrice'),
  sort: byId<HTMLSelectElement>('sortSelect'),
  resetFilters: byId<HTMLButtonElement>('resetFilters'),
  addVehicle: byId<HTMLButtonElement>('addVehicleButton'),
  form: byId<HTMLFormElement>('vehicleForm'),
  formDialog: byId<HTMLDialogElement>('formDialog'),
  formTitle: byId<HTMLElement>('formTitle'),
  submit: byId<HTMLButtonElement>('submitButton'),
  cancelForm: byId<HTMLButtonElement>('cancelForm'),
  detailsDialog: byId<HTMLDialogElement>('detailsDialog'),
  detailsBody: byId<HTMLElement>('detailsBody'),
  confirmDialog: byId<HTMLDialogElement>('confirmDialog'),
  confirmText: byId<HTMLElement>('confirmText'),
  confirmCancel: byId<HTMLButtonElement>('confirmCancel'),
  confirmDelete: byId<HTMLButtonElement>('confirmDelete'),
  statTotal: byId<HTMLElement>('statTotal'),
  statAvailable: byId<HTMLElement>('statAvailable'),
  statReserved: byId<HTMLElement>('statReserved'),
  statSold: byId<HTMLElement>('statSold'),
};

type FormField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const fieldNames: readonly FieldName[] = [
  'brand',
  'model',
  'year',
  'price',
  'color',
  'transmission',
  'fuelType',
  'status',
  'mileage',
  'imageUrl',
];

const fields: Record<keyof VehicleDraft, FormField> = {
  brand: byId<HTMLSelectElement>('brand'),
  model: byId<HTMLInputElement>('model'),
  year: byId<HTMLInputElement>('year'),
  price: byId<HTMLInputElement>('price'),
  color: byId<HTMLInputElement>('color'),
  transmission: byId<HTMLSelectElement>('transmission'),
  fuelType: byId<HTMLSelectElement>('fuelType'),
  status: byId<HTMLSelectElement>('status'),
  mileage: byId<HTMLInputElement>('mileage'),
  imageUrl: byId<HTMLInputElement>('imageUrl'),
  description: byId<HTMLTextAreaElement>('description'),
};

const options = (values: readonly string[], label: (value: string) => string = (v) => v): string =>
  values.map((value) => `<option value="${value}">${escapeHtml(label(value))}</option>`).join('');

const statusLabel = (value: string): string => STATUS_LABELS[value as VehicleStatus] ?? value;

export const populateSelects = (): void => {
  elements.brandFilter.innerHTML = `<option value="all">All brands</option>${options(BRANDS)}`;
  elements.statusFilter.innerHTML = `<option value="all">All statuses</option>${options(STATUSES, statusLabel)}`;
  fields.brand.innerHTML = `<option value="">Choose a brand</option>${options(BRANDS)}`;
  fields.transmission.innerHTML = `<option value="">Choose</option>${options(TRANSMISSIONS)}`;
  fields.fuelType.innerHTML = `<option value="">Choose</option>${options(FUEL_TYPES)}`;
  fields.status.innerHTML = options(STATUSES, statusLabel);
};

const COLOR_HEX: Readonly<Record<string, string>> = {
  white: '#e8ebf2',
  black: '#2a2f3a',
  grey: '#8b93a5',
  gray: '#8b93a5',
  silver: '#b9c0cf',
  blue: '#3b82f6',
  red: '#ef4444',
  green: '#22a06b',
  orange: '#f59e0b',
  yellow: '#facc15',
  brown: '#8a5a3c',
};

const carPicture = (color: string): string => {
  const fill = COLOR_HEX[color.trim().toLowerCase()] ?? '#7c5cff';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 170">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b2030"/><stop offset="1" stop-color="#0f121a"/></linearGradient></defs>` +
    `<rect width="320" height="170" fill="url(#g)"/>` +
    `<ellipse cx="160" cy="138" rx="120" ry="9" fill="#000" opacity=".35"/>` +
    `<path d="M40 118 L44 98 Q48 90 62 88 L104 82 L128 56 Q134 50 144 50 L204 50 Q214 50 222 58 L244 84 L268 90 Q280 93 282 104 L284 118 Z" fill="${fill}"/>` +
    `<path d="M132 60 L150 60 L150 82 L112 84 Z M158 60 L202 60 L222 82 L158 82 Z" fill="#0b0d12" opacity=".55"/>` +
    `<circle cx="96" cy="120" r="20" fill="#0b0d12"/><circle cx="96" cy="120" r="9" fill="#5b6275"/>` +
    `<circle cx="232" cy="120" r="20" fill="#0b0d12"/><circle cx="232" cy="120" r="9" fill="#5b6275"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const picture = (vehicle: Vehicle): string => {
  const url = vehicle.imageUrl;
  return url !== undefined && url !== '' ? url : carPicture(vehicle.color);
};

const eyeIcon =
  '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z"/><circle cx="10" cy="10" r="2.5"/></svg>';
const editIcon =
  '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M13.5 3.5l3 3L7 16H4v-3z"/><path d="M11.5 5.5l3 3"/></svg>';
const deleteIcon =
  '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12"/><path d="M8 6V4h4v2"/><path d="M5.5 6l.8 10h7.4l.8-10"/></svg>';

const statusPill = (status: VehicleStatus): string =>
  `<span class="status status-${status}">${STATUS_LABELS[status]}</span>`;

const cardHtml = (vehicle: Vehicle): string => {
  const { id, brand, model, year, price, color, status, specs } = vehicle;
  const name = escapeHtml(`${brand} ${model}`);
  return `
    <article class="vehicle-card" data-id="${id}">
      <div class="vehicle-media">
        <img src="${picture(vehicle)}" alt="${name}, ${escapeHtml(color)}" loading="lazy">
        ${statusPill(status)}
      </div>
      <div class="vehicle-body">
        <p class="vehicle-brand">${escapeHtml(brand)}</p>
        <h3 class="vehicle-name">${escapeHtml(model)}</h3>
        <p class="vehicle-meta">${year}  |  ${escapeHtml(color)}  |  ${formatMileage(specs.mileage)}</p>
        <div class="chips">
          <span class="chip">${specs.transmission}</span>
          <span class="chip">${specs.fuelType}</span>
        </div>
        <div class="vehicle-foot">
          <span class="vehicle-price">${formatPrice(price)}</span>
          <div class="card-actions">
            <button type="button" class="icon-btn" data-action="view" data-id="${id}" aria-label="View ${name}" title="View">${eyeIcon}</button>
            <button type="button" class="icon-btn" data-action="edit" data-id="${id}" aria-label="Edit ${name}" title="Edit">${editIcon}</button>
            <button type="button" class="icon-btn icon-btn-danger" data-action="delete" data-id="${id}" aria-label="Delete ${name}" title="Delete">${deleteIcon}</button>
          </div>
        </div>
      </div>
    </article>`;
};

const notice = (html: string): string => `<div class="grid-notice">${html}</div>`;

export const renderVehicles = (view: ViewState, visible: readonly Vehicle[]): void => {
  switch (view.kind) {
    case 'loading':
      elements.count.textContent = 'Loading...';
      elements.grid.innerHTML = notice(
        '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Loading vehicles...',
      );
      return;
    case 'error':
      elements.count.textContent = '';
      elements.grid.innerHTML = notice(
        `<span class="d-block mb-3 text-danger" role="alert">${escapeHtml(view.message)}</span>` +
          '<button type="button" class="btn-soft" data-action="retry">Try again</button>',
      );
      return;
    case 'ready':
      elements.count.textContent =
        visible.length === view.vehicles.length
          ? `${view.vehicles.length} vehicles`
          : `${visible.length} of ${view.vehicles.length} vehicles`;
      elements.grid.innerHTML =
        visible.length === 0
          ? notice(view.vehicles.length === 0 ? 'No vehicles yet. Add the first one.' : 'No vehicles match these filters.')
          : visible.map(cardHtml).join('');
      return;
    default:
      assertNever(view);
  }
};

export const renderTotals = (totals: VehicleTotals): void => {
  elements.statTotal.textContent = String(totals.total);
  elements.statAvailable.textContent = String(totals.available);
  elements.statReserved.textContent = String(totals.reserved);
  elements.statSold.textContent = String(totals.sold);
};

export const renderDetails = (vehicle: Vehicle): void => {
  const { id, brand, model, year, price, color, status, specs, description } = vehicle;
  const actions = nextStatuses(status)
    .map(
      (next) =>
        `<button type="button" class="btn-soft" data-action="set-status" data-id="${id}" data-status="${next}">Mark ${STATUS_LABELS[next].toLowerCase()}</button>`,
    )
    .join('');
  elements.detailsBody.innerHTML = `
    <div class="details-media"><img src="${picture(vehicle)}" alt="${escapeHtml(`${brand} ${model}`)}">${statusPill(status)}</div>
    <div class="details-content">
      <p class="vehicle-brand">${escapeHtml(brand)}</p>
      <h2 class="dialog-title mb-1">${escapeHtml(model)}</h2>
      <p class="details-price">${formatPrice(price)}</p>
      <p class="details-status">${escapeHtml(describeStatus(status))}</p>
      <dl class="details-list">
        <div><dt>Year</dt><dd>${year}</dd></div>
        <div><dt>Color</dt><dd>${escapeHtml(color)}</dd></div>
        <div><dt>Transmission</dt><dd>${specs.transmission}</dd></div>
        <div><dt>Fuel type</dt><dd>${specs.fuelType}</dd></div>
        <div><dt>Mileage</dt><dd>${formatMileage(specs.mileage)}</dd></div>
        ${description ? `<div><dt>Notes</dt><dd>${escapeHtml(description)}</dd></div>` : ''}
      </dl>
      <div class="status-actions">${actions}</div>
      <div class="dialog-actions">
        <button type="button" class="btn-soft" data-action="edit" data-id="${id}">Edit</button>
        <button type="button" class="btn btn-primary" data-action="close-details">Close</button>
      </div>
    </div>`;
};

let messageTimer: number | undefined;

export const showMessage = (text: string, kind: MessageKind = 'success'): void => {
  window.clearTimeout(messageTimer);
  const toast = document.createElement('div');
  toast.className = kind === 'danger' ? 'toast-msg toast-danger' : 'toast-msg';
  toast.setAttribute('role', kind === 'danger' ? 'alert' : 'status');
  toast.textContent = text;
  elements.messages.replaceChildren(toast);
  messageTimer = window.setTimeout(() => elements.messages.replaceChildren(), 4000);
};

export const readDraft = (): VehicleDraft => ({
  brand: fields.brand.value,
  model: fields.model.value,
  year: fields.year.value,
  price: fields.price.value,
  color: fields.color.value,
  transmission: fields.transmission.value,
  fuelType: fields.fuelType.value,
  status: fields.status.value,
  mileage: fields.mileage.value,
  imageUrl: fields.imageUrl.value,
  description: fields.description.value,
});

export const clearFieldErrors = (): void => {
  for (const name of fieldNames) {
    fields[name].classList.remove('is-invalid');
    fields[name].removeAttribute('aria-invalid');
    byId<HTMLElement>(`${name}Error`).textContent = '';
  }
};

export const showFieldErrors = (errors: FieldErrors): void => {
  clearFieldErrors();
  let firstInvalid: HTMLElement | null = null;
  for (const name of fieldNames) {
    const message = errors[name];
    if (!message) continue;
    fields[name].classList.add('is-invalid');
    fields[name].setAttribute('aria-invalid', 'true');
    byId<HTMLElement>(`${name}Error`).textContent = message;
    firstInvalid ??= fields[name];
  }
  firstInvalid?.focus();
};

export const openAddForm = (): void => {
  elements.form.reset();
  clearFieldErrors();
  fields.status.value = 'available';
  fields.mileage.value = '0';
  fields.year.value = String(new Date().getFullYear());
  elements.formTitle.textContent = 'Add vehicle';
  elements.submit.textContent = 'Add vehicle';
  elements.formDialog.showModal();
};

export const openEditForm = (vehicle: Vehicle): void => {
  clearFieldErrors();
  fields.brand.value = vehicle.brand;
  fields.model.value = vehicle.model;
  fields.year.value = String(vehicle.year);
  fields.price.value = String(vehicle.price);
  fields.color.value = vehicle.color;
  fields.transmission.value = vehicle.specs.transmission;
  fields.fuelType.value = vehicle.specs.fuelType;
  fields.status.value = vehicle.status;
  fields.mileage.value = String(vehicle.specs.mileage);
  fields.imageUrl.value = vehicle.imageUrl ?? '';
  fields.description.value = vehicle.description ?? '';
  elements.formTitle.textContent = `Edit ${vehicle.brand} ${vehicle.model}`;
  elements.submit.textContent = 'Save changes';
  elements.formDialog.showModal();
};

export const setSubmitting = (busy: boolean): void => {
  elements.submit.disabled = busy;
};
