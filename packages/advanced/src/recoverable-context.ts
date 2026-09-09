import {
  ContextItem,
  ContextGraph,
  ContextArchive,
  ActiveContext,
  ArchivedContext,
  RecoveryResult,
  RecoveryError,
  TokenAmount,
  tokens,
} from './types';

export class RecoverableContextManager {
  private activeContexts: Map<string, ActiveContext> = new Map();
  private archivedContexts: Map<string, ArchivedContext> = new Map();
  private archives: Map<string, ContextArchive> = new Map();

  createActiveContext(requestId: string, items: ContextItem[], graph: ContextGraph, tokenBudget: TokenAmount): ActiveContext {
    const usedTokens = this.calculateTotalTokens(items);

    const active: ActiveContext = {
      requestId,
      items,
      graph,
      tokenBudget,
      usedTokens: tokens(usedTokens),
      lastUpdated: new Date().toISOString(),
    };

    this.activeContexts.set(requestId, active);
    return active;
  }

  getActiveContext(requestId: string): ActiveContext | undefined {
    return this.activeContexts.get(requestId);
  }

  updateActiveContext(requestId: string, updates: Partial<ActiveContext>): ActiveContext | undefined {
    const existing = this.activeContexts.get(requestId);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates, lastUpdated: new Date().toISOString() };
    this.activeContexts.set(requestId, updated);
    return updated;
  }

  archiveItems(requestId: string, archiveItems: ContextArchive[]): ArchivedContext {
    let archived = this.archivedContexts.get(requestId);
    if (!archived) {
      archived = {
        requestId,
        items: [],
        totalTokens: tokens(0),
        lastArchived: new Date().toISOString(),
      };
      this.archivedContexts.set(requestId, archived);
    }

    let newTokens = 0;
    for (const archive of archiveItems) {
      this.archives.set(archive.id, archive);
      archived.items.push(archive);
      newTokens += archive.item.tokens;
    }

    archived.totalTokens = tokens(archived.totalTokens + newTokens);
    archived.lastArchived = new Date().toISOString();

    const active = this.activeContexts.get(requestId);
    if (active) {
      active.usedTokens = tokens(Math.max(0, active.usedTokens - newTokens));
      active.items = active.items.filter(item => !archiveItems.some(a => a.item.id === item.id));
      active.lastUpdated = new Date().toISOString();
    }

    return archived;
  }

  getArchivedContext(requestId: string): ArchivedContext | undefined {
    return this.archivedContexts.get(requestId);
  }

  getArchive(archiveId: string): ContextArchive | undefined {
    return this.archives.get(archiveId);
  }

  getArchivesForRequest(requestId: string): ContextArchive[] {
    return Array.from(this.archives.values()).filter(a => a.requestId === requestId);
  }

  recoverContext(requestId: string, itemIds: string[]): RecoveryResult {
    const archived = this.archivedContexts.get(requestId);
    if (!archived) {
      return { success: false, items: [], errors: [{ itemId: 'unknown', error: 'No archived context for request', recoverable: false }], tokensRestored: tokens(0) };
    }

    const recovered: ContextItem[] = [];
    const errors: RecoveryError[] = [];
    let tokensRestored = 0;

    for (const itemId of itemIds) {
      const archive = archived.items.find(a => a.item.id === itemId);
      if (!archive) {
        errors.push({ itemId, error: 'Archive not found', recoverable: false });
        continue;
      }

      if (!archive.recoverable) {
        errors.push({ itemId, error: 'Item marked as non-recoverable', recoverable: false });
        continue;
      }

      try {
        const restoredItem = { ...archive.item };
        recovered.push(restoredItem);
        tokensRestored += restoredItem.tokens;
      } catch (error) {
        errors.push({ itemId, error: String(error), recoverable: false });
      }
    }

    if (recovered.length > 0) {
      const active = this.activeContexts.get(requestId);
      if (active) {
        active.items.push(...recovered);
        active.usedTokens = tokens(active.usedTokens + tokensRestored);
        active.lastUpdated = new Date().toISOString();

        for (const item of recovered) {
          active.graph.nodes.set(item.id, item);
        }
      }
    }

    return {
      success: recovered.length > 0,
      items: recovered,
      errors,
      tokensRestored: tokens(tokensRestored),
    };
  }

  recoverAllArchived(requestId: string): RecoveryResult {
    const archived = this.archivedContexts.get(requestId);
    if (!archived) {
      return { success: false, items: [], errors: [], tokensRestored: tokens(0) };
    }

    const allIds = archived.items.map(a => a.item.id);
    return this.recoverContext(requestId, allIds);
  }

  listRecoverableItems(requestId: string): ContextItem[] {
    const archived = this.archivedContexts.get(requestId);
    if (!archived) return [];

    return archived.items
      .filter(a => a.recoverable)
      .map(a => a.item);
  }

  getContextSummary(requestId: string): {
    active: { itemCount: number; totalTokens: number };
    archived: { itemCount: number; totalTokens: number };
    recoverable: { itemCount: number; totalTokens: number };
  } | null {
    const active = this.activeContexts.get(requestId);
    const archived = this.archivedContexts.get(requestId);

    if (!active && !archived) return null;

    const recoverableItems = this.listRecoverableItems(requestId);
    const recoverableTokens = recoverableItems.reduce((sum, item) => sum + item.tokens, 0);

    return {
      active: {
        itemCount: active?.items.length || 0,
        totalTokens: active?.usedTokens || 0,
      },
      archived: {
        itemCount: archived?.items.length || 0,
        totalTokens: archived?.totalTokens || 0,
      },
      recoverable: {
        itemCount: recoverableItems.length,
        totalTokens: tokens(recoverableTokens),
      },
    };
  }

  private calculateTotalTokens(items: ContextItem[]): number {
    return items.reduce((sum, item) => sum + item.tokens, 0);
  }

  clearRequest(requestId: string): void {
    this.activeContexts.delete(requestId);
    this.archivedContexts.delete(requestId);
    for (const [id, archive] of this.archives) {
      if (archive.requestId === requestId) {
        this.archives.delete(id);
      }
    }
  }

  getAllActiveContexts(): ActiveContext[] {
    return Array.from(this.activeContexts.values());
  }

  getAllArchivedContexts(): ArchivedContext[] {
    return Array.from(this.archivedContexts.values());
  }
}

export const recoverableContext = new RecoverableContextManager();