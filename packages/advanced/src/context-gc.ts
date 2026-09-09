import {
  ContextGraph,
  ContextItem,
  GCandidate,
  GCReason,
  GCConfig,
  ContextEdge,
  tokens,
  TokenAmount,
} from './types';

const DEFAULT_GC_CONFIG: GCConfig = {
  stalenessThresholdMs: 24 * 60 * 60 * 1000,
  duplicateThreshold: 0.95,
  supersessionEnabled: true,
  tokenBudgetThreshold: 0.8,
  minArchivePriority: 0.3,
  maxCandidatesPerRun: 50,
};

export class ContextGarbageCollector {
  private config: GCConfig;
  private archive: Map<string, ContextArchive> = new Map();

  constructor(config: Partial<GCConfig> = {}) {
    this.config = { ...DEFAULT_GC_CONFIG, ...config };
  }

  identifyCandidates(graph: ContextGraph, activeItemIds: Set<string>): GCandidate[] {
    const candidates: GCandidate[] = [];
    const now = Date.now();

    for (const [itemId, item] of graph.nodes) {
      if (activeItemIds.has(itemId)) continue;

      const reason = this.identifyRemovalReason(item, graph, now);
      if (!reason) continue;

      const dependents = this.findDependents(graph, itemId);
      const dependencies = this.findDependencies(graph, itemId);
      const safeToRemove = this.canSafelyRemove(item, dependents, graph);

      const confidence = this.calculateConfidence(item, reason, dependents, safeToRemove);
      const estimatedTokensSaved = tokens(item.tokens);
      const archivePriority = this.calculateArchivePriority(item, reason, confidence);

      if (archivePriority < this.config.minArchivePriority && safeToRemove) {
        continue;
      }

      candidates.push({
        itemId,
        reason,
        confidence,
        estimatedTokensSaved,
        dependencies,
        dependents,
        safeToRemove,
        archivePriority,
      });
    }

    candidates.sort((a, b) => b.archivePriority - a.archivePriority);
    return candidates.slice(0, this.config.maxCandidatesPerRun);
  }

  private identifyRemovalReason(item: ContextItem, graph: ContextGraph, now: number): GCReason | null {
    if (this.isStale(item, now)) return 'stale';
    if (this.isDuplicate(item, graph)) return 'duplicate';
    if (this.isSuperseded(item, graph)) return 'superseded';
    if (this.isUnreferencedToolOutput(item)) return 'unreferenced_tool_output';
    if (this.isObsoleteConversationState(item)) return 'obsolete_conversation_state';
    if (this.isRedundantRetrieval(item, graph)) return 'redundant_retrieval';
    if (item.priority < 0.2) return 'low_priority';
    return null;
  }

  private isStale(item: ContextItem, now: number): boolean {
    const itemAge = now - new Date(item.provenance.timestamp).getTime();
    return itemAge > this.config.stalenessThresholdMs && item.type !== 'system' && item.type !== 'constraint';
  }

  private isDuplicate(item: ContextItem, graph: ContextGraph): boolean {
    for (const [otherId, other] of graph.nodes) {
      if (otherId === item.id) continue;
      if (other.type !== item.type) continue;

      const similarity = this.calculateSimilarity(item.content, other.content);
      if (similarity >= this.config.duplicateThreshold) {
        if (other.priority >= item.priority) return true;
      }
    }
    return false;
  }

  private isSuperseded(item: ContextItem, graph: ContextGraph): boolean {
    if (!this.config.supersessionEnabled) return false;

    for (const edge of graph.edges) {
      if (edge.to === item.id && edge.type === 'supersedes') {
        const supersedingNode = graph.nodes.get(edge.from);
        if (supersedingNode && supersedingNode.priority >= item.priority) {
          return true;
        }
      }
    }
    return false;
  }

  private isUnreferencedToolOutput(item: ContextItem): boolean {
    return item.type === 'tool' && !item.referenced && item.age > 3;
  }

  private isObsoleteConversationState(item: ContextItem): boolean {
    return item.type === 'assistant' && item.age > 10 && !item.referenced;
  }

  private isRedundantRetrieval(item: ContextItem, graph: ContextGraph): boolean {
    if (item.type !== 'retrieval') return false;

    for (const [otherId, other] of graph.nodes) {
      if (otherId === item.id) continue;
      if (other.type !== 'retrieval') continue;

      const similarity = this.calculateSimilarity(item.content, other.content);
      if (similarity >= 0.9 && other.priority >= item.priority) {
        return true;
      }
    }
    return false;
  }

