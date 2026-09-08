export interface SqlClientConfig {
  connectionString: string;
  maxRetries?: number;
  timeoutMs?: number;
}

export type SqlRow = Record<string, unknown>;

export type QueryOptions = {
  timeoutMs?: number;
};

export interface SqlClient {
  query<T = SqlRow>(sql: string, params?: unknown[], options?: QueryOptions): Promise<QueryResult<T>>;
  close(): Promise<void>;
}

export interface QueryResult<T = SqlRow> {
  rows: T[];
  rowCount: number;
  command: string;
  fields: Array<{ name: string; dataType: string }>;
}
