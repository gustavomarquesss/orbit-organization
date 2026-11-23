export type ChecklistItemData = {
  id: string;
  text: string;
  done: boolean;
  done_on: string | null;
  sort_order: number;
};

// Um item conta como feito: checklist comum -> campo "done"; checklist diário -> marcado hoje.
// (Arquivo sem imports de servidor: também é usado em componentes de cliente.)
export function isItemDone(item: Pick<ChecklistItemData, "done" | "done_on">, repeatDaily: boolean, today: string) {
  return repeatDaily ? item.done_on === today : item.done;
}
