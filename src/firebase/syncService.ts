/**
 * Cloud sync via Firebase Realtime Database.
 * Local SQLite is always the source of truth.
 * RTDB is the backup / multi-device layer.
 *
 * Structure:
 *   users/{uid}/stores/{storeId}/_meta       → store row
 *   users/{uid}/stores/{storeId}/products/   → {id: product}
 *   users/{uid}/stores/{storeId}/categories/ → {id: category}
 *   users/{uid}/stores/{storeId}/bills/      → {id: bill + items[]}
 *
 * Merge rules:
 *   Products   → prefer newer updated_at
 *   Bills      → immutable; insert if missing
 *   Categories → insert if missing
 */

import { ref, get, set, update, child } from 'firebase/database';
import { rtdb } from './config';
import { getDatabase } from '../db/database';

// ─── Path helpers ─────────────────────────────────────────────────────────────

const storeRef  = (uid: string, sid: string) => ref(rtdb, `users/${uid}/stores/${sid}`);
const storesRef = (uid: string)              => ref(rtdb, `users/${uid}/stores`);

// ─── Check cloud data ─────────────────────────────────────────────────────────

export async function hasCloudData(uid: string): Promise<boolean> {
  try {
    const snap = await get(storesRef(uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function getCloudStoreIds(uid: string): Promise<string[]> {
  try {
    const snap = await get(storesRef(uid));
    if (!snap.exists()) return [];
    return Object.keys(snap.val());
  } catch {
    return [];
  }
}

// ─── Push local → cloud ───────────────────────────────────────────────────────

export async function pushToCloud(uid: string, storeId: string): Promise<void> {
  const sqlDb = await getDatabase();

  const [storeRow, products, categories, bills, billItems] = await Promise.all([
    sqlDb.getFirstAsync<any>('SELECT * FROM stores WHERE id = ?', [storeId]),
    sqlDb.getAllAsync<any>('SELECT * FROM products WHERE store_id = ?', [storeId]),
    sqlDb.getAllAsync<any>('SELECT * FROM categories WHERE store_id = ?', [storeId]),
    sqlDb.getAllAsync<any>('SELECT * FROM bills WHERE store_id = ?', [storeId]),
    sqlDb.getAllAsync<any>(
      `SELECT bi.* FROM bill_items bi
       JOIN bills b ON bi.bill_id = b.id
       WHERE b.store_id = ?`,
      [storeId]
    ),
  ]);

  if (!storeRow) return;

  // Build the full store payload
  const productsMap: Record<string, any>  = {};
  const categoriesMap: Record<string, any> = {};
  const billsMap: Record<string, any>      = {};

  for (const p of products)    productsMap[p.id]    = p;
  for (const c of categories)  categoriesMap[c.id]  = c;

  for (const b of bills) {
    billsMap[b.id] = {
      ...b,
      items: billItems
        .filter((i: any) => i.bill_id === b.id)
        .reduce((acc: any, i: any) => { acc[i.id] = i; return acc; }, {}),
    };
  }

  await set(storeRef(uid, storeId), {
    _meta:      { ...storeRow, _syncedAt: Date.now() },
    products:   productsMap,
    categories: categoriesMap,
    bills:      billsMap,
  });
}

// ─── Pull cloud → local (merge) ───────────────────────────────────────────────

export async function pullFromCloud(uid: string, storeId: string): Promise<void> {
  const snap = await get(storeRef(uid, storeId));
  if (!snap.exists()) return;

  const data        = snap.val();
  const products    = data.products    ?? {};
  const categories  = data.categories  ?? {};
  const bills       = data.bills       ?? {};

  const sqlDb = await getDatabase();

  // Categories — insert if missing
  for (const c of Object.values<any>(categories)) {
    await sqlDb.runAsync(
      `INSERT OR IGNORE INTO categories (id, store_id, name) VALUES (?, ?, ?)`,
      [c.id, storeId, c.name]
    );
  }

  // Products — prefer newer updated_at
  for (const cloud of Object.values<any>(products)) {
    const local = await sqlDb.getFirstAsync<any>(
      'SELECT updated_at FROM products WHERE id = ?', [cloud.id]
    );
    const cloudTs = cloud.updated_at ?? '';
    const localTs = local?.updated_at ?? '';

    if (!local || cloudTs > localTs) {
      await sqlDb.runAsync(
        `INSERT OR REPLACE INTO products
         (id, store_id, category_id, name, sku, barcode, description, image,
          cost_price, selling_price, profit, margin, quantity, tax, discount,
          is_archived, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          cloud.id, storeId, cloud.category_id ?? null, cloud.name,
          cloud.sku ?? null, cloud.barcode ?? null,
          cloud.description ?? null, cloud.image ?? null,
          cloud.cost_price ?? 0, cloud.selling_price ?? 0,
          cloud.profit ?? 0, cloud.margin ?? 0,
          cloud.quantity ?? 0, cloud.tax ?? 0, cloud.discount ?? 0,
          cloud.is_archived ?? 0, cloud.created_at, cloud.updated_at,
        ]
      );
    }
  }

  // Bills — immutable; insert if missing
  for (const b of Object.values<any>(bills)) {
    const exists = await sqlDb.getFirstAsync<any>(
      'SELECT id FROM bills WHERE id = ?', [b.id]
    );
    if (!exists) {
      await sqlDb.runAsync(
        `INSERT INTO bills
         (id, store_id, customer_id, bill_number, subtotal, discount,
          tax, total, profit, payment_method, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          b.id, storeId, b.customer_id ?? null, b.bill_number ?? 0,
          b.subtotal ?? 0, b.discount ?? 0, b.tax ?? 0,
          b.total ?? 0, b.profit ?? 0,
          b.payment_method ?? 'cash', b.created_at,
        ]
      );

      // Insert bill items
      const items = b.items ?? {};
      for (const item of Object.values<any>(items)) {
        const itemExists = await sqlDb.getFirstAsync<any>(
          'SELECT id FROM bill_items WHERE id = ?', [item.id]
        );
        if (!itemExists) {
          await sqlDb.runAsync(
            `INSERT INTO bill_items
             (id, bill_id, product_id, product_name, quantity, price, cost_price, profit)
             VALUES (?,?,?,?,?,?,?,?)`,
            [
              item.id, b.id, item.product_id, item.product_name,
              item.quantity ?? 1, item.price ?? 0,
              item.cost_price ?? 0, item.profit ?? 0,
            ]
          );
        }
      }
    }
  }
}

// ─── Smart merge (bidirectional) ──────────────────────────────────────────────

export async function mergeSync(uid: string, storeId: string): Promise<void> {
  await pullFromCloud(uid, storeId);
  await pushToCloud(uid, storeId);
}

// ─── On login: check existing cloud data and import ───────────────────────────

export async function onLoginSync(uid: string, localStoreId: string): Promise<void> {
  const cloudStoreIds = await getCloudStoreIds(uid);
  if (cloudStoreIds.length === 0) {
    await pushToCloud(uid, localStoreId);
  } else if (cloudStoreIds.includes(localStoreId)) {
    await mergeSync(uid, localStoreId);
  } else {
    await pullFromCloud(uid, cloudStoreIds[0]);
    await pushToCloud(uid, localStoreId);
  }
}
