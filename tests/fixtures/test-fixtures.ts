import { test as base } from "@playwright/test";
import { NotesApiClient } from "../helpers/api-client";
import { NotesPage } from "../ui/pages/notes.page";

type TestFixtures = {
  api: NotesApiClient;
  notesPage: NotesPage;
  uid: string;
};

export const test = base.extend<TestFixtures>({
  api: async ({ request }, use) => {
    const client = new NotesApiClient(request);
    await use(client);
    await client.cleanup();
  },

  notesPage: async ({ page }, use) => {
    const notesPage = new NotesPage(page);
    await use(notesPage);
  },

  uid: async ({}, use) => {
    const id = `t${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await use(id);
  },
});

export { expect } from "@playwright/test";
