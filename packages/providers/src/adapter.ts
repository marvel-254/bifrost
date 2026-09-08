/**
 * Provider adapter interface and shared normalized types.
 *
 * Re-exports the canonical {@link ProviderAdapter} contract from `@bifrost/shared`
 * so provider implementations can import from a single local path. The routing
 * layer only interacts with this interface — provider-specific HTTP, auth,
 * payload translation, streaming normalization, and error mapping live inside
 * each adapter.
 */

export type {
  NormalizedMessage,
  NormalizedRequest,
  NormalizedUsage,
  NormalizedChoice,
  NormalizedResponse,
  NormalizedStreamDelta,
  NormalizedStreamChoice,
  NormalizedStreamEvent,
  NormalizedEmbeddingRequest,
  NormalizedEmbedding,
  NormalizedEmbeddingResponse,
  ProviderCapabilities,
  ProviderError,
  ProviderAdapter,
} from '@bifrost/shared';