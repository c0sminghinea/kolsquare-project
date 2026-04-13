import { test } from "../fixtures/test-fixtures";

test.describe("Reply Threading", () => {
  test("adds a reply and it appears in the thread", async ({ notesPage, api, uid }) => {
    const noteText = `Parent for reply ${uid}`;
    await api.createNote(noteText);

    await notesPage.goto();
    await notesPage.replyToNote(noteText, `Reply text ${uid}`);
  });

  test("threads with 3+ replies show a collapse indicator", async ({ notesPage, api, uid }) => {
    const noteText = `Thread collapse ${uid}`;
    const { body: note } = await api.createNote(noteText);
    await api.createReply(note.id, `Reply 1 ${uid}`);
    await api.createReply(note.id, `Reply 2 ${uid}`);
    await api.createReply(note.id, `Reply 3 ${uid}`);

    await notesPage.goto();
    await notesPage.expectShowMoreVisible(noteText);

    await notesPage.expandThread(noteText);

    await notesPage.expectNoteVisible(`Reply 1 ${uid}`);
    await notesPage.expectNoteVisible(`Reply 2 ${uid}`);
    await notesPage.expectNoteVisible(`Reply 3 ${uid}`);
  });
});
