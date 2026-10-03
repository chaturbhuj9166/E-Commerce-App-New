// Small pieces more than one admin page reuses.
import React from 'react';
import { ArrowUpRight, Package } from 'lucide-react';
import { money } from '../api';
import { Badge, Empty } from '../ui';

// The distinct shops an order's items belong to; empty means it's all NTSA's
// own stock.
export const orderSellers = items => [...new Set(items.map(i => i.sellerName).filter(Boolean))];
export const isNtsaOwnOrder = order => orderSellers(order.items).length === 0;
// Who an order's items actually belong to -- NTSA's own stock, one seller,
// or several mixed in the same cart.
function sellerSummary(items) {
  const names = orderSellers(items);
  if (!names.length) return 'NTSA';
  if (names.length === 1) return names[0];
  return `${names[0]} +${names.length - 1} more`;
}

export function OrderTable({ orders, onOpen }) {
  return orders.length ? <div className="table-scroll"><table>
    <thead><tr><th>Order</th><th>Customer</th><th>Seller</th><th>Date</th><th>Amount</th><th>Status</th><th/></tr></thead>
    <tbody>{orders.map(o => <tr key={o.id}>
      <td><div className="product-cell">{o.items[0]?.image ? <img className="product-image" src={o.items[0].image} alt=""/> : <div className="product-image placeholder"><Package size={16}/></div>}<div><strong>#{o.id.slice(-8).toUpperCase()}</strong><small>{o.vendorId ? 'Wholesale' : 'Customer'} · {o.items.length} item(s)</small></div></div></td>
      <td>{o.address?.name || <span className="muted">—</span>}</td>
      <td><small>{sellerSummary(o.items)}</small></td>
      <td>{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
      <td>{money(o.totalPaise)}</td>
      <td><Badge>{o.status}</Badge></td>
      <td><button className="icon-button" aria-label={`Open order ${o.id}`} onClick={() => onOpen(o)}><ArrowUpRight size={17}/></button></td>
    </tr>)}</tbody>
  </table></div> : <Empty text="Ready for your first order"/>;
}
