const modules = import.meta.glob('./*.js', { eager: true, import: 'default' });
const templates = Object.fromEntries(
  Object.entries(modules)
    .filter(([path]) => path !== './index.js')
    .map(([, t]) => [t.id, t])
);
export default templates;
