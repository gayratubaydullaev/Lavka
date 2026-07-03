import { createAuditLog, appendAudit } from './audit-log.js';
import { createTariffState } from './tariffs.js';
import { createFraudHqState } from './fraud-hq.js';
import { DARKSTORES } from './darkstores.js';

export function createPhase4State() {
  const audit = createAuditLog();
  appendAudit(audit, { user_id: 'hq_admin', action: 'tariff.publish', payload: { version: 1 } });
  appendAudit(audit, { user_id: 'support_op', action: 'refund.approve', payload: { ticket_id: 'demo', amount: 18900 } });

  return {
    darkstores: DARKSTORES,
    audit,
    tariffs: createTariffState(),
    fraudHq: createFraudHqState(),
  };
}
