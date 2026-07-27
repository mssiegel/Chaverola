import type { Catalog } from "../../types";

/** The chat pieces both roles render — composer, header, banners, transcript. Registered from `i18n/ns/chat.ts`, so it rides that page's chunk. */
export const chat = {} as const satisfies Catalog;

export type ChatCatalog = typeof chat;
