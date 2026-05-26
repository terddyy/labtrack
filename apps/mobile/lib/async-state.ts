export type AsyncState<T> =
  | { status: "idle" | "loading"; data: T | null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: T | null; error: string };

export function idleState<T>(data: T | null = null): AsyncState<T> {
  return { status: "idle", data, error: null };
}

export function loadingState<T>(data: T | null = null): AsyncState<T> {
  return { status: "loading", data, error: null };
}

export function successState<T>(data: T): AsyncState<T> {
  return { status: "success", data, error: null };
}

export function errorState<T>(error: string, data: T | null = null): AsyncState<T> {
  return { status: "error", data, error };
}
