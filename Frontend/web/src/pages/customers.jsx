// Shoppers and what they've actually bought. A customer's own details are
// theirs to edit in the app; the admin can only block or unblock them.
import React from 'react';
import { Search } from 'lucide-react';
import { money } from '../api';
import { Badge, Empty } from '../ui';

export function CustomersPage({ customers, query, setQuery, busy, onBlock }) {
  const shown = customers.filter(c => `${c.name} ${c.phone || ''} ${c.email || ''}`.toLowerCase().includes(query.toLowerCase()));
  const newThisWeek = customers.filter(c => Date.now() - new Date(c.createdAt).getTime() < 7 * 86400000).length;
  const blockedCount = customers.filter(c => c.blocked).length;
  return <section className="panel">
    <div className="panel-heading">
      <div><h2>Customers <span className="count">{customers.length}</span></h2><p>{newThisWeek} joined in the last 7 days{blockedCount ? ` · ${blockedCount} blocked` : ''}</p></div>
      <div className="search"><Search size={17}/><input aria-label="Search customers" placeholder="Search by name, phone or email…" value={query} onChange={e => setQuery(e.target.value)}/></div>
    </div>
    <div className="table-scroll"><table>
      <thead><tr><th>Customer</th><th>Contact</th><th>Orders</th><th>Total spent</th><th>Last order</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>{shown.map(c => <tr key={c.id}>
        <td><strong>{c.name || 'Unnamed'}</strong></td>
        <td>{c.phone && <small>{c.phone}</small>}{c.phone && c.email && <br/>}{c.email && <small>{c.email}</small>}{!c.phone && !c.email && <small className="muted">Not on file</small>}</td>
        <td>{c.orderCount}</td>
        <td>{money(c.totalSpentPaise)}</td>
        <td><small>{c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString('en-IN') : '—'}</small></td>
        <td><small>{new Date(c.createdAt).toLocaleDateString('en-IN')}</small></td>
        <td>{c.blocked ? <span className="badge red">Blocked</span> : <Badge>Active</Badge>}</td>
        <td><div className="row-actions">
          <button className={c.blocked ? '' : 'danger-text'} disabled={busy} onClick={() => onBlock(c, !c.blocked)}>{c.blocked ? 'Unblock' : 'Block'}</button>
        </div></td>
      </tr>)}</tbody>
    </table></div>
    {!shown.length && <Empty text={customers.length ? 'No customers found' : 'Your first customer will show up here'}/>}
  </section>;
}
