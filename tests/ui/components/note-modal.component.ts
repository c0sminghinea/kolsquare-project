import { Locator, Page, expect } from "@playwright/test";

export class NoteModal {
  private readonly dialog: Locator;
  private readonly textarea: Locator;
  private readonly createButton: Locator;
  private readonly saveButton: Locator;
  private readonly replyButton: Locator;
  private readonly deleteButton: Locator;
  private readonly cancelButton: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.locator('div[role="dialog"]');
    this.textarea = this.dialog.locator("textarea");
    this.createButton = this.dialog.getByRole("button", { name: "Create Note" });
    this.saveButton = this.dialog.getByRole("button", { name: "Save Note" });
    this.replyButton = this.dialog.getByRole("button", { name: "Create Reply" });
    this.deleteButton = this.dialog.getByRole("button", { name: "Delete Note" });
    this.cancelButton = this.dialog.getByRole("button", { name: "Cancel" });
  }

  // ─── Visibility ─────────────────────────────────────

  async expectOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible();
  }

  async expectClosed(): Promise<void> {
    await expect(this.dialog).not.toBeVisible();
  }

  // ─── Text input ─────────────────────────────────────

  async fill(text: string): Promise<void> {
    await this.textarea.fill(text);
  }

  async clearAndFill(text: string): Promise<void> {
    await this.textarea.clear();
    await this.textarea.fill(text);
  }

  async expectTextareaEmpty(): Promise<void> {
    await expect(this.textarea).toHaveValue("");
  }

  // ─── Actions ────────────────────────────────────────

  async submitCreate(): Promise<void> {
    await this.createButton.click();
  }

  async submitSave(): Promise<void> {
    await this.saveButton.click();
  }

  async submitReply(): Promise<void> {
    await this.replyButton.click();
  }

  async submitDelete(): Promise<void> {
    await this.deleteButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }
}
