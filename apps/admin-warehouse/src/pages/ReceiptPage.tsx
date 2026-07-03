import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, t } from '@jomboy/ui-web';
import { defaultExpiryDate, DEMO_ASL, savePlacementsLocal, type PlacementRec } from '../wms-utils';

interface PoItem {
  sku_id: string;
  name: string;
  barcode: string;
  expected_qty: number;
  zone: string;
  is_marked: boolean;
  min_expiry_days: number;
}

interface PurchaseOrder {
  id: string;
  supplier: string;
  status: string;
  items: PoItem[];
}

export function ReceiptPage() {
  const navigate = useNavigate();
  const [poNumber, setPoNumber] = useState('');
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [supplier, setSupplier] = useState('');
  const [items, setItems] = useState<PoItem[]>([]);
  const [barcode, setBarcode] = useState('');
  const [aslCode, setAslCode] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [expiryDate, setExpiryDate] = useState(defaultExpiryDate());
  const [frozenTemp, setFrozenTemp] = useState('-18');
  const [scannedBarcodes, setScannedBarcodes] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [escalation, setEscalation] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<PlacementRec[]>([]);
  const [done, setDone] = useState(false);

  const { data: poData } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => api<{ purchase_orders: PurchaseOrder[] }>('/wms/purchase-orders?status=open'),
  });

  const purchaseOrders = poData?.purchase_orders ?? [];
  const selectedPo = purchaseOrders.find((p) => p.id === poNumber) ?? purchaseOrders[0];
  const currentItem = items.find((i) => i.barcode === barcode) ?? items.find((i) => !scannedBarcodes.has(i.barcode));
  const hasFrozen = items.some((i) => i.zone === 'C');
  const progress = items.length ? (scannedBarcodes.size / items.length) * 100 : 0;

  const pickItem = (item: PoItem) => {
    setBarcode(item.barcode);
    setQuantity(item.expected_qty);
    setError('');
    if (item.is_marked) setAslCode(DEMO_ASL);
    if (item.zone === 'A') setExpiryDate(defaultExpiryDate(item.min_expiry_days + 3));
  };

  const startReceipt = async () => {
    const po = poNumber || selectedPo?.id;
    if (!po) return;
    setError('');
    try {
      const res = await api<{
        receipt_id: string;
        po_number: string;
        supplier: string;
        expected_items: PoItem[];
      }>('/admin/warehouse/receipts', {
        method: 'POST',
        body: JSON.stringify({ po_number: po }),
      });
      setPoNumber(res.po_number);
      setReceiptId(res.receipt_id);
      setSupplier(res.supplier);
      setItems(res.expected_items);
      setScannedBarcodes(new Set());
      setDone(false);
      setRecommendations([]);
      if (res.expected_items[0]) pickItem(res.expected_items[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка PO');
    }
  };

  const scanItem = async () => {
    if (!receiptId || !barcode) return;
    setError('');
    setEscalation(null);
    try {
      const res = await api<{ ok: boolean; escalate_to_director?: boolean }>(
        `/admin/warehouse/receipts/${receiptId}/scan`,
        {
          method: 'POST',
          body: JSON.stringify({
            barcode,
            quantity,
            expiry_date: currentItem?.zone === 'A' ? expiryDate : undefined,
            asl_code: currentItem?.is_marked ? aslCode || DEMO_ASL : undefined,
            damage: false,
          }),
        },
      );
      setScannedBarcodes((prev) => new Set(prev).add(barcode));
      if (res.escalate_to_director) {
        setEscalation('Расхождение с PO > 5% — эскалация директору');
      }
      const next = items.find((i) => !scannedBarcodes.has(i.barcode) && i.barcode !== barcode);
      setBarcode('');
      setAslCode('');
      if (next) pickItem(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка скана');
    }
  };

  const complete = async () => {
    if (!receiptId) return;
    setError('');
    try {
      if (hasFrozen) {
        await api(`/admin/warehouse/receipts/${receiptId}/frozen-temp`, {
          method: 'POST',
          body: JSON.stringify({ temperature_c: Number(frozenTemp) }),
        });
      }
      const res = await api<{ placement_recommendations: PlacementRec[] }>(
        `/admin/warehouse/receipts/${receiptId}/complete`,
        { method: 'POST' },
      );
      const recs = res.placement_recommendations ?? [];
      setRecommendations(recs);
      savePlacementsLocal(recs);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось завершить');
    }
  };

  return (
    <div className="wms-page">
      <h1>{t('warehouse.receipt')}</h1>
      <p className="wms-muted" style={{ marginBottom: 16 }}>
        PO → скан EAN-13 → {t('warehouse.asl_belgi')} (если маркировано) → срок годности (зона A) → размещение
      </p>

      {error && <div className="card wms-alert">{error}</div>}
      {escalation && <div className="card wms-alert wms-alert--warn">{escalation}</div>}

      {!receiptId ? (
        <div className="card">
          <label>
            <strong>Заказ поставщику (PO)</strong>
            <select
              className="wms-field"
              value={poNumber || selectedPo?.id || ''}
              onChange={(e) => setPoNumber(e.target.value)}
            >
              {purchaseOrders.length === 0 && <option value="">Загрузка…</option>}
              {purchaseOrders.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.id} — {po.supplier} ({po.items.length} поз.)
                </option>
              ))}
            </select>
          </label>
          {selectedPo && (
            <ul style={{ fontSize: 14, color: '#757575', paddingLeft: 20 }}>
              {selectedPo.items.map((i) => (
                <li key={i.sku_id}>
                  {i.name} · {i.barcode} · зона {i.zone}
                  {i.is_marked && ' · АСЛ БЕЛГИ'}
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="wms-btn-block" onClick={startReceipt}>
            Начать приёмку
          </button>
        </div>
      ) : done ? (
        <div className="card wms-alert wms-alert--ok">
          <h2>✓ Приёмка завершена</h2>
          <p>Поставщик: <strong>{supplier}</strong> · PO: {poNumber}</p>
          <p className="wms-muted">Остатки обновлены в каталоге (stock.changed)</p>
          {recommendations.length > 0 && (
            <>
              <h3>Рекомендации размещения ({recommendations.length})</h3>
              <ul>
                {recommendations.map((r, i) => (
                  <li key={i}>
                    {r.barcode} → ячейка <strong>{r.cell_code}</strong> (зона {r.zone})
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="wms-btn-row">
            <button type="button" onClick={() => navigate('/placement')}>
              Перейти к размещению
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setReceiptId(null);
                setDone(false);
              }}
            >
              Новая приёмка
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="card">
            <p>
              <strong>{supplier}</strong> · PO {poNumber} · {scannedBarcodes.size}/{items.length} позиций
            </p>
            <div className="wms-progress">
              <div className="wms-progress__bar" style={{ width: `${progress}%` }} />
            </div>

            {hasFrozen && (
              <label>
                Температура заморозки при приёмке (°C, ≤ −15)
                <input
                  type="number"
                  className="wms-field"
                  value={frozenTemp}
                  onChange={(e) => setFrozenTemp(e.target.value)}
                  placeholder="-18"
                />
              </label>
            )}

            <input
              className="wms-field wms-field--scan"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Скан EAN-13"
              onKeyDown={(e) => e.key === 'Enter' && scanItem()}
            />

            {currentItem?.is_marked && (
              <input
                className="wms-field"
                value={aslCode}
                onChange={(e) => setAslCode(e.target.value)}
                placeholder={`${t('warehouse.asl_belgi')} (0104600…)`}
              />
            )}

            {currentItem?.zone === 'A' && (
              <label>
                Срок годности (мин. {currentItem.min_expiry_days} дн.)
                <input
                  type="date"
                  className="wms-field"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </label>
            )}

            <label>
              Количество
              <input
                type="number"
                className="wms-field"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </label>

            <button type="button" className="wms-btn-block" onClick={scanItem}>
              Сканировать позицию
            </button>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3>Позиции PO</h3>
            {items.map((item) => {
              const isDone = scannedBarcodes.has(item.barcode);
              return (
                <div
                  key={item.sku_id}
                  className={`wms-item wms-row${isDone ? ' wms-item--done' : ''}`}
                  style={{ cursor: isDone ? 'default' : 'pointer' }}
                  onClick={() => !isDone && pickItem(item)}
                  onKeyDown={(e) => e.key === 'Enter' && !isDone && pickItem(item)}
                  role="button"
                  tabIndex={0}
                >
                  <div>
                    <strong>{item.name}</strong>
                    {isDone && ' ✓'}
                    <div className="wms-muted" style={{ fontSize: 14 }}>
                      {item.barcode} · qty {item.expected_qty} · зона {item.zone}
                      {item.is_marked && ' · 🏷 АСЛ БЕЛГИ'}
                    </div>
                  </div>
                  {!isDone && (
                    <button type="button" className="secondary" onClick={(e) => { e.stopPropagation(); pickItem(item); }}>
                      Выбрать
                    </button>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              className="wms-btn-block"
              onClick={complete}
              disabled={scannedBarcodes.size === 0}
            >
              Завершить приёмку ({scannedBarcodes.size}/{items.length})
            </button>
          </div>
        </>
      )}
    </div>
  );
}
