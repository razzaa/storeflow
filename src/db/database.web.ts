// Web stub — SQLite is native-only; web uses in-memory mock for dev/testing

type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = {};

const defaultSettings = {
  id: 'default',
  active_store_id: null,
  app_name: 'StoreFlow',
  is_onboarding_done: 0,
  app_lock_enabled: 0,
  pin_code: null,
  language: 'en',
  currency: 'PKR',
};

tables['app_settings'] = [defaultSettings];
tables['stores'] = [];
tables['categories'] = [];
tables['products'] = [];
tables['customers'] = [];
tables['bills'] = [];
tables['bill_items'] = [];
tables['inventory_logs'] = [];
tables['product_price_history'] = [];

let idCounter = 1;

function generateId() {
  return `web_${idCounter++}_${Date.now()}`;
}

function matchWhere(row: Row, where: string, params: unknown[]): boolean {
  return true;
}

const mockDb = {
  execAsync: async (_sql: string) => {},
  runAsync: async (sql: string, params: unknown[] = []) => {
    const insertMatch = sql.match(/INSERT\s+OR\s+IGNORE\s+INTO\s+(\w+)|INSERT\s+INTO\s+(\w+)/i);
    const updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.*)\s+WHERE\s+id\s*=\s*\?/i);
    const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)\s+WHERE\s+id\s*=\s*\?/i);

    if (insertMatch) {
      const table = insertMatch[1] || insertMatch[2];
      if (table && tables[table]) {
        const cols = sql.match(/\(([^)]+)\)\s+VALUES/)?.[1]?.split(',').map((c) => c.trim());
        if (cols) {
          const row: Row = {};
          cols.forEach((col, i) => { row[col] = params[i] as unknown; });
          if (!tables[table].find((r) => r.id === row.id)) {
            tables[table].push(row);
          }
        }
      }
    } else if (updateMatch) {
      const table = updateMatch[1];
      const id = params[params.length - 1];
      if (table && tables[table]) {
        const idx = tables[table].findIndex((r) => r.id === id);
        if (idx >= 0) {
          const setCols = updateMatch[2].split(',').map((s) => s.trim().split(/\s*=\s*/)[0]);
          setCols.forEach((col, i) => { tables[table][idx][col] = params[i] as unknown; });
        }
      }
    } else if (deleteMatch) {
      const table = deleteMatch[1];
      const id = params[0];
      if (table && tables[table]) {
        tables[table] = tables[table].filter((r) => r.id !== id);
      }
    }
    return { changes: 1, lastInsertRowId: 0 };
  },
  getFirstAsync: async <T>(sql: string, params: unknown[] = []): Promise<T | null> => {
    const match = sql.match(/FROM\s+(\w+)/i);
    if (!match) return null;
    const table = match[1];
    if (!tables[table]) return null;

    const whereId = sql.includes('WHERE') && params.length > 0;
    if (whereId) {
      const row = tables[table].find((r) => Object.values(r).includes(params[0]));
      return (row as T) ?? null;
    }
    return (tables[table][0] as T) ?? null;
  },
  getAllAsync: async <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
    const match = sql.match(/FROM\s+(\w+)/i);
    if (!match) return [];
    const table = match[1];
    if (!tables[table]) return [];

    let rows = [...tables[table]];
    if (sql.includes('WHERE') && params.length > 0) {
      rows = rows.filter((r) => Object.values(r).includes(params[0]));
    }
    return rows as T[];
  },
  withTransactionAsync: async (fn: () => Promise<void>) => { await fn(); },
};

let db: typeof mockDb | null = null;

export async function getDatabase() {
  if (!db) db = mockDb;
  return db;
}

export async function initializeDatabase() {
  db = mockDb;
}
