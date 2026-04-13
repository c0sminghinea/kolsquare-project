import { test, expect } from "../fixtures/test-fixtures";

test.describe("Reply Threading", () => {
  test("creates a reply on an existing note", async ({ api, uid }) => {
    const { body: note } = await api.createNote(`Parent note ${uid}`);

    const { body: reply } = await api.createReply(note.id, `My reply ${uid}`);

    expect(reply.text).toBe(`My reply ${uid}`);
    expect(reply).toHaveProperty("author");
  });

  test("replies appear in the parent note's replies array", async ({ api, uid }) => {
    const { body: note } = await api.createNote(`Parent with replies ${uid}`);
    await api.createReply(note.id, `Reply 1 ${uid}`);
    await api.createReply(note.id, `Reply 2 ${uid}`);

    const { body: notes } = await api.getNotes();
    const found = notes.find((n) => n.id === note.id);

    expect(found!.replies).toHaveLength(2);
    expect(found!.replies[0].text).toBe(`Reply 1 ${uid}`);
    expect(found!.replies[1].text).toBe(`Reply 2 ${uid}`);
  });

  test("deleting a parent note cascade-deletes all replies", async ({ api, uid }) => {
    const { body: note } = await api.createNote(`Cascade parent ${uid}`);
    await api.createReply(note.id, `Reply A ${uid}`);
    await api.createReply(note.id, `Reply B ${uid}`);

    await api.deleteNote(note.id);

    const found = await api.findNoteByText(`Cascade parent ${uid}`);
    expect(found).toBeUndefined();
  });

  test("returns 404 when replying to a non-existent note", async ({ api }) => {
    const { status } = await api.postRaw("/notes/999999/reply", { text: "Orphan reply" });
    expect(status).toBe(404);
  });
});
