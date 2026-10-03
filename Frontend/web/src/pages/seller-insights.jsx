// Every seller's whole picture in one place: what they've listed, how often
// each product was ordered, what they've sold, and how much came back as
// refunds. Expand a seller to see the per-product breakdown.
import React, { useState } from 'react';
import { Search, ChevronRight, Package, RotateCcw, ShoppingBag, TrendingUp } from 'lucide-react';
import { money } from '../api';
import { Badge, Empty, ProductImage } from '../ui';

export function SellerInsightsPage({ insights, query, setQuery, openSellerDashboard }) {
  const [open, setOpen] = useState(null);
  const q = query.toLowerCase();
  const shown = insights.filter(s => `${s.shopName} ${s.ownerName}`.toLowerCase().includes(q));
  const totals = insights.reduce((t, s) => ({ revenue: t.revenue + s.revenuePaise, units: t.units + s.unitsSold, refunds: t.refunds + s.refunds }), { revenue: 0, units: 0, refunds: 0 });
  return <section className="panel">
    <div className="panel-heading">
      <div><h2>Seller insights <span className="count">{insights.length}</span></h2><p>{money(totals.revenue)} sold · {totals.units} units · {totals.refunds} refunds across all sellers</p></div>
      <div className="search"><Search size={17}/><input aria-label="Search sellers" placeholder="Search by shop or owner…" value={query} onChange={e => setQuery(e.target.value)}/></div>
    </div>
    <div className="table-scroll"><table>
      <thead><tr><th></th><th>Shop</th><th>Products</th><th>Orders</th><th>Units sold</th><th>Revenue</th><th>Refunds</th><th>Commission</th><th>Actions</th></tr></thead>
      <tbody>{shown.map(s => <React.Fragment key={s.id}>
        <tr style={{ cursor: 'pointer' }} onClick={() => setOpen(open === s.id ? null : s.id)}>
          <td><ChevronRight size={16} style={{ transform: open === s.id ? 'rotate(90deg)' : 'none', transition: 'transform .15s', color: '#8a969d' }}/></td>
          <td><strong>{s.shopName}</strong><small>{s.ownerName}{!s.enabled && ' · frozen'}</small></td>
          <td>{s.productCount}</td>
          <td>{s.orders}<small>{s.orderLines} line(s)</small></td>
          <td>{s.unitsSold}</td>
          <td><strong>{money(s.revenuePaise)}</strong></td>
          <td>{s.refunds ? <span className="danger-text">{s.refunds}{s.refundsApproved ? ` (${s.refundsApproved} approved)` : ''}</span> : <small className="muted">0</small>}</td>
          <td>{s.commissionPercent}%{s.penaltyPaise ? <small className="danger-text">{money(s.penaltyPaise)} penalty</small> : null}</td>
          <td><div className="row-actions" onClick={e => e.stopPropagation()}>{openSellerDashboard && <button onClick={() => openSellerDashboard(s)}>Open panel</button>}</div></td>
        </tr>
        {open === s.id && <tr><td colSpan={9} style={{ background: '#fafbfc', padding: 0 }}>
          {s.products.length ? <div style={{ padding: '6px 20px 14px 52px' }}>
            <table><thead><tr><th>Product</th><th>Times ordered</th><th>Units</th><th>Revenue</th><th>Refunds</th><th>In stock</th></tr></thead>
              <tbody>{s.products.map(p => <tr key={p.productId}>
                <td><div className="product-cell"><ProductImage product={{ images: p.image ? [p.image] : [], name: p.name }}/><div><strong>{p.name}</strong>{!p.active && <small className="muted">No longer listed</small>}</div></div></td>
                <td>{p.timesOrdered}</td>
                <td>{p.units}</td>
                <td>{money(p.revenuePaise)}</td>
                <td>{p.refunds ? <span className="danger-text">{p.refunds}</span> : <small className="muted">0</small>}</td>
                <td>{p.stock === null ? <small className="muted">—</small> : <Badge>{p.stock} units</Badge>}</td>
              </tr>)}</tbody>
            </table>
          </div> : <div style={{ padding: '18px 52px', color: '#91a3ad', fontSize: 12 }}>This seller has no products yet.</div>}
        </td></tr>}
      </React.Fragment>)}</tbody>
    </table></div>
    {!shown.length && <Empty text={insights.length ? 'No sellers found' : 'No sellers yet'}/>}
  </section>;
}
