# StoreFlow — Project Brief for UI Design

## What It Is

**StoreFlow** is an offline-first POS (Point of Sale) and inventory management mobile app built with **Expo (React Native)**. It targets small business owners who need to manage products, process sales, track bills, and view analytics — all without requiring an internet connection.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Expo ~54 + Expo Router ~6 |
| Language | TypeScript |
| Styling | `StyleSheet.create` (no NativeWind active yet) |
| State | Zustand (`appStore`, `cartStore`) |
| Data Fetching | TanStack React Query v5 |
| Local DB | expo-sqlite (SQLite on device) |
| Icons | `@expo/vector-icons` → Ionicons |
| Forms | react-hook-form + zod |
| Animation | react-native-reanimated + react-native-gesture-handler |
| Camera | expo-camera (barcode scanning) |

---

## Design System

### Colors (`src/theme/colors.ts`)

```ts
primary:       '#2563EB'   // blue — main brand color
primaryDark:   '#1E40AF'
primaryLight:  '#DBEAFE'
background:    '#F8FAFC'   // page background
card:          '#FFFFFF'
text:          '#1E293B'   // dark slate
subtext:       '#64748B'
border:        '#E2E8F0'
success:       '#10B981'   successLight: '#D1FAE5'
warning:       '#F59E0B'   warningLight: '#FEF3C7'
error:         '#EF4444'   errorLight:   '#FEE2E2'
info:          '#3B82F6'   infoLight:    '#DBEAFE'
gray50/100/200/400/600
overlay:       'rgba(0,0,0,0.5)'
```

### Spacing

```ts
xs: 4  |  sm: 8  |  md: 16  |  lg: 24  |  xl: 32  |  xxl: 48
```

### Border Radius

```ts
sm: 8  |  md: 12  |  lg: 16  |  xl: 24  |  full: 9999
```

### Font Sizes

```ts
xs: 11  |  sm: 13  |  md: 15  |  lg: 17  |  xl: 20  |  xxl: 24  |  xxxl: 30
```

### Visual Style

- Light mode default, dark mode supported via `userInterfaceStyle: 'automatic'`
- Cards: white background, `borderRadius: 12–16`, subtle shadow or border
- Buttons: filled primary for CTAs, ghost/outline for secondary
- FAB (Floating Action Button): bottom-right, `borderRadius: full`, primary color with shadow
- Section headers: `fontWeight: '700'`, `fontSize: 17`
- No NativeWind/Tailwind active — use `StyleSheet.create` only

---

## App Structure

```
app/
  index.tsx                    ← Splash router (redirects based on onboarding state)
  _layout.tsx                  ← Root layout
  (onboarding)/
    index.tsx                  ← 4-slide carousel onboarding
    auth.tsx                   ← Login / Register screen
    setup.tsx                  ← Create first store
    _layout.tsx
  (app)/
    _layout.tsx
    (tabs)/
      _layout.tsx              ← Bottom tab bar (5 tabs)
      index.tsx                ← Home / Dashboard
      products/
        index.tsx              ← Product list with search
        add.tsx                ← Add product form
        [id].tsx               ← Product detail / edit
        _layout.tsx
      bills/
        index.tsx              ← Bills history list
        checkout.tsx           ← Active cart / POS screen
        [id].tsx               ← Bill detail / receipt
        _layout.tsx
      analytics.tsx            ← Charts & reports
      settings.tsx             ← App + store settings
```

---

## Data Models (`src/types/index.ts`)

### Store
```ts
{ id, name, type, currency, theme_color, logo, created_at }
```

### Product
```ts
{ id, store_id, category_id, name, sku, barcode, description, image,
  cost_price, selling_price, profit, margin, quantity, tax, discount,
  is_archived, created_at, updated_at }
```

### Bill
```ts
{ id, store_id, customer_id, subtotal, discount, tax, total, profit,
  payment_method, created_at }
```

### BillItem
```ts
{ id, bill_id, product_id, product_name, quantity, price, cost_price, profit }
```

