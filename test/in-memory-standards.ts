import {
  createRecordsQuery,
  type FilterRule,
  type ObjectBuilderLike,
  type SortRule,
  ValidationError,
} from "@stndrds/client";
import type { StandardsRecords } from "../src/standards/client";

export interface StoredRecord {
  id: string;
  values: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface InMemoryStandards {
  standards: StandardsRecords;
  seed(objectName: string, values: Record<string, unknown>): string;
  records(objectName: string): StoredRecord[];
  failNextRequestWith(error: Error, pathPattern?: RegExp): void;
}

/** Mirrors the REST controller: 20 records unless asked, never more than 100. */
const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;

interface ListBody {
  filters?: { combinator: "and" | "or"; rules: FilterRule[] };
  sorts?: SortRule[];
  limit?: number;
  offset?: number;
}

const SUPPORTED_OPERATORS: ReadonlySet<FilterRule["operator"]> = new Set<FilterRule["operator"]>([
  "is",
  "is_not",
  "less_than",
  "less_or_equal",
  "greater_than",
  "greater_or_equal",
  "any_of",
  "none_of",
  "is_empty",
  "is_not_empty",
]);

function unsupportedOperator(operator: string): ValidationError {
  return new ValidationError(`in-memory transport does not implement operator "${operator}"`, []);
}

/** Checked before filtering, so an unsupported operator throws even on an empty table. */
function assertSupported(rules: FilterRule[]): void {
  for (const rule of rules) {
    if (!SUPPORTED_OPERATORS.has(rule.operator)) throw unsupportedOperator(rule.operator);
  }
}

function isEmptyValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function matches(rule: FilterRule, values: Record<string, unknown>): boolean {
  const actual = values[rule.attribute];
  const expected = rule.value as string | number | boolean | null | string[];
  switch (rule.operator) {
    case "is":
      return actual === expected;
    case "is_not":
      return actual !== expected;
    case "less_than":
      return (actual as number) < (expected as number);
    case "less_or_equal":
      return (actual as number) <= (expected as number);
    case "greater_than":
      return (actual as number) > (expected as number);
    case "greater_or_equal":
      return (actual as number) >= (expected as number);
    case "any_of":
      return Array.isArray(expected) && expected.includes(actual as string);
    case "none_of":
      return Array.isArray(expected) && !expected.includes(actual as string);
    case "is_empty":
      return isEmptyValue(actual);
    case "is_not_empty":
      return !isEmptyValue(actual);
    default:
      throw unsupportedOperator(rule.operator);
  }
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === undefined || a === null) return 1;
  if (b === undefined || b === null) return -1;
  return (a as number) < (b as number) ? -1 : 1;
}

function sortRecords(records: StoredRecord[], sorts: SortRule[]): StoredRecord[] {
  return [...records].sort((left, right) => {
    for (const sort of sorts) {
      const result = compare(left.values[sort.attribute], right.values[sort.attribute]);
      if (result !== 0) return sort.direction === "desc" ? -result : result;
    }
    return 0;
  });
}

/**
 * Emulates the REST records API well enough for the app's queries: `is`, `is_not`,
 * the four comparisons on numbers and ISO strings, `any_of`/`none_of`, the empty
 * checks, multi-key sorts, offset/limit. Anything else throws so a test never
 * passes on a filter the double silently ignored.
 */
export function createInMemoryStandards(): InMemoryStandards {
  const store = new Map<string, StoredRecord[]>();
  let nextId = 1;
  let pendingError: { error: Error; pathPattern: RegExp | undefined } | null = null;

  function table(objectName: string): StoredRecord[] {
    const existing = store.get(objectName);
    if (existing) return existing;
    const created: StoredRecord[] = [];
    store.set(objectName, created);
    return created;
  }

  function insert(objectName: string, values: Record<string, unknown>): StoredRecord {
    const now = new Date().toISOString();
    const record: StoredRecord = {
      id: `r${nextId++}`,
      values: { ...values },
      createdAt: now,
      updatedAt: now,
    };
    table(objectName).push(record);
    return record;
  }

  function parse(path: string): { objectName: string; tail: string | null } {
    const [, , objectName = "", tail = null] = path.split("/");
    return {
      objectName: decodeURIComponent(objectName),
      tail: tail === null ? null : decodeURIComponent(tail),
    };
  }

  function find(objectName: string, id: string): StoredRecord {
    const record = table(objectName).find((r) => r.id === id);
    if (!record) throw new ValidationError(`Record ${id} not found in ${objectName}`, []);
    return record;
  }

  function list(objectName: string, body: ListBody) {
    const rules = body.filters?.rules ?? [];
    assertSupported(rules);
    const combinator = body.filters?.combinator ?? "and";
    const filtered = table(objectName).filter((record) =>
      rules.length === 0
        ? true
        : combinator === "and"
          ? rules.every((rule) => matches(rule, record.values))
          : rules.some((rule) => matches(rule, record.values))
    );
    const sorted = sortRecords(filtered, body.sorts ?? []);
    const offset = body.offset ?? 0;
    const limit = Math.min(body.limit ?? DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT);
    const page = sorted.slice(offset, offset + limit);
    return { data: page, page: { total: filtered.length, hasMore: false, countMode: "exact" } };
  }

  function guard(path: string): void {
    if (pendingError && (!pendingError.pathPattern || pendingError.pathPattern.test(path))) {
      const { error } = pendingError;
      pendingError = null;
      throw error;
    }
  }

  const transport = {
    async get(path: string) {
      guard(path);
      const { objectName, tail } = parse(path);
      return find(objectName, tail ?? "");
    },
    async post(path: string, body?: unknown) {
      guard(path);
      const { objectName, tail } = parse(path);
      if (tail === "list" || tail === "search") return list(objectName, (body ?? {}) as ListBody);
      return insert(objectName, (body as { data: Record<string, unknown> }).data);
    },
    async put(path: string, body?: unknown) {
      guard(path);
      const { objectName, tail } = parse(path);
      const record = find(objectName, tail ?? "");
      record.values = { ...record.values, ...(body as Record<string, unknown>) };
      record.updatedAt = new Date().toISOString();
      return record;
    },
    async delete(path: string) {
      guard(path);
      const { objectName, tail } = parse(path);
      const records = table(objectName);
      const index = records.findIndex((r) => r.id === tail);
      if (index >= 0) records.splice(index, 1);
      return null;
    },
  };

  const standards: StandardsRecords = {
    from: ((target: ObjectBuilderLike | string) =>
      typeof target === "string"
        ? createRecordsQuery(transport, target)
        : createRecordsQuery(transport, target)) as StandardsRecords["from"],
  };

  return {
    standards,
    seed: (objectName, values) => insert(objectName, values).id,
    records: (objectName) => table(objectName),
    failNextRequestWith: (error, pathPattern) => {
      pendingError = { error, pathPattern };
    },
  };
}
