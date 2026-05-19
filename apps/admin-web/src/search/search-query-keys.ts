export const searchKeys = {
  modulePrefix: (moduleName: string) =>
    ['search', 'module', moduleName] as const,
  globalPrefix: () => ['search', 'global'] as const,
  dropdownPrefix: (moduleName: string) =>
    ['search', 'dropdown', moduleName] as const,
  autocompletePrefix: (moduleName: string) =>
    ['search', 'autocomplete', moduleName] as const,
  module: (moduleName: string, params: Record<string, unknown>) =>
    ['search', 'module', moduleName, params] as const,
  global: (query: string) => ['search', 'global', query.trim().toLowerCase()] as const,
  dropdown: (moduleName: string, query: string) =>
    ['search', 'dropdown', moduleName, query.trim().toLowerCase()] as const,
  autocomplete: (moduleName: string, query: string) =>
    ['search', 'autocomplete', moduleName, query.trim().toLowerCase()] as const,
};
