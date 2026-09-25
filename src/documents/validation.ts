import type { DocumentModel } from '../types/document';
import { SchemaMigrationManager } from './migration';

export interface FileValidationResult {
  valid: boolean;
  canRecover: boolean;
  errors: string[];
  warnings: string[];
  document?: DocumentModel;
}

export class DocumentValidator {
  public static validate(rawJson: string | object): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    let parsed: any;
    if (typeof rawJson === 'string') {
      try {
        parsed = JSON.parse(rawJson);
      } catch (e: any) {
        return {
          valid: false,
          canRecover: false,
          errors: [`Invalid JSON format: ${e.message || 'Syntax error'}`],
          warnings: [],
        };
      }
    } else {
      parsed = rawJson;
    }

    if (!parsed || typeof parsed !== 'object') {
      return {
        valid: false,
        canRecover: false,
        errors: ['Root document payload is not an object'],
        warnings: [],
      };
    }

    // Attempt migration
    let doc: DocumentModel;
    try {
      const migration = SchemaMigrationManager.migrate(parsed);
      doc = migration.document;
      if (migration.migrated) {
        warnings.push(`Migrated from legacy schema v${migration.fromVersion} to v6`);
      }
    } catch (e: any) {
      return {
        valid: false,
        canRecover: false,
        errors: [`Schema migration failed: ${e.message}`],
        warnings: [],
      };
    }

    // Validate pages
    if (!Array.isArray(doc.pages) || doc.pages.length === 0) {
      errors.push('Document contains no pages');
    }

    // Validate object ID uniqueness
    const seenIds = new Set<string>();
    let duplicateIds = 0;
    for (const page of doc.pages || []) {
      for (const obj of page.objects || []) {
        if (!obj.id) {
          warnings.push(`Found object without ID in page ${page.name}`);
        } else if (seenIds.has(obj.id)) {
          duplicateIds++;
        } else {
          seenIds.add(obj.id);
        }
      }
    }

    if (duplicateIds > 0) {
      warnings.push(`Found and resolved ${duplicateIds} duplicate object IDs`);
    }

    return {
      valid: errors.length === 0,
      canRecover: doc && Array.isArray(doc.pages),
      errors,
      warnings,
      document: doc,
    };
  }
}
