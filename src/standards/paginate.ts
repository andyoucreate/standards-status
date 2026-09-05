import type { RecordsQuery } from "@stndrds/client";

type Records<TBuilder> = Awaited<ReturnType<RecordsQuery<TBuilder>["fetch"]>>["records"];

/** The REST API answers 20 records by default and never more than 100 per call. */
export const PAGE_SIZE = 100;

/** Walks every page of a query; a page shorter than `PAGE_SIZE` is the last one. */
export async function fetchAll<TBuilder>(
  query: RecordsQuery<TBuilder>
): Promise<Records<TBuilder>> {
  const all: Records<TBuilder> = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { records } = await query.limit(PAGE_SIZE).offset(offset).fetch();
    all.push(...records);
    if (records.length < PAGE_SIZE) return all;
  }
}
