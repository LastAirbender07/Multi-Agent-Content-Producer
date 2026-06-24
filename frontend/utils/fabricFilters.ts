// Fabric image filter utilities — shared between RightPanel and ContextToolbar.
// All functions operate on an `obj` with a `.filters` array (FabricImage pattern).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

export function getFilterValue(obj: AnyObj, type: string, prop: string): number {
  if (!obj?.filters) return 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = (obj.filters as any[]).find((x: any) => x.type === type);
  return f ? Math.round((f[prop] ?? 0) * 100) : 0;
}

export function hasFilter(obj: AnyObj, type: string): boolean {
  return (obj?.filters ?? []).some((f: { type: string }) => f.type === type);
}

export function setFilter(
  canvas: AnyObj,
  obj: AnyObj,
  type: string,
  FilterClass: new (opts: Record<string, number>) => object,
  prop: string,
  rawVal: number,
  onChanged: () => void,
): void {
  if (!obj || !canvas) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filters: any[] = obj.filters ?? [];
  const idx = filters.findIndex((f: { type: string }) => f.type === type);
  const newFilter = new FilterClass({ [prop]: rawVal / 100 });
  if (idx >= 0) filters[idx] = newFilter; else filters.push(newFilter);
  obj.filters = filters;
  obj.applyFilters();
  canvas.renderAll();
  onChanged();
}

export function toggleFilter(
  canvas: AnyObj,
  obj: AnyObj,
  type: string,
  FilterClass: new () => object,
  onChanged: () => void,
): void {
  if (!obj || !canvas) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filters: any[] = obj.filters ?? [];
  if (hasFilter(obj, type)) {
    obj.filters = filters.filter((f: { type: string }) => f.type !== type);
  } else {
    obj.filters = [...filters, new FilterClass()];
  }
  obj.applyFilters();
  canvas.renderAll();
  onChanged();
}
