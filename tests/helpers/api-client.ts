import { APIRequestContext } from "@playwright/test";
import { Note, Reply } from "./types";

export class NotesApiClient {
  private readonly trackedNoteIds: number[] = [];

  constructor(private readonly request: APIRequestContext) {}

  // ─── Tracking ─────────────────────────────────────────

  trackForCleanup(id: number): void {
    this.trackedNoteIds.push(id);
  }

  /** Delete all tracked notes. Called automatically by fixture teardown. */
  async cleanup(): Promise<void> {
    for (const id of this.trackedNoteIds.reverse()) {
      try {
        await this.request.delete(`/api/notes/${id}`);
      } catch {
      }
    }
    this.trackedNoteIds.length = 0;
  }

  async getNotes(): Promise<{ status: number; body: Note[] }> {
    const res = await this.request.get("/api/notes");
    return { status: res.status(), body: await res.json() };
  }

  async createNote(text: string): Promise<{ status: number; body: Note }> {
    const res = await this.request.post("/api/notes", {
      data: { text },
    });
    const body = await res.json();
    if (body?.id) this.trackForCleanup(body.id);
    return { status: res.status(), body };
  }

  async editNote(id: number, text: string): Promise<{ status: number; body: Note }> {
    const res = await this.request.patch(`/api/notes/${id}`, {
      data: { text },
    });
    return { status: res.status(), body: await res.json() };
  }

  async deleteNote(id: number): Promise<{ status: number; body: string }> {
    const res = await this.request.delete(`/api/notes/${id}`);
    return { status: res.status(), body: await res.text() };
  }

  async createReply(noteId: number, text: string): Promise<{ status: number; body: Reply }> {
    const res = await this.request.post(`/api/notes/${noteId}/reply`, {
      data: { text },
    });
    return { status: res.status(), body: await res.json() };
  }

  async postRaw(endpoint: string, data: unknown): Promise<{ status: number }> {
    const res = await this.request.post(`/api${endpoint}`, { data });
    // Track any note accidentally created (e.g. validation bugs accepting invalid input)
    if (res.ok()) {
      try {
        const body = await res.json();
        if (body?.id) this.trackForCleanup(body.id);
      } catch {
      }
    }
    return { status: res.status() };
  }

  async patchRaw(endpoint: string, data: unknown): Promise<{ status: number }> {
    const res = await this.request.patch(`/api${endpoint}`, { data });
    return { status: res.status() };
  }
  // ─── Utilities ────────────────────────────────────────

  async findNoteByText(text: string): Promise<Note | undefined> {
    const { body: notes } = await this.getNotes();
    return notes.find((n) => n.text === text);
  }
}
