export interface Model {
  id: string;
  provider: string;
  displayName: string;
  contextWindow: number;
  capabilities: string[];
  inputPrice?: number;
  outputPrice?: number;
  enabled: boolean;
}

export interface ModelConfig {
  models: Model[];
}
