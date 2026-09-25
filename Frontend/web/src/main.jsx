import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LayoutDashboard, Package, Shapes, Users, ShoppingBag, RotateCcw, LogOut, Search, Plus, ArrowUpRight, ChevronRight, Check, Menu, X, Truck, ShieldCheck, Wallet, Store, Image, Tag, Eye, EyeOff, Bell, ClipboardList, UserPlus, BadgeCheck, UserCog, MapPin, Paperclip, Settings as SettingsIcon, FileText } from 'lucide-react';
import { api, money, paise, openInvoice, suggestCategory } from './api';
import { Button, Field, PasswordField, Badge, Empty, Modal, Stat, ProductImage, CONDITION_LABEL } from './ui';
import { WholesaleProductsPage, AudienceField } from './pages/wholesale-products';
import './style.css';

function App() {
  const [session, setSession] = useState(() => sessionStorage.getItem('ntsa-token'));
  const [me, setMe] = useState(null), [page, setPage] = useState('Overview'), [error, setError] = useState(''), [toast, setToast] = useState('');
  const [products, setProducts] = useState([]), [categories, setCategories] = useState([]), [orders, setOrders] = useState([]), [vendors, setVendors] = useState([]), [refunds, setRefunds] = useState([]);
  const [banners, setBanners] = useState([]), [coupons, setCoupons] = useState([]);
  // Wholesale-only stock, added from its own page and never shown in the app.
  const [wholesaleProducts, setWholesaleProducts] = useState([]);
  const [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [modal, setModal] = useState(null), [query, setQuery] = useState(''), [mobileNav, setMobileNav] = useState(false);
  const [cart, setCart] = useState({});
  // Packing and sales staff sign in on the same page and get their own few pages.
  const [staff, setStaff] = useState([]), [applications, setApplications] = useState([]), [notifications, setNotifications] = useState([]);
  const [toPack, setToPack] = useState([]), [packed, setPacked] = useState([]), [bellOpen, setBellOpen] = useState(false);
  const [blockedPins, setBlockedPins] = useState([]), [pinStats, setPinStats] = useState([]), [deliveryRules, setDeliveryRules] = useState([]);
  // The letterhead every invoice is printed with.
  const [settings, setSettings] = useState(null);
  const role = me?.role ?? 'ADMIN';
  const isAdmin = role === 'ADMIN', isPacking = role === 'PACKING', isSales = role === 'SALES';
  const unread = notifications.filter(n => !n.readAt).length;
  function logout() { sessionStorage.removeItem('ntsa-token'); setSession(null); setMe(null); setCart({}); setModal(null); setError(''); }
  async function load() {
    setLoading(true);
    try {
      const account = await api('/me'); setMe(account);
      if (account.role === 'PACKING') {
        const [queue, done, notes] = await Promise.all([api('/packing/orders'), api('/packing/orders?status=PACKED'), api('/notifications')]);
        setToPack(queue); setPacked(done); setNotifications(notes);
        return;
      }
      if (account.role === 'SALES') {
        const [apps, notes] = await Promise.all([api('/sales/applications'), api('/notifications')]);
        setApplications(apps); setNotifications(notes);
        return;
      }
      const [p, c, o] = await Promise.all([api(account.role === 'ADMIN' ? '/admin/products?audience=RETAIL' : '/vendor/products'), api('/categories'), api('/orders')]);
      setProducts(p); setCategories(c); setOrders(o);
      if (account.role === 'ADMIN') setWholesaleProducts(await api('/admin/products?audience=WHOLESALE'));
      if (account.role === 'ADMIN') {
        const [v, r, b, cp, st, apps, notes, queue, pins, stats, rules, cfg] = await Promise.all([api('/admin/vendors'), api('/admin/refunds'), api('/admin/banners'), api('/admin/coupons'), api('/admin/staff'), api('/admin/seller-applications'), api('/notifications'), api('/packing/orders'), api('/admin/blocked-pincodes'), api('/admin/pincode-stats'), api('/admin/delivery-rules'), api('/admin/settings')]);
        setVendors(v); setRefunds(r); setBanners(b); setCoupons(cp); setStaff(st); setApplications(apps); setNotifications(notes); setToPack(queue); setBlockedPins(pins); setPinStats(stats); setDeliveryRules(rules); setSettings(cfg);
      }
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  async function markNotificationsRead() {
    if (!unread) return;
    try { await api('/notifications/read', { method: 'POST', body: {} }); setNotifications(list => list.map(n => n.readAt ? n : { ...n, readAt: new Date().toISOString() })); } catch (e) { setError(e.message); }
  }
  useEffect(() => { if (session) load(); }, [session]);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timer); } }, [toast]);
  async function action(fn, message = 'Changes saved') {
    if (busy) return; setBusy(true); setError('');
    try { await fn(); setToast(message); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  if (!session) return <Login onLogin={(token, loginRole) => { sessionStorage.setItem('ntsa-token', token); setPage(loginRole === 'PACKING' ? 'To pack' : loginRole === 'SALES' ? 'Add seller' : 'Overview'); setSession(token); }}/ >;
  const nav = isPacking ? [['To pack', ClipboardList], ['Packed', Check]]
    : isSales ? [['Add seller', UserPlus], ['My sellers', Store]]
    : isAdmin ? [['Overview', LayoutDashboard], ['Products', Package], ['Wholesale products', Store], ['Categories', Shapes], ['Banners', Image], ['Coupons', Tag], ['Orders', ShoppingBag], ['To pack', ClipboardList], ['Sellers', BadgeCheck], ['Vendors', Users], ['Refunds', RotateCcw], ['Delivery areas', MapPin], ['Staff', UserCog], ['Settings', SettingsIcon]]
    : [['Overview', LayoutDashboard], ['Wholesale catalog', Store], ['Orders', ShoppingBag]];
  const pendingApplications = applications.filter(a => a.status === 'PENDING').length;
  const shown = products.filter(p => `${p.name} ${p.category?.name}`.toLowerCase().includes(query.toLowerCase()));
  const cartItems = products.filter(p => cart[p.id] > 0).map(p => ({ ...p, quantity: cart[p.id] }));
  const cartTotal = cartItems.reduce((sum, p) => sum + p.wholesalePaise * p.quantity, 0);
  const next = { PLACED: 'PACKED', PACKED: 'SHIPPED', SHIPPED: 'OUT_FOR_DELIVERY' };
  function go(name) { setPage(name); setQuery(''); setMobileNav(false); }
  return <div className="app-shell">
    <aside className={mobileNav ? 'sidebar open' : 'sidebar'}><div className="brand"><ShoppingBag/><span>N<span className="accent">T</span>SA<span className="brand-dot">.</span></span></div><div className="workspace-label">{isPacking ? 'PACKING WORKSPACE' : isSales ? 'SALES WORKSPACE' : isAdmin ? 'COMMERCE WORKSPACE' : 'WHOLESALE WORKSPACE'}</div>
      <nav>{nav.map(([name, Icon]) => <button key={name} className={page === name ? 'nav-item active' : 'nav-item'} onClick={() => go(name)}><Icon size={19}/><span>{name}</span>{name === 'Orders' && <small>{orders.length}</small>}{name === 'To pack' && toPack.length > 0 && <small>{toPack.length}</small>}{name === 'Sellers' && pendingApplications > 0 && <small>{pendingApplications}</small>}</button>)}</nav>
      <div className="sidebar-note"><ShieldCheck size={24}/><strong>Everything in one place.</strong><p>{isPacking ? 'Pack what came in, mark it done.' : isSales ? 'Bring new shops onto NTSA.' : isAdmin ? 'Your products, partners and everyday operations.' : 'Better prices. Bigger possibilities.'}</p></div>
      <button className="nav-item signout" onClick={logout}><LogOut size={18}/>Sign out</button>
    </aside>
    <div className="main"><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(!mobileNav)}><Menu/></button><span>Workspace</span><ChevronRight size={14}/><strong>{page}</strong></div><div className="account">
      {role !== 'VENDOR' && <div className="bell-wrap">
        <button className="icon-button" aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`} onClick={() => { setBellOpen(o => !o); if (!bellOpen) markNotificationsRead(); }}><Bell size={19}/>{unread > 0 && <span className="bell-dot">{unread > 9 ? '9+' : unread}</span>}</button>
        {bellOpen && <div className="bell-panel"><header><strong>Notifications</strong><button className="icon-button" aria-label="Close notifications" onClick={() => setBellOpen(false)}><X size={15}/></button></header>
          {notifications.length === 0 ? <p className="muted">Nothing yet.</p> : notifications.slice(0, 20).map(n => <div key={n.id} className="bell-item"><strong>{n.title}</strong><p>{n.body}</p><small>{new Date(n.createdAt).toLocaleString('en-IN')}</small></div>)}
        </div>}
      </div>}
      <span className="online-dot"/><span>{isAdmin ? 'Super Admin' : me?.name || (isPacking ? 'Packing team' : isSales ? 'Sales team' : 'Vendor')}</span><div className="avatar">{isAdmin ? 'SA' : isPacking ? 'PK' : isSales ? 'SL' : 'WV'}</div></div></header>
      <main className="content">
        <div className="page-heading"><div><div className="eyebrow">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1>{page === 'Overview' ? 'A good day to grow.' : page}</h1><p>{({ Overview: 'Here’s what’s happening with your store today.', Products: 'A little care for every product on your shelf.', Categories: 'Make your collection easy to discover.', Banners: 'Control the Home screen banner without a code change.', Coupons: 'Create and manage discount codes.', Orders: 'From your shelf to their doorstep.', Vendors: 'Build stronger wholesale partnerships.', Refunds: 'Thoughtful resolutions. Happier customers.', 'Wholesale catalog': 'Stock up on quality. Save on every order.', 'To pack': 'Everything waiting to be packed and sent.', Packed: 'Packed today and on its way.', 'Add seller': 'Sign up a shop that wants to sell on NTSA.', 'My sellers': 'What you sent for verification.', Sellers: 'Check the details, then hand out their login.', Staff: 'Logins for your packing and sales teams.', 'Delivery areas': 'Delivery charges, and the areas you no longer deliver to.', Settings: 'The letterhead every invoice is printed with.' })[page]}</p></div>
          {isAdmin && ['Products', 'Wholesale products', 'Categories', 'Vendors', 'Banners', 'Coupons'].includes(page) && <Button onClick={() => setModal({ type: page, data: null })}><Plus size={17}/>Add {{ Categories: 'category', Banners: 'banner', Coupons: 'coupon', 'Wholesale products': 'wholesale product' }[page] || page.slice(0, -1).toLowerCase()}</Button>}
          {isAdmin && page === 'Staff' && <Button onClick={() => setModal({ type: 'Staff', data: null })}><Plus size={17}/>Add staff login</Button>}
          {(isPacking || isAdmin) && page === 'To pack' && <Button secondary onClick={load}>Refresh</Button>}
          {!isAdmin && page === 'Wholesale catalog' && <Button disabled={!cartItems.length} onClick={() => setModal({ type: 'Checkout' })}><ShoppingBag size={18}/>Checkout · {money(cartTotal)}</Button>}
        </div>
        {error && <div role="alert" className="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}
        {loading && !me ? <div className="empty">Loading workspace…</div> : <>
          {page === 'Overview' && <><section className="hero"><div><div className="hero-kicker"><span/> YOUR BUSINESS, AT A GLANCE</div><h2>Small details.<br/>Big possibilities.</h2><p>{isAdmin ? 'Keep your shelves ready and your customers happy.' : `Your order range: ${money(me?.limits?.minPaise)} – ${money(me?.limits?.maxPaise)}.`}</p><Button onClick={() => go(isAdmin ? 'Products' : 'Wholesale catalog')}>{isAdmin ? 'Manage your products' : 'Explore wholesale'}<ArrowUpRight size={17}/></Button></div><div className="hero-art" aria-hidden="true"><div className="orbit"/><div className="parcel parcel-back"/><div className="parcel parcel-front"><ShoppingBag size={52} strokeWidth={1.2}/></div><div className="art-tag"><Check size={15}/>Made for everyday</div><span className="sparkle">✦</span></div></section>
          <div className="stats"><Stat icon={Wallet} label="Order value" value={money(orders.filter(o => !['PENDING_PAYMENT', 'CANCELLED'].includes(o.status)).reduce((s, o) => s + o.totalPaise, 0))} note="Placed orders in recent history"/><Stat icon={ShoppingBag} label="Total orders" value={orders.length} note="Up to 200 most recent orders"/><Stat icon={Package} label="Active products" value={products.length} note={`${products.filter(p => p.stock < 10).length} running low on stock`}/><Stat icon={isAdmin ? Users : Truck} label={isAdmin ? 'Wholesale partners' : 'On the way'} value={isAdmin ? vendors.filter(v => v.enabled).length : orders.filter(o => ['SHIPPED', 'OUT_FOR_DELIVERY'].includes(o.status)).length} note={isAdmin ? 'Active vendor accounts' : 'Orders moving toward you'}/></div>
          <div className="overview-grid"><section className="panel"><div className="panel-heading"><div><h2>Recent orders</h2><p>Your latest customer activity</p></div><button className="text-button" onClick={() => go('Orders')}>View all <ArrowUpRight size={15}/></button></div><OrderTable orders={orders.slice(0, 5)} onOpen={o => setModal({ type: 'Order', data: o })}/></section><section className="panel stock-panel"><div className="panel-heading"><div><h2>Stock watch</h2><p>A quick look at your inventory</p></div><Package size={20}/></div>{products.slice().sort((a, b) => a.stock - b.stock).slice(0, 4).map(p => <div className="stock-row" key={p.id}><ProductImage product={p}/><div><strong>{p.name}</strong><small>{p.category?.name}</small></div><Badge>{`${p.stock} left`}</Badge></div>)}{!products.length && <Empty/>}</section></div>
          </>}
          {['Products', 'Wholesale catalog'].includes(page) && <section className="panel"><div className="panel-heading"><h2>{isAdmin ? 'All products' : 'Available to order'} <span className="count">{products.length}</span></h2><div className="search"><Search size={17}/><input aria-label="Search products" placeholder="Search products or categories…" value={query} onChange={e => setQuery(e.target.value)}/></div></div>
          {isAdmin ? <div className="table-scroll"><table><thead><tr><th>Product</th><th>Retail / wholesale</th><th>Stock</th><th>Refund window</th><th>Actions</th></tr></thead><tbody>{shown.map(p => <tr key={p.id}><td><div className="product-cell"><ProductImage product={p}/><div><strong>{p.name}</strong><small>{p.category?.name}{p.deal ? ' · Deal of the day' : ''}{p.condition && p.condition !== 'NEW' ? ` · ${{ REFURBISHED: 'Refurbished', OPEN_BOX: 'Open box', USED: 'Used' }[p.condition]}` : ''}</small></div></div></td><td><strong>{money(p.pricePaise)}</strong><small>{money(p.wholesalePaise)} wholesale</small></td><td><Badge>{`${p.stock} units`}</Badge></td><td>{p.refundWindowHours} hours<small>from {p.category?.name}</small></td><td><div className="row-actions"><button onClick={() => setModal({ type: 'Products', data: p })}>Edit</button><button className="danger-text" onClick={() => setModal({ type: 'Delete', data: { path: `/admin/products/${p.id}`, name: p.name } })}>Remove</button></div></td></tr>)}</tbody></table></div> : <div className="catalog">{shown.map(p => <article className="product-card" key={p.id}><ProductImage product={p}/><small>{p.category?.name}</small><h3>{p.name}</h3><div><strong>{money(p.wholesalePaise)}</strong><del>{money(p.pricePaise)}</del></div><p>{p.stock} available · {p.refundWindowHours}h refund window</p><Field label="Order quantity" type="number" min="0" max={p.stock} value={cart[p.id] || 0} onChange={e => setCart({ ...cart, [p.id]: Math.max(0, Math.min(p.stock, Number(e.target.value))) })}/></article>)}</div>}{!shown.length && <Empty text="No products found"/>}</section>}
          {page === 'Wholesale products' && <WholesaleProductsPage products={wholesaleProducts} query={query} setQuery={setQuery}
            onEdit={p => setModal({ type: 'Wholesale products', data: p })}
            onRemove={p => setModal({ type: 'Delete', data: { path: `/admin/products/${p.id}`, name: p.name } })}/>}
          {page === 'Categories' && <div className="category-grid">{categories.map(c => <section className="panel category-card" key={c.id}><div className="category-icon"><Shapes size={26}/></div><h2>{c.name}</h2><p>{products.filter(p => p.categoryId === c.id).length} active products · returns within {c.refundWindowHours} hours{c.allowsUsedStock ? ' · refurbished allowed' : ''}</p><div className="row-actions"><button onClick={() => setModal({ type: 'Categories', data: c })}>Edit category</button><button className="danger-text" onClick={() => setModal({ type: 'Delete', data: { path: `/admin/categories/${c.id}`, name: c.name } })}>Remove</button></div></section>)}</div>}
          {page === 'Banners' && <section className="panel"><div className="panel-heading"><h2>Home screen banner/slider <span className="count">{banners.length}</span></h2></div><div className="table-scroll"><table><thead><tr><th>Preview</th><th>Title</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead><tbody>{banners.map(b => <tr key={b.id}><td>{b.imageUrl ? <img className="product-image" src={b.imageUrl} alt={b.title}/> : <div className="product-image placeholder" style={{ background: b.backgroundColor || '#13224A' }}/>}</td><td><strong style={{ whiteSpace: 'pre-line' }}>{b.title}</strong>{b.subtitle && <small>{b.subtitle}</small>}</td><td>{b.sortOrder}</td><td><Badge>{b.active ? 'Active' : 'Disabled'}</Badge></td><td><div className="row-actions"><button onClick={() => setModal({ type: 'Banners', data: b })}>Edit</button><button className="danger-text" onClick={() => setModal({ type: 'Delete', data: { path: `/admin/banners/${b.id}`, name: b.title } })}>Remove</button></div></td></tr>)}</tbody></table></div>{!banners.length && <Empty text="Add a banner to light up the Home screen"/>}</section>}
          {page === 'Coupons' && <section className="panel"><div className="panel-heading"><h2>Discount coupons <span className="count">{coupons.length}</span></h2></div><div className="table-scroll"><table><thead><tr><th>Code</th><th>Discount</th><th>Min. order</th><th>Redeemed</th><th>Status</th><th>Actions</th></tr></thead><tbody>{coupons.map(c => <tr key={c.id}><td><strong>{c.code}</strong><small>{c.description}</small></td><td>{c.discountType === 'PERCENT' ? `${c.value}%${c.maxDiscountPaise ? ` (up to ${money(c.maxDiscountPaise)})` : ''}` : money(c.value)}</td><td>{money(c.minOrderPaise)}</td><td>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td><td><Badge>{c.active ? 'Active' : 'Disabled'}</Badge></td><td><div className="row-actions"><button onClick={() => setModal({ type: 'Coupons', data: c })}>Edit</button><button className="danger-text" onClick={() => setModal({ type: 'Delete', data: { path: `/admin/coupons/${c.id}`, name: c.code } })}>Remove</button></div></td></tr>)}</tbody></table></div>{!coupons.length && <Empty text="Create your first discount code"/>}</section>}
          {page === 'Orders' && <section className="panel"><div className="panel-heading"><h2>Order history</h2><button className="text-button" onClick={load}>Refresh</button></div><OrderTable orders={orders} onOpen={o => setModal({ type: 'Order', data: o })}/></section>}
          {page === 'Vendors' && <section className="panel"><div className="panel-heading"><h2>Your wholesale partners <span className="count">{vendors.length}</span></h2></div><div className="table-scroll"><table><thead><tr><th>Partner</th><th>Contact</th><th>Order limits</th><th>Status</th><th>Actions</th></tr></thead><tbody>{vendors.map(v => <tr key={v.id}><td><strong>{v.name}</strong><small>{v.username}</small></td><td>{v.email && <small>{v.email}</small>}{v.email && v.phone && <br/>}{v.phone && <small>{v.phone}</small>}{!v.email && !v.phone && <small className="muted">Not on file</small>}</td><td>{money(v.limits.minPaise)} – {money(v.limits.maxPaise)}</td><td><Badge>{v.enabled ? 'Active' : 'Disabled'}</Badge>{v.gstVerified || v.aadharVerified ? <small style={{ color: '#418568', fontWeight: 600 }}>{[v.gstVerified && 'GST ✓', v.aadharVerified && 'Aadhaar ✓'].filter(Boolean).join(' · ')}</small> : <small className="muted">Not verified</small>}</td><td><div className="row-actions"><button onClick={() => setModal({ type: 'Vendors', data: v })}>Edit</button><button disabled={busy} onClick={() => action(() => api(`/admin/vendors/${v.id}`, { method: 'PATCH', body: { enabled: !v.enabled } }))}>{v.enabled ? 'Disable' : 'Enable'}</button><button onClick={() => setModal({ type: 'Reset', data: v })}>Reset password</button><button onClick={() => setModal({ type: 'Messages', data: v })}>Messages</button><button className="danger-text" onClick={() => setModal({ type: 'Delete', data: { path: `/admin/vendors/${v.id}`, name: v.name } })}>Remove</button></div></td></tr>)}</tbody></table></div>{!vendors.length && <Empty text="Your first partnership starts here"/>}</section>}
          {page === 'Refunds' && <section className="panel"><div className="panel-heading"><div><h2>Refund requests</h2><p>Approved refunds are credited to the customer's NTSA wallet.</p></div></div><div className="table-scroll"><table><thead><tr><th>Product / order</th><th>Reason</th><th>Amount</th><th>Status</th><th>Review</th></tr></thead><tbody>{refunds.map(r => <tr key={r.id}><td><strong>{r.orderItem.name}</strong><small>#{r.orderItem.orderId.slice(-8).toUpperCase()}</small></td><td>{r.reason}</td><td>{money(r.orderItem.unitPaise * r.orderItem.quantity)}</td><td><Badge>{r.status}</Badge></td><td>{r.status === 'REQUESTED' && <div className="row-actions"><button disabled={busy} onClick={() => action(() => api(`/admin/refunds/${r.id}`, { method: 'PATCH', body: { status: 'APPROVED' } }))}>Approve</button><button disabled={busy} className="danger-text" onClick={() => action(() => api(`/admin/refunds/${r.id}`, { method: 'PATCH', body: { status: 'REJECTED' } }))}>Reject</button></div>}</td></tr>)}</tbody></table></div>{!refunds.length && <Empty text="No refund requests"/>}</section>}
          {['To pack', 'Packed'].includes(page) && <section className="panel"><div className="panel-heading"><h2>{page === 'To pack' ? 'Waiting to be packed' : 'Packed and on the way'} <span className="count">{(page === 'To pack' ? toPack : packed).length}</span></h2></div>
            <div className="table-scroll"><table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Deliver to</th><th>Placed</th><th/></tr></thead><tbody>
              {(page === 'To pack' ? toPack : packed).map(o => <tr key={o.id}>
                <td><strong>#{o.id.slice(0, 10).toUpperCase()}</strong><small>{o.vendorId ? 'Wholesale' : 'Customer'} · {money(o.totalPaise)}</small></td>
                <td><strong>{o.address?.name}</strong><small>{o.address?.phone}</small></td>
                <td><strong>{o.items.reduce((s, i) => s + i.quantity, 0)} pcs</strong><small>{o.items.length} line(s)</small></td>
                <td><small>{[o.address?.city, o.address?.state, o.address?.postalCode].filter(Boolean).join(', ')}</small></td>
                <td><small>{new Date(o.createdAt).toLocaleString('en-IN')}</small></td>
                <td><div className="row-actions"><button onClick={() => setModal({ type: 'Pack', data: o })}>Open</button></div></td>
              </tr>)}
            </tbody></table></div>
            {!(page === 'To pack' ? toPack : packed).length && <Empty text={page === 'To pack' ? 'Nothing to pack right now' : 'Nothing packed yet'}/>}</section>}
          {page === 'Add seller' && <section className="panel"><div className="panel-heading"><div><h2>New seller details</h2><p>The admin checks these and creates the seller's login.</p></div></div>
            <div style={{ padding: 22 }}><SellerApplicationForm busy={busy} onSubmit={body => action(async () => { await api('/sales/applications', { method: 'POST', body }); go('My sellers'); }, 'Sent to the admin for verification')}/></div></section>}
          {['My sellers', 'Sellers'].includes(page) && <section className="panel"><div className="panel-heading"><h2>{isAdmin ? 'Seller sign-ups' : 'Sellers you added'} <span className="count">{applications.length}</span></h2></div>
            <div className="table-scroll"><table><thead><tr><th>Shop</th><th>Contact</th><th>GST / Aadhaar</th>{isAdmin && <th>Added by</th>}<th>Status</th><th>Actions</th></tr></thead><tbody>
              {applications.map(a => <tr key={a.id}>
                <td><strong>{a.shopName}</strong><small>{a.ownerName}</small></td>
                <td><small>{a.phone}</small>{a.email && <small>{a.email}</small>}</td>
                <td><small>{a.gstNumber || 'No GST'}</small><small>{a.aadharNumber ? `Aadhaar ••••${a.aadharNumber.slice(-4)}` : 'No Aadhaar'}</small></td>
                {isAdmin && <td><small>{a.submittedBy?.name || '—'}</small></td>}
                <td><Badge>{a.status}</Badge>{a.seller?.username && <small>{a.seller.username}</small>}{a.note && <small className="muted">{a.note}</small>}</td>
                <td><div className="row-actions">
                  <button onClick={() => setModal({ type: 'Application', data: a })}>Details</button>
                  {isAdmin && a.status === 'PENDING' && <button onClick={() => setModal({ type: 'Approve', data: a })}>Approve</button>}
                  {isAdmin && a.status === 'PENDING' && <button className="danger-text" onClick={() => setModal({ type: 'Reject', data: a })}>Reject</button>}
                </div></td>
              </tr>)}
            </tbody></table></div>
            {!applications.length && <Empty text={isAdmin ? 'No seller sign-ups yet' : 'You have not added a seller yet'}/>}</section>}
          {page === 'Delivery areas' && <>
            <section className="panel"><div className="panel-heading"><div><h2>Delivery charges <span className="count">{deliveryRules.length}</span></h2><p>Set what a small order pays. An order above every slab ships free.</p></div></div>
              <div style={{ padding: '18px 22px' }}>
                <form className="editor" style={{ marginBottom: 0 }} onSubmit={e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); e.target.reset(); action(() => api('/admin/delivery-rules', { method: 'POST', body: { belowPaise: paise(f.below), chargePaise: paise(f.charge) } }), 'Delivery charge added'); }}>
                  <div className="form-grid">
                    <Field label="For orders below (₹)" name="below" type="number" min="1" step="0.01" placeholder="500" required/>
                    <Field label="Delivery charge (₹)" name="charge" type="number" min="0" step="0.01" placeholder="30" required/>
                  </div>
                  <Button disabled={busy}>Add delivery charge</Button>
                </form>
              </div>
              <div className="table-scroll"><table><thead><tr><th>Order value</th><th>Delivery charge</th><th>Actions</th></tr></thead><tbody>
                {deliveryRules.map(rule => <tr key={rule.id}>
                  <td><strong>Below {money(rule.belowPaise)}</strong></td>
                  <td>{rule.chargePaise === 0 ? <span style={{ color: '#418568', fontWeight: 600 }}>FREE</span> : money(rule.chargePaise)}</td>
                  <td><div className="row-actions"><button className="danger-text" disabled={busy} onClick={() => action(() => api(`/admin/delivery-rules/${rule.id}`, { method: 'DELETE' }), 'Delivery charge removed')}>Remove</button></div></td>
                </tr>)}
              </tbody></table></div>
              {!deliveryRules.length && <Empty text="Delivery is free on every order right now"/>}
              {deliveryRules.length > 0 && <p className="muted" style={{ padding: '0 22px 18px' }}>Orders of {money(Math.max(...deliveryRules.map(r => r.belowPaise)))} or more get free delivery.</p>}
            </section>
            <section className="panel" style={{ marginTop: 22 }}><div className="panel-heading"><div><h2>Blocked PIN codes <span className="count">{blockedPins.length}</span></h2><p>Nobody can save an address or place an order in these areas.</p></div></div>
              <div style={{ padding: '18px 22px' }}>
                <form className="editor" style={{ marginBottom: 0 }} onSubmit={e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); e.target.reset(); action(() => api('/admin/blocked-pincodes', { method: 'POST', body: { pincode: f.pincode, reason: f.reason?.trim() || null } }), 'PIN code blocked'); }}>
                  <div className="form-grid">
                    <Field label="PIN code" name="pincode" pattern="[0-9]{6}" title="6 digits" placeholder="302001" required/>
                    <Field label="Reason (optional)" name="reason" maxLength={200} placeholder="Repeated fake returns"/>
                  </div>
                  <Button disabled={busy}>Block this PIN code</Button>
                </form>
              </div>
              <div className="table-scroll"><table><thead><tr><th>PIN code</th><th>Reason</th><th>Blocked on</th><th>Actions</th></tr></thead><tbody>
                {blockedPins.map(p => <tr key={p.pincode}>
                  <td><strong>{p.pincode}</strong></td>
                  <td>{p.reason || <span className="muted">—</span>}</td>
                  <td><small>{new Date(p.createdAt).toLocaleDateString('en-IN')}</small></td>
                  <td><div className="row-actions"><button className="danger-text" disabled={busy} onClick={() => action(() => api(`/admin/blocked-pincodes/${p.pincode}`, { method: 'DELETE' }), 'PIN code unblocked')}>Unblock</button></div></td>
                </tr>)}
              </tbody></table></div>
              {!blockedPins.length && <Empty text="No PIN code is blocked"/>}</section>
            <section className="panel" style={{ marginTop: 22 }}><div className="panel-heading"><div><h2>Where returns come from</h2><p>Orders and refunds by PIN code — the most refunds first.</p></div></div>
              <div className="table-scroll"><table><thead><tr><th>PIN code</th><th>Orders</th><th>Refunds</th><th>Cancelled</th><th>Refund rate</th><th>Actions</th></tr></thead><tbody>
                {pinStats.map(s => { const rate = s.orders ? Math.round((s.refunds / s.orders) * 100) : 0; const blocked = blockedPins.some(b => b.pincode === s.pincode); return <tr key={s.pincode}>
                  <td><strong>{s.pincode}</strong></td><td>{s.orders}</td><td>{s.refunds}</td><td>{s.cancelled}</td>
                  <td><Badge>{`${rate}%`}</Badge></td>
                  <td><div className="row-actions">{blocked ? <span className="muted">Blocked</span> : <button disabled={busy} onClick={() => action(() => api('/admin/blocked-pincodes', { method: 'POST', body: { pincode: s.pincode, reason: `${rate}% of orders refunded` } }), 'PIN code blocked')}>Block</button>}</div></td>
                </tr>; })}
              </tbody></table></div>
              {!pinStats.length && <Empty text="No orders yet"/>}</section>
          </>}
          {page === 'Staff' && <section className="panel"><div className="panel-heading"><div><h2>Panel logins <span className="count">{staff.length}</span></h2><p>Packing and sales teams sign in on this same page and see only their own screens.</p></div></div>
            <div className="table-scroll"><table><thead><tr><th>Person</th><th>Team</th><th>Status</th><th>Added</th><th>Actions</th></tr></thead><tbody>
              {staff.map(s => <tr key={s.id}>
                <td><strong>{s.name || '—'}</strong><small>{s.email}</small></td>
                <td><Badge>{{ ADMIN: 'Admin', PACKING: 'Packing team', SALES: 'Sales team' }[s.role]}</Badge></td>
                <td><Badge>{s.enabled ? 'Active' : 'Disabled'}</Badge></td>
                <td><small>{new Date(s.createdAt).toLocaleDateString('en-IN')}</small></td>
                <td><div className="row-actions">
                  <button onClick={() => setModal({ type: 'StaffEdit', data: s })}>Edit</button>
                  <button disabled={busy || s.id === me?.id} onClick={() => action(() => api(`/admin/staff/${s.id}`, { method: 'PATCH', body: { enabled: !s.enabled } }))}>{s.enabled ? 'Disable' : 'Enable'}</button>
                  <button onClick={() => setModal({ type: 'StaffReset', data: s })}>Reset password</button>
                  <button className="danger-text" disabled={s.id === me?.id} onClick={() => setModal({ type: 'Delete', data: { path: `/admin/staff/${s.id}`, name: s.name || s.email } })}>Remove</button>
                </div></td>
              </tr>)}
            </tbody></table></div>
            {!staff.length && <Empty text="Add your first packing or sales login"/>}</section>}
          {page === 'Settings' && <SettingsPage settings={settings} busy={busy} action={action}/>}
        </>}
        <footer>NTSA <span>·</span> Shop smarter. Live better.<span className="footer-right">Your everyday commerce companion</span></footer>
      </main>
    </div>
    {toast && <div role="status" className="toast"><Check size={18}/>{toast}</div>}
    {modal && <Modal title={({ Products: modal.data ? 'Edit product' : 'New product', 'Wholesale products': modal.data ? 'Edit wholesale product' : 'New wholesale product', Categories: modal.data ? 'Edit category' : 'New category', Vendors: modal.data ? 'Edit partner' : 'New wholesale partner', Banners: modal.data ? 'Edit banner' : 'New banner', Coupons: modal.data ? 'Edit coupon' : 'New coupon', Order: 'Order details', Delete: 'Remove record', Reset: 'Reset vendor password', Messages: `Messages · ${modal.data?.name}`, Checkout: 'Place wholesale order', Pack: `Order #${modal.data?.id?.slice(0, 10).toUpperCase()}`, Staff: 'New staff login', StaffEdit: 'Edit staff login', StaffReset: 'Reset staff password', Application: modal.data?.shopName, Approve: `Approve ${modal.data?.shopName}`, Reject: `Reject ${modal.data?.shopName}` })[modal.type]} close={() => !busy && setModal(null)}>
      {error && <div role="alert" className="alert">{error}</div>}
      {['Products', 'Wholesale products', 'Categories', 'Vendors', 'Banners', 'Coupons'].includes(modal.type) && <Editor type={modal.type} data={modal.data} categories={categories} busy={busy} onSubmit={body => action(async () => {
        const path = { Products: 'products', 'Wholesale products': 'products', Categories: 'categories', Vendors: 'vendors', Banners: 'banners', Coupons: 'coupons' }[modal.type];
        await api(`/admin/${path}${modal.data ? `/${modal.data.id}` : ''}`, { method: modal.data ? (modal.type === 'Vendors' ? 'PATCH' : 'PUT') : 'POST', body });
        setModal(null);
      })}/>}
      {modal.type === 'Pack' && <PackSlip order={modal.data} busy={busy} onPacked={() => action(async () => { await api(`/packing/orders/${modal.data.id}/packed`, { method: 'POST' }); setModal(null); }, 'Marked packed, the admin has been told')}/>}
      {modal.type === 'Application' && <ApplicationDetails application={modal.data}/>}
      {modal.type === 'Approve' && <ApproveSeller application={modal.data} busy={busy} onSubmit={body => action(async () => { await api(`/admin/seller-applications/${modal.data.id}/approve`, { method: 'POST', body }); setModal(null); }, 'Seller approved and login created')}/>}
      {modal.type === 'Reject' && <RejectSeller busy={busy} onSubmit={note => action(async () => { await api(`/admin/seller-applications/${modal.data.id}/reject`, { method: 'POST', body: { note } }); setModal(null); }, 'Application rejected')}/>}
      {['Staff', 'StaffEdit'].includes(modal.type) && <StaffEditor data={modal.data} busy={busy} onSubmit={body => action(async () => {
        await api(`/admin/staff${modal.data ? `/${modal.data.id}` : ''}`, { method: modal.data ? 'PATCH' : 'POST', body });
        setModal(null);
      })}/>}
      {modal.type === 'StaffReset' && <ResetPassword vendor={{ name: modal.data.name || modal.data.email, username: modal.data.email }} busy={busy} onSubmit={password => action(async () => { await api(`/admin/staff/${modal.data.id}/reset-password`, { method: 'POST', body: { password } }); setModal(null); }, 'Password updated')}/>}
      {modal.type === 'Delete' && <><p>Remove “{modal.data.name}” from the workspace? Order history is retained. Categories still linked to products cannot be removed.</p><Button disabled={busy} onClick={() => action(async () => { await api(modal.data.path, { method: 'DELETE' }); setModal(null); }, 'Record removed')}>Remove</Button></>}
      {modal.type === 'Reset' && <ResetPassword vendor={modal.data} busy={busy} onSubmit={password => action(async () => { await api(`/admin/vendors/${modal.data.id}/reset-password`, { method: 'POST', body: { password } }); setModal(null); }, 'Password updated')}/>}
      {modal.type === 'Messages' && <VendorMessages vendor={modal.data}/>}
      {modal.type === 'Order' && <OrderDetails order={orders.find(o => o.id === modal.data.id) || modal.data} admin={isAdmin} busy={busy} action={action} next={next} onCancel={reason => action(async () => { await api(`/admin/orders/${modal.data.id}/cancel`, { method: 'POST', body: { reason } }); setModal(null); }, 'Order cancelled, stock put back')}/>}
      {modal.type === 'Checkout' && <WholesaleCheckout items={cartItems} total={cartTotal} limits={me?.limits} busy={busy} onSubmit={body => action(async () => { await api('/orders', { method: 'POST', body }); setCart({}); setModal(null); go('Orders'); }, 'Wholesale order placed')}/>}
    </Modal>}
  </div>;
}
function OrderTable({ orders, onOpen }) { return orders.length ? <div className="table-scroll"><table><thead><tr><th>Order</th><th>Date</th><th>Amount</th><th>Status</th><th/></tr></thead><tbody>{orders.map(o => <tr key={o.id}><td><strong>#{o.id.slice(-8).toUpperCase()}</strong><small>{o.vendorId ? 'Wholesale' : 'Customer'} · {o.items.length} item(s)</small></td><td>{new Date(o.createdAt).toLocaleDateString('en-IN')}</td><td>{money(o.totalPaise)}</td><td><Badge>{o.status}</Badge></td><td><button className="icon-button" aria-label={`Open order ${o.id}`} onClick={() => onOpen(o)}><ArrowUpRight size={17}/></button></td></tr>)}</tbody></table></div> : <Empty text="Ready for your first order"/>; }
// What the packing team works from: who it goes to, and exactly what to put
// in the box. Cancelled orders say so in red so nothing gets packed by mistake.
function PackSlip({ order, busy, onPacked }) {
  const a = order.address || {};
  const [invoiceBusy, setInvoiceBusy] = useState(false), [invoiceError, setInvoiceError] = useState('');
  async function viewBill() {
    setInvoiceBusy(true); setInvoiceError('');
    try { await openInvoice(order.id, '/packing/orders'); } catch (e) { setInvoiceError(e.message); } finally { setInvoiceBusy(false); }
  }
  return <div className="order-detail">
    {order.status === 'CANCELLED' && <div className="alert" role="alert"><strong>CANCELLED — do not pack this order.</strong></div>}
    <div className="detail-summary"><strong>{order.vendorId ? 'Wholesale order' : 'Customer order'}</strong><Badge>{order.status}</Badge></div>
    <h3>Pack this</h3>
    {order.items.map(i => <div key={i.id} className="line-item"><div><strong>{i.name}</strong>{(i.size || i.color) && <small className="variant">{[i.size && `Size / option: ${i.size}`, i.color && `Color: ${i.color}`].filter(Boolean).join(' · ')}</small>}</div><strong>× {i.quantity}</strong></div>)}
    <div className="line-item"><strong>Total pieces</strong><strong>{order.items.reduce((s, i) => s + i.quantity, 0)}</strong></div>
    <h3>Deliver to</h3>
    <p><strong>{a.name}</strong> · {a.phone}<br/>{a.line1}, {a.city}, {a.state} {a.postalCode}</p>
    <p className="muted">Payment: {order.paymentMethod} · Order value {money(order.totalPaise)} · Placed {new Date(order.createdAt).toLocaleString('en-IN')}</p>
    {invoiceError && <div className="alert" role="alert">{invoiceError}</div>}
    <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
      <Button secondary onClick={() => window.print()}>Print slip</Button>
      <Button secondary disabled={invoiceBusy} onClick={viewBill}><FileText size={16}/>{invoiceBusy ? 'Opening…' : 'View bill'}</Button>
      {order.status === 'PLACED' && <Button disabled={busy} onClick={onPacked}><Check size={16}/>Mark packed</Button>}
    </div>
  </div>;
}
// The company letterhead every invoice is printed with -- one row, filled
// in once. Blank fields still produce a working invoice, just a plainer one.
function SettingsPage({ settings, busy, action }) {
  const [logoUrl, setLogoUrl] = useState(settings?.logoUrl || '');
  const [uploading, setUploading] = useState(false), [error, setError] = useState('');
  useEffect(() => { setLogoUrl(settings?.logoUrl || ''); }, [settings]);
  if (!settings) return <section className="panel"><Empty text="Loading your settings…"/></section>;
  return <section className="panel">
    <div className="panel-heading"><div><h2>Company details</h2><p>Printed on every invoice — the customer's, the wholesale partner's, and the packing slip.</p></div></div>
    <form className="editor" style={{ padding: '18px 22px' }} onSubmit={e => {
      e.preventDefault(); setError('');
      const f = Object.fromEntries(new FormData(e.target));
      action(() => api('/admin/settings', { method: 'PUT', body: {
        companyName: f.companyName, companyAddress: f.companyAddress || '',
        companyGSTIN: f.companyGSTIN?.trim() || null, companyPhone: f.companyPhone?.trim() || null,
        companyEmail: f.companyEmail?.trim() || null, logoUrl: logoUrl || null,
      } }), 'Company details saved');
    }}>
      <Field label="Company name" name="companyName" defaultValue={settings.companyName} required maxLength={150}/>
      <Field label="Address"><textarea name="companyAddress" defaultValue={settings.companyAddress || ''} maxLength={500} rows={2} placeholder="Shop / office address, printed on every invoice"/></Field>
      <div className="form-grid">
        <Field label="GSTIN (optional)" name="companyGSTIN" defaultValue={settings.companyGSTIN || ''} pattern="[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][0-9A-Za-z][zZ][0-9A-Za-z]" title="15-character GST number, e.g. 08ABCDE1234F1Z5" placeholder="08ABCDE1234F1Z5"/>
        <Field label="Phone (optional)" name="companyPhone" defaultValue={settings.companyPhone || ''} placeholder="+91 90000 00000"/>
      </div>
      <Field label="Email (optional)" name="companyEmail" type="email" defaultValue={settings.companyEmail || ''} placeholder="support@yourshop.com"/>
      <Field label="Logo URL — shown top-right on every invoice" name="logoUrl" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://…"/>
      <Field label={uploading ? 'Uploading…' : 'Or upload a logo (max 5 MB)'} type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={async e => {
        if (!e.target.files[0]) return; setUploading(true);
        try { const form = new FormData(); form.append('image', e.target.files[0]); form.append('watermark', 'false'); const r = await api('/admin/images', { method: 'POST', body: form }); setLogoUrl(r.url); }
        catch (err) { setError(err.message); } finally { setUploading(false); }
      }}/>
      {logoUrl && <img src={logoUrl} alt="Logo preview" style={{ height: 56, marginBottom: 14, borderRadius: 8, border: '1px solid #e5ebef' }} onError={e => { e.currentTarget.style.display = 'none'; }}/>}
      {error && <div role="alert" className="alert">{error}</div>}
      <Button disabled={busy || uploading}>Save company details</Button>
    </form>
  </section>;
}
function ApplicationDetails({ application: a }) {
  return <div className="order-detail">
    <div className="detail-summary"><strong>{a.shopName}</strong><Badge>{a.status}</Badge></div>
    <p><strong>{a.ownerName}</strong> · {a.phone}{a.email ? ` · ${a.email}` : ''}<br/>{a.address}</p>
    <h3>Verification details</h3>
    <p>GST: <strong>{a.gstNumber || 'not given'}</strong><br/>Aadhaar: <strong>{a.aadharNumber || 'not given'}</strong></p>
    {a.documents?.length > 0 && <div className="doc-row">{a.documents.map(url => <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt="Uploaded document"/></a>)}</div>}
    {a.note && <p className="muted">Note: {a.note}</p>}
    {a.seller?.username && <p className="muted">Seller login: <strong>{a.seller.username}</strong></p>}
  </div>;
}
function ApproveSeller({ application, busy, onSubmit }) {
  return <form className="editor" onSubmit={e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); onSubmit({ username: f.username, password: f.password, gstVerified: f.gstVerified === 'on', aadharVerified: f.aadharVerified === 'on' }); }}>
    <p className="muted">Check the GST and Aadhaar details, then set the login you will pass on to {application.ownerName}.</p>
    <p>GST: <strong>{application.gstNumber || 'not given'}</strong> · Aadhaar: <strong>{application.aadharNumber || 'not given'}</strong></p>
    <label className="checkbox"><input type="checkbox" name="gstVerified"/>GST number verified</label>
    <label className="checkbox"><input type="checkbox" name="aadharVerified"/>Aadhaar verified</label>
    <div className="form-grid">
      <Field label="Seller ID (username)" name="username" minLength={3} maxLength={50} pattern="[a-zA-Z0-9_.\-]+" placeholder="e.g. sharma-traders" required/>
      <PasswordField label="Password" name="password" minLength={8} maxLength={100} placeholder="Set their first password" required autoComplete="new-password"/>
    </div>
    <Button disabled={busy}>{busy ? 'Creating…' : 'Approve and create login'}</Button>
  </form>;
}
function RejectSeller({ busy, onSubmit }) {
  return <form className="editor" onSubmit={e => { e.preventDefault(); onSubmit(new FormData(e.target).get('note')); }}>
    <Field label="Why is this rejected? The sales team will see this."><textarea name="note" required maxLength={500} rows={3} placeholder="e.g. GST certificate photo is not readable"/></Field>
    <Button disabled={busy}>{busy ? 'Saving…' : 'Reject application'}</Button>
  </form>;
}
function StaffEditor({ data, busy, onSubmit }) {
  return <form className="editor" onSubmit={e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); onSubmit(data ? { name: f.name, role: f.role } : { name: f.name, email: f.email, password: f.password, role: f.role }); }}>
    <Field label="Name" name="name" defaultValue={data?.name} maxLength={100} required/>
    {data ? <p className="muted">Email: <strong>{data.email}</strong> · use “Reset password” to change the password.</p>
      : <div className="form-grid">
        <Field label="Email (their login)" name="email" type="email" maxLength={200} required autoComplete="off"/>
        <PasswordField label="Password" name="password" minLength={8} maxLength={100} required autoComplete="new-password"/>
      </div>}
    <Field label="Team"><select name="role" defaultValue={data?.role || 'PACKING'} required><option value="PACKING">Packing team — sees only orders to pack</option><option value="SALES">Sales team — signs up new sellers</option><option value="ADMIN">Admin — full access</option></select></Field>
    <Button disabled={busy}>{busy ? 'Saving…' : data ? 'Save changes' : 'Create login'}</Button>
  </form>;
}
// The sales team fills this in front of the shopkeeper.
function SellerApplicationForm({ busy, onSubmit }) {
  const [documents, setDocuments] = useState([]), [uploading, setUploading] = useState(false), [error, setError] = useState('');
  return <form className="editor" onSubmit={e => {
    e.preventDefault(); setError('');
    const f = Object.fromEntries(new FormData(e.target));
    onSubmit({ shopName: f.shopName, ownerName: f.ownerName, phone: f.phone, email: f.email || null, address: f.address, gstNumber: f.gstNumber || null, aadharNumber: f.aadharNumber || null, documents });
  }}>
    <div className="form-grid">
      <Field label="Shop name" name="shopName" maxLength={150} required/>
      <Field label="Owner name" name="ownerName" maxLength={100} required/>
      <Field label="Phone" name="phone" type="tel" pattern="\+?[0-9]{10,15}" title="10-15 digits" required/>
      <Field label="Email (optional)" name="email" type="email" maxLength={200}/>
      <Field label="GST number (optional)" name="gstNumber" pattern="[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][0-9A-Za-z][zZ][0-9A-Za-z]" title="15-character GST number, e.g. 08ABCDE1234F1Z5" placeholder="08ABCDE1234F1Z5"/>
      <Field label="Aadhaar number (optional)" name="aadharNumber" pattern="[0-9]{12}" title="12 digits" placeholder="12 digits"/>
    </div>
    <Field label="Shop address"><textarea name="address" maxLength={500} rows={2} required/></Field>
    <Field label={uploading ? 'Uploading…' : 'Photos of GST certificate / Aadhaar / shop (up to 6)'} type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading || documents.length >= 6} onChange={async e => {
      if (!e.target.files[0]) return;
      setUploading(true); setError('');
      try { const form = new FormData(); form.append('image', e.target.files[0]); const r = await api('/panel/images', { method: 'POST', body: form }); setDocuments(d => [...d, r.url]); }
      catch (err) { setError(err.message); } finally { setUploading(false); e.target.value = ''; }
    }}/>
    {documents.length > 0 && <div className="doc-row">{documents.map(url => <div key={url}><img src={url} alt="Uploaded document"/><button type="button" className="icon-button" aria-label="Remove document" onClick={() => setDocuments(d => d.filter(x => x !== url))}><X size={14}/></button></div>)}</div>}
    {error && <div className="alert">{error}</div>}
    <Button disabled={busy || uploading}>{busy ? 'Sending…' : 'Send to admin for verification'}</Button>
  </form>;
}
function Login({ onLogin }) {
  // Vendor sign-in is hidden for now (wholesale is being added later); the
  // role switch comes back by restoring the tabs below with a role state.
  const role = 'ADMIN', [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <div className="login"><section className="login-story"><div className="brand"><ShoppingBag/><span>NTSA.</span></div><div><div className="eyebrow">GOOD BUSINESS STARTS HERE</div><h1>Everything you need.<br/><span>Room to grow.</span></h1><p>Your store, your partners, your next big idea.<br/>Bring it all together with NTSA.</p><div className="login-tags"><span><Check size={16}/>Simple operations</span><span><Check size={16}/>Stronger partnerships</span></div></div><small>Shop smarter. Live better.</small></section><section className="login-form"><div><div className="eyebrow">WELCOME TO YOUR WORKSPACE</div><h2>Let’s get you settled.</h2><p>Sign in to manage your everyday business.</p><form style={{ marginTop: 28 }}onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); const data = new FormData(e.target); try { const r = await api('/auth/login', { method: 'POST', body: { role, username: data.get('username'), password: data.get('password') } }); onLogin(r.token, r.role); } catch (err) { setError(err.message); } finally { setBusy(false); } }}><Field label={role === 'ADMIN' ? 'Email address' : 'Username'} name="username" type={role === 'ADMIN' ? 'email' : 'text'} placeholder={role === 'ADMIN' ? 'you@company.com' : 'Your assigned username'} required autoComplete="username"/><PasswordField label="Password" name="password" placeholder="Enter your password" required autoComplete="current-password"/>{error && <div role="alert" className="alert">{error}</div>}<Button disabled={busy}>{busy ? 'Signing in…' : 'Sign in to workspace'}<ArrowUpRight size={18}/></Button></form><p className="login-help"><ShieldCheck size={17}/>{role === 'ADMIN' ? 'Access is reserved for your store administrator.' : 'Your account is created by the NTSA administrator.'}</p></div></section></div>;
}
function Editor({ type, data, categories, busy, onSubmit }) {
  const [images, setImages] = useState(data?.images?.join('\n') || ''), [uploading, setUploading] = useState(false), [error, setError] = useState('');
  const [colorImages, setColorImages] = useState(Object.entries(data?.colorImages || {}).map(([c, u]) => `${c} = ${u}`).join('\n'));
  const [attributes, setAttributes] = useState(data?.attributes?.length ? data.attributes : [{ label: '', value: '' }]);
  const setAttr = (i, key, value) => setAttributes(rows => rows.map((r, idx) => idx === i ? { ...r, [key]: value } : r));
  // Options (sizes / storage / ...) and their optional per-option prices, in rupees while editing.
  const [showCondition, setShowCondition] = useState(!!data?.condition && data.condition !== 'NEW');
  const [sizes, setSizes] = useState(data?.sizes?.join(', ') || '');
  const [sizePrices, setSizePrices] = useState(() => Object.fromEntries(Object.entries(data?.sizePrices || {}).map(([k, v]) => [k, { retail: v.pricePaise / 100, wholesale: v.wholesalePaise / 100, mrp: v.mrpPaise ? v.mrpPaise / 100 : '' }])));
  const sizeList = sizes.split(',').map(x => x.trim()).filter(Boolean);
  const setSizePrice = (size, key, value) => setSizePrices(p => ({ ...p, [size]: { ...p[size], [key]: value } }));
  // Colours and what each one adds to the price, in rupees while editing.
  const [categoryId, setCategoryId] = useState(data?.categoryId || '');
  // Refurbished / open box only belongs to some categories; an existing
  // second-hand product keeps the field so it can still be corrected.
  const allowsUsedStock = !!categories?.find(c => c.id === categoryId)?.allowsUsedStock;
  // A free, offline nudge from the product's own name/description, so a
  // phone doesn't end up filed under Books. Only ever a suggestion --
  // shown while it disagrees with whatever category is actually picked.
  const [suggestion, setSuggestion] = useState(null);
  const checkSuggestion = form => setSuggestion(suggestCategory(`${form.name?.value || ''} ${form.description?.value || ''}`, categories || []));
  const [colors, setColors] = useState(data?.colors?.join(', ') || '');
  const colorList = colors.split(',').map(x => x.trim()).filter(Boolean);
  const [colorExtras, setColorExtras] = useState(() => Object.fromEntries(Object.entries(data?.colorExtraPaise || {}).map(([k, v]) => [k, v / 100])));
  const setColorExtra = (color, value) => setColorExtras(p => ({ ...p, [color]: value }));
  // Typing "+300" on an option fills its three prices from the ones above, so
  // the admin sets one number instead of three and no option is left at the
  // base price by accident.
  const applyExtra = (form, size, extra) => {
    const add = Number(extra);
    if (!Number.isFinite(add)) return;
    const base = { retail: Number(form.retail?.value), wholesale: Number(form.wholesale?.value), mrp: Number(form.mrp?.value) };
    if (!Number.isFinite(base.retail) || !Number.isFinite(base.wholesale)) { setError('Fill in the retail and wholesale price above first'); return; }
    setSizePrices(p => ({ ...p, [size]: {
      retail: (base.retail + add).toFixed(2),
      wholesale: (base.wholesale + add).toFixed(2),
      mrp: base.mrp > 0 ? (base.mrp + add).toFixed(2) : '',
    } }));
  };
  return <form className="editor" onSubmit={e => { e.preventDefault(); setError(''); const f = Object.fromEntries(new FormData(e.target)); try {
    if (type === 'Products' || type === 'Wholesale products') {
      const colorImageMap = Object.fromEntries(colorImages.split('\n').map(line => line.split('=').map(x => x.trim())).filter(([c, u]) => c && u));
      const cleanAttributes = attributes.map(a => ({ label: a.label.trim(), value: a.value.trim() })).filter(a => a.label && a.value);
      const colorExtraPaise = Object.fromEntries(colorList.filter(c => Number(colorExtras[c]) > 0).map(c => [c, paise(colorExtras[c])]));
      const optionPrices = Object.fromEntries(sizeList.filter(s => String(sizePrices[s]?.retail ?? '').trim()).map(s => {
        const o = sizePrices[s];
        if (!String(o.wholesale ?? '').trim()) throw new Error(`Enter a wholesale price for ${s}, or clear its retail price`);
        return [s, { pricePaise: paise(o.retail), wholesalePaise: paise(o.wholesale), mrpPaise: String(o.mrp ?? '').trim() ? paise(o.mrp) : null }];
      }));
      onSubmit({ name: f.name, description: f.description, pricePaise: paise(f.retail), wholesalePaise: paise(f.wholesale), mrpPaise: f.mrp ? paise(f.mrp) : null, stock: Number(f.stock), categoryId: f.categoryId, images: images.split('\n').map(x => x.trim()).filter(Boolean), colors: f.colors.split(',').map(x => x.trim()).filter(Boolean), sizes: sizeList, sizeLabel: f.sizeLabel?.trim() || 'Size', sizePrices: Object.keys(optionPrices).length ? optionPrices : null, colorImages: Object.keys(colorImageMap).length ? colorImageMap : null, colorExtraPaise: Object.keys(colorExtraPaise).length ? colorExtraPaise : null, attributes: cleanAttributes, deal: f.deal === 'on', condition: f.condition || 'NEW', conditionNote: f.conditionNote?.trim() || null, audience: f.audience });
    }
    else if (type === 'Categories') onSubmit({ name: f.name, icon: data?.icon || 'shopping_bag', refundWindowHours: Number(f.refundWindowHours), allowsUsedStock: f.allowsUsedStock === 'on' });
    // Cleared optional fields are sent as null so an edit actually removes them.
    else if (type === 'Banners') onSubmit({ title: f.title, subtitle: f.subtitle || null, imageUrl: f.imageUrl || null, videoUrl: f.videoUrl || null, backgroundColor: f.backgroundColor || null, buttonText: f.buttonText || 'Shop Now', sortOrder: Number(f.sortOrder) || 0, active: f.active === 'on' });
    else if (type === 'Coupons') onSubmit({ code: f.code, description: f.description || '', discountType: f.discountType, value: f.discountType === 'PERCENT' ? Number(f.value) : paise(f.value), minOrderPaise: Number(f.minOrderPaise) > 0 ? paise(f.minOrderPaise) : 1, maxDiscountPaise: Number(f.maxDiscountPaise) > 0 ? paise(f.maxDiscountPaise) : null, usageLimit: f.usageLimit ? Number(f.usageLimit) : null, expiresAt: f.expiresAt ? new Date(f.expiresAt).toISOString() : undefined, active: f.active === 'on' });
    else onSubmit({
      name: f.name,
      // Only sent when creating -- the wholesale ID can't change after
      // creation, and the password is changed separately via Reset.
      ...(data ? {} : { username: f.username, password: f.password }),
      email: f.email || null, phone: f.phone || null,
      aadharNumber: f.aadharNumber || null, panNumber: f.panNumber || null, gstNumber: f.gstNumber || null,
      gstVerified: f.gstVerified === 'on', aadharVerified: f.aadharVerified === 'on',
      limits: { minPaise: paise(f.min), maxPaise: paise(f.max) },
    });
  } catch (err) { setError(err.message); } }}>
    {['Products', 'Wholesale products', 'Categories', 'Vendors'].includes(type) && <Field label="Name" name="name" defaultValue={data?.name} required maxLength={100} onChange={e => checkSuggestion(e.target.form)}/>}
    {['Products', 'Wholesale products'].includes(type) && <AudienceField value={data?.audience || (type === 'Wholesale products' ? 'WHOLESALE' : 'RETAIL')}/>}
    {type === 'Categories' && <>
      <Field label="Return window (hours) — how long a customer has to return anything in this category" name="refundWindowHours" type="number" min="0" max="720" step="1" defaultValue={data?.refundWindowHours ?? 24} required/>
      <label className="checkbox"><input type="checkbox" name="allowsUsedStock" defaultChecked={data?.allowsUsedStock}/>Allow refurbished / open-box stock here</label>
      <p className="muted">0 means no returns. Saving this updates every product in the category; orders already placed keep the window they were bought under.</p>
    </>}
    {['Products', 'Wholesale products'].includes(type) && <><Field label="Description"><textarea name="description" defaultValue={data?.description} required maxLength={5000} onChange={e => checkSuggestion(e.target.form)}/></Field><div className="form-grid"><Field label="Retail price (₹)" name="retail" type="number" min="0.01" step="0.01" defaultValue={data ? data.pricePaise / 100 : ''} required/><Field label="Wholesale price (₹)" name="wholesale" type="number" min="0.01" step="0.01" defaultValue={data ? data.wholesalePaise / 100 : ''} required/><Field label="MRP (₹) — optional, shows a strikethrough discount" name="mrp" type="number" min="0.01" step="0.01" defaultValue={data?.mrpPaise ? data.mrpPaise / 100 : ''}/><Field label="Stock quantity" name="stock" type="number" min="0" step="1" defaultValue={data?.stock ?? 0} required/><p className="muted">Returns are allowed for as long as the chosen category says. Change that on the Categories page.</p></div><Field label="Category"><select name="categoryId" value={categoryId} onChange={e => setCategoryId(e.target.value)} required><option value="" disabled>Select a category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
    {suggestion && suggestion.id !== categoryId && <p className="muted" style={{ marginTop: -10 }}>This sounds like it belongs in <strong>{suggestion.name}</strong>. <button type="button" className="text-button" style={{ display: 'inline', padding: 0 }} onClick={() => { setCategoryId(suggestion.id); setSuggestion(null); }}>Use this category</button></p>}<div className="form-grid"><Field label="Colors — comma separated, optional" name="colors" value={colors} onChange={e => setColors(e.target.value)} placeholder="Black, White, Blue"/><Field label="Options (sizes, storage…) — comma separated, optional" name="sizes" value={sizes} onChange={e => setSizes(e.target.value)} placeholder="6, 7, 8  or  128GB, 256GB"/></div>
      {colorList.length > 0 && <Field label="Colour price difference — optional. What a colour costs on top of the price above; leave blank when it costs the same.">
        <div className="attribute-rows">
          {colorList.map(c => <div className="option-price-row" key={c}>
            <strong>{c}</strong>
            <input type="number" min="0" step="0.01" placeholder="+ Extra ₹" aria-label={`${c} extra over the base price`} value={colorExtras[c] ?? ''} onChange={e => setColorExtra(c, e.target.value)}/>
          </div>)}
        </div>
      </Field>}
      {sizeList.length > 0 && <>
        <Field label="Option name shown to shoppers" name="sizeLabel" defaultValue={data?.sizeLabel || 'Size'} maxLength={30} placeholder="Size, Storage, RAM…" required/>
        <Field label="Price per option — a bigger option should cost more. Type what it costs extra and the prices fill in, or write them yourself.">
          <div className="attribute-rows">
            {sizeList.map(s => <div className="option-price-row" key={s}>
              <strong>{s}</strong>
              <input type="number" step="0.01" placeholder="+ Extra ₹" aria-label={`${s} extra over the base price`} onChange={e => applyExtra(e.target.form, s, e.target.value)}/>
              <input type="number" min="0.01" step="0.01" placeholder="Retail ₹" aria-label={`${s} retail price`} value={sizePrices[s]?.retail ?? ''} onChange={e => setSizePrice(s, 'retail', e.target.value)}/>
              <input type="number" min="0.01" step="0.01" placeholder="Wholesale ₹" aria-label={`${s} wholesale price`} value={sizePrices[s]?.wholesale ?? ''} onChange={e => setSizePrice(s, 'wholesale', e.target.value)}/>
              <input type="number" min="0.01" step="0.01" placeholder="MRP ₹ (optional)" aria-label={`${s} MRP`} value={sizePrices[s]?.mrp ?? ''} onChange={e => setSizePrice(s, 'mrp', e.target.value)}/>
            </div>)}
          </div>
          {sizeList.some(s => String(sizePrices[s]?.retail ?? '').trim()) && sizeList.some(s => !String(sizePrices[s]?.retail ?? '').trim())
            ? <small className="danger-text">Price every option, or clear them all — a half-filled list is refused.</small>
            : sizeList.every(s => !String(sizePrices[s]?.retail ?? '').trim())
              ? <small>Every option costs the same right now. Is 10kg really the same price as 5kg?</small>
              : null}
        </Field>
      </>}<Field label="Color photos — optional, one per line as &quot;Color = image URL&quot;. Shown when the shopper picks that color."><textarea value={colorImages} onChange={e => setColorImages(e.target.value)} placeholder={'Black = https://…\nWhite = https://…'} rows={3}/></Field><Field label="Image URLs — one per line, up to 5"><textarea value={images} onChange={e => setImages(e.target.value)} placeholder="https://…"/></Field><Field label={uploading ? 'Uploading…' : 'Or upload a photo (max 5 MB) — the NTSA logo is stamped on automatically'} type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={async e => { if (!e.target.files[0]) return; setUploading(true); try { if (images.split('\n').filter(Boolean).length >= 5) throw new Error('Maximum five images'); const form = new FormData(); form.append('image', e.target.files[0]); const r = await api('/admin/images', { method: 'POST', body: form }); setImages(v => [v, r.url].filter(Boolean).join('\n')); } catch (err) { setError(err.message); } finally { setUploading(false); } }}/>
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
      <label className="checkbox"><input type="checkbox" name="deal" defaultChecked={data?.deal}/>Feature in Deals of the Day</label>
      {/* Hidden behind a button: most products are plain new stock. */}
      {!allowsUsedStock && !showCondition ? null : !showCondition ? <button type="button" className="button secondary" onClick={() => setShowCondition(true)}>Not brand-new stock? (refurbished / open box)</button> : <>
        <Field label="Condition"><select name="condition" defaultValue={data?.condition || 'NEW'}><option value="NEW">New</option><option value="REFURBISHED">Refurbished</option><option value="OPEN_BOX">Open box — unused, box opened</option><option value="USED">Used</option></select></Field>
        <Field label="Condition note — shown to the shopper (optional)" name="conditionNote" defaultValue={data?.conditionNote || ''} maxLength={200} placeholder="e.g. Box opened for testing, product unused"/>
      </>}</>}
    {type === 'Banners' && <>
      <Field label="Title — use a new line for a second line" name="title"><textarea name="title" defaultValue={data?.title} required maxLength={100} rows={2}/></Field>
      <Field label="Subtitle (optional)" name="subtitle" defaultValue={data?.subtitle || ''} maxLength={200}/>
      <Field label="Background image URL (optional)" name="imageUrl" defaultValue={data?.imageUrl || ''} placeholder="https://…"/>
      <Field label={uploading ? 'Uploading…' : 'Or upload a background image (max 5 MB)'} type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={async e => { if (!e.target.files[0]) return; setUploading(true); try { const form = new FormData(); form.append('image', e.target.files[0]); form.append('watermark', 'false'); const r = await api('/admin/images', { method: 'POST', body: form }); e.target.form.imageUrl.value = r.url; } catch (err) { setError(err.message); } finally { setUploading(false); } }}/>
      <Field label="Background video URL (optional) — plays instead of the image, muted and on a loop" name="videoUrl" defaultValue={data?.videoUrl || ''} placeholder="https://…"/>
      <Field label={uploading ? 'Uploading…' : 'Or upload a video (MP4, WebM or MOV, max 25 MB)'} type="file" accept="video/mp4,video/webm,video/quicktime" disabled={uploading} onChange={async e => { if (!e.target.files[0]) return; setUploading(true); try { const form = new FormData(); form.append('file', e.target.files[0]); const r = await api('/admin/attachments', { method: 'POST', body: form }); e.target.form.videoUrl.value = r.url; } catch (err) { setError(err.message); } finally { setUploading(false); } }}/>
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
        <Field label="GST number" name="gstNumber" defaultValue={data?.gstNumber || ''} pattern="[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][0-9A-Za-z][zZ][0-9A-Za-z]" title="15-character GST number, e.g. 08ABCDE1234F1Z5" placeholder="08ABCDE1234F1Z5"/>
      </div>
      <p className="muted" style={{ marginBottom: 6 }}>Tick these once you have seen the documents yourself.</p>
      <label className="checkbox"><input type="checkbox" name="gstVerified" defaultChecked={data?.gstVerified}/>GST number verified</label>
      <label className="checkbox"><input type="checkbox" name="aadharVerified" defaultChecked={data?.aadharVerified}/>Aadhaar verified</label>
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
  // Photos or clips picked for the next message, uploaded as soon as they're chosen.
  const [attachments, setAttachments] = useState([]), [uploading, setUploading] = useState(false);
  useEffect(() => { api(`/admin/vendors/${vendor.id}/messages`).then(setThread).catch(err => setError(err.message)); }, [vendor.id]);
  async function attach(file) {
    if (!file) return;
    if (attachments.length >= 4) { setError('Up to four attachments per message'); return; }
    setUploading(true); setError('');
    try { const form = new FormData(); form.append('file', file); const { url } = await api('/admin/attachments', { method: 'POST', body: form }); setAttachments(a => [...a, url]); }
    catch (err) { setError(err.message); } finally { setUploading(false); }
  }
  async function send() {
    if (!reply.trim() && !attachments.length) return;
    setSending(true); setError('');
    try {
      const msg = await api(`/admin/vendors/${vendor.id}/messages`, { method: 'POST', body: { body: reply.trim(), attachments } });
      setThread(t => [...(t || []), msg]); setReply(''); setAttachments([]);
    } catch (err) { setError(err.message); } finally { setSending(false); }
  }
  return <div className="messages-thread">
    <div className="messages-scroll">
      {thread === null ? <p className="muted">Loading conversation…</p> : thread.length === 0 ? <p className="muted">No messages yet from this partner.</p> : thread.map(m => <div key={m.id} className={`message-bubble ${m.sender === 'ADMIN' ? 'from-admin' : 'from-vendor'}`}>{m.body && <p>{m.body}</p>}{!!m.attachments?.length && <div className="message-media">{m.attachments.map(url => <Attachment key={url} url={url}/>)}</div>}<small>{m.sender === 'ADMIN' ? 'You' : vendor.name} · {new Date(m.createdAt).toLocaleString()}</small></div>)}
    </div>
    {error && <div className="alert">{error}</div>}
    {!!attachments.length && <div className="message-media pending">{attachments.map(url => <div key={url} className="pending-attachment"><Attachment url={url}/><button type="button" aria-label="Remove attachment" onClick={() => setAttachments(a => a.filter(u => u !== url))}>×</button></div>)}</div>}
    <div className="message-compose">
      <input placeholder="Reply to this partner…" value={reply} onChange={e => setReply(e.target.value)} maxLength={1000} onKeyDown={e => e.key === 'Enter' && send()}/>
      <label className="attach-button" title="Attach a photo or video">{uploading ? '…' : <Paperclip size={17}/>}<input type="file" name="attachment" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime" disabled={uploading || attachments.length >= 4} style={{ display: 'none' }} onChange={async e => { await attach(e.target.files[0]); e.target.value = ''; }}/></label>
      <Button disabled={sending || uploading || (!reply.trim() && !attachments.length)} onClick={send}>Send</Button>
    </div>
  </div>;
}
// A chat attachment: Cloudinary keeps videos under /video/, and our dev
// stand-in just writes the file with its own extension.
function Attachment({ url }) {
  const isVideo = /\.(mp4|webm|mov)($|\?)/i.test(url) || /\/video\/upload\//.test(url);
  return isVideo
    ? <video src={url} controls preload="metadata"/>
    : <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="Attachment"/></a>;
}
function OrderDetails({ order, admin, busy, action, next, onCancel }) {
  const [otp, setOtp] = useState(''), [code, setCode] = useState(''), [cancelling, setCancelling] = useState(false);
  const [invoiceBusy, setInvoiceBusy] = useState(false), [invoiceError, setInvoiceError] = useState('');
  async function viewBill() {
    setInvoiceBusy(true); setInvoiceError('');
    try { await openInvoice(order.id); } catch (e) { setInvoiceError(e.message); } finally { setInvoiceBusy(false); }
  }
  // An order can be called off until it is handed over as delivered.
  const cancellable = admin && onCancel && !['DELIVERED', 'CANCELLED'].includes(order.status);
  return <div className="order-detail"><div className="detail-summary"><strong>#{order.id.slice(-8).toUpperCase()}</strong><Badge>{order.status}</Badge></div>
    <div style={{ margin: '2px 0 16px' }}><Button secondary disabled={invoiceBusy} onClick={viewBill}><FileText size={15}/>{invoiceBusy ? 'Opening…' : 'View / download bill'}</Button></div>
    {invoiceError && <div className="alert" role="alert">{invoiceError}</div>}
    {order.items.map(i => <div key={i.id} className="line-item"><div><strong>{i.name}</strong>{(i.size || i.color) && <small className="variant">{[i.size && `Size / option: ${i.size}`, i.color && `Color: ${i.color}`].filter(Boolean).join(' · ')}</small>}<small>{i.quantity} × {money(i.unitPaise)} · {i.refundWindowHours}h refund window</small></div><strong>{money(i.unitPaise * i.quantity)}</strong></div>)}<div className="line-item"><strong>Total · {order.paymentMethod}</strong><strong>{money(order.totalPaise)}</strong></div><h3>Delivery address</h3><p>{order.address.name} · {order.address.phone}<br/>{order.address.line1}, {order.address.city}, {order.address.state} {order.address.postalCode}</p>{order.deliveredAt && <p>Delivered: {new Date(order.deliveredAt).toLocaleString()}</p>}
    {admin && next[order.status] && <Button disabled={busy} onClick={() => action(() => api(`/admin/orders/${order.id}/status`, { method: 'PATCH', body: { status: next[order.status] } }))}>Mark {next[order.status].toLowerCase().replaceAll('_', ' ')}</Button>}
    {admin && order.status === 'OUT_FOR_DELIVERY' && <form onSubmit={e => { e.preventDefault(); action(() => api(`/admin/orders/${order.id}/deliver`, { method: 'POST', body: { otp } })); }}><Field label="Recipient's delivery OTP" value={otp} onChange={e => setOtp(e.target.value)} pattern="[0-9]{6}" maxLength={6} required/><Button disabled={busy}>Verify and confirm delivery</Button></form>}
    {order.status === 'CANCELLED' && <p className="danger-text"><strong>Cancelled{order.cancelledBy ? ` by ${order.cancelledBy.toLowerCase()}` : ''}.</strong>{order.cancelReason ? ` ${order.cancelReason}` : ''} Stock has been put back.</p>}
    {cancellable && (cancelling
      ? <form className="editor" style={{ marginTop: 18 }} onSubmit={e => { e.preventDefault(); onCancel(new FormData(e.target).get('reason')); }}>
          <Field label="Why is this order being cancelled?"><textarea name="reason" required maxLength={300} rows={2} placeholder="e.g. Customer refused delivery"/></Field>
          <div style={{ display: 'flex', gap: 10 }}><Button secondary type="button" onClick={() => setCancelling(false)}>Keep order</Button><Button disabled={busy}>Cancel this order</Button></div>
        </form>
      : <p><button className="danger-text" onClick={() => setCancelling(true)}>Cancel this order</button></p>)}
    {!admin && order.status === 'OUT_FOR_DELIVERY' && <><p>Only share this code with the rider after receiving your order.</p><Button disabled={busy} onClick={() => action(async () => { const r = await api(`/orders/${order.id}/delivery-code`, { method: 'POST' }); setCode(r.otp); }, 'Delivery OTP generated')}>Generate delivery OTP</Button>{code && <h2>{code} <small>Valid for 15 minutes</small></h2>}</>}
  </div>;
}
function WholesaleCheckout({ items, total, limits, busy, onSubmit }) {
  const [key] = useState(() => crypto.randomUUID());
  const valid = limits && total >= limits.minPaise && total <= limits.maxPaise;
  return <form className="editor" onSubmit={e => { e.preventDefault(); const address = Object.fromEntries(new FormData(e.target)); onSubmit({ items: items.map(p => ({ productId: p.id, quantity: p.quantity })), address, paymentMethod: 'COD', checkoutKey: key }); }}><div className="line-item"><strong>{items.length} products</strong><strong>{money(total)}</strong></div><p className={valid ? 'muted' : 'danger-text'}>Your order must be between {money(limits?.minPaise)} and {money(limits?.maxPaise)}.</p><div className="form-grid">{[['name', 'Recipient'], ['phone', 'Phone'], ['line1', 'Street address'], ['city', 'City'], ['state', 'State'], ['postalCode', 'PIN code']].map(([name, label]) => <Field key={name} label={label} name={name} required/>)}</div><p>Payment: cash on delivery. Prices and stock are checked again when you place the order.</p><Button disabled={busy || !valid}>{busy ? 'Placing order…' : 'Place wholesale order'}</Button></form>;
}
createRoot(document.getElementById('root')).render(<App/>);
