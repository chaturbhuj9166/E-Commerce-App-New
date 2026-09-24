// The dealer-only catalogue. Stock added here never shows in the shopping
// app -- it is the bulk packs and dealer lots the wholesale portal sells.
import React from 'react';
import { Search, Store } from 'lucide-react';
import { money } from '../api';
import { Badge, Empty, Field, ProductImage, CONDITION_LABEL } from '../ui';

export function WholesaleProductsPage({ products, query, setQuery, onEdit, onRemove }) {
  const shown = products.filter(p => `${p.name} ${p.category?.name}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="panel">
    <div className="panel-heading">
      <div>
        <h2>Wholesale products <span className="count">{products.length}</span></h2>
        <p>Only your wholesale partners see these. Mark one “Shop and wholesale” to list it in the app as well.</p>
      </div>
      <div className="search"><Search size={17}/><input aria-label="Search wholesale products" placeholder="Search products or categories…" value={query} onChange={e => setQuery(e.target.value)}/></div>
    </div>
    <div className="table-scroll"><table>
      <thead><tr><th>Product</th><th>Wholesale rate</th><th>Retail price</th><th>Stock</th><th>Listed in</th><th>Actions</th></tr></thead>
      <tbody>{shown.map(p => <tr key={p.id}>
        <td><div className="product-cell"><ProductImage product={p}/><div><strong>{p.name}</strong><small>{p.category?.name}{p.condition && p.condition !== 'NEW' ? ` · ${CONDITION_LABEL[p.condition]}` : ''}</small></div></div></td>
        <td><strong>{money(p.wholesalePaise)}</strong>{p.sizes?.length ? <small>{p.sizes.length} {(p.sizeLabel || 'size').toLowerCase()} options</small> : null}</td>
        <td>{money(p.pricePaise)}{p.mrpPaise ? <small>MRP {money(p.mrpPaise)}</small> : null}</td>
        <td><Badge>{`${p.stock} units`}</Badge></td>
        <td><small>{p.audience === 'WHOLESALE' ? 'Wholesale only' : 'Shop and wholesale'}</small></td>
        <td><div className="row-actions"><button onClick={() => onEdit(p)}>Edit</button><button className="danger-text" onClick={() => onRemove(p)}>Remove</button></div></td>
      </tr>)}</tbody>
    </table></div>
    {!shown.length && <Empty text={products.length ? 'No products found' : 'Add the first product your partners can order'}/>}
  </section>;
}

/// Shown on the wholesale portal's own catalogue when there is nothing yet.
export function WholesaleEmpty() { return <div className="empty"><Store size={36}/><h3>Nothing to order yet</h3><p>Your NTSA contact will add wholesale stock shortly.</p></div>; }

/// The audience picker used by the product editor, so both product pages
/// describe the choice the same way.
export function AudienceField({ value }) {
  return <Field label="Where it is listed">
    <select name="audience" defaultValue={value}>
      <option value="RETAIL">Shop only — customers in the app</option>
      <option value="WHOLESALE">Wholesale only — partners in the portal</option>
      <option value="BOTH">Shop and wholesale</option>
    </select>
  </Field>;
}
