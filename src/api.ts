import type { ApiResult, Entity, StatusUpdate, Vehicle, VehicleInput, VehicleStatus } from './types.js';

const BASE_URL = 'http://localhost:3000';
const TIMEOUT_MS = 8000;

const HTTP_MESSAGES: Record<number, string> = {
  400: 'The server rejected the submitted data.',
  404: 'This vehicle no longer exists.',
  500: 'Server error. Please try again later.',
};

export interface Repository<T extends Entity, TInput> {
  list(): Promise<ApiResult<T[]>>;
  get(id: number): Promise<ApiResult<T>>;
  create(input: TInput): Promise<ApiResult<T>>;
  update(id: number, input: TInput): Promise<ApiResult<T>>;
  patch(id: number, changes: Partial<TInput>): Promise<ApiResult<T>>;
  remove(id: number): Promise<ApiResult<null>>;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: HTTP_MESSAGES[response.status] ?? `Request failed with status ${response.status}.`,
      };
    }

    const data: unknown = await response.json();
    return { ok: true, data: data as T };
  } catch (error: unknown) {
    const timedOut = error instanceof DOMException && error.name === 'AbortError';
    return {
      ok: false,
      status: null,
      error: timedOut
        ? 'The server took too long to respond.'
        : 'Could not reach the API. Make sure JSON Server is running on port 3000.',
    };
  } finally {
    clearTimeout(timer);
  }
}

export function createRepository<T extends Entity, TInput>(resource: string): Repository<T, TInput> {
  const base = `/${resource}`;
  return {
    list: () => request<T[]>(base),
    get: (id) => request<T>(`${base}/${id}`),
    create: (input) => request<T>(base, { method: 'POST', body: JSON.stringify(input) }),
    update: (id, input) => request<T>(`${base}/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    patch: (id, changes) => request<T>(`${base}/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }),
    remove: async (id) => {
      const result = await request<unknown>(`${base}/${id}`, { method: 'DELETE' });
      return result.ok ? { ok: true, data: null } : result;
    },
  };
}

export const vehicles: Repository<Vehicle, VehicleInput> = createRepository('vehicles');

export const updateStatus = (id: number, status: VehicleStatus): Promise<ApiResult<Vehicle>> => {
  const changes: StatusUpdate = { status };
  return vehicles.patch(id, changes);
};
