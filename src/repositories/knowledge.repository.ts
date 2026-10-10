import type { QueryResultRow } from "pg";
import { db } from "../config/database";

export interface KnowledgeChunkRow extends QueryResultRow {
  chunk_id: string;
  document_id: string;
  document_version: number;
  chunk_order: number;
  content: string;

  attraction_id: string | null;
  title: string;
  language_code: string;
  source_url: string | null;
  source_credit: string;
}

export async function findApprovedKnowledgeChunks(
  languageCode: string
): Promise<KnowledgeChunkRow[]> {
  const result = await db.query<KnowledgeChunkRow>(
    `
      SELECT
        c.chunk_id,
        c.document_id,
        c.document_version,
        c.chunk_order,
        c.content,

        d.attraction_id,
        d.title,
        d.language_code,
        d.source_url,
        d.source_credit

      FROM knowledge_chunks c

      INNER JOIN knowledge_documents d
        ON d.document_id = c.document_id
       AND d.version = c.document_version

      WHERE d.status = 'approved'
        AND d.language_code = $1

      ORDER BY
        d.document_id ASC,
        c.chunk_order ASC
    `,
    [languageCode]
  );

  return result.rows;
}