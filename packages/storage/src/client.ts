import { SQL } from '@neondatabase/serverless';
import { DatabaseConfig, QueryResult } from './types';

export class NeonClient {
  private sql: SQL;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    if (!config.connectionString) {
      throw new Error('NeonClient requires connectionString');
    }
    // @ts-expect-error — neon serverless driver accepts connectionString directly
    this.sql = new SQL({ connectionString: config.connectionString });
  }

  async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    const result = await this.sql.query<T>({ querie...[truncated]
