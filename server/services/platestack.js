// PlateStack integration bridge
// Set PLATESTACK_DB_PATH environment variable to enable
export function isEnabled() {
  return !!process.env.PLATESTACK_DB_PATH;
}
