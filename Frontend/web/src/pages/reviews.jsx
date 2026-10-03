// Every review shoppers have left. The admin can't edit a customer's words,
// only take a fake or abusive review down.
import React from 'react';
import { Search, Star, Plus } from 'lucide-react';
import { Button, Empty, ProductImage } from '../ui';

export function ReviewsPage({ reviews, query, setQuery, busy, onAdd, onRemove }) {
  const q = query.toLowerCase();
  const shown = reviews.filter(r => `${r.product?.name} ${r.authorName || r.user?.name || ''} ${r.comment} ${r.product?.seller?.shopName || ''}`.toLowerCase().includes(q));
  const low = reviews.filter(r => r.rating <= 2).length;
  return <section className="panel">
    <div className="panel-heading">
      <div><h2>Reviews <span className="count">{reviews.length}</span></h2><p>{low} rated 2 stars or less</p></div>
      <div className="row-actions" style={{ gap: 14 }}>
        <div className="search"><Search size={17}/><input aria-label="Search reviews" placeholder="Search product, customer, seller or text…" value={query} onChange={e => setQuery(e.target.value)}/></div>
        {onAdd && <Button onClick={onAdd}><Plus size={16}/>Add review</Button>}
      </div>
    </div>
    <div className="table-scroll"><table>
      <thead><tr><th>Product</th><th>Customer</th><th>Rating</th><th>Review</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody>{shown.map(r => <tr key={r.id}>
        <td><div className="product-cell"><ProductImage product={r.product || {}}/><div><strong>{r.product?.name}</strong><small>{r.product?.seller?.shopName || 'NTSA'}</small></div></div></td>
        <td><strong>{r.authorName || r.user?.name || 'Customer'}</strong>{r.user?.phone ? <small>{r.user.phone}</small> : !r.userId && <small className="muted">Added by admin</small>}</td>
        <td><span className={r.rating <= 2 ? 'badge red' : 'badge green'} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Star size={11}/>{r.rating}</span></td>
        <td style={{ maxWidth: 360 }}>{r.comment || <small className="muted">No text</small>}{r.images?.length > 0 && <small>{r.images.length} photo(s)</small>}</td>
        <td><small>{new Date(r.createdAt).toLocaleDateString('en-IN')}</small></td>
        <td><div className="row-actions"><button className="danger-text" disabled={busy} onClick={() => onRemove(r)}>Remove</button></div></td>
      </tr>)}</tbody>
    </table></div>
    {!shown.length && <Empty text={reviews.length ? 'No reviews found' : 'No reviews yet'}/>}
  </section>;
}
