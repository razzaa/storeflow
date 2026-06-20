/**
 * Admin notifications are written to the `admin_notifications` node in RTDB
 * by the app owner directly in the Firebase Console.
 *
 * Node shape:
 *   admin_notifications/{id}: { title, body, createdAt, active }
 */

import { ref, get, query, orderByChild, limitToLast } from 'firebase/database';
import { rtdb } from './config';

export type AdminNotif = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
};

export async function fetchAdminNotifications(): Promise<AdminNotif[]> {
  try {
    const q = query(
      ref(rtdb, 'admin_notifications'),
      orderByChild('createdAt'),
      limitToLast(30)
    );
    const snap = await get(q);
    if (!snap.exists()) return [];

    const results: AdminNotif[] = [];
    snap.forEach((child) => {
      const d = child.val();
      if (d.active) {
        results.push({
          id: child.key!,
          title: d.title ?? '',
          body: d.body ?? '',
          createdAt: d.createdAt ?? Date.now(),
        });
      }
    });
    return results.reverse(); // newest first
  } catch {
    return [];
  }
}