### CartItem
```ts
{ product: Product, quantity, unit_price, discount }
```

### Customer
```ts
{ id, store_id, name, phone, notes, created_at }
```

### Category
```ts
{ id, store_id, name }
```

### InventoryLog
```ts
{ id, product_id, change_type: 'add'|'sell'|'return'|'damage'|'adjust',
  quantity, reason, created_at }
```

### DashboardStats
```ts
{ today_sales, today_profit, total_orders, low_stock_count, monthly_revenue }
```

### AppSettings
```ts
{ active_store_id, app_name, is_onboarding_done, app_lock_enabled,
  pin_code, language, currency }
```

---

## Existing Reusable Components (`src/components/`)

| Component | Location | Notes |
|---|---|---|
| `Button` | `ui/Button.tsx` | Props: `label`, `onPress`, `size` (`sm`/`md`/`lg`), `fullWidth`, variant |
| `Input` | `ui/Input.tsx` | Styled text input |
| `Card` | `ui/Card.tsx` | White card container |
| `DashboardCard` | `DashboardCard.tsx` | Stat card: `title`, `value`, `subtitle`, `color`, `icon` |
| `ProductCard` | `ProductCard.tsx` | Product list row / grid item |
| `BarcodeScanner` | `BarcodeScanner.tsx` | Full-screen camera scanner |

---

## Navigation & State

- **Expo Router** file-based routing; groups in `(onboarding)` and `(app)/(tabs)`
- **Tab bar**: Home · Products · Bills · Analytics · Settings
  - Active color = store's `theme_color` (falls back to `#2563EB`)
  - Height 62px, white background, 1px border top
- **`useAppStore`** (Zustand): holds `settings`, `activeStore`, `isLoading`
- **`useCartStore`** (Zustand): manages cart items for the checkout/POS flow
- **React Query** keys: `['dashboard', storeId]`, `['top-products', storeId]`, `['low-stock', storeId]`

---

## Screen-by-Screen Summary

### Home (Dashboard)
- Daily motivational quote card (blue tint)
- 4-stat grid: Sales / Profit / Orders / Low Stock
- Monthly Revenue full-width card (solid primary blue)
- Low Stock Alerts list (warning/error dot indicator)
- Top Sellers ranked list
- FAB → "New Bill" → navigates to checkout

### Products
- Searchable list of products for the active store
- Each row: product name, SKU, price, stock quantity badge
- Add button → `products/add.tsx`
- Tap row → `products/[id].tsx` (detail/edit + inventory log)
- Barcode scan shortcut

### Bills (History)
- List of past bills sorted by date
- Each row: bill ID, total, payment method, date
- Tap → `bills/[id].tsx` (receipt view)
- FAB → `bills/checkout.tsx`

### Checkout (POS)
- Product search / barcode scan to add to cart
- Cart item list with quantity controls and per-item discount
- Subtotal / discount / tax / total summary
- Customer selector (optional)
- Payment method picker (Cash / Card / etc.)
- "Complete Sale" button

### Analytics
- Charts for revenue, profit, top products
- Date range selector (today / week / month)
- Summary stats cards

### Settings
- Store management (switch / create / edit stores)
- App lock (PIN code toggle)
- Currency & language
- Theme color picker per store

---

## UI Conventions to Follow

1. **Always use `StyleSheet.create`** — no inline styles, no Tailwind classes.
2. **Import tokens** from `src/theme/colors` (`Colors`, `Spacing`, `Radius`, `FontSize`).
3. **Use `Ionicons`** for all icons — import from `@expo/vector-icons`.
4. **Use `expo-router`** `router.push/replace` for navigation, never `useNavigation`.
5. **Pull-to-refresh** on list screens via `RefreshControl` + React Query `refetch`.
6. **Empty states** use a large emoji + title + action link pattern.
7. **Currency formatting** via `formatCurrency(amount, currency)` from `src/utils/calc`.
8. **Offline first** — all data reads/writes go through SQLite queries in `src/db/queries`.
9. Platform target: **iOS + Android portrait**; tablet supported on iOS.
