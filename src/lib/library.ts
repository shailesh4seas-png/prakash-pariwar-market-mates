import { useSyncExternalStore } from "react";

type State = { saved: string[]; downloads: { id: string; at: string }[] };
let state: State = { saved: ["t1", "t11", "t5"], downloads: [{ id: "t3", at: "Oct 18" }, { id: "t2", at: "Oct 15" }] };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export const library = {
  toggleSave(id: string) {
    state = { ...state, saved: state.saved.includes(id) ? state.saved.filter((x) => x !== id) : [id, ...state.saved] };
    emit();
  },
  addDownload(id: string) {
    state = { ...state, downloads: [{ id, at: "Just now" }, ...state.downloads.filter((d) => d.id !== id)] };
    emit();
  },
};

export function useLibrary() {
  return useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => state,
    () => state,
  );
}
