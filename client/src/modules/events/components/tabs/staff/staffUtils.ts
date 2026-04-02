/**
 * Utility functions for mapping staff roles to categories.
 * Used by StaffCategorySection and AddStaffDialog.
 */

/**
 * Check if a staff member's role matches a staffing category.
 */
export function matchRoleToCategory(roleName: string, category: string): boolean {
  const baseCategory = category.replace(/_[A-Z_]+$/, '').toLowerCase();
  const roleNormalized = roleName.toLowerCase();

  const categoryMap: Record<string, string[]> = {
    waiter: ['waiter', 'head_waiter', 'cisnik', 'servírka'],
    chef: ['chef', 'head_chef', 'sous_chef', 'prep_cook', 'cook', 'kuchar'],
    coordinator: ['coordinator', 'koordinátor', 'koordinator'],
    bartender: ['bartender', 'barman', 'barmanka'],
    hostess: ['hostess', 'hosteska', 'host'],
    security: ['security', 'ochranka', 'bodyguard'],
    musician: ['musician', 'band', 'muzikant', 'hudebník', 'hudebnik', 'kapela'],
    dancer: ['dancer', 'dance_group', 'tanecník', 'tanecnik', 'soubor'],
    photographer: ['photographer', 'fotograf'],
    sound_tech: ['sound_tech', 'zvukar', 'technik'],
    cleaner: ['cleaner', 'uklízec', 'uklizec', 'úklid'],
    driver: ['driver', 'ridic'],
    manager: ['manager', 'manažer', 'manazer'],
  };

  const keywords = categoryMap[baseCategory] || [baseCategory];
  return keywords.some(keyword => roleNormalized.includes(keyword));
}

/**
 * Get the position enum values that correspond to a staffing category.
 */
export function getPositionsForCategory(category: string): string[] {
  const baseCategory = category.replace(/_[A-Z_]+$/, '').toLowerCase();

  const categoryToPositions: Record<string, string[]> = {
    waiter: ['WAITER', 'HEAD_WAITER'],
    chef: ['CHEF', 'HEAD_CHEF', 'SOUS_CHEF', 'PREP_COOK'],
    coordinator: ['COORDINATOR'],
    bartender: ['BARTENDER'],
    hostess: ['HOSTESS'],
    security: ['SECURITY'],
    musician: ['MUSICIAN'],
    dancer: ['DANCER'],
    photographer: ['PHOTOGRAPHER'],
    sound_tech: ['SOUND_TECH'],
    cleaner: ['CLEANER'],
    driver: ['DRIVER'],
    manager: ['MANAGER'],
  };

  return categoryToPositions[baseCategory] || [];
}
