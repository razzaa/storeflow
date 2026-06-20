import type {
  Store, Product, Customer, Bill, BillItem,
  Category, AppSettings, InventoryLog, CartItem, DashboardStats
} from '../types';
import { getDatabase } from './database';
import { calcProfit, calcMargin, generateId } from '../utils/calc';

// ─── App Settings ──────────────────────────────────────────────────────────

export async function getAppSettings(): Promise<AppSettings> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<AppSettings>(
    'SELECT * FROM app_settings WHERE id = ?', ['default']
  );
  return result!;
}

export async function updateAppSettings(
  updates: Partial<AppSettings>
): Promise<void> {
  const db = await getDatabase();
  const fields = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), 'default'];
  await db.runAsync(`UPDATE app_settings SET ${fields} WHERE id = ?`, values);
}

// ─── Stores ────────────────────────────────────────────────────────────────

export async function getStores(): Promise<Store[]> {
  const db = await getDatabase();
  return db.getAllAsync<Store>('SELECT * FROM stores ORDER BY created_at DESC');
}

export async function getStore(id: string): Promise<Store | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Store>('SELECT * FROM stores WHERE id = ?', [id]);
}

export async function createStore(
  data: Omit<Store, 'id' | 'created_at'>
): Promise<Store> {
  const db = await getDatabase();
  const store: Store = {
    id: generateId(),
    created_at: new Date().toISOString(),
    ...data,
  };
  await db.runAsync(
    'INSERT INTO stores (id, name, type, currency, theme_color, logo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [store.id, store.name, store.type, store.currency, store.theme_color, store.logo, store.created_at]
  );
  return store;
}

export async function updateStore(
  id: string, updates: Partial<Store>
): Promise<void> {
  const db = await getDatabase();
  const fields = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
  await db.runAsync(
    `UPDATE stores SET ${fields} WHERE id = ?`,
    [...Object.values(updates), id]
  );
}

export async function deleteStore(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM stores WHERE id = ?', [id]);
}

// ─── Categories ────────────────────────────────────────────────────────────

export async function getCategories(storeId: string): Promise<Category[]> {
  const db = await getDatabase();
  return db.getAllAsync<Category>(
    'SELECT * FROM categories WHERE store_id = ? ORDER BY name',
    [storeId]
  );
}

export async function createCategory(
  storeId: string, name: string
): Promise<Category> {
  const db = await getDatabase();
  const category: Category = { id: generateId(), store_id: storeId, name };
  await db.runAsync(
    'INSERT INTO categories (id, store_id, name) VALUES (?, ?, ?)',
    [category.id, storeId, name]
  );
  return category;
}

// ─── Products ──────────────────────────────────────────────────────────────

export async function getProducts(
  storeId: string,
  search?: string,
  categoryId?: string
): Promise<Product[]> {
  const db = await getDatabase();
  let query = 'SELECT * FROM products WHERE store_id = ? AND is_archived = 0';
  const params: (string | number)[] = [storeId];

  if (search) {
    query += ' AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (categoryId) {
    query += ' AND category_id = ?';
    params.push(categoryId);
  }
  query += ' ORDER BY name';
  return db.getAllAsync<Product>(query, params);
}

export async function getProduct(id: string): Promise<Product | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Product>('SELECT * FROM products WHERE id = ?', [id]);
}

export async function getLowStockProducts(storeId: string, threshold = 5): Promise<Product[]> {
  const db = await getDatabase();
  return db.getAllAsync<Product>(
    'SELECT * FROM products WHERE store_id = ? AND quantity <= ? AND quantity > 0 AND is_archived = 0 ORDER BY quantity ASC',
    [storeId, threshold]
  );
}

export async function getOutOfStockProducts(storeId: string): Promise<Product[]> {
  const db = await getDatabase();
  return db.getAllAsync<Product>(
    'SELECT * FROM products WHERE store_id = ? AND quantity = 0 AND is_archived = 0',
    [storeId]
  );
}

