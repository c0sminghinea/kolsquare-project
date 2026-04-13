import { expect, Locator } from "@playwright/test";

export class NoteCard {
  private readonly editButton: Locator;
  private readonly deleteButton: Locator;
  private readonly replyButton: Locator;
  private readonly authorName: Locator;
  private readonly avatar: Locator;
  private readonly timestamp: Locator;
  private readonly lastEdited: Locator;

  constructor(private readonly root: Locator) {
    this.editButton = root.getByRole("button", { name: "Edit" });
    this.deleteButton = root.getByRole("button", { name: "Delete" });
    this.replyButton = root.getByRole("button", { name: "Reply" });
    this.authorName = root.locator("p.font-medium");
    this.avatar = root.locator("img.rounded-full");
    this.timestamp = root.locator("p.text-xs").first();
    this.lastEdited = root.getByText("Last Edited");
  }

  // ─── Actions ──────────────────────────────────────────

  async clickEdit(): Promise<void> {
    await this.root.hover();
    await this.editButton.click();
  }

  async clickDelete(): Promise<void> {
    await this.root.hover();
    await this.deleteButton.click();
  }

  async clickReply(): Promise<void> {
    await this.replyButton.click();
  }

  // ─── Data display assertions ──────────────────────────

  async expectAuthorName(fullName: string): Promise<void> {
    await expect(this.authorName).toHaveText(fullName);
  }

  async expectAvatarSrc(src: string): Promise<void> {
    await expect(this.avatar).toBeVisible();
    await expect(this.avatar).toHaveAttribute("src", src);
  }

  async expectTimestampVisible(): Promise<void> {
    await expect(this.timestamp).toBeVisible();
    await expect(this.timestamp).not.toHaveText("");
  }

  async expectLastEditedVisible(): Promise<void> {
    await expect(this.lastEdited).toBeVisible();
  }
}
