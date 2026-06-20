// Design tokens from StoreFlow handoff
export const LT = {
  bg: '#EEF2F7',
  surface: '#FFFFFF',
  s2: '#F8FAFC',
  border: '#E2E8F0',
  line: '#EEF2F7',
  t1: '#0D1B2E',
  t2: '#4A5568',
  t3: '#A0ADB8',
  blue: '#2563EB',
  blueD: '#1D4ED8',
  blueL: '#EFF6FF',
  green: '#059669',
  greenL: '#ECFDF5',
  amber: '#D97706',
  amberL: '#FEF3C7',
  red: '#DC2626',
  redL: '#FEF2F2',
  purple: '#7C3AED',
  purpleL: '#F5F3FF',
  isDark: false as const,
};

export const DT = {
  bg: '#0F1923',
  surface: '#182334',
  s2: '#1E2D42',
  border: '#2A3F58',
  line: '#182334',
  t1: '#E8F0FE',
  t2: '#7A96B8',
  t3: '#435B75',
  blue: '#5BA4F5',
  blueD: '#3B82F6',
  blueL: 'rgba(91,164,245,0.12)',
  green: '#34D399',
  greenL: 'rgba(52,211,153,0.12)',
  amber: '#FBBF24',
  amberL: 'rgba(251,191,36,0.10)',
  red: '#F87171',
  redL: 'rgba(248,113,113,0.12)',
  purple: '#A78BFA',
  purpleL: 'rgba(167,139,250,0.14)',
  isDark: true as const,
};

export type Theme = {
  bg: string; surface: string; s2: string; border: string; line: string;
  t1: string; t2: string; t3: string;
  blue: string; blueD: string; blueL: string;
  green: string; greenL: string;
  amber: string; amberL: string;
  red: string; redL: string;
  purple: string; purpleL: string;
  isDark: boolean;
};

export const space = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24,
};

export const radius = {
  sm: 8, md: 10, lg: 14, xl: 18, xxl: 22, full: 9999,
};

export const type = {
  h1: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 20, fontWeight: '700' as const },
  h4: { fontSize: 17, fontWeight: '700' as const },
  h5: { fontSize: 15, fontWeight: '700' as const },
  body1: { fontSize: 14, fontWeight: '500' as const },
  body2: { fontSize: 13, fontWeight: '400' as const },
  label: { fontSize: 11, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.6 },
  mono: { fontSize: 13 },
};

export const shadow = {
  card: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  fab: {
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },
};
