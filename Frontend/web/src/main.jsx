import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LayoutDashboard, Package, Shapes, Users, ShoppingBag, RotateCcw, LogOut, Search, Plus, ArrowUpRight, ChevronRight, Check, Menu, X, Truck, ShieldCheck, Wallet, Store, Image, Tag, Eye, EyeOff } from 'lucide-react';
import { api, money, paise } from './api';
import './style.css';

function Button({ children, secondary, ...props }) { return <button className={secondary ? 'button secondary' : 'button'} {...props}>{children}</button>; }
function Field({ label, children, ...props }) { return <label className="field"><span>{label}</span>{children || <input {...props}/>}</label>; }
function PasswordField({ label, ...props }) {
  const [visible, setVisible] = useState(false);
  return <label className="field"><span>{label}</span><div className="password-input"><input {...props} type={visible ? 'text' : 'password'}/><button type="button" className="icon-button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(v => !v)}>{visible ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>;
}
function Badge({ children }) { return <span className={`badge ${['DELIVERED', 'APPROVED', 'Active'].includes(children) ? 'green' : ['CANCELLED', 'REJECTED', 'Disabled'].includes(children) ? 'red' : ''}`}>{String(children).replaceAll('_', ' ')}</span>; }
function Empty({ text = 'Nothing here yet.' }) { return <div className="empty"><Package size={36}/><h3>{text}</h3><p>New activity will appear here.</p></div>; }
function Modal({ title, close, children }) { return <div className="overlay" onClick={close}><section role="dialog" aria-modal="true" aria-label={title} className="modal" onClick={e => e.stopPropagation()}><header><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={close}><X/></button></header>{children}</section></div>; }
function App() {
  const [session, setSession] = useState(() => sessionStorage.getItem('ntsa-token'));
  const [me, setMe] = useState(null), [page, setPage] = useState('Overview'), [error, setError] = useState(''), [toast, setToast] = useState('');
  const [products, setProducts] = useState([]), [categories, setCategories] = useState([]), [orders, setOrders] = useState([]), [vendors, setVendors] = useState([]), [refunds, setRefunds] = useState([]);
  const [banners, setBanners] = useState([]), [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [modal, setModal] = useState(null), [query, setQuery] = useState(''), [mobileNav, setMobileNav] = useState(false);
  const [cart, setCart] = useState({});
  const isAdmin = me?.role === 'ADMIN';
  function logout() { sessionStorage.removeItem('ntsa-token'); setSession(null); setMe(null); setCart({}); setModal(null); setError(''); }
  async function load() {
    setLoading(true);
    try {
      const account = await api('/me'); setMe(account);
      const [p, c, o] = await Promise.all([api(account.role === 'ADMIN' ? '/admin/products' : '/vendor/products'), api('/categories'), api('/orders')]);
      setProducts(p); setCategories(c); setOrders(o);
      if (account.role === 'ADMIN') { const [v, r, b, cp] = await Promise.all([api('/admin/vendors'), api('/admin/refunds'), api('/admin/banners'), api('/admin/coupons')]); setVendors(v); setRefunds(r); setBanners(b); setCoupons(cp); }
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { if (session) load(); }, [session]);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timer); } }, [toast]);
  async function action(fn, message = 'Changes saved') {
    if (busy) return; setBusy(true); setError('');
    try { await fn(); setToast(message); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  if (!session) return <Login onLogin={token => { sessionStorage.setItem('ntsa-token', token); setPage('Overview'); setSession(token); }}/ >;
  const nav = isAdmin ? [['Overview', LayoutDashboard], ['Products', Package], ['Categories', Shapes], ['Banners', Image], ['Coupons', Tag], ['Orders', ShoppingBag], ['Vendors', Users], ['Refunds', RotateCcw]] : [['Overview', LayoutDashboard], ['Wholesale catalog', Store], ['Orders', ShoppingBag]];
  const shown = products.filter(p => `${p.name} ${p.category?.name}`.toLowerCase().includes(query.toLowerCase()));
  const cartItems = products.filter(p => cart[p.id] > 0).map(p => ({ ...p, quantity: cart[p.id] }));
  const cartTotal = cartItems.reduce((sum, p) => sum + p.wholesalePaise * p.quantity, 0);
  const next = { PLACED: 'PACKED', PACKED: 'SHIPPED', SHIPPED: 'OUT_FOR_DELIVERY' };
  function go(name) { setPage(name); setQuery(''); setMobileNav(false); }
  return <div className="app-shell">
    <aside className={mobileNav ? 'sidebar open' : 'sidebar'}><div className="brand"><ShoppingBag/><span>N<span className="accent">T</span>SA<span className="brand-dot">.</span></span></div><div className="workspace-label">{isAdmin ? 'COMMERCE WORKSPACE' : 'WHOLESALE WORKSPACE'}</div>
      <nav>{nav.map(([name, Icon]) => <button key={name} className={page === name ? 'nav-item active' : 'nav-item'} onClick={() => go(name)}><Icon size={19}/><span>{name}</span>{name === 'Orders' && <small>{orders.length}</small>}</button>)}</nav>
      <div className="sidebar-note"><ShieldCheck size={24}/><strong>Everything in one place.</strong><p>{isAdmin ? 'Your products, partners and everyday operations.' : 'Better prices. Bigger possibilities.'}</p></div>
      <button className="nav-item signout" onClick={logout}><LogOut size={18}/>Sign out</button>
    </aside>
    <div className="main"><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(!mobileNav)}><Menu/></button><span>Workspace</span><ChevronRight size={14}/><strong>{page}</strong></div><div className="account"><span className="online-dot"/><span>{isAdmin ? 'Super Admin' : me?.name || 'Vendor'}</span><div className="avatar">{isAdmin ? 'SA' : 'WV'}</div></div></header>
      <main className="content">
        <div className="page-heading"><div><div className="eyebrow">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1>{page === 'Overview' ? 'A good day to grow.' : page}</h1><p>{({ Overview: 'Here’s what’s happening with your store today.', Products: 'A little care for every product on your shelf.', Categories: 'Make your collection easy to discover.', Banners: 'Control the Home screen banner without a code change.', Coupons: 'Create and manage discount codes.', Orders: 'From your shelf to their doorstep.', Vendors: 'Build stronger wholesale partnerships.', Refunds: 'Thoughtful resolutions. Happier customers.', 'Wholesale catalog': 'Stock up on quality. Save on every order.' })[page]}</p></div>
          {isAdmin && ['Products', 'Categories', 'Vendors', 'Banners', 'Coupons'].includes(page) && <Button onClick={() => setModal({ type: page, data: null })}><Plus size={17}/>Add {{ Categories: 'category', Banners: 'banner', Coupons: 'coupon' }[page] || page.slice(0, -1).toLowerCase()}</Button>}
          {!isAdmin && page === 'Wholesale catalog' && <Button disabled={!cartItems.length} onClick={() => setModal({ type: 'Checkout' })}><ShoppingBag size={18}/>Checkout · {money(cartTotal)}</Button>}
        </div>
        {error && <div role="alert" className="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}
        {loading && !me ? <div className="empty">Loading workspace…</div> : <>
          {page === 'Overview' && <><section className="hero"><div><div className="hero-kicker"><span/> YOUR BUSINESS, AT A GLANCE</div><h2>Small details.<br/>Big possibilities.</h2><p>{isAdmin ? 'Keep your shelves ready and your customers happy.' : `Your order range: ${money(me?.limits?.minPaise)} – ${money(me?.limits?.maxPaise)}.`}</p><Button onClick={() => go(isAdmin ? 'Products' : 'Wholesale catalog')}>{isAdmin ? 'Manage your products' : 'Explore wholesale'}<ArrowUpRight size={17}/></Button></div><div className="hero-art" aria-hidden="true"><div className="orbit"/><div className="parcel parcel-back"/><div className="parcel parcel-front"><ShoppingBag size={52} strokeWidth={1.2}/></div><div className="art-tag"><Check size={15}/>Made for everyday</div><span className="sparkle">✦</span></div></section>
          <div className="stats"><Stat icon={Wallet} label="Order value" value={money(orders.filter(o => !['PENDING_PAYMENT', 'CANCELLED'].includes(o.status)).reduce((s, o) => s + o.totalPaise, 0))} note="Placed orders in recent history"/><Stat icon={ShoppingBag} label="Total orders" value={orders.length} note="Up to 200 most recent orders"/><Stat icon={Package} label="Active products" value={products.length} note={`${products.filter(p => p.stock < 10).length} running low on stock`}/><Stat icon={isAdmin ? Users : Truck} label={isAdmin ? 'Wholesale partners' : 'On the way'} value={isAdmin ? vendors.filter(v => v.enabled).length : orders.filter(o => ['SHIPPED', 'OUT_FOR_DELIVERY'].includes(o.status)).length} note={isAdmin ? 'Active vendor accounts' : 'Orders moving toward you'}/></div>
          <div className="overview-grid"><section className="panel"><div className="panel-heading"><div><h2>Recent orders</h2><p>Your latest customer activity</p></div><button className="text-button" onClick={() => go('Orders')}>View all <ArrowUpRight size={15}/></button></div><OrderTable orders={orders.slice(0, 5)} onOpen={o => setModal({ type: 'Order', data: o })}/></section><section className="panel stock-panel"><div className="panel-heading"><div><h2>Stock watch</h2><p>A quick look at your inventory</p></div><Package size={20}/></div>{products.slice().sort((a, b) => a.stock - b.stock).slice(0, 4).map(p => <div className="stock-row" key={p.id}><ProductImage product={p}/><div><strong>{p.name}</strong><small>{p.category?.name}</small></div><Badge>{`${p.stock} left`}</Badge></div>)}{!products.length && <Empty/>}</section></div>
          </>}
          {['Products', 'Wholesale catalog'].includes(page) && <section className="panel"><div className="panel-heading"><h2>{isAdmin ? 'All products' : 'Available to order'} <span className="count">{products.length}</span></h2><div className="search"><Search size={17}/><input aria-label="Search products" placeholder="Search products or categories…" value={query} onChange={e => setQuery(e.target.value)}/></div></div>
          {isAdmin ? <div className="table-scroll"><table><thead><tr><th>Product</th><th>Retail / wholesale</th><th>Stock</th><th>Refund window</th><th>Actions</th></tr></thead><tbody>{shown.map(p => <tr key={p.id}><td><div className="product-cell"><ProductImage product={p}/><div><strong>{p.name}</strong><small>{p.category?.name}{p.deal ? ' · Deal of the day' : ''}</small></div></div></td><td><strong>{money(p.pricePaise)}</strong><small>{money(p.wholesalePaise)} wholesale</small></td><td><Badge>{`${p.stock} units`}</Badge></td><td>{p.refundWindowHours} hours</td><td><div className="row-actions"><button onClick={() => setModal({ type: 'Products', data: p })}>Edit</button><button className="danger-text" onClick={() => setModal({ type: 'Delete', data: { path: `/admin/products/${p.id}`, name: p.name } })}>Remove</button></div></td></tr>)}</tbody></table></div> : <div className="catalog">{shown.map(p => <article className="product-card" key={p.id}><ProductImage product={p}/><small>{p.category?.name}</small><h3>{p.name}</h3><div><strong>{money(p.wholesalePaise)}</strong><del>{money(p.pricePaise)}</del></div><p>{p.stock} available · {p.refundWindowHours}h refund window</p><Field label="Order quantity" type="number" min="0" max={p.stock} value={cart[p.id] || 0} onChange={e => setCart({ ...cart, [p.id]: Math.max(0, Math.min(p.stock, Number(e.target.value))) })}/></article>)}</div>}{!shown.length && <Empty text="No products found"/>}</section>}
          {page === 'Categories' && <div className="category-grid">{categories.map(c => <section className="panel category-card" key={c.id}><div className="category-icon"><Shapes size={26}/></div><h2>{c.name}</h2><p>{products.filter(p => p.categoryId === c.id).length} active products</p><div className="row-actions"><button onClick={() => setModal({ type: 'Categories', data: c })}>Edit category</button><button className="danger-text" onClick={() => setModal({ type: 'Delete', data: { path: `/admin/categories/${c.id}`, name: c.name } })}>Remove</button></div></section>)}</div>}
          {page === 'Banners' && <section className="panel"><div className="panel-heading"><h2>Home screen banner/slider <span className="count">{banners.length}</span></h2></div><div className="table-scroll"><table><thead><tr><th>Preview</th><th>Title</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead><tbody>{banners.map(b => <tr key={b.id}><td>{b.imageUrl ? <img className="product-image" src={b.imageUrl} alt={b.title}/> : <div className="product-image placeholder" style={{ background: b.backgroundColor || '#13224A' }}/>}</td><td><strong style={{ whiteSpace: 'pre-line' }}>{b.title}</strong>{b.subtitle && <small>{b.subtitle}</small>}</td><td>{b.sortOrder}</td><td><Badge>{b.active ? 'Active' : 'Disabled'}</Badge></td><td><div className="row-actions"><button onClick={() => setModal({ type: 'Banners', data: b })}>Edit</button><button className="danger-text" onClick={() => setModal({ type: 'Delete', data: { path: `/admin/banners/${b.id}`, name: b.title } })}>Remove</button></div></td></tr>)}</tbody></table></div>{!banners.length && <Empty text="Add a banner to light up the Home screen"/>}</section>}
          {page === 'Coupons' && <section className="panel"><div className="panel-heading"><h2>Discount coupons <span className="count">{coupons.length}</span></h2></div><div className="table-scroll"><table><thead><tr><th>Code</th><th>Discount</th><th>Min. order</th><th>Redeemed</th><th>Status</th><th>Actions</th></tr></thead><tbody>{coupons.map(c => <tr key={c.id}><td><strong>{c.code}</strong><small>{c.description}</small></td><td>{c.discountType === 'PERCENT' ? `${c.value}%${c.maxDiscountPaise ? ` (up to ${money(c.maxDiscountPaise)})` : ''}` : money(c.value)}</td><td>{money(c.minOrderPaise)}</td><td>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td><td><Badge>{c.active ? 'Active' : 'Disabled'}</Badge></td><td><div className="row-actions"><button onClick={() => setModal({ type: 'Coupons', data: c })}>Edit</button><button className="danger-text" onClick={() => setModal({ type: 'Delete', data: { path: `/admin/coupons/${c.id}`, name: c.code } })}>Remove</button></div></td></tr>)}</tbody></table></div>{!coupons.length && <Empty text="Create your first discount code"/>}</section>}
          {page === 'Orders' && <section className="panel"><div className="panel-heading"><h2>Order history</h2><button className="text-button" onClick={load}>Refresh</button></div><OrderTable orders={orders} onOpen={o => setModal({ type: 'Order', data: o })}/></section>}
          {page === 'Vendors' && <section className="panel"><div className="panel-heading"><h2>Your wholesale partners <span className="count">{vendors.length}</span></h2></div><div className="table-scroll"><table><thead><tr><th>Partner</th><th>Contact</th><th>Order limits</th><th>Status</th><th>Actions</th></tr></thead><tbody>{vendors.map(v => <tr key={v.id}><td><strong>{v.name}</strong><small>{v.username}</small></td><td>{v.email && <small>{v.email}</small>}{v.email && v.phone && <br/>}{v.phone && <small>{v.phone}</small>}{!v.email && !v.phone && <small className="muted">Not on file</small>}</td><td>{money(v.limits.minPaise)} – {money(v.limits.maxPaise)}</td><td><Badge>{v.enabled ? 'Active' : 'Disabled'}</Badge></td><td><div className="row-actions"><button onClick={() => setModal({ type: 'Vendors', data: v })}>Edit</button><button disabled={busy} onClick={() => action(() => api(`/admin/vendors/${v.id}`, { method: 'PATCH', body: { enabled: !v.enabled } }))}>{v.enabled ? 'Disable' : 'Enable'}</button><button onClick={() => setModal({ type: 'Reset', data: v })}>Reset password</button><button onClick={() => setModal({ type: 'Messages', data: v })}>Messages</button><button className="danger-text" onClick={() => setModal({ type: 'Delete', data: { path: `/admin/vendors/${v.id}`, name: v.name } })}>Remove</button></div></td></tr>)}</tbody></table></div>{!vendors.length && <Empty text="Your first partnership starts here"/>}</section>}
          {page === 'Refunds' && <section className="panel"><div className="panel-heading"><div><h2>Refund requests</h2><p>Approved refunds are credited to the customer's NTSA wallet.</p></div></div><div className="table-scroll"><table><thead><tr><th>Product / order</th><th>Reason</th><th>Amount</th><th>Status</th><th>Review</th></tr></thead><tbody>{refunds.map(r => <tr key={r.id}><td><strong>{r.orderItem.name}</strong><small>#{r.orderItem.orderId.slice(-8).toUpperCase()}</small></td><td>{r.reason}</td><td>{money(r.orderItem.unitPaise * r.orderItem.quantity)}</td><td><Badge>{r.status}</Badge></td><td>{r.status === 'REQUESTED' && <div className="row-actions"><button disabled={busy} onClick={() => action(() => api(`/admin/refunds/${r.id}`, { method: 'PATCH', body: { status: 'APPROVED' } }))}>Approve</button><button disabled={busy} className="danger-text" onClick={() => action(() => api(`/admin/refunds/${r.id}`, { method: 'PATCH', body: { status: 'REJECTED' } }))}>Reject</button></div>}</td></tr>)}</tbody></table></div>{!refunds.length && <Empty text="No refund requests"/>}</section>}
        </>}
        <footer>NTSA <span>·</span> Shop smarter. Live better.<span className="footer-right">Your everyday commerce companion</span></footer>
      </main>
    </div>
    {toast && <div role="status" className="toast"><Check size={18}/>{toast}</div>}
    {modal && <Modal title={({ Products: modal.data ? 'Edit product' : 'New product', Categories: modal.data ? 'Edit category' : 'New category', Vendors: modal.data ? 'Edit partner' : 'New wholesale partner', Banners: modal.data ? 'Edit banner' : 'New banner', Coupons: modal.data ? 'Edit coupon' : 'New coupon', Order: 'Order details', Delete: 'Remove record', Reset: 'Reset vendor password', Messages: `Messages · ${modal.data?.name}`, Checkout: 'Place wholesale order' })[modal.type]} close={() => !busy && setModal(null)}>
      {error && <div role="alert" className="alert">{error}</div>}
      {['Products', 'Categories', 'Vendors', 'Banners', 'Coupons'].includes(modal.type) && <Editor type={modal.type} data={modal.data} categories={categories} busy={busy} onSubmit={body => action(async () => {
        const path = { Products: 'products', Categories: 'categories', Vendors: 'vendors', Banners: 'banners', Coupons: 'coupons' }[modal.type];
        await api(`/admin/${path}${modal.data ? `/${modal.data.id}` : ''}`, { method: modal.data ? (modal.type === 'Vendors' ? 'PATCH' : 'PUT') : 'POST', body });
        setModal(null);
      })}/>}
      {modal.type === 'Delete' && <><p>Remove “{modal.data.name}” from the workspace? Order history is retained. Categories still linked to products cannot be removed.</p><Button disabled={busy} onClick={() => action(async () => { await api(modal.data.path, { method: 'DELETE' }); setModal(null); }, 'Record removed')}>Remove</Button></>}
      {modal.type === 'Reset' && <ResetPassword vendor={modal.data} busy={busy} onSubmit={password => action(async () => { await api(`/admin/vendors/${modal.data.id}/reset-password`, { method: 'POST', body: { password } }); setModal(null); }, 'Password updated')}/>}
      {modal.type === 'Messages' && <VendorMessages vendor={modal.data}/>}
      {modal.type === 'Order' && <OrderDetails order={orders.find(o => o.id === modal.data.id) || modal.data} admin={isAdmin} busy={busy} action={action} next={next}/>}
      {modal.type === 'Checkout' && <WholesaleCheckout items={cartItems} total={cartTotal} limits={me?.limits} busy={busy} onSubmit={body => action(async () => { await api('/orders', { method: 'POST', body }); setCart({}); setModal(null); go('Orders'); }, 'Wholesale order placed')}/>}
    </Modal>}
  </div>;
}
function Stat({ icon: Icon, label, value, note }) { return <section className="stat"><div className="stat-top"><span>{label}</span><Icon size={19}/></div><strong>{value}</strong><p>{note}</p></section>; }
function ProductImage({ product }) { return product.images?.[0] ? <img className="product-image" src={product.images[0]} alt={product.name} onError={e => { e.currentTarget.style.visibility = 'hidden'; }}/> : <div className="product-image placeholder"><Package/></div>; }
function OrderTable({ orders, onOpen }) { return orders.length ? <div className="table-scroll"><table><thead><tr><th>Order</th><th>Date</th><th>Amount</th><th>Status</th><th/></tr></thead><tbody>{orders.map(o => <tr key={o.id}><td><strong>#{o.id.slice(-8).toUpperCase()}</strong><small>{o.vendorId ? 'Wholesale' : 'Customer'} · {o.items.length} item(s)</small></td><td>{new Date(o.createdAt).toLocaleDateString('en-IN')}</td><td>{money(o.totalPaise)}</td><td><Badge>{o.status}</Badge></td><td><button className="icon-button" aria-label={`Open order ${o.id}`} onClick={() => onOpen(o)}><ArrowUpRight size={17}/></button></td></tr>)}</tbody></table></div> : <Empty text="Ready for your first order"/>; }
function Login({ onLogin }) {
  // Vendor sign-in is hidden for now (wholesale is being added later); the
  // role switch comes back by restoring the tabs below with a role state.
  const role = 'ADMIN', [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <div className="login"><section className="login-story"><div className="brand"><ShoppingBag/><span>NTSA.</span></div><div><div className="eyebrow">GOOD BUSINESS STARTS HERE</div><h1>Everything you need.<br/><span>Room to grow.</span></h1><p>Your store, your partners, your next big idea.<br/>Bring it all together with NTSA.</p><div className="login-tags"><span><Check size={16}/>Simple operations</span><span><Check size={16}/>Stronger partnerships</span></div></div><small>Shop smarter. Live better.</small></section><section className="login-form"><div><div className="eyebrow">WELCOME TO YOUR WORKSPACE</div><h2>Let’s get you settled.</h2><p>Sign in to manage your everyday business.</p><form style={{ marginTop: 28 }}onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); const data = new FormData(e.target); try { const r = await api('/auth/login', { method: 'POST', body: { role, username: data.get('username'), password: data.get('password') } }); onLogin(r.token); } catch (err) { setError(err.message); } finally { setBusy(false); } }}><Field label={role === 'ADMIN' ? 'Email address' : 'Username'} name="username" type={role === 'ADMIN' ? 'email' : 'text'} placeholder={role === 'ADMIN' ? 'you@company.com' : 'Your assigned username'} required autoComplete="username"/><PasswordField label="Password" name="password" placeholder="Enter your password" required autoComplete="current-password"/>{error && <div role="alert" className="alert">{error}</div>}<Button disabled={busy}>{busy ? 'Signing in…' : 'Sign in to workspace'}<ArrowUpRight size={18}/></Button></form><p className="login-help"><ShieldCheck size={17}/>{role === 'ADMIN' ? 'Access is reserved for your store administrator.' : 'Your account is created by the NTSA administrator.'}</p></div></section></div>;
}
function Editor({ type, data, categories, busy, onSubmit }) {
  const [images, setImages] = useState(data?.images?.join('\n') || ''), [uploading, setUploading] = useState(false), [error, setError] = useState('');
  const [colorImages, setColorImages] = useState(Object.entries(data?.colorImages || {}).map(([c, u]) => `${c} = ${u}`).join('\n'));
  const [attributes, setAttributes] = useState(data?.attributes?.length ? data.attributes : [{ label: '', value: '' }]);
  const setAttr = (i, key, value) => setAttributes(rows => rows.map((r, idx) => idx === i ? { ...r, [key]: value } : r));
  // Options (sizes / storage / ...) and their optional per-option prices, in rupees while editing.
  const [sizes, setSizes] = useState(data?.sizes?.join(', ') || '');
  const [sizePrices, setSizePrices] = useState(() => Object.fromEntries(Object.entries(data?.sizePrices || {}).map(([k, v]) => [k, { retail: v.pricePaise / 100, wholesale: v.wholesalePaise / 100, mrp: v.mrpPaise ? v.mrpPaise / 100 : '' }])));
  const sizeList = sizes.split(',').map(x => x.trim()).filter(Boolean);
  const setSizePrice = (size, key, value) => setSizePrices(p => ({ ...p, [size]: { ...p[size], [key]: value } }));
  return <form className="editor" onSubmit={e => { e.preventDefault(); setError(''); const f = Object.fromEntries(new FormData(e.target)); try {
    if (type === 'Products') {
      const colorImageMap = Object.fromEntries(colorImages.split('\n').map(line => line.split('=').map(x => x.trim())).filter(([c, u]) => c && u));
      const cleanAttributes = attributes.map(a => ({ label: a.label.trim(), value: a.value.trim() })).filter(a => a.label && a.value);
      const optionPrices = Object.fromEntries(sizeList.filter(s => String(sizePrices[s]?.retail ?? '').trim()).map(s => {
        const o = sizePrices[s];
        if (!String(o.wholesale ?? '').trim()) throw new Error(`Enter a wholesale price for ${s}, or clear its retail price`);
        return [s, { pricePaise: paise(o.retail), wholesalePaise: paise(o.wholesale), mrpPaise: String(o.mrp ?? '').trim() ? paise(o.mrp) : null }];
      }));
      onSubmit({ name: f.name, description: f.description, pricePaise: paise(f.retail), wholesalePaise: paise(f.wholesale), mrpPaise: f.mrp ? paise(f.mrp) : null, stock: Number(f.stock), categoryId: f.categoryId, refundWindowHours: Number(f.refundWindowHours), images: images.split('\n').map(x => x.trim()).filter(Boolean), colors: f.colors.split(',').map(x => x.trim()).filter(Boolean), sizes: sizeList, sizeLabel: f.sizeLabel?.trim() || 'Size', sizePrices: Object.keys(optionPrices).length ? optionPrices : null, colorImages: Object.keys(colorImageMap).length ? colorImageMap : null, attributes: cleanAttributes, deal: f.deal === 'on' });
    }
    else if (type === 'Categories') onSubmit({ name: f.name, icon: data?.icon || 'shopping_bag' });
    // Cleared optional fields are sent as null so an edit actually removes them.
    else if (type === 'Banners') onSubmit({ title: f.title, subtitle: f.subtitle || null, imageUrl: f.imageUrl || null, backgroundColor: f.backgroundColor || null, buttonText: f.buttonText || 'Shop Now', sortOrder: Number(f.sortOrder) || 0, active: f.active === 'on' });
    else if (type === 'Coupons') onSubmit({ code: f.code, description: f.description || '', discountType: f.discountType, value: f.discountType === 'PERCENT' ? Number(f.value) : paise(f.value), minOrderPaise: Number(f.minOrderPaise) > 0 ? paise(f.minOrderPaise) : 1, maxDiscountPaise: Number(f.maxDiscountPaise) > 0 ? paise(f.maxDiscountPaise) : null, usageLimit: f.usageLimit ? Number(f.usageLimit) : null, expiresAt: f.expiresAt ? new Date(f.expiresAt).toISOString() : undefined, active: f.active === 'on' });
    else onSubmit({
      name: f.name,
      // Only sent when creating -- the wholesale ID can't change after
      // creation, and the password is changed separately via Reset.
      ...(data ? {} : { username: f.username, password: f.password }),
      email: f.email || null, phone: f.phone || null,
      aadharNumber: f.aadharNumber || null, panNumber: f.panNumber || null,
      limits: { minPaise: paise(f.min), maxPaise: paise(f.max) },
    });
  } catch (err) { setError(err.message); } }}>
    {['Products', 'Categories', 'Vendors'].includes(type) && <Field label="Name" name="name" defaultValue={data?.name} required maxLength={100}/>}
    {type === 'Products' && <><Field label="Description"><textarea name="description" defaultValue={data?.description} required maxLength={5000}/></Field><div className="form-grid"><Field label="Retail price (₹)" name="retail" type="number" min="0.01" step="0.01" defaultValue={data ? data.pricePaise / 100 : ''} required/><Field label="Wholesale price (₹)" name="wholesale" type="number" min="0.01" step="0.01" defaultValue={data ? data.wholesalePaise / 100 : ''} required/><Field label="MRP (₹) — optional, shows a strikethrough discount" name="mrp" type="number" min="0.01" step="0.01" defaultValue={data?.mrpPaise ? data.mrpPaise / 100 : ''}/><Field label="Stock quantity" name="stock" type="number" min="0" step="1" defaultValue={data?.stock ?? 0} required/><Field label="Refund window (hours)" name="refundWindowHours" type="number" min="0" max="720" step="1" defaultValue={data?.refundWindowHours ?? 24} required/></div><Field label="Category"><select name="categoryId" defaultValue={data?.categoryId || ''} required><option value="" disabled>Select a category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><div className="form-grid"><Field label="Colors — comma separated, optional" name="colors" defaultValue={data?.colors?.join(', ') || ''} placeholder="Black, White, Blue"/><Field label="Options (sizes, storage…) — comma separated, optional" value={sizes} onChange={e => setSizes(e.target.value)} placeholder="6, 7, 8  or  128GB, 256GB"/></div>
      {sizeList.length > 0 && <>
        <Field label="Option name shown to shoppers" name="sizeLabel" defaultValue={data?.sizeLabel || 'Size'} maxLength={30} placeholder="Size, Storage, RAM…" required/>
        <Field label="Price per option — optional. Leave blank to use the prices above; fill in for options that cost more (e.g. 256GB).">
          <div className="attribute-rows">
            {sizeList.map(s => <div className="option-price-row" key={s}>
              <strong>{s}</strong>
              <input type="number" min="0.01" step="0.01" placeholder="Retail ₹" aria-label={`${s} retail price`} value={sizePrices[s]?.retail ?? ''} onChange={e => setSizePrice(s, 'retail', e.target.value)}/>
              <input type="number" min="0.01" step="0.01" placeholder="Wholesale ₹" aria-label={`${s} wholesale price`} value={sizePrices[s]?.wholesale ?? ''} onChange={e => setSizePrice(s, 'wholesale', e.target.value)}/>
              <input type="number" min="0.01" step="0.01" placeholder="MRP ₹ (optional)" aria-label={`${s} MRP`} value={sizePrices[s]?.mrp ?? ''} onChange={e => setSizePrice(s, 'mrp', e.target.value)}/>
            </div>)}
          </div>
        </Field>
      </>}<Field label="Color photos — optional, one per line as &quot;Color = image URL&quot;. Shown when the shopper picks that color."><textarea value={colorImages} onChange={e => setColorImages(e.target.value)} placeholder={'Black = https://…\nWhite = https://…'} rows={3}/></Field><Field label="Image URLs — one per line, up to 5"><textarea value={images} onChange={e => setImages(e.target.value)} placeholder="https://…"/></Field><Field label={uploading ? 'Uploading…' : 'Or upload to Cloudinary (max 5 MB)'} type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={async e => { if (!e.target.files[0]) return; setUploading(true); try { if (images.split('\n').filter(Boolean).length >= 5) throw new Error('Maximum five images'); const form = new FormData(); form.append('image', e.target.files[0]); const r = await api('/admin/images', { method: 'POST', body: form }); setImages(v => [v, r.url].filter(Boolean).join('\n')); } catch (err) { setError(err.message); } finally { setUploading(false); } }}/>
      <Field label="Additional details — anything that doesn't fit a field above, e.g. a bag's capacity">
        <div className="attribute-rows">
          {attributes.map((row, i) => <div className="attribute-row" key={i}>
            <input placeholder="Label (e.g. Capacity)" value={row.label} maxLength={50} onChange={e => setAttr(i, 'label', e.target.value)}/>
            <input placeholder="Value (e.g. 20L)" value={row.value} maxLength={200} onChange={e => setAttr(i, 'value', e.target.value)}/>
            <button type="button" className="icon-button" aria-label="Remove detail" onClick={() => setAttributes(rows => rows.filter((_, idx) => idx !== i))}><X size={16}/></button>
          </div>)}
        </div>
        <button type="button" className="button secondary" onClick={() => setAttributes(rows => [...rows, { label: '', value: '' }])}><Plus size={15}/>Add detail</button>
      </Field>
      <label className="checkbox"><input type="checkbox" name="deal" defaultChecked={data?.deal}/>Feature in Deals of the Day</label></>}
    {type === 'Banners' && <>
      <Field label="Title — use a new line for a second line" name="title"><textarea name="title" defaultValue={data?.title} required maxLength={100} rows={2}/></Field>
      <Field label="Subtitle (optional)" name="subtitle" defaultValue={data?.subtitle || ''} maxLength={200}/>
      <Field label="Background image URL (optional)" name="imageUrl" defaultValue={data?.imageUrl || ''} placeholder="https://…"/>
      <div className="form-grid">
        <Field label="Background color (used when there's no image)" name="backgroundColor" type="color" defaultValue={data?.backgroundColor || '#13224A'}/>
        <Field label="Button text" name="buttonText" defaultValue={data?.buttonText || 'Shop Now'} maxLength={30}/>
      </div>
      <Field label="Sort order (lower shows first)" name="sortOrder" type="number" min="0" step="1" defaultValue={data?.sortOrder ?? 0}/>
      <label className="checkbox"><input type="checkbox" name="active" defaultChecked={data?.active ?? true}/>Active (visible on the Home screen)</label>
    </>}
    {type === 'Coupons' && <>
      <Field label="Code" name="code" defaultValue={data?.code} placeholder="NTSA500" pattern="[A-Za-z0-9]+" minLength={3} maxLength={30} required readOnly={!!data}/>
      <Field label="Description" name="description" defaultValue={data?.description || ''} maxLength={200} placeholder="Flat ₹500 off on orders above ₹4,999"/>
      <div className="form-grid">
        <Field label="Discount type"><select name="discountType" defaultValue={data?.discountType || 'FLAT'} required><option value="FLAT">Flat amount (₹)</option><option value="PERCENT">Percent (%)</option></select></Field>
        <Field label="Value (₹ if flat, % if percent)" name="value" type="number" min="1" step="0.01" defaultValue={data ? (data.discountType === 'PERCENT' ? data.value : data.value / 100) : ''} required/>
      </div>
      <div className="form-grid">
        <Field label="Minimum order (₹)" name="minOrderPaise" type="number" min="0" step="0.01" defaultValue={data ? data.minOrderPaise / 100 : ''}/>
        <Field label="Max discount cap (₹) — percent coupons only" name="maxDiscountPaise" type="number" min="0" step="0.01" defaultValue={data?.maxDiscountPaise ? data.maxDiscountPaise / 100 : ''}/>
      </div>
      <div className="form-grid">
        <Field label="Usage limit (total redemptions, optional)" name="usageLimit" type="number" min="1" step="1" defaultValue={data?.usageLimit ?? ''}/>
        <Field label="Expires on (optional)" name="expiresAt" type="date" defaultValue={data?.expiresAt ? data.expiresAt.slice(0, 10) : ''}/>
      </div>
      <label className="checkbox"><input type="checkbox" name="active" defaultChecked={data?.active ?? true}/>Active</label>
    </>}
    {type === 'Vendors' && <>
      {!data && <div className="form-grid">
        <Field label="Wholesale ID (username)" name="username" placeholder="e.g. rajesh-traders" minLength={3} maxLength={50} pattern="[a-zA-Z0-9_.\-]+" title="Only letters, numbers, dots, hyphens and underscores" required/>
        <PasswordField label="Password" name="password" placeholder="Set a password for this vendor" minLength={8} maxLength={100} required autoComplete="new-password"/>
      </div>}
      {data && <p className="muted">Wholesale ID: <strong>{data.username}</strong> · use “Reset password” to change the password.</p>}
      <div className="form-grid">
        <Field label="Email" name="email" type="email" defaultValue={data?.email || ''} maxLength={200}/>
        <Field label="Phone" name="phone" type="tel" defaultValue={data?.phone || ''} placeholder="+91XXXXXXXXXX"/>
        <Field label="Aadhaar number" name="aadharNumber" defaultValue={data?.aadharNumber || ''} pattern="[0-9]{12}" title="12 digits" placeholder="12-digit Aadhaar"/>
        <Field label="PAN number" name="panNumber" defaultValue={data?.panNumber || ''} pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]" title="e.g. ABCDE1234F" placeholder="ABCDE1234F"/>
      </div>
      <div className="form-grid"><Field label="Minimum order (₹)" name="min" type="number" min="0.01" step="0.01" defaultValue={data ? data.limits.minPaise / 100 : 10000} required/><Field label="Maximum order (₹)" name="max" type="number" min="0.01" step="0.01" defaultValue={data ? data.limits.maxPaise / 100 : 500000} required/></div>
      {data && <p className="muted">Updated limits apply to the next order. Existing sessions will be invalidated.</p>}
    </>}
    {error && <div className="alert">{error}</div>}<Button disabled={busy || uploading}>{busy ? 'Saving…' : 'Save changes'}</Button>
  </form>;
}
function ResetPassword({ vendor, busy, onSubmit }) {
  const [error, setError] = useState('');
  return <form className="editor" onSubmit={e => { e.preventDefault(); setError(''); const f = Object.fromEntries(new FormData(e.target)); try { onSubmit(f.password); } catch (err) { setError(err.message); } }}>
    <p>Set a new password for <strong>{vendor.name}</strong> ({vendor.username}). This invalidates their existing sessions.</p>
    <PasswordField label="New password" name="password" minLength={8} maxLength={100} required autoFocus autoComplete="new-password"/>
    {error && <div className="alert">{error}</div>}<Button disabled={busy}>{busy ? 'Saving…' : 'Update password'}</Button>
  </form>;
}
function VendorMessages({ vendor }) {
  const [thread, setThread] = useState(null), [reply, setReply] = useState(''), [sending, setSending] = useState(false), [error, setError] = useState('');
  useEffect(() => { api(`/admin/vendors/${vendor.id}/messages`).then(setThread).catch(err => setError(err.message)); }, [vendor.id]);
  async function send() {
    if (!reply.trim()) return;
    setSending(true); setError('');
    try {
      const msg = await api(`/admin/vendors/${vendor.id}/messages`, { method: 'POST', body: { body: reply.trim() } });
      setThread(t => [...(t || []), msg]); setReply('');
    } catch (err) { setError(err.message); } finally { setSending(false); }
  }
  return <div className="messages-thread">
    <div className="messages-scroll">
      {thread === null ? <p className="muted">Loading conversation…</p> : thread.length === 0 ? <p className="muted">No messages yet from this partner.</p> : thread.map(m => <div key={m.id} className={`message-bubble ${m.sender === 'ADMIN' ? 'from-admin' : 'from-vendor'}`}><p>{m.body}</p><small>{m.sender === 'ADMIN' ? 'You' : vendor.name} · {new Date(m.createdAt).toLocaleString()}</small></div>)}
    </div>
    {error && <div className="alert">{error}</div>}
    <div className="message-compose"><input placeholder="Reply to this partner…" value={reply} onChange={e => setReply(e.target.value)} maxLength={1000} onKeyDown={e => e.key === 'Enter' && send()}/><Button disabled={sending || !reply.trim()} onClick={send}>Send</Button></div>
  </div>;
}
function OrderDetails({ order, admin, busy, action, next }) {
  const [otp, setOtp] = useState(''), [code, setCode] = useState('');
  return <div className="order-detail"><div className="detail-summary"><strong>#{order.id.slice(-8).toUpperCase()}</strong><Badge>{order.status}</Badge></div>{order.items.map(i => <div key={i.id} className="line-item"><div><strong>{i.name}</strong>{(i.size || i.color) && <small className="variant">{[i.size && `Size / option: ${i.size}`, i.color && `Color: ${i.color}`].filter(Boolean).join(' · ')}</small>}<small>{i.quantity} × {money(i.unitPaise)} · {i.refundWindowHours}h refund window</small></div><strong>{money(i.unitPaise * i.quantity)}</strong></div>)}<div className="line-item"><strong>Total · {order.paymentMethod}</strong><strong>{money(order.totalPaise)}</strong></div><h3>Delivery address</h3><p>{order.address.name} · {order.address.phone}<br/>{order.address.line1}, {order.address.city}, {order.address.state} {order.address.postalCode}</p>{order.deliveredAt && <p>Delivered: {new Date(order.deliveredAt).toLocaleString()}</p>}
    {admin && next[order.status] && <Button disabled={busy} onClick={() => action(() => api(`/admin/orders/${order.id}/status`, { method: 'PATCH', body: { status: next[order.status] } }))}>Mark {next[order.status].toLowerCase().replaceAll('_', ' ')}</Button>}
    {admin && order.status === 'OUT_FOR_DELIVERY' && <form onSubmit={e => { e.preventDefault(); action(() => api(`/admin/orders/${order.id}/deliver`, { method: 'POST', body: { otp } })); }}><Field label="Recipient's delivery OTP" value={otp} onChange={e => setOtp(e.target.value)} pattern="[0-9]{6}" maxLength={6} required/><Button disabled={busy}>Verify and confirm delivery</Button></form>}
    {!admin && order.status === 'OUT_FOR_DELIVERY' && <><p>Only share this code with the rider after receiving your order.</p><Button disabled={busy} onClick={() => action(async () => { const r = await api(`/orders/${order.id}/delivery-code`, { method: 'POST' }); setCode(r.otp); }, 'Delivery OTP generated')}>Generate delivery OTP</Button>{code && <h2>{code} <small>Valid for 15 minutes</small></h2>}</>}
  </div>;
}
function WholesaleCheckout({ items, total, limits, busy, onSubmit }) {
  const [key] = useState(() => crypto.randomUUID());
  const valid = limits && total >= limits.minPaise && total <= limits.maxPaise;
  return <form className="editor" onSubmit={e => { e.preventDefault(); const address = Object.fromEntries(new FormData(e.target)); onSubmit({ items: items.map(p => ({ productId: p.id, quantity: p.quantity })), address, paymentMethod: 'COD', checkoutKey: key }); }}><div className="line-item"><strong>{items.length} products</strong><strong>{money(total)}</strong></div><p className={valid ? 'muted' : 'danger-text'}>Your order must be between {money(limits?.minPaise)} and {money(limits?.maxPaise)}.</p><div className="form-grid">{[['name', 'Recipient'], ['phone', 'Phone'], ['line1', 'Street address'], ['city', 'City'], ['state', 'State'], ['postalCode', 'PIN code']].map(([name, label]) => <Field key={name} label={label} name={name} required/>)}</div><p>Payment: cash on delivery. Prices and stock are checked again when you place the order.</p><Button disabled={busy || !valid}>{busy ? 'Placing order…' : 'Place wholesale order'}</Button></form>;
}
createRoot(document.getElementById('root')).render(<App/>);
