# Soft launch runbook (TZ §8.4 п.5)

## Preconditions

- [ ] `docker compose --profile prod-local up` — all 8 Go services healthy
- [ ] `npm run prod-local:health` green
- [ ] E2E-01…10 pass on staging
- [ ] Prometheus/Grafana dashboards imported
- [ ] On-call Telegram channel configured

## Cutover (staging → production Uztelecom)

1. Deploy K8s manifests from `deploy/k8s/` (8 services + Kong + Keycloak)
2. Run DB migrations per service
3. Seed catalog 3900 SKU + ES reindex: `scripts/catalog/es-index.sh`
4. Switch DNS / Kong upstream from mock to Go services
5. Enable Keycloak: `VITE_KEYCLOAK_ENABLED=true` on web panels

## 7-day monitoring (§8.7)

| Metric | Target |
|--------|--------|
| Orders/day | ≥ 200 |
| Payment success | ≥ 98% |
| API error rate | < 0.5% |
| Pick SLA | ≥ 95% within 15 min |
| SEV-1 incidents | 0 |

## Sign-off signatures

PM / Tech Lead / QA / CEO — see `docs/TZ-v1.0.md` Appendix D.
