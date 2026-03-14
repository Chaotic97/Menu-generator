/**
 * Deep-merges a base template config with a partial overrides object.
 * Each top-level group (colors, fonts, sizes, spacing, typography, layout)
 * is shallow-merged independently so partial overrides work correctly.
 */
export default function mergeTemplate(base, overrides) {
  if (!overrides || typeof overrides !== 'object') return base;

  const result = { ...base };

  const groups = ['colors', 'fonts', 'sizes', 'spacing', 'typography', 'layout'];
  for (const group of groups) {
    if (overrides[group] && typeof overrides[group] === 'object' && base[group]) {
      result[group] = { ...base[group], ...overrides[group] };
    }
  }

  return result;
}
