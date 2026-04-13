import { test } from "../fixtures/test-fixtures";

test.describe("Note Lifecycle", () => {
  test("creates a note via the modal and it appears in the feed", async ({ notesPage, api, uid }) => {
    await notesPage.goto();
    const text = `Lifecycle create ${uid}`;
    await notesPage.createNote(text);

    const note = await api.findNoteByText(text);
    if (note) api.trackForCleanup(note.id);
  });

  test("edits a note and sees the updated content", async ({ notesPage, api, uid }) => {
    const before = `Before edit ${uid}`;
    const after = `After edit ${uid}`;
    await api.createNote(before);

    await notesPage.goto();
    await notesPage.editNote(before, after);
  });

  test("deletes a note via the confirmation dialog", async ({ notesPage, api, uid }) => {
    const text = `Delete via UI ${uid}`;
    await api.createNote(text);

    await notesPage.goto();
    await notesPage.deleteNote(text);
  });
});
