import { vehicles as repository, updateStatus } from './api.js';
import { computeTotals, filterVehicles, isBrand, isStatus, parseDraft, parsePriceLimit, parseSort } from './vehicles.js';
import type { Vehicle, VehicleFilters, ViewState } from './types.js';
import * as ui from './ui.js';
import { findById } from './utils.js';

interface AppState {
  view: ViewState;
  filters: VehicleFilters;
  editingId: number | null;
  detailsId: number | null;
  deletingId: number | null;
}

const defaultFilters = (): VehicleFilters => ({
  search: '',
  brand: 'all',
  status: 'all',
  minPrice: null,
  maxPrice: null,
  sort: { field: 'year', direction: 'desc' },
});

const state: AppState = {
  view: { kind: 'loading' },
  filters: defaultFilters(),
  editingId: null,
  detailsId: null,
  deletingId: null,
};

const allVehicles = (): readonly Vehicle[] => (state.view.kind === 'ready' ? state.view.vehicles : []);

const render = (): void => {
  const visible = filterVehicles(allVehicles(), state.filters);
  ui.renderTotals(computeTotals(allVehicles()));
  ui.renderVehicles(state.view, visible);
};

const setVehicles = (vehicles: readonly Vehicle[]): void => {
  state.view = { kind: 'ready', vehicles };
};

const replaceVehicle = (updated: Vehicle): void => {
  setVehicles(allVehicles().map((item) => (item.id === updated.id ? updated : item)));
};

const refreshDetails = (): void => {
  if (state.detailsId === null) return;
  const vehicle = findById(allVehicles(), state.detailsId);
  if (vehicle) ui.renderDetails(vehicle);
  else ui.elements.detailsDialog.close();
};

async function loadVehicles(): Promise<void> {
  state.view = { kind: 'loading' };
  render();
  const result = await repository.list();
  state.view = result.ok ? { kind: 'ready', vehicles: result.data } : { kind: 'error', message: result.error };
  render();
}

async function handleSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const parsed = parseDraft(ui.readDraft());
  if (!parsed.ok) {
    ui.showFieldErrors(parsed.errors);
    return;
  }

  ui.clearFieldErrors();
  ui.setSubmitting(true);
  try {
    const editingId = state.editingId;
    const result =
      editingId === null ? await repository.create(parsed.value) : await repository.update(editingId, parsed.value);
    if (!result.ok) {
      ui.showMessage(result.error, 'danger');
      return;
    }
    const saved = result.data;
    if (editingId === null) setVehicles([...allVehicles(), saved]);
    else replaceVehicle(saved);
    ui.elements.formDialog.close();
    render();
    refreshDetails();
    ui.showMessage(`${saved.brand} ${saved.model} was ${editingId === null ? 'added' : 'updated'}.`);
  } finally {
    ui.setSubmitting(false);
  }
}

async function changeStatus(vehicle: Vehicle, status: Vehicle['status']): Promise<void> {
  const result = await updateStatus(vehicle.id, status);
  if (!result.ok) {
    ui.showMessage(result.error, 'danger');
    return;
  }
  replaceVehicle(result.data);
  render();
  refreshDetails();
  ui.showMessage(`${result.data.brand} ${result.data.model} is now ${status}.`);
}

async function confirmDelete(): Promise<void> {
  const vehicle = state.deletingId === null ? undefined : findById(allVehicles(), state.deletingId);
  ui.elements.confirmDialog.close();
  if (!vehicle) return;
  const result = await repository.remove(vehicle.id);
  if (!result.ok) {
    ui.showMessage(result.error, 'danger');
    return;
  }
  setVehicles(allVehicles().filter((item) => item.id !== vehicle.id));
  if (state.detailsId === vehicle.id) ui.elements.detailsDialog.close();
  render();
  ui.showMessage(`${vehicle.brand} ${vehicle.model} was deleted.`);
}

function handleClick(event: MouseEvent): void {
  if (!(event.target instanceof Element)) return;
  const trigger = event.target.closest<HTMLElement>('[data-action]');
  if (!trigger) return;
  const action = trigger.dataset['action'];

  if (action === 'retry') {
    void loadVehicles();
    return;
  }
  if (action === 'close-details') {
    ui.elements.detailsDialog.close();
    return;
  }

  const vehicle = findById(allVehicles(), Number(trigger.dataset['id']));
  if (!vehicle) return;

  switch (action) {
    case 'view':
      state.detailsId = vehicle.id;
      ui.renderDetails(vehicle);
      ui.elements.detailsDialog.showModal();
      break;
    case 'edit':
      ui.elements.detailsDialog.close();
      state.editingId = vehicle.id;
      ui.openEditForm(vehicle);
      break;
    case 'delete':
      state.deletingId = vehicle.id;
      ui.elements.confirmText.textContent = `Delete ${vehicle.brand} ${vehicle.model} (${vehicle.year}) from the inventory?`;
      ui.elements.confirmDialog.showModal();
      break;
    case 'set-status': {
      const next = trigger.dataset['status'];
      if (next !== undefined && isStatus(next)) void changeStatus(vehicle, next);
      break;
    }
  }
}

function syncFilterControls(): void {
  ui.elements.search.value = state.filters.search;
  ui.elements.brandFilter.value = state.filters.brand;
  ui.elements.statusFilter.value = state.filters.status;
  ui.elements.minPrice.value = state.filters.minPrice === null ? '' : String(state.filters.minPrice);
  ui.elements.maxPrice.value = state.filters.maxPrice === null ? '' : String(state.filters.maxPrice);
  ui.elements.sort.value = 'year-desc';
}

const updateFilters = (changes: Partial<VehicleFilters>): void => {
  state.filters = { ...state.filters, ...changes };
  render();
};

const bindFilters = (): void => {
  ui.elements.search.addEventListener('input', () => updateFilters({ search: ui.elements.search.value }));
  ui.elements.brandFilter.addEventListener('change', () => {
    const value = ui.elements.brandFilter.value;
    updateFilters({ brand: isBrand(value) ? value : 'all' });
  });
  ui.elements.statusFilter.addEventListener('change', () => {
    const value = ui.elements.statusFilter.value;
    updateFilters({ status: isStatus(value) ? value : 'all' });
  });
  ui.elements.minPrice.addEventListener('input', () => updateFilters({ minPrice: parsePriceLimit(ui.elements.minPrice.value) }));
  ui.elements.maxPrice.addEventListener('input', () => updateFilters({ maxPrice: parsePriceLimit(ui.elements.maxPrice.value) }));
  ui.elements.sort.addEventListener('change', () => updateFilters({ sort: parseSort(ui.elements.sort.value) }));
  ui.elements.resetFilters.addEventListener('click', () => {
    state.filters = defaultFilters();
    syncFilterControls();
    render();
  });
};

const init = (): void => {
  ui.populateSelects();
  bindFilters();
  document.addEventListener('click', handleClick);
  ui.elements.form.addEventListener('submit', (event) => void handleSubmit(event));
  ui.elements.cancelForm.addEventListener('click', () => ui.elements.formDialog.close());
  ui.elements.addVehicle.addEventListener('click', () => {
    state.editingId = null;
    ui.openAddForm();
  });
  ui.elements.confirmCancel.addEventListener('click', () => ui.elements.confirmDialog.close());
  ui.elements.confirmDelete.addEventListener('click', () => void confirmDelete());
  for (const dialog of [ui.elements.formDialog, ui.elements.detailsDialog, ui.elements.confirmDialog]) {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  }
  void loadVehicles();
};

init();
