import { VectorObject, JsonTemplateSchema } from '../types/document';

export interface PlaceholderFieldInfo {
  name: string;
  description: string;
  defaultValue?: string;
  count: number;
}

/**
 * Extracts all unique placeholder definitions from the document
 */
export function extractPlaceholders(objects: VectorObject[]): PlaceholderFieldInfo[] {
  const map = new Map<string, PlaceholderFieldInfo>();

  for (const obj of objects) {
    if (obj.type === 'text' && obj.placeholder?.isPlaceholder && obj.placeholder.name) {
      const name = obj.placeholder.name.trim();
      const desc = obj.placeholder.description || `Value for ${name}`;
      const def = obj.placeholder.defaultValue || obj.text || '';

      if (map.has(name)) {
        map.get(name)!.count++;
      } else {
        map.set(name, {
          name,
          description: desc,
          defaultValue: def,
          count: 1,
        });
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Generates sample data JSON template with empty values (or default values)
 */
export function generateDataJsonTemplate(objects: VectorObject[]): Record<string, string> {
  const fields = extractPlaceholders(objects);
  const data: Record<string, string> = {};

  for (const f of fields) {
    data[f.name] = f.defaultValue || '';
  }

  return data;
}

/**
 * Generates JSON Schema metadata document with field descriptions
 */
export function generateSchemaMetadata(
  templateName: string,
  objects: VectorObject[]
): JsonTemplateSchema {
  const fields = extractPlaceholders(objects);
  const fieldsObj: JsonTemplateSchema['fields'] = {};

  for (const f of fields) {
    fieldsObj[f.name] = {
      description: f.description,
      type: 'string',
      default: f.defaultValue,
    };
  }

  return {
    template: templateName || 'document-template',
    version: '1.0.0',
    fields: fieldsObj,
  };
}

/**
 * Parses and normalizes imported JSON (single object or array of objects)
 */
export function parseImportedJsonData(
  jsonString: string
): { isArray: boolean; records: Record<string, string>[] } {
  const parsed = JSON.parse(jsonString);

  if (Array.isArray(parsed)) {
    const records = parsed.map((item, idx) => {
      if (typeof item !== 'object' || item === null) {
        throw new Error(`Record at index ${idx} is not a valid JSON object.`);
      }
      const stringifiedRecord: Record<string, string> = {};
      for (const [key, val] of Object.entries(item)) {
        stringifiedRecord[key] = String(val ?? '');
      }
      return stringifiedRecord;
    });
    return { isArray: true, records };
  } else if (typeof parsed === 'object' && parsed !== null) {
    const stringifiedRecord: Record<string, string> = {};
    for (const [key, val] of Object.entries(parsed)) {
      stringifiedRecord[key] = String(val ?? '');
    }
    return { isArray: false, records: [stringifiedRecord] };
  } else {
    throw new Error('Imported JSON must be an object or an array of objects.');
  }
}
