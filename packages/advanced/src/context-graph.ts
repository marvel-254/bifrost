import {
  ContextItem,
  ContextType,
  ContextEdge,
  EdgeType,
  ContextGraph,
  Provenance,
  Invariant,
  InvariantType,
  tokens,
} from './types';

function generateId(): string {
  return `ctx_${crypto.randomUUID()}`;
}

function generateEdgeId(): string {
  return `edge_${crypto.randomBytes(8).toString('hex')}`;
}

function buildProvenance(source: string, toolId?: string, documentId?: string, author?: string): Provenance {
  return {
    source,
    toolId,
    documentId,
    timestamp: new Date().toISOString(),
    author,
    version: '1.0',
  };
}

export class ContextGraphBuilder {
  private nodes: Map<string, ContextItem> = new Map();
  private edges: ContextEdge[] = [];
  private requestId: string;

  constructor(requestId: string) {
    this.requestId = requestId;
  }

  addItem(
    type: ContextType,
    content: string,
    options: {
      tokens?: number;
      age?: number;
      referenced?: boolean;
      priority?: number;
      dependencies?: string[];
      provenance?: Provenance;
      invariants?: Invariant[];
      metadata?: Record<string, unknown>;
    } = {}
  ): string {
    const id = generateId();
    const tokensCount = options.tokens || Math.ceil(content.length / 4);

    const item: ContextItem = {
      id,
      requestId: this.requestId,
      type,
      content,
      tokens: tokensCount,
      age: options.age || 0,
      referenced: options.referenced || false,
      priority: options.priority ?? this.defaultPriority(type),
      dependencies: options.dependencies || [],
      provenance: options.provenance || buildProvenance('graph'),
      invariants: options.invariants || [],
      metadata: options.metadata,
    };

    this.nodes.set(id, item);
    return id;
  }

  private defaultPriority(type: ContextType): number {
    switch (type) {
      case 'system': return 1.0;
      case 'constraint': return 0.95;
      case 'error': return 0.9;
      case 'user': return 0.8;
      case 'document': return 0.7;
      case 'retrieval': return 0.6;
      case 'tool': return 0.5;
      case 'assistant': return 0.4;
      case 'metadata': return 0.3;
      default: return 0.5;
    }
  }

  addEdge(
    from: string,
    to: string,
    type: EdgeType,
    options: {
      weight?: number;
      provenance?: Provenance;
      invariants?: Invariant[];
      metadata?: Record<string, unknown>;
    } = {}
  ): void {
    if (!this.nodes.has(from) || !this.nodes.has(to)) {
      throw new Error(`Node not found: ${from} or ${to}`);
    }

    const edge: ContextEdge = {
      from,
      to,
      type,
      weight: options.weight ?? this.defaultEdgeWeight(type),
      provenance: options.provenance || buildProvenance('graph'),
      invariants: options.invariants || [],
      metadata: options.metadata,
    };

    this.edges.push(edge);
  }

  private defaultEdgeWeight(type: EdgeType): number {
    switch (type) {
      case 'depends_on': return 1.0;
      case 'references': return 0.9;
      case 'constrains': return 0.8;
      case 'supersedes': return 0.7;
      case 'derived_from': return 0.6;
      case 'validates': return 0.5;
      case 'conflicts_with': return 0.4;
      default: return 0.5;
    }
  }

  addReference(fromId: string, toId: string): void {
    this.addEdge(fromId, toId, 'references');
  }

  addDependency(fromId: string, toId: string): void {
    this.addEdge(fromId, toId, 'depends_on');
    const fromNode = this.nodes.get(fromId);
    if (fromNode && !fromNode.dependencies.includes(toId)) {
      fromNode.dependencies.push(toId);
    }
  }

  addSupersession(oldId: string, newId: string): void {
    this.addEdge(newId, oldId, 'supersedes');
  }

  addDerivation(derivedId: string, sourceId: string): void {
    this.addEdge(derivedId, sourceId, 'derived_from');
  }

  addConstraint(constraintId: string, constrainedId: string): void {
    this.addEdge(constraintId, constrainedId, 'constrains');
  }