export async function createProduct(
  data: Omit<Product, 'id' | 'profit' | 'margin' | 'created_at' | 'updated_at'>
): Promise<Product> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const product: Product = {
    id: generateId(),
    profit: calcProfit(data.selling_price, data.cost_price),
    margin: calcMargin(data.selling_price, data.cost_price),
    created_at: now,
    updated_at: now,
    ...data,
  };
  await db.runAsync(
    `INSERT INTO products (id, store_id, category_id, name, sku, barcode, description, image, cost_price, selling_price, profit, margin, quantity, tax, discount, is_archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [product.id, product.store_id, product.category_id, product.name, product.sku, product.barcode,
     product.description, product.image, product.cost_price, product.selling_price, product.profit,
     product.margin, product.quantity, product.tax, product.discount, product.is_archived,
     product.created_at, product.updated_at]
  );
  return product;
}

export async function updateProduct(
  id: string, updates: Partial<Omit<Product, 'id'>>
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const data = { ...updates, updated_at: now };

  if (data.selling_price !== undefined || data.cost_price !== undefined) {
    const existing = await getProduct(id);
    if (existing) {
      const sp = data.selling_price ?? existing.selling_price;
      const cp = data.cost_price ?? existing.cost_price;
      data.profit = calcProfit(sp, cp);
      data.margin = calcMargin(sp, cp);
    }
  }

  const fields = Object.keys(data).map((k) => `${k} = ?`).join(', ');
  await db.runAsync(
    `UPDATE products SET ${fields} WHERE id = ?`,
    [...Object.values(data), id]
  );
}

export async function deleteProduct(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM products WHERE id = ?', [id]);
}

// ─── Bills ─────────────────────────────────────────────────────────────────

export async function getBills(storeId: string): Promise<Bill[]> {
  const db = await getDatabase();
  return db.getAllAsync<Bill>(
    'SELECT * FROM bills WHERE store_id = ? ORDER BY created_at DESC',
    [storeId]
  );
}

export async function getBill(id: string): Promise<Bill | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Bill>('SELECT * FROM bills WHERE id = ?', [id]);
}

export async function getBillItems(billId: string): Promise<BillItem[]> {
  const db = await getDatabase();
  return db.getAllAsync<BillItem>(
    'SELECT * FROM bill_items WHERE bill_id = ?',
    [billId]
  );
}

export async function createBill(
  storeId: string,
  cart: CartItem[],
  discount: number,
  tax: number,
  paymentMethod: string,
  customerId?: string
): Promise<Bill> {
  const db = await getDatabase();
  const billId = generateId();
  const now = new Date().toISOString();

  // Sequential bill number per store
  const countRow = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) as n FROM bills WHERE store_id = ?', [storeId]
  );
  const billNumber = (countRow?.n ?? 0) + 1;

  const subtotal = cart.reduce(
    (sum, item) => sum + item.unit_price * item.quantity - item.discount, 0
  );
  const totalProfit = cart.reduce(
    (sum, item) =>
      sum + (item.unit_price - item.product.cost_price) * item.quantity - item.discount,
    0
  );
  const taxAmount = (subtotal - discount) * (tax / 100);
  const total = subtotal - discount + taxAmount;

  const bill: Bill = {
    id: billId,
    store_id: storeId,
    customer_id: customerId || null,
    bill_number: billNumber,
    subtotal,
    discount,
    tax: taxAmount,
    total,
    profit: totalProfit,
    payment_method: paymentMethod,
    created_at: now,
  };

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO bills (id, store_id, customer_id, bill_number, subtotal, discount, tax, total, profit, payment_method, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [bill.id, bill.store_id, bill.customer_id, bill.bill_number, bill.subtotal, bill.discount,
       bill.tax, bill.total, bill.profit, bill.payment_method, bill.created_at]
    );

    for (const item of cart) {
      const itemId = generateId();
      const itemProfit = (item.unit_price - item.product.cost_price) * item.quantity - item.discount;
      await db.runAsync(
        `INSERT INTO bill_items (id, bill_id, product_id, product_name, quantity, price, cost_price, profit)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [itemId, billId, item.product.id, item.product.name,
         item.quantity, item.unit_price, item.product.cost_price, itemProfit]
      );

      await db.runAsync(
        'UPDATE products SET quantity = quantity - ? WHERE id = ?',
        [item.quantity, item.product.id]
      );

      const logId = generateId();
      await db.runAsync(
        `INSERT INTO inventory_logs (id, product_id, change_type, quantity, reason, created_at)
         VALUES (?, ?, 'sell', ?, 'Sold in bill', ?)`,
        [logId, item.product.id, item.quantity, now]
      );
    }
  });

  return bill;
}

// ─── Customers ─────────────────────────────────────────────────────────────

export async function getCustomers(storeId: string): Promise<Customer[]> {
  const db = await getDatabase();
  return db.getAllAsync<Customer>(
    'SELECT * FROM customers WHERE store_id = ? ORDER BY name',
    [storeId]
  );
}

export async function createCustomer(
  storeId: string, name: string, phone?: string, notes?: string
): Promise<Customer> {
  const db = await getDatabase();
  const customer: Customer = {
    id: generateId(),
    store_id: storeId,
    name,
    phone: phone || null,
    notes: notes || null,
    created_at: new Date().toISOString(),
  };
  await db.runAsync(
    'INSERT INTO customers (id, store_id, name, phone, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [customer.id, customer.store_id, customer.name, customer.phone, customer.notes, customer.created_at]
  );
  return customer;
}

// ─── Dashboard ─────────────────────────────────────────────────────────────

