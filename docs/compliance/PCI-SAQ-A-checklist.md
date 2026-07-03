# PCI DSS SAQ-A Checklist (redirect payments)

**Статус:** documented  
**Scope:** Customer app Payme/Click WebView/redirect only — no card data on Jomboy servers.

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | No storage of cardholder data | Done | Redirect to Payme/Click |
| 2 | No processing of cardholder data on merchant systems | Done | Billing webhooks receive payment status only |
| 3 | All payment pages from PCI-compliant provider | Documented | Merchant agreements pending |
| 4 | SAQ-A attestation | Pending | QSA review post soft launch |
