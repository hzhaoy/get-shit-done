/**
 * Core type definitions for GSD-1 PLAN.md structures.
 *
 * These types model the YAML frontmatter + XML task bodies
 * that make up a GSD plan file.
 */

// ─── Frontmatter types ───────────────────────────────────────────────────────

export interface MustHaveArtifact {
  path: string;
  provides: string;
  min_lines?: number;
  exports?: string[];
  contains?: string;
}

export interface MustHaveKeyLink {
  from: string;
  to: string;
  via: string;
  pattern?: string;
}

export interface MustHaves {
  truths: string[];
  artifacts: MustHaveArtifact[];
  key_links: MustHaveKeyLink[];
}

export interface UserSetupEnvVar {
  name: string;
  source: string;
}

export interface UserSetupDashboardConfig {
  task: string;
  location: string;
  details: string;
}

export interface UserSetupItem {
  service: string;
  why: string;
  env_vars?: UserSetupEnvVar[];
  dashboard_config?: UserSetupDashboardConfig[];
  local_dev?: string[];
}

export interface PlanFrontmatter {
  phase: string;
  plan: string;
  type: string;
  wave: number;
  depends_on: string[];
  files_modified: string[];
  autonomous: boolean;
  requirements: string[];
  user_setup?: UserSetupItem[];
  must_haves: MustHaves;
  [key: string]: unknown; // Allow additional fields
}

// ─── Task types ──────────────────────────────────────────────────────────────

export interface PlanTask {
  type: string;
  name: string;
  files: string[];
  read_first: string[];
  action: string;
  verify: string;
  acceptance_criteria: string[];
  done: string;
}

// ─── Parsed plan ─────────────────────────────────────────────────────────────

export interface ParsedPlan {
  frontmatter: PlanFrontmatter;
  objective: string;
  execution_context: string[];
  context_refs: string[];
  tasks: PlanTask[];
  raw: string;
}

// ─── Session & execution types ───────────────────────────────────────────────

/**
 * Options for configuring a single plan execution session.
 */
export interface SessionOptions {
  /** Maximum agentic turns before stopping. Default: 50. */
  maxTurns?: number;
  /** Maximum budget in USD. Default: 5.0. */
  maxBudgetUsd?: number;
  /** Model ID to use (e.g., 'claude-sonnet-4-6'). Falls back to config model_profile. */
  model?: string;
  /** Working directory for the session. */
  cwd?: string;
  /** Allowed tool names. Default: ['Read','Write','Edit','Bash','Grep','Glob']. */
  allowedTools?: string[];
}

/**
 * Usage statistics from a completed session.
 */
export interface SessionUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

/**
 * Result of a plan execution session.
 */
export interface PlanResult {
  /** Whether the plan completed successfully. */
  success: boolean;
  /** Session UUID for audit trail. */
  sessionId: string;
  /** Total cost in USD. */
  totalCostUsd: number;
  /** Total wall-clock duration in milliseconds. */
  durationMs: number;
  /** Token usage breakdown. */
  usage: SessionUsage;
  /** Number of agentic turns used. */
  numTurns: number;
  /** Error details when success is false. */
  error?: {
    /** Error subtype from SDK result (e.g., 'error_max_turns', 'error_during_execution'). */
    subtype: string;
    /** Error messages. */
    messages: string[];
  };
}

/**
 * Options for creating a GSD instance.
 */
export interface GSDOptions {
  /** Root directory of the project. */
  projectDir: string;
  /** Path to gsd-tools.cjs. Falls back to ~/.claude/get-shit-done/bin/gsd-tools.cjs. */
  gsdToolsPath?: string;
  /** Model to use for execution sessions. */
  model?: string;
  /** Maximum budget per plan execution in USD. Default: 5.0. */
  maxBudgetUsd?: number;
  /** Maximum turns per plan execution. Default: 50. */
  maxTurns?: number;
}

// ─── S02: Event stream types ─────────────────────────────────────────────────

/**
 * Phase types for GSD execution workflow.
 */
export enum PhaseType {
  Discuss = 'discuss',
  Research = 'research',
  Plan = 'plan',
  Execute = 'execute',
  Verify = 'verify',
}

/**
 * Event types emitted by the GSD event stream.
 * Maps from SDKMessage variants to domain-meaningful events.
 */
export enum GSDEventType {
  SessionInit = 'session_init',
  SessionComplete = 'session_complete',
  SessionError = 'session_error',
  AssistantText = 'assistant_text',
  ToolCall = 'tool_call',
  ToolProgress = 'tool_progress',
  ToolUseSummary = 'tool_use_summary',
  TaskStarted = 'task_started',
  TaskProgress = 'task_progress',
  TaskNotification = 'task_notification',
  CostUpdate = 'cost_update',
  APIRetry = 'api_retry',
  RateLimit = 'rate_limit',
  StatusChange = 'status_change',
  CompactBoundary = 'compact_boundary',
  StreamEvent = 'stream_event',
}

/**
 * Base fields present on every GSD event.
 */
export interface GSDEventBase {
  type: GSDEventType;
  timestamp: string;
  sessionId: string;
  phase?: PhaseType;
  planName?: string;
}

/**
 * Session initialized — emitted on SDKSystemMessage subtype 'init'.
 */
export interface GSDSessionInitEvent extends GSDEventBase {
  type: GSDEventType.SessionInit;
  model: string;
  tools: string[];
  cwd: string;
}

