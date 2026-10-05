import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LayoutDashboard, Package, ShoppingBag, LogOut, Plus, ArrowUpRight, ChevronRight, Check, Menu, ShieldCheck, Wallet, Store, Search, BadgeCheck, Truck, Image, X, Percent, PackageCheck, BarChart3, PieChart } from 'lucide-react';
import { api, money, paise, suggestCategory } from './api';
import { Button, Field, PasswordField, Badge, Empty, Modal, Stat, ProductImage, CONDITION_LABEL } from './ui';
import './style.css';

// The refurbished/used grades a shopper can be offered, cheapest intent first.
const GRADES = ['Fair', 'Good', 'Superb'];

/// The seller panel: its own site, signed into with the username and
/// password the NTSA admin hands out. A shop only ever sees its own stock
/// and its own sales here.
function App() {
  // An admin's "View dashboard" opens this site with ?token=... -- a real
  // seller-role token, so this just signs the browser in with it like any
  // other session, then drops it from the address bar.
  const [session, setSession] = useState(() => {
    const url = new URL(window.location.href);
    const fromAdmin = url.searchParams.get('token');
    if (fromAdmin) {
      sessionStorage.setItem('ntsa-token', fromAdmin);
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      return fromAdmin;
    }
    return sessionStorage.getItem('ntsa-token');
  });
  const [me, setMe] = useState(null), [page, setPage] = useState('Overview'), [penalties, setPenalties] = useState([]);
  const [products, setProducts] = useState([]), [orders, setOrders] = useState([]), [summary, setSummary] = useState(null), [categories, setCategories] = useState([]);
  const [error, setError] = useState(''), [toast, setToast] = useState(''), [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false), [modal, setModal] = useState(null), [query, setQuery] = useState(''), [mobileNav, setMobileNav] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState(null);

  function logout() { sessionStorage.removeItem('ntsa-token'); setSession(null); setMe(null); setModal(null); setError(''); }
  async function load() {
    setLoading(true);
    try {
      const [account, p, o, s, c, pen] = await Promise.all([api('/me'), api('/seller/products'), api('/seller/orders'), api('/seller/summary'), api('/categories'), api('/seller/penalties')]);
      setMe(account); setProducts(p); setOrders(o); setSummary(s); setCategories(c); setPenalties(pen);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { if (session) load(); }, [session]);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timer); } }, [toast]);
  // Keeps every page live without a manual refresh -- orders and the summary
  // are what change under a seller, and only in the tab that's on screen (the
  // API rate-limits per IP). Paused while a modal is open so a reload never
  // yanks a form out from under someone mid-edit.
  async function refresh() {
    const [o, s] = await Promise.all([api('/seller/orders'), api('/seller/summary')]);
    setOrders(o); setSummary(s);
  }
  const pollingRef = useRef(false);
  useEffect(() => {
    if (!session) return;
    const busyNow = () => pollingRef.current || modal || cancelOrderId || document.hidden;
    const tick = async () => {
      if (busyNow()) return;
      pollingRef.current = true;
      // A missed background poll isn't worth an error banner; the next one retries.
      try { await refresh(); } catch {} finally { pollingRef.current = false; }
    };
    const id = setInterval(tick, 10000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, [session, modal, cancelOrderId]);
  async function action(fn, message = 'Changes saved') {
    if (busy) return; setBusy(true); setError('');
    try { await fn(); setToast(message); await load(); setModal(null); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  if (!session) return <Login onLogin={token => { sessionStorage.setItem('ntsa-token', token); setSession(token); }}/>;
  // A line needs packing once it's PLACED and this shop hasn't ticked it off
  // yet -- NTSA's own stock never shows up here, only ever the seller's own.
  const toPack = orders.filter(o => o.status === 'PLACED' && !o.packedAt);
  const nav = [['Overview', LayoutDashboard], ['My products', Package], ['My orders', ShoppingBag], ['To pack', PackageCheck]];
  const shown = products.filter(p => `${p.name} ${p.category?.name}`.toLowerCase().includes(query.toLowerCase()));
  function go(name) { setPage(name); setQuery(''); setMobileNav(false); }

  return <div className="app-shell">
    <aside className={mobileNav ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><img className="brand-logo" src="/ntsa_logo.png" alt="NTSA"/></div>
      <div className="workspace-label">SELLER WORKSPACE</div>
      <nav>{nav.map(([name, Icon]) => <button key={name} className={page === name ? 'nav-item active' : 'nav-item'} onClick={() => go(name)}><Icon size={19}/><span>{name}</span>{name === 'My orders' && orders.length > 0 && <small>{orders.length}</small>}{name === 'To pack' && toPack.length > 0 && <small>{toPack.length}</small>}</button>)}</nav>
      <div className="sidebar-note"><ShieldCheck size={24}/><strong>{me?.onHoliday ? 'You are on holiday.' : 'Your shop on NTSA.'}</strong><p>{me?.onHoliday ? 'Your products are hidden from shoppers until you come back.' : 'Going away? Put your shop on hold so no new orders come in.'}</p><button className="text-button" style={{ color: me?.onHoliday ? '#ffb45d' : '#86a4b5', marginTop: 10 }} disabled={busy} onClick={() => action(() => api('/seller/holiday', { method: 'POST', body: { onHoliday: !me?.onHoliday } }), me?.onHoliday ? 'Welcome back — your shop is live' : 'Your shop is on holiday')}>{me?.onHoliday ? 'End holiday & go live' : 'Go on holiday'}</button></div>
      <button className="nav-item signout" onClick={logout}><LogOut size={18}/>Sign out</button>
    </aside>
    <div className="main">
      <header className="topbar">
        <div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(!mobileNav)}><Menu/></button><span>Seller</span><ChevronRight size={14}/><strong>{page}</strong></div>
        <div className="account">
          {(me?.gstVerified || me?.aadharVerified) && <span className="badge green"><BadgeCheck size={12}/> Verified</span>}
          <span className="online-dot"/><span>{me?.shopName || 'Your shop'}</span>
          <span className="avatar">{(me?.shopName || 'S').slice(0, 2).toUpperCase()}</span>
        </div>
      </header>
      <main className="content">
        <div className="page-heading">
          <div>
            <div className="eyebrow">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            <h1>{page === 'Overview' ? 'A good day to sell.' : page}</h1>
            {page === 'Overview' && <p>Here's how your shop is doing on NTSA.</p>}
          </div>
          {page === 'My products' && <Button onClick={() => setModal({ data: null })}><Plus size={17}/>Add product</Button>}
        </div>
        {me?.onHoliday && <div className="holiday-banner"><Truck size={18}/><span><strong>You're on holiday.</strong> Your products are hidden from shoppers. Existing orders still need to be packed and delivered.</span><Button disabled={busy} onClick={() => action(() => api('/seller/holiday', { method: 'POST', body: { onHoliday: false } }), 'Welcome back — your shop is live')}>End holiday</Button></div>}
        {error && <div role="alert" className="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss">✕</button></div>}
        {loading && !me ? <Empty text="Loading your shop…"/> : <>

          {page === 'Overview' && <>
            <section className="hero">
              <div>
                <div className="hero-kicker"><span/> YOUR SHOP, AT A GLANCE</div>
                <h2>{me?.shopName || 'Your shop'}</h2>
                <p>{summary?.products ?? 0} product(s) listed · {summary?.orders ?? 0} order(s) so far.</p>
                <Button onClick={() => go('My products')}>Manage your products<ArrowUpRight size={17}/></Button>
              </div>
              <div className="hero-art" aria-hidden="true"><div className="orbit"/><div className="parcel parcel-back"/><div className="parcel parcel-front"><Store size={52} strokeWidth={1.2}/></div><div className="art-tag"><Check size={15}/>Selling on NTSA</div><span className="sparkle">✦</span></div>
            </section>
            <div className="stats">
              <Stat icon={Wallet} label="Earned" value={money(summary?.earnedPaise)} note={summary?.penaltyPaise ? `After NTSA's commission and ${money(summary.penaltyPaise)} in penalties` : "After NTSA's commission, from delivered orders"}/>
              <Stat icon={Percent} label="Commission paid" value={money(summary?.commissionPaise)} note={`NTSA's ${summary?.commissionPercent ?? 0}% on delivered orders`}/>
              <Stat icon={Truck} label="On the way" value={money(summary?.awaitingPaise)} note="Ordered, not yet delivered"/>
              <Stat icon={ShoppingBag} label="Pieces sold" value={summary?.piecesSold ?? 0} note={`Across ${summary?.orders ?? 0} order(s)`}/>
              <Stat icon={Package} label="Products listed" value={summary?.products ?? 0} note={`${summary?.outOfStock ?? 0} out of stock`}/>
            </div>
            <div className="chart-grid">
              <section className="panel">
                <div className="panel-heading"><div><h2>Sales, last 14 days</h2><p>What buyers ordered from your shop each day</p></div><BarChart3 size={20}/></div>
                <SalesChart orders={orders}/>
              </section>
              <section className="panel">
                <div className="panel-heading"><div><h2>Order status</h2><p>Where your orders stand right now</p></div><PieChart size={20}/></div>
                <StatusDonut orders={orders}/>
              </section>
            </div>
            <div className="chart-grid" style={{ marginBottom: 22 }}>
              <section className="panel">
                <div className="panel-heading"><div><h2>Settlement</h2><p>How your delivered sales become what NTSA pays you</p></div><Wallet size={20}/></div>
                <div style={{ padding: '18px 24px' }}>
                  <div className="settle-row"><span>Delivered sales (gross)</span><strong>{money(summary?.deliveredGrossPaise)}</strong></div>
                  <div className="settle-row"><span>NTSA commission ({summary?.commissionPercent ?? 0}%)</span><span className="danger-text">− {money(summary?.commissionPaise)}</span></div>
                  <div className="settle-row"><span>Penalties</span><span className="danger-text">− {money(summary?.penaltyPaise)}</span></div>
                  <div className="settle-row settle-total"><strong>You get paid</strong><strong>{money(summary?.earnedPaise)}</strong></div>
                  <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>{money(summary?.awaitingPaise)} more is on the way (ordered, not yet delivered).</p>
                </div>
              </section>
              <section className="panel">
                <div className="panel-heading"><div><h2>Performance</h2><p>How your shop is doing — keep these healthy</p></div><BadgeCheck size={20}/></div>
                <div style={{ padding: '18px 24px' }}>
                  <div className="settle-row"><span>Shop rating</span><strong>{summary?.avgRating ? `★ ${summary.avgRating.toFixed(1)} (${summary.ratingCount})` : 'No reviews yet'}</strong></div>
                  <div className="settle-row"><span>Cancellation rate</span><strong className={summary?.cancelRate > 10 ? 'danger-text' : ''}>{summary?.cancelRate ?? 0}%</strong></div>
                  <div className="settle-row"><span>Refund/return rate</span><strong className={summary?.refundRate > 10 ? 'danger-text' : ''}>{summary?.refundRate ?? 0}%</strong></div>
                  <div className="settle-row"><span>Delivered orders</span><strong>{summary?.deliveredOrders ?? 0}</strong></div>
                  <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>A high cancellation or refund rate can lead to penalties. Pack on time and describe items accurately.</p>
                </div>
              </section>
            </div>
            {penalties.length > 0 && <section className="panel" style={{ marginBottom: 22, border: '1px solid #f0d2cc' }}>
              <div className="panel-heading"><div><h2>Penalties</h2><p>Fines NTSA has applied, and what each was for. These are deducted from your earnings.</p></div><strong className="danger-text">{money(summary?.penaltyPaise)}</strong></div>
              <div className="table-scroll"><table><thead><tr><th>Date</th><th>Amount</th><th>Reason</th></tr></thead>
                <tbody>{penalties.map(p => <tr key={p.id}><td><small>{new Date(p.createdAt).toLocaleDateString('en-IN')}</small></td><td><strong className="danger-text">{money(p.amountPaise)}</strong></td><td>{p.reason}</td></tr>)}</tbody>
              </table></div>
            </section>}
            <div className="overview-grid">
              <section className="panel">
                <div className="panel-heading"><div><h2>Recent orders</h2><p>Your latest sales</p></div><button className="text-button" onClick={() => go('My orders')}>View all<ArrowUpRight size={14}/></button></div>
                <OrderTable orders={orders.slice(0, 6)}/>
              </section>
              <section className="panel stock-panel">
                <div className="panel-heading"><div><h2>Stock watch</h2><p>What is running low</p></div><Package size={20}/></div>
                {products.length ? [...products].sort((a, b) => a.stock - b.stock).slice(0, 6).map(p => <div className="stock-row" key={p.id}>
                  <ProductImage product={p}/>
                  <div><strong>{p.name}</strong><small>{p.category?.name}</small></div>
                  <Badge>{p.stock === 0 ? 'Out of stock' : `${p.stock} left`}</Badge>
                </div>) : <Empty text="Add your first product"/>}
              </section>
            </div>
          </>}

          {page === 'My products' && <section className="panel">
            <div className="panel-heading">
              <div><h2>My products <span className="count">{products.length}</span></h2><p>Only your own stock. The NTSA team's products are not shown here.</p></div>
              <div className="search"><Search size={17}/><input aria-label="Search products" placeholder="Search products or categories…" value={query} onChange={e => setQuery(e.target.value)}/></div>
            </div>
            <div className="table-scroll"><table>
              <thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Returns</th><th>Actions</th></tr></thead>
              <tbody>{shown.map(p => <tr key={p.id}>
                <td><div className="product-cell"><ProductImage product={p}/><div><strong>{p.name}</strong><small>{p.category?.name}{p.condition && p.condition !== 'NEW' ? ` · ${CONDITION_LABEL[p.condition]}` : ''}</small></div></div></td>
                <td><strong>{money(p.pricePaise)}</strong>{p.mrpPaise ? <small>MRP {money(p.mrpPaise)}</small> : null}</td>
                <td><Badge>{p.stock === 0 ? 'Out of stock' : `${p.stock} units`}</Badge></td>
                <td>{p.refundWindowHours} hours<small>from {p.category?.name}</small></td>
                <td><div className="row-actions">
                  <button onClick={() => setModal({ data: p })}>Edit</button>
                  <button disabled={busy} onClick={() => action(() => api(`/seller/products/${p.id}/duplicate`, { method: 'POST' }), `Copied “${p.name}” — it's hidden; edit it, then it shows`)}>Duplicate</button>
                  <button className="danger-text" onClick={() => action(() => api(`/seller/products/${p.id}`, { method: 'DELETE' }), 'Product removed')}>Remove</button>
                </div></td>
              </tr>)}</tbody>
            </table></div>
            {!shown.length && <Empty text={products.length ? 'No products found' : 'Add the first thing you want to sell'}/>}
          </section>}

          {page === 'My orders' && <section className="panel">
            <div className="panel-heading"><div><h2>My orders <span className="count">{orders.length}</span></h2><p>Every line a buyer has ordered from your shop. NTSA packs and delivers.</p></div><button className="text-button" onClick={load}>Refresh</button></div>
            <OrderTable orders={orders} full onCancel={setCancelOrderId}/>
          </section>}

          {page === 'To pack' && <section className="panel">
            <div className="panel-heading"><div><h2>To pack <span className="count">{toPack.length}</span></h2><p>Pack your own lines and tick them off. NTSA still delivers everything.</p></div><button className="text-button" onClick={load}>Refresh</button></div>
            {toPack.length ? <div className="table-scroll"><table>
              <thead><tr><th>Item</th><th>Order</th><th>Customer</th><th>Qty</th><th>Action</th></tr></thead>
              <tbody>{toPack.map(o => <tr key={o.id}>
                <td><div className="product-cell">{o.image ? <img className="product-image" src={o.image} alt=""/> : <div className="product-image placeholder"><Package/></div>}<div><strong>{o.name}</strong>{(o.size || o.color) && <small>{[o.size, o.color].filter(Boolean).join(' · ')}</small>}</div></div></td>
                <td><strong>#{o.orderId.slice(-8).toUpperCase()}</strong><small>{new Date(o.placedAt).toLocaleDateString('en-IN')}</small></td>
                <td>{o.buyerName ? <><strong>{o.buyerName}</strong>{o.address && <small>{o.address.phone}<br/>{o.address.line1}, {o.address.city}, {o.address.state} {o.address.postalCode}</small>}</> : <span className="muted">—</span>}</td>
                <td>{o.quantity}</td>
                <td><Button disabled={busy} onClick={() => action(() => api(`/seller/orders/${o.id}/pack`, { method: 'POST' }), 'Marked packed')}><Check size={16}/>Mark packed</Button></td>
              </tr>)}</tbody>
            </table></div> : <Empty text="Nothing waiting on you right now"/>}
          </section>}
        </>}
        <footer>NTSA <span>·</span> Seller panel<span className="footer-right">Your shop, your customers</span></footer>
      </main>
    </div>
    {toast && <div role="status" className="toast"><Check size={18}/>{toast}</div>}
    {modal && <Modal title={modal.data ? 'Edit product' : 'New product'} close={() => !busy && setModal(null)}>
      {error && <div role="alert" className="alert">{error}</div>}
      <ProductEditor data={modal.data} categories={categories} busy={busy} onSubmit={body => action(
        () => api(`/seller/products${modal.data ? `/${modal.data.id}` : ''}`, { method: modal.data ? 'PUT' : 'POST', body }),
        modal.data ? 'Product updated' : 'Product added',
      )}/>
    </Modal>}
    {cancelOrderId && <Modal title="Cancel this order?" close={() => !busy && setCancelOrderId(null)}>
      {error && <div role="alert" className="alert">{error}</div>}
      <p className="muted">Only works when every line in this order is your own stock. Stock will be put back.</p>
      <form className="editor" onSubmit={e => {
        e.preventDefault();
        const reason = new FormData(e.target).get('reason');
        action(async () => { await api(`/seller/orders/${cancelOrderId}/cancel`, { method: 'POST', body: { reason } }); setCancelOrderId(null); }, 'Order cancelled, stock put back');
      }}>
        <Field label="Why is this order being cancelled?"><textarea name="reason" required maxLength={300} rows={2} placeholder="e.g. Out of stock"/></Field>
        <div style={{ display: 'flex', gap: 10 }}><Button secondary type="button" onClick={() => setCancelOrderId(null)}>Keep order</Button><Button disabled={busy}>Cancel this order</Button></div>
      </form>
    </Modal>}
  </div>;
}

// A dependency-free bar chart of the last 14 days' sales, drawn straight from
// the seller's own order lines (gross value, cancelled lines left out). Kept as
// inline SVG so the seller panel stays a tiny bundle with no chart library.
function SalesChart({ orders }) {
  const days = [];
  for (let i = 13; i >= 0; i--) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i); days.push(d); }
  const key = d => new Date(d).toISOString().slice(0, 10);
  const totals = Object.create(null);
  for (const o of orders) if (o.status !== 'CANCELLED') totals[key(o.placedAt)] = (totals[key(o.placedAt)] || 0) + (o.grossPaise ?? o.unitPaise * o.quantity);
  const data = days.map(d => ({ d, paise: totals[key(d)] || 0 }));
  const max = Math.max(1, ...data.map(x => x.paise));
  const total = data.reduce((s, x) => s + x.paise, 0);
  if (!total) return <Empty text="No sales in the last 14 days yet"/>;
  return <div className="bar-chart">
    <div className="bar-chart-total">{money(total)}<small>total, last 14 days</small></div>
    <div className="bars">{data.map((x, i) => <div key={i} className="bar-col" title={`${x.d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: ${money(x.paise)}`}>
      <div className="bar" style={{ height: `${Math.round((x.paise / max) * 100)}%` }}/>
      {(i % 2 === 0) && <small>{x.d.getDate()}</small>}
    </div>)}</div>
  </div>;
}
// Order-status mix as an SVG donut, one order counted once (by its id).
function StatusDonut({ orders }) {
  const COLORS = { PLACED: '#e0a63a', PACKED: '#3f86c7', DELIVERED: '#499b76', CANCELLED: '#b4544b' };
  const seen = new Set(), counts = {};
  for (const o of orders) { if (seen.has(o.orderId)) continue; seen.add(o.orderId); counts[o.status] = (counts[o.status] || 0) + 1; }
  const entries = Object.entries(counts).filter(([, n]) => n > 0);
  const total = entries.reduce((s, [, n]) => s + n, 0);
  if (!total) return <Empty text="No orders yet"/>;
  const R = 54, C = 2 * Math.PI * R; let offset = 0;
  return <div className="donut-wrap">
    <svg viewBox="0 0 140 140" className="donut">
      {entries.map(([st, n]) => { const frac = n / total, dash = `${frac * C} ${C}`, el = <circle key={st} cx="70" cy="70" r={R} fill="none" stroke={COLORS[st] || '#9aa8b0'} strokeWidth="18" strokeDasharray={dash} strokeDashoffset={-offset} transform="rotate(-90 70 70)"/>; offset += frac * C; return el; })}
      <text x="70" y="66" textAnchor="middle" className="donut-num">{total}</text>
      <text x="70" y="84" textAnchor="middle" className="donut-lbl">orders</text>
    </svg>
    <div className="donut-legend">{entries.map(([st, n]) => <div key={st} className="legend-row"><span className="dot" style={{ background: COLORS[st] || '#9aa8b0' }}/>{st.charAt(0) + st.slice(1).toLowerCase().replace('_', ' ')}<strong>{n}</strong></div>)}</div>
  </div>;
}
function OrderTable({ orders, full, onCancel }) {
  return orders.length ? <div className="table-scroll"><table>
    <thead><tr><th>Item</th><th>Order</th>{full && <th>Customer</th>}<th>Qty</th><th>Order value</th>{full && <th>You earn</th>}<th>Status</th>{full && onCancel && <th>Actions</th>}</tr></thead>
    <tbody>{orders.map(o => <tr key={o.id}>
      <td><div className="product-cell">{o.image ? <img className="product-image" src={o.image} alt=""/> : <div className="product-image placeholder"><Package/></div>}<div><strong>{o.name}</strong>{(o.size || o.color) && <small>{[o.size, o.color].filter(Boolean).join(' · ')}</small>}</div></div></td>
      <td><strong>#{o.orderId.slice(-8).toUpperCase()}</strong><small>{full ? new Date(o.placedAt).toLocaleDateString('en-IN') : `${o.buyerName || o.buyer} · ${new Date(o.placedAt).toLocaleDateString('en-IN')}`}</small></td>
      {full && <td>{o.buyerName ? <><strong>{o.buyerName}</strong>{o.address && <small>{o.address.phone}<br/>{o.address.line1}, {o.address.city}, {o.address.state} {o.address.postalCode}</small>}</> : <span className="muted">—</span>}</td>}
      <td>{o.quantity}</td>
      <td>{money(o.grossPaise ?? o.unitPaise * o.quantity)}{full && <small>{money(o.unitPaise)} each</small>}</td>
      {full && <td>{money(o.netPaise)}<small>{money(o.commissionPaise)} commission ({o.commissionPercent}%)</small></td>}
      <td><Badge>{o.status}</Badge></td>
      {full && onCancel && <td>{['PENDING_PAYMENT', 'PLACED'].includes(o.status) && <button className="danger-text" onClick={() => onCancel(o.orderId)}>Cancel order</button>}</td>}
    </tr>)}</tbody>
  </table></div> : <Empty text="Your first order will show up here"/>;
}

function Login({ onLogin }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <div className="login">
    <section className="login-story">
      <div className="brand"><img className="brand-logo" src="/ntsa_logo.png" alt="NTSA"/></div>
      <div>
        <div className="eyebrow">SELL WITH NTSA</div>
        <h1>Your shop.<br/><span>More customers.</span></h1>
        <p>List what you sell, and let NTSA bring the buyers,<br/>the packing and the delivery.</p>
        <div className="login-tags"><span><Check size={16}/>Your own stock</span><span><Check size={16}/>Your own sales</span></div>
      </div>
      <small>Shop smarter. Live better.</small>
    </section>
    <section className="login-form"><div>
      <div className="eyebrow">SELLER SIGN IN</div>
      <h2>Welcome back.</h2>
      <p>Use the seller ID and password the NTSA team gave you.</p>
      <form style={{ marginTop: 28 }} onSubmit={async e => {
        e.preventDefault(); setBusy(true); setError('');
        const data = new FormData(e.target);
        try {
          const r = await api('/auth/login', { method: 'POST', body: { role: 'SELLER', username: data.get('username'), password: data.get('password') } });
          onLogin(r.token);
        } catch (err) { setError(err.message); } finally { setBusy(false); }
      }}>
        <Field label="Seller ID" name="username" placeholder="Your assigned seller ID" required autoComplete="username"/>
        <PasswordField label="Password" name="password" placeholder="Enter your password" required autoComplete="current-password"/>
        {error && <div role="alert" className="alert">{error}</div>}
        <Button disabled={busy}>{busy ? 'Signing in…' : 'Sign in to your shop'}<ArrowUpRight size={18}/></Button>
      </form>
      <p className="login-help"><ShieldCheck size={17}/>Your account is created by the NTSA administrator.</p>
    </div></section>
  </div>;
}

/// The seller's product form. Deliberately smaller than the admin's: no
/// wholesale price, no "deal of the day", no choosing who sees it.
function ProductEditor({ data, categories, busy, onSubmit }) {
  const [images, setImages] = useState(data?.images?.join('\n') || ''), [uploading, setUploading] = useState(false), [error, setError] = useState('');
  const [categoryId, setCategoryId] = useState(data?.categoryId || '');
  const [showCondition, setShowCondition] = useState(!!data?.condition && data.condition !== 'NEW');
  const [condition, setCondition] = useState(data?.condition || 'NEW');
  // Refurbished/used grades are their own axis, priced like colours (an extra
  // over the base), so a product can have a capacity option, a colour AND a
  // condition grade all at once -- picking "Refurbished" no longer wipes out
  // the other options.
  const gradeMode = showCondition && condition !== 'NEW';
  const [grades, setGrades] = useState(data?.conditionGrades?.join(', ') || '');
  const gradeList = grades.split(',').map(x => x.trim()).filter(Boolean);
  const [gradeExtras, setGradeExtras] = useState(() => Object.fromEntries(Object.entries(data?.conditionGradeExtraPaise || {}).map(([k, v]) => [k, v / 100])));
  const setGradeExtra = (g, value) => setGradeExtras(p => ({ ...p, [g]: value }));
  const toggleGrade = g => setGrades(prev => {
    const picked = prev.split(',').map(x => x.trim()).filter(Boolean);
    const next = picked.includes(g) ? picked.filter(x => x !== g) : [...picked, g];
    return GRADES.filter(x => next.includes(x)).join(', ');
  });
  const allowsUsedStock = !!categories.find(c => c.id === categoryId)?.allowsUsedStock;
  const category = categories.find(c => c.id === categoryId);
  // A free, offline nudge from the product's own name/description, so a
  // shop doesn't end up filing a phone under Books. Only a suggestion --
  // shown while it disagrees with whatever category is actually picked.
  const [suggestion, setSuggestion] = useState(null);
  const checkSuggestion = form => setSuggestion(suggestCategory(`${form.name?.value || ''} ${form.description?.value || ''}`, categories));
  const [sizes, setSizes] = useState(data?.sizes?.join(', ') || '');
  const sizeList = sizes.split(',').map(x => x.trim()).filter(Boolean);
  const [sizePrices, setSizePrices] = useState(() => Object.fromEntries(Object.entries(data?.sizePrices || {}).map(([k, v]) => [k, { retail: v.pricePaise / 100, mrp: v.mrpPaise ? v.mrpPaise / 100 : '' }])));
  const setSizePrice = (size, key, value) => setSizePrices(p => ({ ...p, [size]: { ...p[size], [key]: value } }));
  const [colors, setColors] = useState(data?.colors?.join(', ') || '');
  const colorList = colors.split(',').map(x => x.trim()).filter(Boolean);
  const [colorExtras, setColorExtras] = useState(() => Object.fromEntries(Object.entries(data?.colorExtraPaise || {}).map(([k, v]) => [k, v / 100])));
  const setColorExtra = (color, value) => setColorExtras(p => ({ ...p, [color]: value }));
  const [colorImageMap, setColorImageMap] = useState(() => ({ ...(data?.colorImages || {}) }));
  const [uploadingColor, setUploadingColor] = useState(null);
  const uploadColorImage = async (color, file) => {
    setUploadingColor(color);
    try {
      const form = new FormData(); form.append('image', file);
      const r = await api('/seller/images', { method: 'POST', body: form });
      setColorImageMap(m => ({ ...m, [color]: r.url }));
    } catch (err) { setError(err.message); } finally { setUploadingColor(null); }
  };
  const applyExtra = (form, size, extra) => {
    const add = Number(extra);
    if (!Number.isFinite(add)) return;
    const retail = Number(form.retail?.value), mrp = Number(form.mrp?.value);
    if (!Number.isFinite(retail)) { setError('Fill in the price above first'); return; }
    setSizePrices(p => ({ ...p, [size]: { retail: (retail + add).toFixed(2), mrp: mrp > 0 ? (mrp + add).toFixed(2) : '' } }));
  };

  // The per-option / per-grade price grid. Shown in the options block for a
  // normal product, or right under the grade tick-boxes for a graded one.
  const priceTable = sizeList.length > 0 ? <Field label="Price per option — a bigger option should cost more. Type what it costs extra and the price fills in.">
    <div className="attribute-rows">
      {sizeList.map(s => <div className="option-price-row" key={s}>
        <strong>{s}</strong>
        <input type="number" step="0.01" placeholder="+ Extra ₹" aria-label={`${s} extra over the base price`} onChange={e => applyExtra(e.target.form, s, e.target.value)}/>
        <input type="number" min="0.01" step="0.01" placeholder="Price ₹" aria-label={`${s} price`} value={sizePrices[s]?.retail ?? ''} onChange={e => setSizePrice(s, 'retail', e.target.value)}/>
        <input type="number" min="0.01" step="0.01" placeholder="MRP ₹ (optional)" aria-label={`${s} MRP`} value={sizePrices[s]?.mrp ?? ''} onChange={e => setSizePrice(s, 'mrp', e.target.value)}/>
      </div>)}
    </div>
    {sizeList.some(s => String(sizePrices[s]?.retail ?? '').trim()) && sizeList.some(s => !String(sizePrices[s]?.retail ?? '').trim())
      ? <small className="danger-text">Price every option, or clear them all — a half-filled list is refused.</small>
      : sizeList.every(s => !String(sizePrices[s]?.retail ?? '').trim())
        ? <small>Every option costs the same right now. Is the bigger one really the same price?</small>
        : null}
  </Field> : null;
  return <form className="editor" onSubmit={e => {
    e.preventDefault(); setError('');
    const f = Object.fromEntries(new FormData(e.target));
    try {
      const optionPrices = Object.fromEntries(sizeList.filter(s => String(sizePrices[s]?.retail ?? '').trim()).map(s => {
        const o = sizePrices[s];
        // A seller sets one price; NTSA's wholesale rate is not theirs to set.
        return [s, { pricePaise: paise(o.retail), wholesalePaise: paise(o.retail), mrpPaise: String(o.mrp ?? '').trim() ? paise(o.mrp) : null }];
      }));
      const colorExtraPaise = Object.fromEntries(colorList.filter(c => Number(colorExtras[c]) > 0).map(c => [c, paise(colorExtras[c])]));
      const colorImagesOut = Object.fromEntries(colorList.filter(c => colorImageMap[c]).map(c => [c, colorImageMap[c]]));
      onSubmit({
        name: f.name, description: f.description, sku: f.sku?.trim() || null,
        pricePaise: paise(f.retail), wholesalePaise: paise(f.retail),
        mrpPaise: f.mrp ? paise(f.mrp) : null, marketPricePaise: f.market ? paise(f.market) : null,
        stock: Number(f.stock), categoryId: f.categoryId,
        images: images.split('\n').map(x => x.trim()).filter(Boolean),
        colors: colorList,
        sizes: sizeList, sizeLabel: f.sizeLabel?.trim() || 'Size',
        sizePrices: Object.keys(optionPrices).length ? optionPrices : null,
        colorExtraPaise: Object.keys(colorExtraPaise).length ? colorExtraPaise : null,
        colorImages: Object.keys(colorImagesOut).length ? colorImagesOut : null,
        conditionGrades: gradeMode ? gradeList : [],
        conditionGradeExtraPaise: gradeMode ? (() => { const m = Object.fromEntries(gradeList.filter(g => Number(gradeExtras[g]) > 0).map(g => [g, paise(gradeExtras[g])])); return Object.keys(m).length ? m : null; })() : null,
        attributes: [], audience: 'RETAIL',
        condition, conditionNote: f.conditionNote?.trim() || null,
      });
    } catch (err) { setError(err.message); }
  }}>
    <Field label="Product name" name="name" defaultValue={data?.name} required maxLength={100} onChange={e => checkSuggestion(e.target.form)}/>
    <Field label="Description"><textarea name="description" defaultValue={data?.description} required maxLength={5000} placeholder="What it is, what it's made of, what's in the box…" onChange={e => checkSuggestion(e.target.form)}/></Field>
    <Field label="SKU — your own stock code, optional" name="sku" defaultValue={data?.sku || ''} maxLength={60} placeholder="e.g. SHARMA-001"/>
    <div className="form-grid">
      <Field label="Selling price (₹)" name="retail" type="number" min="0.01" step="0.01" defaultValue={data ? data.pricePaise / 100 : ''} required/>
      <Field label="MRP (₹) — optional, shows a strikethrough discount" name="mrp" type="number" min="0.01" step="0.01" defaultValue={data?.mrpPaise ? data.mrpPaise / 100 : ''}/>
      <Field label="Market price (₹) — optional, what it sells for elsewhere" name="market" type="number" min="0.01" step="0.01" defaultValue={data?.marketPricePaise ? data.marketPricePaise / 100 : ''}/>
    </div>
    <div className="form-grid">
      <Field label="Stock quantity" name="stock" type="number" min="0" step="1" defaultValue={data?.stock ?? 0} required/>
      <Field label="Category">
        <select name="categoryId" value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
          <option value="" disabled>Select a category</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
    </div>
    {suggestion && suggestion.id !== categoryId && <p className="muted" style={{ marginTop: -10 }}>This sounds like it belongs in <strong>{suggestion.name}</strong>. <button type="button" className="text-button" style={{ display: 'inline', padding: 0 }} onClick={() => { setCategoryId(suggestion.id); setSuggestion(null); }}>Use this category</button></p>}
    {category && <p className="muted">Anything in {category.name} can be returned within {category.refundWindowHours} hours. NTSA sets that per category.</p>}
    <div className="form-grid">
      <Field label="Colours — comma separated, optional" name="colors" value={colors} onChange={e => setColors(e.target.value)} placeholder="Black, White, Blue"/>
      <Field label="Options (sizes, storage…) — comma separated, optional" name="sizes" value={sizes} onChange={e => setSizes(e.target.value)} placeholder="6, 7, 8  or  128GB, 256GB"/>
    </div>
    {colorList.length > 0 && <Field label="Colour price difference — optional. What a colour costs on top of the price above; leave blank when it costs the same.">
      <div className="attribute-rows">
        {colorList.map(c => <div className="option-price-row" key={c}>
          <strong>{c}</strong>
          <input type="number" min="0" step="0.01" placeholder="+ Extra ₹" aria-label={`${c} extra over the base price`} value={colorExtras[c] ?? ''} onChange={e => setColorExtra(c, e.target.value)}/>
        </div>)}
      </div>
    </Field>}
    {colorList.length > 0 && <Field label="Colour photos — optional. Shown to the shopper when they pick that colour.">
      <div className="attribute-rows">
        {colorList.map(c => <div className="color-image-row" key={c}>
          <strong>{c}</strong>
          {colorImageMap[c] ? <img className="product-image" src={colorImageMap[c]} alt={`${c} sample`}/> : <div className="product-image placeholder"><Image size={16}/></div>}
          <input type="file" accept="image/png,image/jpeg,image/webp" aria-label={`Upload a ${c} photo`} disabled={uploadingColor === c} onChange={e => { if (e.target.files[0]) uploadColorImage(c, e.target.files[0]); }}/>
          {colorImageMap[c] && <button type="button" className="icon-button" aria-label={`Remove ${c} photo`} onClick={() => setColorImageMap(m => { const n = { ...m }; delete n[c]; return n; })}><X size={16}/></button>}
        </div>)}
      </div>
    </Field>}
    {sizeList.length > 0 && <>
      <Field label="Option name shown to shoppers" name="sizeLabel" defaultValue={data?.sizeLabel || 'Size'} maxLength={30} placeholder="Size, Storage, Weight…" required/>
      {priceTable}
    </>}
    <Field label="Image URLs — one per line, up to 5"><textarea value={images} onChange={e => setImages(e.target.value)} placeholder="https://…"/></Field>
    <Field label={uploading ? 'Uploading…' : 'Or upload a photo (max 5 MB) — the NTSA logo is stamped on automatically'} type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={async e => {
      if (!e.target.files[0]) return;
      setUploading(true);
      try {
        if (images.split('\n').filter(Boolean).length >= 5) throw new Error('Maximum five images');
        const form = new FormData(); form.append('image', e.target.files[0]);
        const r = await api('/seller/images', { method: 'POST', body: form });
        setImages(v => [v, r.url].filter(Boolean).join('\n'));
      } catch (err) { setError(err.message); } finally { setUploading(false); }
    }}/>
    {!allowsUsedStock && !showCondition ? null : !showCondition
      ? <button type="button" className="button secondary" onClick={() => setShowCondition(true)}>Not brand-new stock? (refurbished / open box)</button>
      : <>
        <Field label="Condition"><select name="condition" value={condition} onChange={e => setCondition(e.target.value)}><option value="NEW">New</option><option value="REFURBISHED">Refurbished</option><option value="OPEN_BOX">Open box — unused, box opened</option><option value="USED">Used</option></select></Field>
        {gradeMode && <><Field label="Condition grades — tick the ones you're selling. The shopper picks one; Fair is the base price, better grades cost extra.">
          <div className="grade-picker">{GRADES.map(g => <label key={g} className="grade-chip"><input type="checkbox" checked={gradeList.includes(g)} onChange={() => toggleGrade(g)}/>{g}</label>)}</div>
        </Field>
        {gradeList.length > 0 && <Field label="Grade price difference — what each grade costs on top of the base price. Leave the cheapest (usually Fair) blank.">
          <div className="attribute-rows">{gradeList.map(g => <div className="option-price-row" key={g}><strong>{g}</strong><input type="number" min="0" step="0.01" placeholder="+ Extra ₹" aria-label={`${g} extra over the base price`} value={gradeExtras[g] ?? ''} onChange={e => setGradeExtra(g, e.target.value)}/></div>)}</div>
        </Field>}</>}
        <Field label="Condition note — shown to the shopper (optional)" name="conditionNote" defaultValue={data?.conditionNote || ''} maxLength={200} placeholder="e.g. Box opened for testing, product unused"/>
      </>}
    {error && <div role="alert" className="alert">{error}</div>}
    <Button disabled={busy || uploading}>{busy ? 'Saving…' : data ? 'Save changes' : 'Add product'}</Button>
  </form>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
