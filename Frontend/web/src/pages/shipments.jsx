// Everything that has left the shelf: packed, on its way, or delivered.
// NTSA doesn't track a courier directly, so a "shipment" here is just an
// order once it's past packing -- the same order record, a later stage.
import React from 'react';
import { Package, Truck, MapPin, CheckCircle2 } from 'lucide-react';
import { money } from '../api';
import { Badge, Empty } from '../ui';

const STAGES = [
  { status: 'PACKED', label: 'Packed', icon: Package },
  { status: 'SHIPPED', label: 'Shipped', icon: Truck },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for delivery', icon: MapPin },
  { status: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 },
];

export function ShipmentsPage({ orders }) {
  const shipments = orders.filter(o => STAGES.some(s => s.status === o.status));
  const counts = Object.fromEntries(STAGES.map(s => [s.status, shipments.filter(o => o.status === s.status).length]));
  return <>
    <div className="stats">{STAGES.map(s => <section className="stat" key={s.status}>
      <div className="stat-top"><span>{s.label}</span><s.icon size={19}/></div>
      <strong>{counts[s.status]}</strong>
      <p>Orders {s.label.toLowerCase()}</p>
    </section>)}</div>
    <section className="panel">
      <div className="panel-heading"><div><h2>Shipments <span className="count">{shipments.length}</span></h2><p>Orders that have left packing, in order of most recent movement</p></div></div>
      <div className="table-scroll"><table>
        <thead><tr><th>Order</th><th>Customer</th><th>Deliver to</th><th>Stage</th><th>Updated</th></tr></thead>
        <tbody>{shipments.map(o => <tr key={o.id}>
          <td><strong>#{o.id.slice(-8).toUpperCase()}</strong><small>{money(o.totalPaise)} · {o.items.length} item(s)</small></td>
          <td>{o.address?.name}<br/><small>{o.address?.phone}</small></td>
          <td><small>{[o.address?.city, o.address?.state, o.address?.postalCode].filter(Boolean).join(', ')}</small></td>
          <td><Badge>{o.status}</Badge></td>
          <td><small>{new Date(o.deliveredAt || o.createdAt).toLocaleString('en-IN')}</small></td>
        </tr>)}</tbody>
      </table></div>
      {!shipments.length && <Empty text="Nothing has shipped yet"/>}
    </section>
  </>;
}
