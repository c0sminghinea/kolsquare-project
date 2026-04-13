import { Locator, Page, expect } from "@playwright/test";
import { NoteModal } from "../components/note-modal.component";
import { NoteCard } from "../components/note-card.component";

export class NotesPage {
  readonly modal: NoteModal;
  private readonly createButton: Locator;

  constructor(private readonly page: Page) {
    this.modal = new NoteModal(page);
    this.createButton = page.getByRole("button", { name: "Create a new Note" });
  }

  // ─── Navigation ───────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto("/");
    await this.page.waitForLoadState("networkidle");
  }

  // ─── Note lookup ──────────────────────────────────────

  async getNoteCard(noteText: string): Promise<NoteCard> {
    const card = this.noteLocator(noteText);
    await expect(card).toBeVisible();
    return new NoteCard(card);
  }

  // ─── Create Note ──────────────────────────────────────

  async openCreateModal(): Promise<void> {
    await this.createButton.click();
    await this.modal.expectOpen();
  }

  async createNote(text: string): Promise<void> {
    await this.openCreateModal();
    await this.modal.fill(text);
    await this.modal.submitCreate();
    await this.modal.expectClosed();
    await this.expectNoteVisible(text);
  }

  // ─── Edit Note ────────────────────────────────────────

  async editNote(currentText: string, newText: string): Promise<void> {
    const card = await this.getNoteCard(currentText);
    await card.clickEdit();
    await this.modal.expectOpen();
    await this.modal.clearAndFill(newText);
    await this.modal.submitSave();
    await this.modal.expectClosed();
    await this.expectNoteVisible(newText);
  }

  // ─── Delete Note ──────────────────────────────────────

  async deleteNote(noteText: string): Promise<void> {
    const card = await this.getNoteCard(noteText);
    await card.clickDelete();
    await this.modal.expectOpen();
    await this.modal.submitDelete();
    await this.modal.expectClosed();
    await expect(this.noteLocator(noteText)).not.toBeVisible();
  }

  // ─── Reply ────────────────────────────────────────────

  async replyToNote(noteText: string, replyText: string): Promise<void> {
    const card = await this.getNoteCard(noteText);
    await card.clickReply();
    await this.modal.expectOpen();
    await this.modal.fill(replyText);
    await this.modal.submitReply();
    await this.modal.expectClosed();
    await this.expectNoteVisible(replyText);
  }

  // ─── Thread interactions ──────────────────────────────

  async expandThread(noteText: string): Promise<void> {
    const card = this.noteLocator(noteText);
    const showMore = card.getByRole("button", { name: /Show \d+ more replies/i });
    await expect(showMore).toBeVisible();
    await showMore.click();
  }

  async expectShowMoreVisible(noteText: string): Promise<void> {
    const card = this.noteLocator(noteText);
    const showMore = card.getByRole("button", { name: /Show \d+ more replies/i });
    await expect(showMore).toBeVisible();
  }

  // ─── Content assertions ───────────────────────────────

  async expectNoteVisible(text: string): Promise<void> {
    await expect(this.page.getByText(text, { exact: false })).toBeVisible();
  }

  // ─── Private ──────────────────────────────────────────

  private noteLocator(noteText: string) {
    return this.page.locator("div.note").filter({ hasText: noteText }).first();
  }
}
