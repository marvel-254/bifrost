export interface IProvider {
  name: string;
  authenticate(config: Record<string, unknown>): Promise<boolean>;
  listModels(): Promise<Array<{ id: string; name: string; contextWindow: number; capabilities: string[] }>>;
  complete(request: unknown): Promise<unknown>;
  stream(request: unknown, onChunk: (chunk: unknown) => void | Promise<void>): Promise<unknown>;
  healthCheck(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }>;
  estimateCost(inputTokens: number, outputTokens: number): Promise<number | null>;
}

export interface ProviderRegistryConfig {
  defaultProvider?: string;
  providers?: Array<{ name: string; enabled: boolean }>;
}

export class ProviderRegistry {
  private providers: Map<string, IProvider> = new Map();
  private providerOrder: string[] = [];
  private defaultProvider?: string;

  constructor(config?: ProviderRegistryConfig) {
    if (config?.defaultProvider) {
      this.defaultProvider = config.defaultProvider;
    }
    if (config?.providers) {
      for (const p of config.providers) {
        if (p.enabled) {
          this.providerOrder.push(p.name);
          // Seed the providers map with a placeholder so
          // listProviders() reflects the configured set.
          this.providers.set(p.name, null as unknown as IProvider);
        }
      }
    }
  }

  register(provider: IProvider): void {
    if (!provider.name) throw new Error('Provider must have a name');
    this.providers.set(provider.name, provider);
    if (!this.providerOrder.includes(provider.name)) {
      this.providerOrder.push(provider.name);
    }
  }

  getProvider(name: string): IProvider | undefined {
    return this.providers.get(name);
  }

  listProviders(): string[] {
    return [...this.providers.keys()];
  }

  getDefaultProvider(): string | undefined {
    return this.defaultProvider;
  }

  setDefaultProvider(name: string): void {
    if (this.providers.has(name)) {
      this.defaultProvider = name;
    }
  }

  getProviderCount(): number {
    return this.providers.size;
  }

  clear(): void {
    this.providers.clear();
    this.providerOrder = [];
    this.defaultProvider = undefined;
  }
}

export function createDefaultRegistry(): ProviderRegistry {
  const registry = new ProviderRegistry({ defaultProvider: 'ollama' });
  return registry;
}
