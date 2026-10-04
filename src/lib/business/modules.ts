/**
 * Which app surfaces each optional business module gates.
 *
 * A business type declares the modules it enables (see BUSINESS_TYPE_DEFAULTS).
 * Until now those modules only appeared as marketing copy on the setup and register
 * screens — nothing read them, so choosing "Kuliner & FnB" changed nothing. This map
 * is what makes the declaration real.
 *
 * Modules without an entry here are declared by a business type but have no surface
 * yet (recipe, appointment); they change nothing until that UI exists.
 */
const MODULE_ROUTE_PREFIXES: Record<string, string[]> = {
  inventory: ['/warehouse'],
};

/** The route prefixes a module owns, for sidebar grouping and redirects. */
export function routesForModule(moduleKey: string): string[] {
  return MODULE_ROUTE_PREFIXES[moduleKey] ?? [];
}

/**
 * Whether a module is available for the given enabled-module list.
 *
 * Treats "modules not known yet" (profile still loading) as enabled, so a slow
 * query can never hide a surface the user legitimately has.
 */
export function hasModule(enabledModules: string[] | undefined, moduleKey: string): boolean {
  if (!enabledModules) return true;
  return enabledModules.includes(moduleKey);
}

/** Whether the route is reachable with the given enabled modules. */
export function isRouteEnabled(pathname: string, enabledModules: string[] | undefined): boolean {
  if (!enabledModules) return true;

  for (const [moduleKey, prefixes] of Object.entries(MODULE_ROUTE_PREFIXES)) {
    const owned = prefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
    if (owned && !enabledModules.includes(moduleKey)) return false;
  }

  return true;
}
