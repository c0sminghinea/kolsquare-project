import { test, expect } from "../fixtures/test-fixtures";

test.describe("Notes CRUD", () => {
  test("lists all notes", async ({ api }) => {
    const { status, body } = await api.getNotes();

    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  test("creates a note with valid text", async ({ api, uid }) => {
    test.fail(true, "Known bug A-01: POST /notes returns 200 instead of 201");
    const text = `CRUD create ${uid}`;
    const { status, body } = await api.createNote(text);

    expect(status).toBe(201);
    expect(body).toHaveProperty("id");
    expect(body.text).toBe(text);
    expect(body).toHaveProperty("createdAt");
    expect(body).toHaveProperty("author");
  });

  test("edits a note and updates its content", async ({ api, uid }) => {
    const { body: created } = await api.createNote(`Before edit ${uid}`);

    const { body: updated } = await api.editNote(created.id, `After edit ${uid}`);

    expect(updated.text).toBe(`After edit ${uid}`);
  });

  test("deletes a note and removes it from the list", async ({ api, uid }) => {
    const text = `To be deleted ${uid}`;
    const { body: created } = await api.createNote(text);

    await api.deleteNote(created.id);

    const found = await api.findNoteByText(text);
    expect(found).toBeUndefined();
  });

  test("returns 404 when deleting a non-existent note", async ({ api }) => {
    const { status } = await api.deleteNote(999999);
    expect(status).toBe(404);
  });
});
