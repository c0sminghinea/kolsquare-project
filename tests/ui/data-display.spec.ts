import { test } from "../fixtures/test-fixtures";

test.describe("Data Display", () => {
  test("note displays author name and avatar", async ({ notesPage, api, uid }) => {
    const text = `Author check ${uid}`;
    const { body: note } = await api.createNote(text);

    await notesPage.goto();
    const card = await notesPage.getNoteCard(text);

    const authorName = `${note.author.firstName} ${note.author.lastName}`;
    await card.expectAuthorName(authorName);
    await card.expectAvatarSrc(note.author.avatar);
  });

  test("note displays createdAt timestamp", async ({ notesPage, api, uid }) => {
    const text = `Timestamp check ${uid}`;
    await api.createNote(text);

    await notesPage.goto();
    const card = await notesPage.getNoteCard(text);

    await card.expectTimestampVisible();
  });

  test("edited note shows Last Edited label", async ({ notesPage, api, uid }) => {
    test.fail(true, "Known bug A-06: backend does not update updatedAt on edit, so Last Edited never appears");
    const original = `Display orig ${uid}`;
    const edited = `Display edited ${uid}`;
    const { body: note } = await api.createNote(original);
    await api.editNote(note.id, edited);

    await notesPage.goto();
    const card = await notesPage.getNoteCard(edited);

    await card.expectLastEditedVisible();
  });
});
