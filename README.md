# StoreFlow

An offline-first Point of Sale (POS) and inventory management app for small businesses in Pakistan. Built with Expo (React Native) — works without internet, syncs to the cloud when available.

---

## Features

- **New Sale** — cart-based checkout with product search, quantity, discount, and payment method
- **Bills** — thermal-receipt-style bill view with print, share (PNG), and download
- **Products** — inventory with images, barcode scanning, cost/price, stock levels
- **Analytics** — revenue, profit, orders, gross margin, top products, payment breakdown, peak hours
- **Home Dashboard** — today's revenue, KPI grid, quick actions, monthly chart, top sellers
- **Cloud Sync** — merge sync to Firebase RTDB; local-first, works offline
- **Multi-store** — switch between stores; all data is store-scoped
- **Profile** — Firebase Auth, profile photo (local-first upload), display name
- **Dark mode** — full light/dark theme via design tokens
- **Urdu / English** — language switch with RTL support

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Expo ~54.0.0 + Expo Router ~6.0.24 |
| Language | TypeScript 5.9 |
| React | 19.1.0 / React Native 0.81.5 |
| Local DB | expo-sqlite v16 (WAL mode, offline-first) |
| State | Zustand v5 |
| Server State | TanStack React Query v5 |
| Cloud | Firebase v12 — Auth + RTDB + Storage |
| Icons | lucide-react-native |
| Forms | react-hook-form + zod |
| Animation | react-native-reanimated ~4 + gesture-handler |
| Camera | expo-camera (barcode scan) |
| Print | expo-print (HTML → PDF) |
| Share | expo-sharing + react-native-view-shot (PNG) |
| Package manager | pnpm |

---

## Project Structure

```
app/
  _layout.tsx               # Root layout — auth listener, sync timer, QueryClient
  index.tsx                 # Redirect (auth guard)
  (onboarding)/
    auth.tsx                # Login / register
    setup.tsx               # Create first store
  (app)/
    (tabs)/
      index.tsx             # Home dashboard
      analytics.tsx         # Analytics & charts
      products/
        index.tsx           # Product list + filter
        add.tsx             # Add / edit product
        [id].tsx            # Product detail
      bills/
        index.tsx           # Bill list
        checkout.tsx        # New sale (cart)
        [id].tsx            # Bill detail (thermal receipt)
      settings.tsx          # App settings, cloud sync, store
    profile.tsx             # User profile & photo
    notifications.tsx       # Notification centre

src/
  db/
    database.ts             # SQLite init, schema, WAL mode
    queries.ts              # All SQL query functions
  firebase/
    config.ts               # Firebase app — auth, rtdb, storage
    authService.ts          # Login, logout, profile photo, session
    syncService.ts          # push/pull/merge sync to RTDB
    notificationService.ts  # Admin notifications from RTDB
  stores/
    appStore.ts             # Active store, settings
    authStore.ts            # Firebase user
    cartStore.ts            # Checkout cart
    langStore.ts            # Language (en/ur)
    notificationStore.ts    # In-app notifications
    syncStore.ts            # Sync status, auto-sync timer
    widgetStore.ts          # Dashboard widget visibility, dark mode
  theme/
    design.ts               # LT / DT color tokens, spacing, radius
  i18n/
    index.ts                # English + Urdu translations
  utils/
    calc.ts                 # formatCurrency, tax, margin helpers
  components/               # Shared UI components
  types/                    # Shared TypeScript types
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Expo Go app on your phone, or an Android emulator

### Install

```bash
pnpm install
```

### Run

```bash
pnpm start          # starts Metro bundler
# scan QR with Expo Go, or press 'a' for Android emulator
```

### Environment

No `.env` file needed — Firebase config is in `src/firebase/config.ts`.

---

## Database Schema

SQLite tables (created on first launch):

| Table | Key Columns |
|---|---|
| `stores` | id, name, currency, address |
| `products` | id, store_id, name, sku, cost_price, sale_price, stock, category, image_uri |
| `bills` | id, store_id, bill_number, total, payment_method, created_at |
| `bill_items` | id, bill_id, product_id, qty, unit_price, subtotal |

---

## Firebase RTDB Structure

```
users/
  {uid}/
    profile/          # displayName, photoURL
    stores/
      {storeId}/
        _meta/        # name, currency, updatedAt
        products/     # { productId: { ...fields } }
        categories/   # { name: true }
        bills/        # { billId: { ...fields, items: { itemId: {...} } } }

admin_notifications/  # { id: { title, body, active, createdAt } }
```

### RTDB Rules

Paste these in Firebase Console → Realtime Database → Rules:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "admin_notifications": {
      ".read": "auth != null",
      ".write": false
    }
  }
}
```

---

## Building an APK

This project uses [EAS Build](https://docs.expo.dev/build/introduction/).

```bash
# Install EAS CLI (once)
npm install -g eas-cli

# Login to your Expo account
eas login

# Build a preview APK (directly installable on Android)
eas build --platform android --profile preview
```

The build runs in Expo's cloud. When done, EAS prints a download link for the `.apk` file.

For a Play Store release (`.aab`):
```bash
eas build --platform android --profile production
```

---

## Metro Config (pnpm)

Metro is configured in `metro.config.js` to follow pnpm symlinks:

```js
config.resolver.unstable_enableSymlinks = true;
config.watchFolders = [path.resolve(__dirname, 'node_modules/.pnpm')];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, 'node_modules/.pnpm'),
];
```

---

## License

MIT
