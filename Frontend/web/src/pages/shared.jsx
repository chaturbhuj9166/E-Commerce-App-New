// Small pieces more than one admin page reuses.
import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { money } from '../api';
import { Badge, Empty } from '../ui';

export function OrderTable({ orders, onOpen }) {
  return orders.length ? <div className="table-scroll"><table>
    <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th><th/></tr></thead>
    <tbody>{orders.map(o => <tr key={o.id}>
      <td><strong>#{o.id.slice(-8).toUpperCase()}</strong><small>{o.vendorId ? 'Wholesale' : 'Customer'} · {o.items.length} item(s)</small></td>
      <td>{o.address?.name || <span className="muted">—</span>}</td>
      <td>{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
      <td>{money(o.totalPaise)}</td>
      <td><Badge>{o.status}</Badge></td>
      <td><button className="icon-button" aria-label={`Open order ${o.id}`} onClick={() => onOpen(o)}><ArrowUpRight size={17}/></button></td>
    </tr>)}</tbody>
  </table></div> : <Empty text="Ready for your first order"/>;
}
