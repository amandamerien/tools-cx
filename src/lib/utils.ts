import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Mescla classes do Tailwind resolvendo conflitos. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
