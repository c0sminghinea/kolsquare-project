import { test } from "../fixtures/test-fixtures";

test.describe("Modal Behavior", () => {
  test("textarea is empty when Create modal opens a second time", async ({ notesPage, api, uid }) => {
    test.fail(true, "Known bug F-02: textarea retains previous value on re-open");
    await notesPage.goto();

    const text = `Reset test ${uid}`;
    await notesPage.createNote(text);

    const note = await api.findNoteByText(text);
    if (note) api.trackForCleanup(note.id);

    await notesPage.openCreateModal();
    await notesPage.modal.expectTextareaEmpty();
    await notesPage.modal.cancel();
  });
});
