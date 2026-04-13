import { test, expect } from "../fixtures/test-fixtures";

test.describe("API Contract", () => {
  test.describe("Response schema", () => {
    test("note object includes all required fields", async ({ api, uid }) => {
      const { body: created } = await api.createNote(`Schema check ${uid}`);

      const { body: notes } = await api.getNotes();
      const note = notes.find((n) => n.id === created.id);

      expect(note).toBeDefined();
      expect(note).toHaveProperty("id");
      expect(note).toHaveProperty("text");
      expect(note).toHaveProperty("createdAt");
      expect(note).toHaveProperty("updatedAt");
      expect(note).toHaveProperty("author");
      expect(note!.author).toHaveProperty("firstName");
      expect(note!.author).toHaveProperty("lastName");
      expect(note!.author).toHaveProperty("avatar");
      expect(note).toHaveProperty("replies");
      expect(Array.isArray(note!.replies)).toBe(true);
    });

    test("reply object includes updatedAt for schema consistency", async ({ api, uid }) => {
      test.fail(true, "Known bug A-07: Reply object missing updatedAt field");
      const { body: note } = await api.createNote(`Parent for reply schema ${uid}`);
      const { body: reply } = await api.createReply(note.id, `Schema reply ${uid}`);

      expect(reply).toHaveProperty("updatedAt");
    });
  });

  test.describe("HTTP status codes", () => {
    test("POST /notes returns 201 Created", async ({ api, uid }) => {
      test.fail(true, "Known bug A-01: POST /notes returns 200 instead of 201");
      const { status } = await api.createNote(`Status code test ${uid}`);

      expect(status).toBe(201);
    });

    test("POST /notes/{id}/reply returns 201 Created", async ({ api, uid }) => {
      test.fail(true, "Known bug A-02: POST reply returns 200 instead of 201");
      const { body: note } = await api.createNote(`Parent for 201 ${uid}`);
      const { status } = await api.createReply(note.id, `Reply 201 test ${uid}`);

      expect(status).toBe(201);
    });

    test("DELETE /notes/{id} returns 204 No Content", async ({ api, uid }) => {
      test.fail(true, "Known bug A-03: DELETE returns 200 instead of 204");
      const { body: created } = await api.createNote(`204 test ${uid}`);
      const { status } = await api.deleteNote(created.id);

      expect(status).toBe(204);
    });
  });

  test.describe("Timestamps", () => {
    test("updatedAt changes after editing a note", async ({ api, uid }) => {
      test.fail(true, "Known bug A-06: updatedAt not updated after edit");
      const { body: created } = await api.createNote(`Timestamp test ${uid}`);
      const { body: updated } = await api.editNote(created.id, `Timestamp edited ${uid}`);

      const createdTime = new Date(updated.createdAt).getTime();
      const updatedTime = new Date(updated.updatedAt).getTime();
      expect(updatedTime).toBeGreaterThan(createdTime);
    });
  });

  test.describe("Data ordering", () => {
    test("notes are returned in chronological order", async ({ api, uid }) => {
      const { body: note1 } = await api.createNote(`Order test 1 ${uid}`);
      const { body: note2 } = await api.createNote(`Order test 2 ${uid}`);

      const { body: notes } = await api.getNotes();

      const idx1 = notes.findIndex((n) => n.id === note1.id);
      const idx2 = notes.findIndex((n) => n.id === note2.id);

      expect(idx1).toBeLessThan(idx2);
    });
  });

  test.describe("Delete response integrity", () => {
    test("deleted note id is not null in response", async ({ api, uid }) => {
      test.fail(true, "Known bug A-08: Delete response returns null id");
      const { body: created } = await api.createNote(`Null id test ${uid}`);
      const { body: responseText } = await api.deleteNote(created.id);

      if (responseText) {
        let parsed;
        try {
          parsed = JSON.parse(responseText);
        } catch {
          return; // Non-JSON response (e.g. 204 No Content) — nothing to validate
        }
        if (parsed && parsed.id !== undefined) {
          expect(parsed.id).not.toBeNull();
        }
      }
    });
  });
});