  build(): ContextGraph {
    const roots = this.findRoots();
    const leaves = this.findLeaves();

    return {
      requestId: this.requestId,
      nodes: new Map(this.nodes),
      edges: [...this.edges],
      roots,
      leaves,
      metadata: {
        nodeCount: this.nodes.size,
        edgeCount: this.edges.length,
        builtAt: new Date().toISOString(),
      },
    };
  }

  private findRoots(): string[] {
    const hasIncoming = new Set(this.edges.map(e => e.to));
    return Array.from(this.nodes.keys()).filter(id => !hasIncoming.has(id));
  }

  private findLeaves(): string[] {
    const hasOutgoing = new Set(this.edges.map(e => e.from));
    return Array.from(this.nodes.keys()).filter(id => !hasOutgoing.has(id));
  }

  getNodes(): Map<string, ContextItem> {
    return new Map(this.nodes);
  }

  getEdges(): ContextEdge[] {
    return [...this.edges];
  }
}

export class ContextGraphAnalyzer {
  static findDependencies(graph: ContextGraph, itemId: string): string[] {
    const deps: string[] = [];
    const visited = new Set<string>();

    function traverse(nodeId: string): void {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      for (const edge of graph.edges) {
        if (edge.from === nodeId && (edge.type === 'depends_on' || edge.type === 'references')) {
          deps.push(edge.to);
          traverse(edge.to);
        }
      }
    }

    traverse(itemId);
    return deps;
  }

  static findDependents(graph: ContextGraph, itemId: string): string[] {
    const deps: string[] = [];
    const visited = new Set<string>();

    function traverse(nodeId: string): void {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      for (const edge of graph.edges) {
        if (edge.to === nodeId && (edge.type === 'depends_on' || edge.type === 'references')) {
          deps.push(edge.from);
          traverse(edge.from);
        }
      }
    }

    traverse(itemId);
    return deps;
  }

  static canSafelyRemove(graph: ContextGraph, itemId: string): boolean {
    const node = graph.nodes.get(itemId);
    if (!node) return false;

    if (node.type === 'system' || node.type === 'constraint' || node.type === 'error') {
      return false;
    }
    if (node.referenced) return false;
    if (node.priority >= 0.9) return false;

    const dependents = this.findDependents(graph, itemId);
    for (const depId of dependents) {
      const depNode = graph.nodes.get(depId);
      if (depNode && (depNode.type === 'system' || depNode.type === 'constraint' || depNode.referenced)) {
        return false;
      }
      for (const invariant of depNode.invariants) {
        if (invariant.severity === 'critical' || invariant.severity === 'high') {
          return false;
        }
      }
    }

    for (const invariant of node.invariants) {
      if (invariant.type === 'referential_integrity' && invariant.severity === 'critical') {
        return false;
      }
      if (invariant.type === 'security_boundary') {
        return false;
      }
    }

    return true;
  }

  static findCriticalPath(graph: ContextGraph): string[] {
    const nodeScores = new Map<string, number>();

    for (const [id, node] of graph.nodes) {
      let score = node.priority;
      if (node.type === 'system' || node.type === 'constraint') score += 0.5;
      if (node.referenced) score += 0.3;
      nodeScores.set(id, score);
    }

    for (const edge of graph.edges) {
      if (edge.type === 'depends_on') {
        const fromScore = nodeScores.get(edge.from) || 0;
        const toScore = nodeScores.get(edge.to) || 0;
        nodeScores.set(edge.to, Math.max(toScore, fromScore * edge.weight));
      }
    }

    return Array.from(nodeScores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);
  }

  static getTotalTokens(graph: ContextGraph): number {
    let total = 0;
    for (const node of graph.nodes.values()) {
      total += node.tokens;
    }
    return total;
  }

  static findCycles(graph: ContextGraph): string[][] {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cycles: string[][] = [];
    const path: string[] = [];

    function dfs(nodeId: string): void {
      visited.add(nodeId);
      recStack.add(nodeId);
      path.push(nodeId);

      for (const edge of graph.edges) {
        if (edge.from === nodeId) {
          if (!visited.has(edge.to)) {
            dfs(edge.to);
          } else if (recStack.has(edge.to)) {
            const cycleStart = path.indexOf(edge.to);
            cycles.push(path.slice(cycleStart));
          }
        }
      }

      recStack.delete(nodeId);
      path.pop();
    }

    for (const nodeId of graph.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }

    return cycles;
  }
}

import crypto from 'crypto';