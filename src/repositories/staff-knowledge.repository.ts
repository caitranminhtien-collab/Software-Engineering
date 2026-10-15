import type {
  QueryResultRow,
} from "pg";

import {
  db,
} from "../config/database";

export interface StaffKnowledgeDocumentRow
  extends QueryResultRow {
  document_id: string;

  attraction_id:
    | string
    | null;

  title: string;
  language_code: string;

  source_url:
    | string
    | null;

  source_credit: string;
  body_text: string;

  version: number;

  status:
    | "draft"
    | "in_review"
    | "approved"
    | "archived";

  created_by: string;

  approved_by:
    | string
    | null;

  approved_at:
    | Date
    | null;
}

export async function findStaffKnowledgeDocumentById(
  documentId: number
): Promise<StaffKnowledgeDocumentRow | null> {
  const result =
    await db.query<StaffKnowledgeDocumentRow>(
      `
        SELECT
          document_id,
          attraction_id,
          title,
          language_code,
          source_url,
          source_credit,
          body_text,
          version,
          status,
          created_by,
          approved_by,
          approved_at

        FROM knowledge_documents

        WHERE document_id = $1

        LIMIT 1
      `,
      [documentId]
    );

  return result.rows[0] ?? null;
}

export async function createDraftKnowledgeDocument(
  attractionId: number | null,
  title: string,
  languageCode: string,
  sourceUrl: string | null,
  sourceCredit: string,
  bodyText: string,
  createdBy: number
): Promise<StaffKnowledgeDocumentRow> {
  const result =
    await db.query<StaffKnowledgeDocumentRow>(
      `
        INSERT INTO knowledge_documents (
          attraction_id,
          title,
          language_code,
          source_url,
          source_credit,
          body_text,
          version,
          status,
          created_by,
          approved_by,
          approved_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          1,
          'draft',
          $7,
          NULL,
          NULL
        )

        RETURNING
          document_id,
          attraction_id,
          title,
          language_code,
          source_url,
          source_credit,
          body_text,
          version,
          status,
          created_by,
          approved_by,
          approved_at
      `,
      [
        attractionId,
        title,
        languageCode,
        sourceUrl,
        sourceCredit,
        bodyText,
        createdBy,
      ]
    );

  return result.rows[0];
}
export interface StaffKnowledgeChunkInput {
  chunkOrder: number;
  content: string;
  embeddingModel: string;
  embedding: number[];
}

export interface KnowledgeIndexResult {
  documentId: number;
  version: number;
  chunkCount: number;
}

export async function replaceKnowledgeChunksAtomically(
  documentId: number,
  expectedVersion: number,
  expectedBodyText: string,
  chunks: StaffKnowledgeChunkInput[]
): Promise<KnowledgeIndexResult | null> {
  const client =
    await db.connect();

  try {
    await client.query(
      "BEGIN"
    );

    const documentResult =
      await client.query<{
        document_id: string;
        version: number;
        status: string;
        body_text: string;
      }>(
        `
          SELECT
            document_id,
            version,
            status,
            body_text

          FROM knowledge_documents

          WHERE document_id = $1

          FOR UPDATE
        `,
        [documentId]
      );

    const document =
      documentResult.rows[0];

    if (
      !document ||
      document.status !==
        "in_review" ||
      Number(document.version) !==
        expectedVersion ||
      document.body_text !==
        expectedBodyText
    ) {
      await client.query(
        "ROLLBACK"
      );

      return null;
    }

    await client.query(
      `
        DELETE FROM knowledge_chunks

        WHERE document_id = $1
          AND document_version = $2
      `,
      [
        documentId,
        expectedVersion,
      ]
    );

    for (const chunk of chunks) {
      await client.query(
        `
          INSERT INTO knowledge_chunks (
            document_id,
            document_version,
            chunk_order,
            content,
            embedding_model,
            embedding,
            indexed_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6::double precision[],
            CURRENT_TIMESTAMP
          )
        `,
        [
          documentId,
          expectedVersion,
          chunk.chunkOrder,
          chunk.content,
          chunk.embeddingModel,
          chunk.embedding,
        ]
      );
    }

    await client.query(
      "COMMIT"
    );

    return {
      documentId,
      version:
        expectedVersion,
      chunkCount:
        chunks.length,
    };
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    throw error;
  } finally {
    client.release();
  }
}