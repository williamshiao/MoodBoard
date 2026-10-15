import { create } from "zustand";

export const useToast = create<{ message: string | null }>()(() => ({ message: null }));

let timer: ReturnType<typeof setTimeout> | undefined;

export function toast(message: string) {
  useToast.setState({ message });
  clearTimeout(timer);
  timer = setTimeout(() => useToast.setState({ message: null }), 2600);
}
