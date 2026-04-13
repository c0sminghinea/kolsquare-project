import { test, expect } from "../fixtures/test-fixtures";

test.describe("Input Validation", () => {
  test.describe("Note creation", () => {
    test("rejects empty text", async ({ api }) => {
      test.fail(true, "Known bug A-04: API accepts empty note text");
      const { status } = await api.postRaw("/notes", { text: "" });
      expect(status).toBe(422);
    });

    test("rejects whitespace-only text", async ({ api }) => {
      test.fail(true, "Known bug A-04: API accepts whitespace-only note text");
      const { status } = await api.postRaw("/notes", { text: "   " });
      expect(status).toBe(422);
    });

    test("rejects text exceeding 255 characters", async ({ api }) => {
      test.fail(true, "Known bug A-09: API returns 500 instead of 422 for overlength text");
      const { status } = await api.postRaw("/notes", { text: "a".repeat(256) });
      expect(status).not.toBe(500);
      expect(status).toBe(422);
    });

    test("accepts exactly 255 characters", async ({ api }) => {
      const maxText = "b".repeat(255);
      const { body } = await api.createNote(maxText);

      expect(body.text).toBe(maxText);
    });
  });

  test.describe("Note editing", () => {
    test("rejects empty text on edit", async ({ api, uid }) => {
      test.fail(true, "Known bug A-04: API accepts empty text on edit");
      const { body: note } = await api.createNote(`Will try empty edit ${uid}`);

      const { status } = await api.patchRaw(`/notes/${note.id}`, { text: "" });
      expect(status).toBe(422);
    });
  });

  test.describe("Reply creation", () => {
    test("rejects empty reply text", async ({ api, uid }) => {
      test.fail(true, "Known bug A-05: API accepts empty reply text");
      const { body: note } = await api.createNote(`Parent for validation ${uid}`);

      const { status } = await api.postRaw(`/notes/${note.id}/reply`, { text: "" });
      expect(status).toBe(422);
    });

    test("rejects whitespace-only reply text", async ({ api, uid }) => {
      test.fail(true, "Known bug A-05: API accepts whitespace-only reply text");
      const { body: note } = await api.createNote(`Parent for ws validation ${uid}`);

      const { status } = await api.postRaw(`/notes/${note.id}/reply`, { text: "   " });
      expect(status).toBe(422);
    });
  });
});