export async function getDashboardStats(storeId: string): Promise<DashboardStats> {
  const db = await getDatabase();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const todayBills = await db.getFirstAsync<{ total: number; profit: number; count: number }>(
    `SELECT COALESCE(SUM(total), 0) as total, COALESCE(SUM(profit), 0) as profit, COUNT(*) as count
     FROM bills WHERE store_id = ? AND created_at BETWEEN ? AND ?`,
    [storeId, todayStart.toISOString(), todayEnd.toISOString()]
  );

  const monthlyRevenue = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(total), 0) as total FROM bills WHERE store_id = ? AND created_at >= ?`,
    [storeId, monthStart.toISOString()]
  );

  const lowStock = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM products WHERE store_id = ? AND quantity <= 5 AND quantity > 0 AND is_archived = 0',
    [storeId]
  );

  return {
    today_sales: todayBills?.total ?? 0,
    today_profit: todayBills?.profit ?? 0,
    total_orders: todayBills?.count ?? 0,
    low_stock_count: lowStock?.count ?? 0,
    monthly_revenue: monthlyRevenue?.total ?? 0,
  };
}

export async function getSalesData(storeId: string, days = 7): Promise<{ date: string; total: number }[]> {
  const db = await getDatabase();
  const result: { date: string; total: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);

    const row = await db.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(total), 0) as total FROM bills WHERE store_id = ? AND created_at BETWEEN ? AND ?',
      [storeId, d.toISOString(), end.toISOString()]
    );

    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    result.push({ date: label, total: row?.total ?? 0 });
  }

  return result;
}

export async function getTopProducts(
  storeId: string, limit = 5
): Promise<{ product_name: string; total_qty: number; total_profit: number }[]> {
  const db = await getDatabase();
  return db.getAllAsync(
    `SELECT bi.product_name, SUM(bi.quantity) as total_qty, SUM(bi.profit) as total_profit
     FROM bill_items bi
     JOIN bills b ON bi.bill_id = b.id
     WHERE b.store_id = ?
     GROUP BY bi.product_id
     ORDER BY total_qty DESC
     LIMIT ?`,
    [storeId, limit]
  );
}

// ─── Analytics ─────────────────────────────────────────────────────────────

function getRangeDates(range: 'today' | 'week' | 'month' | 'year'): { start: string; end: string } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (range === 'week') {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (range === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function getAnalyticsStats(
  storeId: string,
  range: 'today' | 'week' | 'month' | 'year' = 'month'
): Promise<{ revenue: number; profit: number; orders: number }> {
  const db = await getDatabase();
  const { start, end } = getRangeDates(range);
  const row = await db.getFirstAsync<{ revenue: number; profit: number; orders: number }>(
    `SELECT COALESCE(SUM(total), 0) as revenue, COALESCE(SUM(profit), 0) as profit, COUNT(*) as orders
     FROM bills WHERE store_id = ? AND created_at BETWEEN ? AND ?`,
    [storeId, start, end]
  );
  return row ?? { revenue: 0, profit: 0, orders: 0 };
}

export async function getPaymentBreakdown(
  storeId: string,
  range: 'today' | 'week' | 'month' | 'year' = 'month'
): Promise<{ method: string; count: number; total: number }[]> {
  const db = await getDatabase();
  const { start, end } = getRangeDates(range);
  return db.getAllAsync(
    `SELECT payment_method as method, COUNT(*) as count, COALESCE(SUM(total), 0) as total
     FROM bills WHERE store_id = ? AND created_at BETWEEN ? AND ?
     GROUP BY payment_method`,
    [storeId, start, end]
  );
}

export async function getPeakHours(storeId: string): Promise<{ hour: number; count: number }[]> {
  const db = await getDatabase();
  return db.getAllAsync(
    `SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as count
     FROM bills WHERE store_id = ?
     GROUP BY hour ORDER BY hour`,
    [storeId]
  );
}

export async function getMonthlySales(storeId: string): Promise<{ month: string; total: number }[]> {
  const db = await getDatabase();
  return db.getAllAsync(
    `SELECT strftime('%Y-%m', created_at) as month, COALESCE(SUM(total), 0) as total
     FROM bills WHERE store_id = ?
     GROUP BY month ORDER BY month ASC`,
    [storeId]
  );
}

export async function getCategoryBreakdown(
  storeId: string,
  range: 'today' | 'week' | 'month' | 'year' = 'month'
): Promise<{ category: string; total: number }[]> {
  const db = await getDatabase();
  const { start, end } = getRangeDates(range);
  return db.getAllAsync(
    `SELECT COALESCE(c.name, 'Other') as category, COALESCE(SUM(bi.price * bi.quantity), 0) as total
     FROM bill_items bi
     JOIN bills b ON bi.bill_id = b.id
     LEFT JOIN products p ON bi.product_id = p.id
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE b.store_id = ? AND b.created_at BETWEEN ? AND ?
     GROUP BY category ORDER BY total DESC LIMIT 6`,
    [storeId, start, end]
  );
}
