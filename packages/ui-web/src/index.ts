/// <reference path="./env.d.ts" />
export { api, formatUzs, API_BASE, DARKSTORE_ID } from './api/client';
export type { Order, Ticket, DashboardData, GmvReport, OrderStatus } from './api/client';
export type { TimelineEvent, FraudProfile, AiSuggestion, AutoRefundEligibility } from './api/phase3';
export type {
  Darkstore,
  CohortReport,
  FunnelStep,
  BiSummary,
  TariffConfig,
  AuditEntry,
  FraudStats,
  BlockedOrder,
} from './api/phase4';
export { DARKSTORE_TASHKENT, DARKSTORE_SAMARKAND } from './api/phase4';
export { AuthProvider, useAuth, RoleGuard } from './auth/AuthContext';
export type { UserRole } from './auth/AuthContext';
export { AdminLayout } from './layout/AdminLayout';
export type { NavItem } from './layout/AdminLayout';
export { KpiCard, OrderStatusBadge, SlaTimer, DataTable } from './components/index';
export { LanguageSwitcher, t } from './components/LanguageSwitcher';
export { setLang, getLang } from './i18n';