  private calculateSimilarity(content1: string, content2: string): number {
    if (content1 === content2) return 1.0;

    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  private findDependents(graph: ContextGraph, itemId: string): string[] {
    const deps: string[] = [];
    for (const edge of graph.edges) {
      if (edge.to === itemId && (edge.type === 'depends_on' || edge.type === 'references')) {
        deps.push(edge.from);
      }
    }
    return deps;
  }

  private findDependencies(graph: ContextGraph, itemId: string): string[] {
    const deps: string[] = [];
    for (const edge of graph.edges) {
      if (edge.from === itemId && (edge.type === 'depends_on' || edge.type === 'references')) {
        deps.push(edge.to);
      }
    }
    return deps;
  }

  private canSafelyRemove(item: ContextItem, dependents: string[], graph: ContextGraph): boolean {
    if (item.type === 'system' || item.type === 'constraint' || item.type === 'error') {
      return false;
    }
    if (item.referenced) return false;
    if (item.priority >= 0.9) return false;

    for (const depId of dependents) {
      const depNode = graph.nodes.get(depId);
      if (depNode && (depNode.type === 'system' || depNode.type === 'constraint' || depNode.referenced)) {
        return false;
      }
      for (const invariant of depNode?.invariants || []) {
        if (invariant.severity === 'critical' || invariant.severity === 'high') {
          return false;
        }
      }
    }

    for (const invariant of item.invariants) {
      if (invariant.type === 'referential_integrity' && invariant.severity === 'critical') {
        return false;
      }
      if (invariant.type === 'security_boundary') {
        return false;
      }
    }

    return true;
  }

  private calculateConfidence(
    item: ContextItem,
    reason: GCReason,
    dependents: string[],
    safeToRemove: boolean
  ): number {
    let confidence = 0.5;

    switch (reason) {
      case 'duplicate': confidence = 0.9; break;
      case 'superseded': confidence = 0.85; break;
      case 'stale': confidence = 0.7; break;
      case 'unreferenced_tool_output': confidence = 0.8; break;
      case 'obsolete_conversation_state': confidence = 0.75; break;
      case 'redundant_retrieval': confidence = 0.75; break;
      case 'low_priority': confidence = 0.6; break;
      case 'token_budget_exceeded': confidence = 0.5; break;
    }

    if (!safeToRemove) confidence *= 0.3;
    if (dependents.length > 0) confidence *= 0.7;
    if (item.priority > 0.7) confidence *= 0.5;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private calculateArchivePriority(item: ContextItem, reason: GCReason, confidence: number): number {
    let priority = confidence * 0.5;

    switch (item.type) {
      case 'document': priority += 0.3; break;
      case 'retrieval': priority += 0.25; break;
      case 'tool': priority += 0.2; break;
      case 'user': priority += 0.15; break;
      case 'constraint': priority += 0.1; break;
    }

    if (item.referenced) priority += 0.2;
    if (item.priority > 0.5) priority += 0.15;

    switch (reason) {
      case 'duplicate': priority += 0.1; break;
      case 'superseded': priority += 0.15; break;
      case 'stale': priority += 0.05; break;
    }

    return Math.max(0, Math.min(1, priority));
  }

  archiveCandidate(graph: ContextGraph, candidate: GCandidate): ContextArchive | null {
    const item = graph.nodes.get(candidate.itemId);
    if (!item) return null;

    const relevantEdges = graph.edges.filter(
      e => e.from === candidate.itemId || e.to === candidate.itemId
    );

    const archive: ContextArchive = {
      id: `archive_${crypto.randomUUID()}`,
      requestId: item.requestId,
      item: { ...item },
      archivedAt: new Date().toISOString(),
      reason: candidate.reason,
      originalGraphEdges: relevantEdges,
      recoverable: true,
      metadata: {
        originalGraphNodeCount: graph.nodes.size,
        originalGraphEdgeCount: graph.edges.size,
        estimatedTokensSaved: candidate.estimatedTokensSaved,
        confidence: candidate.confidence,
      },
    };

    this.archive.set(archive.id, archive);
    return archive;
  }

  getArchive(archiveId: string): ContextArchive | undefined {
    return this.archive.get(archiveId);
  }

  getArchivesForRequest(requestId: string): ContextArchive[] {
    return Array.from(this.archive.values()).filter(a => a.requestId === requestId);
  }

  getAllArchives(): ContextArchive[] {
    return Array.from(this.archive.values());
  }

  clearArchive(): void {
    this.archive.clear();
  }
}

import crypto from 'crypto';

export interface ContextArchive {
  id: string;
  requestId: string;
  item: ContextItem;
  archivedAt: string;
  reason: GCReason;
  originalGraphEdges: ContextEdge[];
  recoverable: boolean;
  metadata?: Record<string, unknown>;
}