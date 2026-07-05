/**
 * Shared validation helpers.
 *
 * `UUID_REGEX` is defined once at module scope (rather than recreated as a
 * new RegExp literal inside each component) so it has a stable identity —
 * this lets effects that reference it skip an unnecessary
 * `react-hooks/exhaustive-deps` dependency, since a module-level constant
 * can never change between renders.
 */
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string | undefined | null): boolean {
  return !!value && UUID_REGEX.test(value);
}