/**
 * Session completed successfully — emitted on SDKResultSuccess.
 */
export interface GSDSessionCompleteEvent extends GSDEventBase {
  type: GSDEventType.SessionComplete;
  success: true;
  totalCostUsd: number;
  durationMs: number;
  numTurns: number;
  result?: string;
}

/**
 * Session ended with an error — emitted on SDKResultError.
 */
export interface GSDSessionErrorEvent extends GSDEventBase {
  type: GSDEventType.SessionError;
  success: false;
  totalCostUsd: number;
  durationMs: number;
  numTurns: number;
  errorSubtype: string;
  errors: string[];
}

/**
 * Assistant produced text output.
 */
export interface GSDAssistantTextEvent extends GSDEventBase {
  type: GSDEventType.AssistantText;
  text: string;
}

/**
 * Tool invocation detected in assistant response.
 */
export interface GSDToolCallEvent extends GSDEventBase {
  type: GSDEventType.ToolCall;
  toolName: string;
  toolUseId: string;
  input: Record<string, unknown>;
}

/**
 * Tool execution progress update.
 */
export interface GSDToolProgressEvent extends GSDEventBase {
  type: GSDEventType.ToolProgress;
  toolName: string;
  toolUseId: string;
  elapsedSeconds: number;
}

/**
 * Tool use summary after completion.
 */
export interface GSDToolUseSummaryEvent extends GSDEventBase {
  type: GSDEventType.ToolUseSummary;
  summary: string;
  toolUseIds: string[];
}

/**
 * Subagent task started.
 */
export interface GSDTaskStartedEvent extends GSDEventBase {
  type: GSDEventType.TaskStarted;
  taskId: string;
  description: string;
  taskType?: string;
}

/**
 * Subagent task progress.
 */
export interface GSDTaskProgressEvent extends GSDEventBase {
  type: GSDEventType.TaskProgress;
  taskId: string;
  description: string;
  totalTokens: number;
  toolUses: number;
  durationMs: number;
  lastToolName?: string;
}

/**
 * Subagent task completed/failed/stopped.
 */
export interface GSDTaskNotificationEvent extends GSDEventBase {
  type: GSDEventType.TaskNotification;
  taskId: string;
  status: 'completed' | 'failed' | 'stopped';
  summary: string;
}

/**
 * Cost updated (emitted on session_complete and periodically).
 */
export interface GSDCostUpdateEvent extends GSDEventBase {
  type: GSDEventType.CostUpdate;
  sessionCostUsd: number;
  cumulativeCostUsd: number;
}

/**
 * API retry in progress.
 */
export interface GSDAPIRetryEvent extends GSDEventBase {
  type: GSDEventType.APIRetry;
  attempt: number;
  maxRetries: number;
  retryDelayMs: number;
  errorStatus: number | null;
}

/**
 * Rate limit information updated.
 */
export interface GSDRateLimitEvent extends GSDEventBase {
  type: GSDEventType.RateLimit;
  status: string;
  resetsAt?: number;
  utilization?: number;
}

/**
 * System status change (e.g., compacting).
 */
export interface GSDStatusChangeEvent extends GSDEventBase {
  type: GSDEventType.StatusChange;
  status: string | null;
}

/**
 * Compact boundary — context window was compacted.
 */
export interface GSDCompactBoundaryEvent extends GSDEventBase {
  type: GSDEventType.CompactBoundary;
  trigger: 'manual' | 'auto';
  preTokens: number;
}

/**
 * Raw stream event from SDK (partial assistant messages).
 */
export interface GSDStreamEvent extends GSDEventBase {
  type: GSDEventType.StreamEvent;
  event: unknown;
}

/**
 * Discriminated union of all GSD events.
 */
export type GSDEvent =
  | GSDSessionInitEvent
  | GSDSessionCompleteEvent
  | GSDSessionErrorEvent
  | GSDAssistantTextEvent
  | GSDToolCallEvent
  | GSDToolProgressEvent
  | GSDToolUseSummaryEvent
  | GSDTaskStartedEvent
  | GSDTaskProgressEvent
  | GSDTaskNotificationEvent
  | GSDCostUpdateEvent
  | GSDAPIRetryEvent
  | GSDRateLimitEvent
  | GSDStatusChangeEvent
  | GSDCompactBoundaryEvent
  | GSDStreamEvent;

/**
 * Transport handler interface for consuming GSD events.
 * Transports receive all events and can write to files, WebSockets, etc.
 */
export interface TransportHandler {
  /** Called for each event. Must not throw. */
  onEvent(event: GSDEvent): void;
  /** Called when the stream is closing. Clean up resources. */
  close(): void;
}

/**
 * Context files resolved for a phase execution.
 */
export interface ContextFiles {
  state?: string;
  roadmap?: string;
  context?: string;
  research?: string;
  requirements?: string;
  config?: string;
  plan?: string;
  summary?: string;
}

/**
 * Per-session cost bucket for tracking execution costs.
 */
export interface CostBucket {
  sessionId: string;
  costUsd: number;
}

/**
 * Cost tracker interface for per-session and cumulative cost tracking.
 * Uses per-session buckets keyed by session_id for thread-safety in parallel execution.
 */
export interface CostTracker {
  /** Per-session cost buckets. */
  sessions: Map<string, CostBucket>;
  /** Total cumulative cost across all sessions. */
  cumulativeCostUsd: number;
  /** Current active session ID. */
  activeSessionId?: string;
}
