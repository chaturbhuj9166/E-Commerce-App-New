import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { LayoutDashboard, Package, Shapes, Users, User, ShoppingBag, RotateCcw, LogOut, Search, Plus, ArrowUpRight, ChevronRight, Check, Menu, X, Truck, ShieldCheck, Wallet, Store, Image, Tag, Eye, EyeOff, Bell, ClipboardList, UserPlus, BadgeCheck, UserCog, MapPin, Paperclip, Settings as SettingsIcon, FileText, BarChart3, Star, TrendingUp, Stamp, LifeBuoy, MoreVertical } from 'lucide-react';
import { api, money, paise, openInvoice, suggestCategory, SELLER_PANEL_URL } from './api';
import { Button, Field, PasswordField, Badge, Empty, Modal, Stat, ProductImage, CONDITION_LABEL } from './ui';
import { WholesaleProductsPage, AudienceField } from './pages/wholesale-products';
import { OverviewPage } from './pages/dashboard';
import { CustomersPage } from './pages/customers';
import { ReviewsPage } from './pages/reviews';
import { SellerInsightsPage } from './pages/seller-insights';
import { ShipmentsPage } from './pages/shipments';
import { ReportsPage } from './pages/reports';
import { OrderTable, isNtsaOwnOrder, orderSellers } from './pages/shared';
import './style.css';

// The refurbished/used grades a shopper can be offered, cheapest intent first.
const GRADES = ['Fair', 'Good', 'Superb'];
// The invoice's item columns before the admin changes anything -- mirrors the
// backend default. `item` and `amount` always print; `variant` is a sub-line.
const DEFAULT_INVOICE_COLUMNS = [
  { key: 'item', label: 'Item', show: true },
  { key: 'variant', label: 'Variant', show: true },
  { key: 'hsn', label: 'HSN', show: false },
  { key: 'qty', label: 'Qty', show: true },
  { key: 'rate', label: 'Rate', show: true },
  { key: 'amount', label: 'Amount', show: true },
];
// Which pages the admin can switch on or off per panel, from the Pages screen.
// A panel's first/home page isn't listed -- it always stays. The key is what's
// stored; the label is what both the Pages screen and the panel's nav use.
const PANEL_CATALOG = {
  SELLER: [['products', 'My products'], ['orders', 'My orders'], ['topack', 'To pack'], ['support', 'Support'], ['settings', 'Settings']],
  PACKING: [['packed', 'Packed']],
  SALES: [['mysellers', 'My sellers']],
  SUPPORT: [['sellerproducts', 'Seller products'], ['settings', 'Settings']],
};
// A staff nav label -> its stored page key (only the hideable ones).
const NAV_KEY = { Packed: 'packed', 'My sellers': 'mysellers', 'Seller products': 'sellerproducts', Settings: 'settings' };
// Admin pages the admin can share into a staff panel (read-only views). Each is
// [key, label, nav icon]; the panel loads its data from /panel/admin-data/<key>.
const SHAREABLE_ADMIN_PAGES = [['orders', 'Orders', ShoppingBag], ['products', 'Products', Package], ['customers', 'Customers', User]];
// Only staff panels can be given admin pages (the seller app can't render them).
const ADMIN_PAGE_PANELS = ['SUPPORT', 'PACKING', 'SALES'];

function App() {
  const [session, setSession] = useState(() => sessionStorage.getItem('ntsa-token'));
  // Panel appearance, remembered per role on this device (so turning the admin
  // panel dark doesn't also darken the packing/sales/support workspaces someone
  // signs into next). Applied as data-theme on the root for the CSS overrides.
  const [theme, setTheme] = useState('light');
  useEffect(() => { try { document.documentElement.setAttribute('data-theme', theme); } catch {} }, [theme]);
  const [me, setMe] = useState(null), [page, setPage] = useState(() => { try { return sessionStorage.getItem('ntsa-page') || 'Overview'; } catch { return 'Overview'; } }), [error, setError] = useState(''), [toast, setToast] = useState('');
  const [products, setProducts] = useState([]), [categories, setCategories] = useState([]), [orders, setOrders] = useState([]), [vendors, setVendors] = useState([]), [refunds, setRefunds] = useState([]);
  const [banners, setBanners] = useState([]), [coupons, setCoupons] = useState([]);
  // Wholesale-only stock, added from its own page and never shown in the app.
  const [wholesaleProducts, setWholesaleProducts] = useState([]);
  const [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [modal, setModal] = useState(null), [query, setQuery] = useState(''), [mobileNav, setMobileNav] = useState(false);
  const [cart, setCart] = useState({});
  // Admin Orders page: split NTSA's own stock from sellers', and find a shop's
  // orders by name.
  const [orderView, setOrderView] = useState('all'), [orderSellerQ, setOrderSellerQ] = useState('');
  const [productView, setProductView] = useState('all');
  // Packing and sales staff sign in on the same page and get their own few pages.
  const [staff, setStaff] = useState([]), [applications, setApplications] = useState([]), [notifications, setNotifications] = useState([]);
  const [toPack, setToPack] = useState([]), [packed, setPacked] = useState([]), [bellOpen, setBellOpen] = useState(false);
  const [blockedPins, setBlockedPins] = useState([]), [pinStats, setPinStats] = useState([]), [deliveryRules, setDeliveryRules] = useState([]), [blockedAreas, setBlockedAreas] = useState([]);
  // The letterhead every invoice is printed with.
  const [settings, setSettings] = useState(null);
  const [customers, setCustomers] = useState([]);
  // Approved sellers' own accounts -- separate from `applications`, which
  // is the sign-up request each one started as.
  const [sellers, setSellers] = useState([]);
  const [hiddenProducts, setHiddenProducts] = useState([]), [reviews, setReviews] = useState([]), [insights, setInsights] = useState([]);
  const [tickets, setTickets] = useState([]), [supportProducts, setSupportProducts] = useState([]);
  const [hiddenPages, setHiddenPages] = useState([]), [pageConfig, setPageConfig] = useState([]);
  const [supportSellers, setSupportSellers] = useState([]);
  const [grantedAdminPages, setGrantedAdminPages] = useState([]);
  // Overview and Reports share the same revenue/order-mix figures, so one
  // load keeps them in sync instead of each page fetching its own copy.
  const [reports, setReports] = useState(null), [reportsDays, setReportsDays] = useState(30), [loadingReports, setLoadingReports] = useState(false);
  async function loadReports(days) {
    setReportsDays(days); setLoadingReports(true);
    try { setReports(await api(`/admin/reports?days=${days}`)); } catch (e) { setError(e.message); } finally { setLoadingReports(false); }
  }
  const role = me?.role ?? 'ADMIN';
  // Load this role's own saved theme once we know who's signed in, and persist
  // only when the user actually changes it (so switching role never writes one
  // role's choice onto another's key).
  useEffect(() => { try { setTheme(localStorage.getItem(`ntsa-theme-${role}`) || 'light'); } catch {} }, [role]);
  const changeTheme = v => { setTheme(v); try { localStorage.setItem(`ntsa-theme-${role}`, v); } catch {} };
  const isAdmin = role === 'ADMIN', isPacking = role === 'PACKING', isSales = role === 'SALES', isSupport = role === 'SUPPORT';
  const isStaff = isPacking || isSales || isSupport;
  const unread = notifications.filter(n => !n.readAt).length;
  function logout() { sessionStorage.removeItem('ntsa-token'); sessionStorage.removeItem('ntsa-page'); setSession(null); setMe(null); setCart({}); setModal(null); setError(''); }
  async function load() {
    setLoading(true);
    try {
      const account = await api('/me'); setMe(account);
      if (['PACKING', 'SALES', 'SUPPORT'].includes(account.role)) {
        const pg = await api('/panel/pages');
        setHiddenPages(pg.hidden || []); setGrantedAdminPages(pg.adminPages || []);
        // Pull the data for each admin page the admin shared into this panel so
        // the shared page renders the same as it does for the admin.
        for (const key of (pg.adminPages || [])) {
          try {
            const data = await api(`/panel/admin-data/${key}`);
            if (key === 'orders') setOrders(data); else if (key === 'products') setProducts(data); else if (key === 'customers') setCustomers(data);
          } catch {}
        }
      }
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
      if (account.role === 'SUPPORT') {
        const [tks, sp, sls, notes] = await Promise.all([api('/support/tickets'), api('/support/products'), api('/support/sellers'), api('/notifications')]);
        setTickets(tks); setSupportProducts(sp); setSupportSellers(sls); setNotifications(notes);
        return;
      }
      const [p, c, o] = await Promise.all([api(account.role === 'ADMIN' ? '/admin/products?audience=RETAIL' : '/vendor/products'), api('/categories'), api('/orders')]);
      setProducts(p); setCategories(c); setOrders(o);
      if (account.role === 'ADMIN') setWholesaleProducts(await api('/admin/products?audience=WHOLESALE'));
      if (account.role === 'ADMIN') {
        const [v, r, b, cp, st, apps, notes, queue, pins, stats, rules, cfg, custs, rep, sls, hidden, revs, ins, tks] = await Promise.all([api('/admin/vendors'), api('/admin/refunds'), api('/admin/banners'), api('/admin/coupons'), api('/admin/staff'), api('/admin/seller-applications'), api('/notifications'), api('/packing/orders'), api('/admin/blocked-pincodes'), api('/admin/pincode-stats'), api('/admin/delivery-rules'), api('/admin/settings'), api('/admin/customers'), api(`/admin/reports?days=${reportsDays}`), api('/admin/sellers'), api('/admin/products?hidden=true'), api('/admin/reviews'), api('/admin/seller-insights'), api('/support/tickets')]);
        setVendors(v); setRefunds(r); setBanners(b); setCoupons(cp); setStaff(st); setApplications(apps); setNotifications(notes); setToPack(queue); setBlockedPins(pins); setPinStats(stats); setDeliveryRules(rules); setSettings(cfg);
        setCustomers(custs); setReports(rep); setSellers(sls); setHiddenProducts(hidden); setReviews(revs); setInsights(ins); setTickets(tks);
        setPageConfig(await api('/admin/pages')); setBlockedAreas(await api('/admin/blocked-areas'));
      }
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  async function markNotificationsRead() {
    if (!unread) return;
    try { await api('/notifications/read', { method: 'POST', body: {} }); setNotifications(list => list.map(n => n.readAt ? n : { ...n, readAt: new Date().toISOString() })); } catch (e) { setError(e.message); }
  }
  async function clearNotifications() {
    try { await api('/notifications', { method: 'DELETE' }); setNotifications([]); } catch (e) { setError(e.message); }
  }
  async function clearNotification(id) {
    try { await api(`/notifications/${id}`, { method: 'DELETE' }); setNotifications(list => list.filter(n => n.id !== id)); } catch (e) { setError(e.message); }
  }
  // Opens the real seller panel, signed in as them -- the blank tab has to
  // open synchronously inside the click or the browser blocks it as an
  // unrequested pop-up (same trick as openInvoice).
  async function openSellerDashboard(seller) {
    const popup = window.open('', '_blank');
    try {
      const { token } = await api(`/admin/sellers/${seller.id}/impersonate`, { method: 'POST' });
      const url = `${SELLER_PANEL_URL}?token=${encodeURIComponent(token)}`;
      if (popup) popup.location.href = url; else window.open(url, '_blank');
    } catch (e) {
      popup?.close();
      setError(e.message);
    }
  }
  useEffect(() => { if (session) load(); }, [session]);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timer); } }, [toast]);
  // Keeps every screen live without a manual refresh -- but only what other
  // people change (orders, the pack queue, notifications...), not the whole
  // workspace, and only in the tab that's actually on screen: every panel on
  // one machine shares one IP, and the API rate-limits per IP. Paused while a
  // modal is open so a reload never yanks a form out from under someone.
  async function refresh() {
    const role = me?.role;
    if (role === 'PACKING') {
      const [queue, done, notes] = await Promise.all([api('/packing/orders'), api('/packing/orders?status=PACKED'), api('/notifications')]);
      setToPack(queue); setPacked(done); setNotifications(notes);
    } else if (role === 'SALES') {
      const [apps, notes] = await Promise.all([api('/sales/applications'), api('/notifications')]);
      setApplications(apps); setNotifications(notes);
    } else if (role === 'ADMIN') {
      const [o, notes, queue, r, apps, rep] = await Promise.all([api('/orders'), api('/notifications'), api('/packing/orders'), api('/admin/refunds'), api('/admin/seller-applications'), api(`/admin/reports?days=${reportsDays}`)]);
      setOrders(o); setNotifications(notes); setToPack(queue); setRefunds(r); setApplications(apps); setReports(rep);
    } else if (role) {
      setOrders(await api('/orders'));
    }
  }
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const pollingRef = useRef(false);
  useEffect(() => {
    if (!session) return;
    const id = setInterval(async () => {
      if (pollingRef.current || modal || document.hidden) return;
      pollingRef.current = true;
      // A missed background poll isn't worth an error banner; the next one retries.
      try { await refreshRef.current(); } catch {} finally { pollingRef.current = false; }
    }, 10000);
    const onShow = () => { if (!document.hidden && !modal) refreshRef.current().catch(() => {}); };
    document.addEventListener('visibilitychange', onShow);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onShow); };
  }, [session, modal]);
  async function action(fn, message = 'Changes saved') {
    if (busy) return; setBusy(true); setError('');
    try { await fn(); setToast(message); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  if (!session) return <Login onLogin={(token, loginRole) => { sessionStorage.setItem('ntsa-token', token); const landing = loginRole === 'PACKING' ? 'To pack' : loginRole === 'SALES' ? 'Add seller' : loginRole === 'SUPPORT' ? 'Tickets' : 'Overview'; setPage(landing); try { sessionStorage.setItem('ntsa-page', landing); } catch {} setSession(token); }}/ >;
  const staffNav = isPacking ? [['To pack', ClipboardList], ['Packed', Check]]
    : isSales ? [['Add seller', UserPlus], ['My sellers', Store]]
    : isSupport ? [['Tickets', LifeBuoy], ['Seller products', Package], ['Settings', SettingsIcon]]
    : null;
  // Admin pages the admin shared into this staff panel, added to its nav.
  const staffAdminNav = staffNav ? grantedAdminPages.map(k => SHAREABLE_ADMIN_PAGES.find(p => p[0] === k)).filter(Boolean).map(([, label, Icon]) => [label, Icon]) : [];
  const nav = staffNav ? [...staffNav, ...staffAdminNav].filter(([label]) => { const k = NAV_KEY[label]; return !k || !hiddenPages.includes(k); })
    : isAdmin ? [['Overview', LayoutDashboard], ['Products', Package], ['Wholesale products', Store], ['Categories', Shapes], ['Orders', ShoppingBag], ['Customers', User], ['Reviews', Star], ['Vendors', Users], ['To pack', ClipboardList], ['Shipments', Truck], ['Banners', Image], ['Coupons', Tag], ['Reports', BarChart3], ['Sellers', BadgeCheck], ['Seller insights', TrendingUp], ['Product label', Stamp], ['Support', LifeBuoy], ['Pages', FileText], ['Refunds', RotateCcw], ['Delivery areas', MapPin], ['Staff', UserCog], ['Invoice', FileText], ['Settings', SettingsIcon]]
    : [['Overview', LayoutDashboard], ['Wholesale catalog', Store], ['Orders', ShoppingBag], ['Messages', Paperclip]];
  // If staff land on a page the admin has since hidden, fall back to the first.
  useEffect(() => { if (staffNav && !nav.some(([name]) => name === page) && nav[0]) setPage(nav[0][0]); }, [hiddenPages]);
  const pendingApplications = applications.filter(a => a.status === 'PENDING').length;
  const shown = products.filter(p => `${p.name} ${p.category?.name} ${p.seller?.shopName || ''}`.toLowerCase().includes(query.toLowerCase()));
  // On the admin Products page, the same All / NTSA's own / Seller split the
  // Orders page uses -- NTSA's own stock has no seller, seller stock does.
  const productShown = isAdmin ? shown.filter(p => productView === 'all' || (productView === 'ntsa' ? !p.seller?.shopName : !!p.seller?.shopName)) : shown;
  const cartItems = products.filter(p => cart[p.id] > 0).map(p => ({ ...p, quantity: cart[p.id] }));
  const cartTotal = cartItems.reduce((sum, p) => sum + p.wholesalePaise * p.quantity, 0);
  const next = { PLACED: 'PACKED', PACKED: 'SHIPPED', SHIPPED: 'OUT_FOR_DELIVERY' };
  function go(name) { setPage(name); try { sessionStorage.setItem('ntsa-page', name); } catch {} setQuery(''); setMobileNav(false); }
  return <div className="app-shell">
    <aside className={mobileNav ? 'sidebar open' : 'sidebar'}><div className="brand"><img className="brand-logo" src="/ntsa_logo.png" alt="NTSA"/></div><div className="workspace-label">{isPacking ? 'PACKING WORKSPACE' : isSales ? 'SALES WORKSPACE' : isSupport ? 'SUPPORT WORKSPACE' : isAdmin ? 'COMMERCE WORKSPACE' : 'WHOLESALE WORKSPACE'}</div>
      <nav>{nav.map(([name, Icon]) => <button key={name} className={page === name ? 'nav-item active' : 'nav-item'} onClick={() => go(name)}><Icon size={19}/><span>{name}</span>{name === 'Orders' && <small>{reports?.summary?.orders ?? orders.length}</small>}{name === 'To pack' && toPack.length > 0 && <small>{toPack.length}</small>}{name === 'Sellers' && pendingApplications > 0 && <small>{pendingApplications}</small>}</button>)}</nav>
      <div className="sidebar-note"><ShieldCheck size={24}/><strong>Everything in one place.</strong><p>{isPacking ? 'Pack what came in, mark it done.' : isSales ? 'Bring new shops onto NTSA.' : isAdmin ? 'Your products, partners and everyday operations.' : 'Better prices. Bigger possibilities.'}</p></div>
      <button className="nav-item signout" onClick={logout}><LogOut size={18}/>Sign out</button>
    </aside>
    <div className="main"><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(!mobileNav)}><Menu/></button><span>Workspace</span><ChevronRight size={14}/><strong>{page}</strong></div><div className="account">
      {role !== 'VENDOR' && <div className="bell-wrap">
        <button className="icon-button" aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`} onClick={() => { setBellOpen(o => !o); if (!bellOpen) markNotificationsRead(); }}><Bell size={19}/>{unread > 0 && <span className="bell-dot">{unread > 9 ? '9+' : unread}</span>}</button>
        {bellOpen && <div className="bell-panel"><header><strong>Notifications</strong><div className="row-actions">{notifications.length > 0 && <button className="text-button" onClick={clearNotifications}>Clear all</button>}<button className="icon-button" aria-label="Close notifications" onClick={() => setBellOpen(false)}><X size={15}/></button></div></header>
          {notifications.length === 0 ? <p className="muted">Nothing yet.</p> : notifications.slice(0, 20).map(n => <div key={n.id} className="bell-item"><button className="icon-button bell-item-dismiss" aria-label="Dismiss this notification" onClick={() => clearNotification(n.id)}><X size={13}/></button><strong>{n.title}</strong><p>{n.body}</p><small>{new Date(n.createdAt).toLocaleString('en-IN')}</small></div>)}
        </div>}
      </div>}
      <span className="online-dot"/><span>{isAdmin ? 'Super Admin' : me?.name || (isPacking ? 'Packing team' : isSales ? 'Sales team' : 'Vendor')}</span><div className="avatar">{isAdmin ? 'SA' : isPacking ? 'PK' : isSales ? 'SL' : (me?.name ? me.name.trim().slice(0, 2).toUpperCase() : 'WV')}</div></div></header>
      <main className="content">
        <div className="page-heading"><div><div className="eyebrow">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1>{page === 'Overview' ? 'A good day to grow.' : page}</h1><p>{({ Overview: 'Here’s what’s happening with your store today.', Products: 'A little care for every product on your shelf.', Categories: 'Make your collection easy to discover.', Banners: 'Control the Home screen banner without a code change.', Coupons: 'Create and manage discount codes.', Orders: 'From your shelf to their doorstep.', Vendors: 'Build stronger wholesale partnerships.', Customers: 'Everyone who has ever shopped with you.', Shipments: 'What has left the shelf, and where it is now.', Reports: 'Revenue, payments and what is actually selling.', Refunds: 'Thoughtful resolutions. Happier customers.', 'Wholesale catalog': 'Stock up on quality. Save on every order.', 'To pack': 'Everything waiting to be packed and sent.', Packed: 'Packed today and on its way.', 'Add seller': 'Sign up a shop that wants to sell on NTSA.', 'My sellers': 'What you sent for verification.', Sellers: 'Check the details, then hand out their login.', 'Product label': 'Decide whose product photos carry the NTSA logo.', Tickets: 'Help requests from sellers, and products the admin has flagged.', Support: 'Every support ticket, who handled it, and how sellers rated them.', 'Seller products': 'Take a seller’s product off the shop, or put it back.', Staff: 'Logins for your packing and sales teams.', 'Delivery areas': 'Delivery charges, and the areas you no longer deliver to.', Invoice: 'Your letterhead, the bill columns, and the terms every invoice is printed with.', Settings: 'Your account, password and how the panel looks.' })[page]}</p></div>
          {isAdmin && ['Products', 'Wholesale products', 'Categories', 'Vendors', 'Banners', 'Coupons'].includes(page) && <Button onClick={() => setModal({ type: page, data: null })}><Plus size={17}/>Add {{ Categories: 'category', Banners: 'banner', Coupons: 'coupon', 'Wholesale products': 'wholesale product' }[page] || page.slice(0, -1).toLowerCase()}</Button>}
          {isAdmin && page === 'Staff' && <Button onClick={() => setModal({ type: 'Staff', data: null })}><Plus size={17}/>Add staff login</Button>}
          {(isPacking || isAdmin) && page === 'To pack' && <Button secondary onClick={load}>Refresh</Button>}
          {!isAdmin && page === 'Wholesale catalog' && <Button disabled={!cartItems.length} onClick={() => setModal({ type: 'Checkout' })}><ShoppingBag size={18}/>Checkout · {money(cartTotal)}</Button>}
        </div>
        {error && <div role="alert" className="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}
        {loading && !me ? <div className="empty">Loading workspace…</div> : <>
          {page === 'Overview' && isAdmin && <OverviewPage isAdmin={isAdmin} me={me} vendors={vendors} orders={orders} products={products} toPack={toPack} applications={applications} notifications={notifications} reports={reports} reportsDays={reportsDays} setReportsDays={loadReports} loadingReports={loadingReports} go={go} openModal={setModal} clearNotifications={clearNotifications} clearNotification={clearNotification}/>}
          {page === 'Overview' && !isAdmin && <><section className="hero"><div><div className="hero-kicker"><span/> YOUR BUSINESS, AT A GLANCE</div><h2>Welcome,<br/>{me?.name || 'partner'}.</h2><p>{`Your order range: ${money(me?.limits?.minPaise)} – ${money(me?.limits?.maxPaise)}.`}</p><Button onClick={() => go('Wholesale catalog')}>Explore wholesale<ArrowUpRight size={17}/></Button></div><div className="hero-art" aria-hidden="true"><div className="orbit"/><div className="parcel parcel-back"/><div className="parcel parcel-front"><ShoppingBag size={52} strokeWidth={1.2}/></div><div className="art-tag"><Check size={15}/>Made for everyday</div><span className="sparkle">✦</span></div></section>
          <div className="stats"><Stat icon={Wallet} label="Order value" value={money(orders.filter(o => !['PENDING_PAYMENT', 'CANCELLED'].includes(o.status)).reduce((s, o) => s + o.totalPaise, 0))} note="Placed orders in recent history"/><Stat icon={ShoppingBag} label="Total orders" value={orders.length} note="Up to 200 most recent orders"/><Stat icon={Package} label="Active products" value={products.length} note={`${products.filter(p => p.stock < 10).length} running low on stock`}/><Stat icon={Truck} label="On the way" value={orders.filter(o => ['SHIPPED', 'OUT_FOR_DELIVERY'].includes(o.status)).length} note="Orders moving toward you"/></div>
          <div className="overview-grid"><section className="panel"><div className="panel-heading"><div><h2>Recent orders</h2><p>Your latest customer activity</p></div><button className="text-button" onClick={() => go('Orders')}>View all <ArrowUpRight size={15}/></button></div><OrderTable orders={orders.slice(0, 5)} onOpen={o => setModal({ type: 'Order', data: o })}/></section><section className="panel stock-panel"><div className="panel-heading"><div><h2>Stock watch</h2><p>A quick look at your inventory</p></div><Package size={20}/></div>{products.slice().sort((a, b) => a.stock - b.stock).slice(0, 4).map(p => <div className="stock-row" key={p.id}><ProductImage product={p}/><div><strong>{p.name}</strong><small>{p.category?.name}</small></div><Badge>{`${p.stock} left`}</Badge></div>)}{!products.length && <Empty/>}</section></div>
          </>}
          {page === 'Customers' && <CustomersPage customers={customers} query={query} setQuery={setQuery} busy={busy} onBlock={(c, blocked) => action(() => api(`/admin/customers/${c.id}`, { method: 'PATCH', body: { blocked } }), blocked ? `${c.name || 'Customer'} blocked` : `${c.name || 'Customer'} unblocked`)}/>}
          {page === 'Seller insights' && <SellerInsightsPage insights={insights} query={query} setQuery={setQuery} openSellerDashboard={openSellerDashboard}/>}
          {page === 'Product label' && <ProductLabelPage sellers={sellers} settings={settings} query={query} setQuery={setQuery} busy={busy} onToggleSeller={(s, watermark) => action(() => api(`/admin/sellers/${s.id}`, { method: 'PATCH', body: { watermark } }), `${s.shopName}: logo ${watermark ? 'on' : 'off'}`)} onToggleOwn={watermark => action(() => api('/admin/settings', { method: 'PUT', body: { companyName: settings.companyName, companyAddress: settings.companyAddress || '', companyGSTIN: settings.companyGSTIN || null, companyPhone: settings.companyPhone || null, companyEmail: settings.companyEmail || null, logoUrl: settings.logoUrl || null, invoiceTerms: settings.invoiceTerms || null, invoiceBankDetails: settings.invoiceBankDetails || null, invoiceColumns: settings.invoiceColumns || null, watermarkOwn: watermark } }), `NTSA own stock: logo ${watermark ? 'on' : 'off'}`)}/>}
          {(page === 'Tickets' || page === 'Support') && <SupportTicketsPage tickets={tickets} query={query} setQuery={setQuery} busy={busy} onReply={(t, body, done) => action(async () => { await api(`/support/tickets/${t.id}/message`, { method: 'POST', body: { body } }); done(); })} onResolve={t => action(() => api(`/support/tickets/${t.id}/resolve`, { method: 'POST' }), 'Ticket resolved')} onReopen={t => action(() => api(`/support/tickets/${t.id}/reopen`, { method: 'POST' }), 'Ticket reopened')}/>}
          {isSupport && page === 'Seller products' && <SupportProductsPage sellers={supportSellers} products={supportProducts} query={query} setQuery={setQuery} busy={busy}
            onHide={p => action(() => api(`/support/products/${p.id}/hide`, { method: 'POST' }), `${p.name} hidden`)}
            onRestore={p => action(() => api(`/support/products/${p.id}/restore`, { method: 'POST' }), `${p.name} back on sale`)}
            onFeature={(p, placement) => action(() => api(`/support/products/${p.id}/feature`, { method: 'POST', body: { placement } }), placement === 'top' ? `“${p.name}” moved to the top` : placement === 'bottom' ? `“${p.name}” moved to the bottom` : 'Placement cleared')}/>}
          {page === 'Reviews' && <ReviewsPage reviews={reviews} query={query} setQuery={setQuery} busy={busy} onAdd={() => setModal({ type: 'AdminReview', data: null })} onRemove={r => setModal({ type: 'Delete', data: { path: `/admin/reviews/${r.id}`, name: `${r.authorName || r.user?.name || 'Customer'}'s review of ${r.product?.name}` } })}/>}
          {page === 'Shipments' && <ShipmentsPage orders={orders}/>}
          {page === 'Pages' && <PagesPage config={pageConfig} busy={busy} onSave={(rows, done) => action(async () => { setPageConfig(await api('/admin/pages', { method: 'PUT', body: { pages: rows } })); done(); }, 'Page visibility saved')}/>}
          {page === 'Reports' && <ReportsPage reports={reports} reportsDays={reportsDays} setReportsDays={loadReports} loadingReports={loadingReports}/>}
          {['Products', 'Wholesale catalog'].includes(page) && <section className="panel"><div className="panel-heading"><h2>{isAdmin ? 'All products' : 'Available to order'} <span className="count">{isAdmin ? productShown.length : products.length}</span></h2><div className="search"><Search size={17}/><input aria-label="Search products" placeholder="Search products or categories…" value={query} onChange={e => setQuery(e.target.value)}/></div></div>
            {isAdmin && page === 'Products' && <div className="order-filters"><div className="tabs" style={{ margin: 0, width: 'auto' }}>{[['all', 'All products'], ['ntsa', "NTSA's own"], ['seller', 'Seller products']].map(([v, label]) => <button key={v} type="button" className={productView === v ? 'selected' : ''} onClick={() => setProductView(v)}>{label}</button>)}</div></div>}
          {isAdmin ? <div className="table-scroll"><table><thead><tr><th>Product</th><th>Seller</th><th>SKU</th><th>Retail / wholesale</th><th>Stock</th><th>Refund window</th><th>Actions</th></tr></thead><tbody>{productShown.map(p => <tr key={p.id}><td><div className="product-cell"><ProductImage product={p}/><div><strong>{p.name}</strong><small>{p.category?.name}{p.deal ? ' · Deal of the day' : ''}{p.condition && p.condition !== 'NEW' ? ` · ${{ REFURBISHED: 'Refurbished', OPEN_BOX: 'Open box', USED: 'Used' }[p.condition]}` : ''}</small></div></div></td><td>{p.seller?.shopName ? <button className="text-button" style={{ display: 'inline' }} onClick={() => setQuery(p.seller.shopName)}>{p.seller.shopName}</button> : <small className="muted">NTSA</small>}</td><td>{p.sku ? <small>{p.sku}</small> : <small className="muted">—</small>}</td><td><strong>{money(p.pricePaise)}</strong><small>{money(p.wholesalePaise)} wholesale</small></td><td><Badge>{`${p.stock} units`}</Badge></td><td>{p.refundWindowHours} hours<small>from {p.category?.name}</small></td><td><RowMenu items={[
                { label: 'Edit', onClick: () => setModal({ type: 'Products', data: p }) },
                { label: 'Duplicate', disabled: busy, onClick: () => action(() => api(`/admin/products/${p.id}/duplicate`, { method: 'POST' }), `Copied “${p.name}” — find it hidden, edit and restore`) },
                p.featuredRank > 0
                  ? { label: 'Unpin from top', disabled: busy, onClick: () => action(() => api(`/admin/products/${p.id}/feature`, { method: 'POST', body: { top: false } }), 'Placement reset') }
                  : { label: 'Move to top', disabled: busy, onClick: () => action(() => api(`/admin/products/${p.id}/feature`, { method: 'POST', body: { top: true } }), `“${p.name}” moved to the top`) },
                p.seller?.shopName && { label: 'Report to support', onClick: () => setModal({ type: 'ReportProduct', data: p }) },
                { label: 'Hide from shop', danger: true, onClick: () => setModal({ type: 'Delete', data: { path: `/admin/products/${p.id}`, name: p.name } }) },
              ]}/></td></tr>)}</tbody></table></div> : isStaff ? <div className="table-scroll"><table><thead><tr><th>Product</th><th>Seller</th><th>Price</th><th>Stock</th><th>Category</th></tr></thead><tbody>{shown.map(p => <tr key={p.id}><td><div className="product-cell"><ProductImage product={p}/><div><strong>{p.name}</strong><small>{p.category?.name}{p.condition && p.condition !== 'NEW' ? ` · ${{ REFURBISHED: 'Refurbished', OPEN_BOX: 'Open box', USED: 'Used' }[p.condition]}` : ''}</small></div></div></td><td>{p.seller?.shopName || <small className="muted">NTSA</small>}</td><td>{money(p.pricePaise)}</td><td><Badge>{`${p.stock} units`}</Badge></td><td>{p.category?.name}</td></tr>)}</tbody></table></div> : <div className="catalog">{shown.map(p => <article className="product-card" key={p.id}><ProductImage product={p}/><small>{p.category?.name}</small><h3>{p.name}</h3><div><strong>{money(p.wholesalePaise)}</strong><del>{money(p.pricePaise)}</del></div><p>{p.stock} available · {p.refundWindowHours}h refund window</p><Field label="Order quantity" type="number" min="0" max={p.stock} value={cart[p.id] || 0} onChange={e => setCart({ ...cart, [p.id]: Math.max(0, Math.min(p.stock, Number(e.target.value))) })}/></article>)}</div>}{!productShown.length && <Empty text="No products found"/>}</section>}
          {isAdmin && page === 'Products' && hiddenProducts.length > 0 && <section className="panel" style={{ marginTop: 22 }}><div className="panel-heading"><div><h2>Hidden from the shop <span className="count">{hiddenProducts.length}</span></h2><p>Taken off the app by the admin or the seller. Restore one to put it back on sale.</p></div></div><div className="table-scroll"><table><thead><tr><th>Product</th><th>Seller</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead><tbody>{hiddenProducts.map(p => <tr key={p.id}><td><div className="product-cell"><ProductImage product={p}/><div><strong>{p.name}</strong><small>{p.category?.name}</small></div></div></td><td>{p.seller?.shopName || <small className="muted">NTSA</small>}</td><td>{money(p.pricePaise)}</td><td>{p.stock} units</td><td><div className="row-actions"><button disabled={busy} onClick={() => action(() => api(`/admin/products/${p.id}/restore`, { method: 'POST' }), `${p.name} is back on sale`)}>Restore</button></div></td></tr>)}</tbody></table></div></section>}
          {page === 'Wholesale products' && <WholesaleProductsPage products={wholesaleProducts} query={query} setQuery={setQuery}
            onEdit={p => setModal({ type: 'Wholesale products', data: p })}
            onRemove={p => setModal({ type: 'Delete', data: { path: `/admin/products/${p.id}`, name: p.name } })}/>}
          {page === 'Categories' && <div className="category-grid">{categories.map(c => <section className="panel category-card" key={c.id}><div className="category-icon"><Shapes size={26}/></div><h2>{c.name}</h2><p>{products.filter(p => p.categoryId === c.id).length} active products · returns within {c.refundWindowHours} hours{c.allowsUsedStock ? ' · refurbished allowed' : ''}</p><div className="row-actions"><button onClick={() => setModal({ type: 'Categories', data: c })}>Edit category</button><button className="danger-text" onClick={() => setModal({ type: 'Delete', data: { path: `/admin/categories/${c.id}`, name: c.name } })}>Remove</button></div></section>)}</div>}
          {page === 'Banners' && <section className="panel"><div className="panel-heading"><h2>Home screen banner/slider <span className="count">{banners.length}</span></h2></div><div className="table-scroll"><table><thead><tr><th>Preview</th><th>Title</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead><tbody>{banners.map(b => <tr key={b.id}><td>{b.imageUrl ? <img className="product-image" src={b.imageUrl} alt={b.title}/> : <div className="product-image placeholder" style={{ background: b.backgroundColor || '#13224A' }}/>}</td><td><strong style={{ whiteSpace: 'pre-line' }}>{b.title}</strong>{b.subtitle && <small>{b.subtitle}</small>}</td><td>{b.sortOrder}</td><td><Badge>{b.active ? 'Active' : 'Disabled'}</Badge></td><td><div className="row-actions"><button onClick={() => setModal({ type: 'Banners', data: b })}>Edit</button><button className="danger-text" onClick={() => setModal({ type: 'Delete', data: { path: `/admin/banners/${b.id}`, name: b.title } })}>Remove</button></div></td></tr>)}</tbody></table></div>{!banners.length && <Empty text="Add a banner to light up the Home screen"/>}</section>}
          {page === 'Coupons' && <section className="panel"><div className="panel-heading"><h2>Discount coupons <span className="count">{coupons.length}</span></h2></div><div className="table-scroll"><table><thead><tr><th>Code</th><th>Discount</th><th>Min. order</th><th>Redeemed</th><th>Status</th><th>Actions</th></tr></thead><tbody>{coupons.map(c => <tr key={c.id}><td><strong>{c.code}</strong><small>{c.description}</small></td><td>{c.discountType === 'PERCENT' ? `${c.value}%${c.maxDiscountPaise ? ` (up to ${money(c.maxDiscountPaise)})` : ''}` : money(c.value)}</td><td>{money(c.minOrderPaise)}</td><td>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td><td><Badge>{c.active ? 'Active' : 'Disabled'}</Badge></td><td><div className="row-actions"><button onClick={() => setModal({ type: 'Coupons', data: c })}>Edit</button><button className="danger-text" onClick={() => setModal({ type: 'Delete', data: { path: `/admin/coupons/${c.id}`, name: c.code } })}>Remove</button></div></td></tr>)}</tbody></table></div>{!coupons.length && <Empty text="Create your first discount code"/>}</section>}
          {page === 'Orders' && (() => {
            const q = orderSellerQ.trim().toLowerCase();
            const shownOrders = (isAdmin ? orders.filter(o => {
              if (orderView === 'ntsa' && !isNtsaOwnOrder(o)) return false;
              if (orderView === 'seller' && isNtsaOwnOrder(o)) return false;
              if (q && !orderSellers(o.items).some(n => n.toLowerCase().includes(q))) return false;
              return true;
            }) : orders);
            return <section className="panel"><div className="panel-heading"><div><h2>Order history <span className="count">{shownOrders.length}</span></h2>{orders.length >= 200 && <p>Showing the 200 most recent. Overview and Reports count every order, not just these.</p>}</div><button className="text-button" onClick={load}>Refresh</button></div>
              {isAdmin && <div className="order-filters"><div className="tabs" style={{ margin: 0, width: 'auto' }}>{[['all', 'All orders'], ['ntsa', "NTSA's own"], ['seller', 'Seller orders']].map(([v, label]) => <button key={v} type="button" className={orderView === v ? 'selected' : ''} onClick={() => setOrderView(v)}>{label}</button>)}</div><div className="search"><Search size={16}/><input aria-label="Search by seller" placeholder="Find a seller's orders by shop name…" value={orderSellerQ} onChange={e => setOrderSellerQ(e.target.value)}/></div></div>}
              <OrderTable orders={shownOrders} onOpen={o => setModal({ type: 'Order', data: o })}/></section>;
          })()}
          {!isAdmin && page === 'Messages' && <section className="panel"><div className="panel-heading"><div><h2>Messages</h2><p>Reach the NTSA team — attach a photo or video if something arrived damaged.</p></div></div><div style={{ padding: 20 }}><VendorMessages vendor={me} self/></div></section>}
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
          {page === 'Sellers' && isAdmin && <section className="panel" style={{ marginBottom: 24 }}><div className="panel-heading"><h2>Seller accounts <span className="count">{sellers.length}</span></h2></div>
            <div className="table-scroll"><table><thead><tr><th>Shop</th><th>Contact</th><th>Products</th><th>Commission</th><th>Penalties</th><th>GST / Aadhaar</th><th>Status</th><th>Actions</th></tr></thead><tbody>
              {sellers.map(s => <tr key={s.id}>
                <td><strong>{s.shopName}</strong><small>{s.ownerName}</small></td>
                <td><small>{s.phone}</small>{s.email && <small>{s.email}</small>}</td>
                <td>{s._count?.products ?? 0}</td>
                <td>{s.commissionPercent}%</td>
                <td>{s.penaltyPaise ? <span className="danger-text">{money(s.penaltyPaise)}</span> : <small className="muted">—</small>}</td>
                <td>{s.gstVerified || s.aadharVerified ? <small style={{ color: '#418568', fontWeight: 600 }}>{[s.gstVerified && 'GST ✓', s.aadharVerified && 'Aadhaar ✓'].filter(Boolean).join(' · ')}</small> : <small className="muted">Not verified</small>}</td>
                <td><Badge>{s.enabled ? 'Active' : 'Disabled'}</Badge>{s.onHoliday && <small style={{ color: '#ad7937', fontWeight: 600 }}>On holiday</small>}</td>
                <td><div className="row-actions">
                  <button onClick={() => openSellerDashboard(s)}>View dashboard</button>
                  <button onClick={() => { go('Products'); setQuery(s.shopName); }}>View products</button>
                  <button onClick={() => setModal({ type: 'Sellers', data: s })}>Edit</button>
                  <button disabled={busy} onClick={() => action(() => api(`/admin/sellers/${s.id}`, { method: 'PATCH', body: { enabled: !s.enabled } }))}>{s.enabled ? 'Freeze' : 'Unfreeze'}</button>
                  <button onClick={() => setModal({ type: 'SellerReset', data: s })}>Reset password</button>
                  <button className="danger-text" onClick={() => setModal({ type: 'Penalty', data: s })}>Apply penalty</button>
                  <button className="danger-text" onClick={() => setModal({ type: 'Delete', data: { path: `/admin/sellers/${s.id}`, name: s.shopName } })}>Remove</button>
                </div></td>
              </tr>)}
            </tbody></table></div>
            {!sellers.length && <Empty text="Approve a seller application to see their account here"/>}
          </section>}
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
            <section className="panel" style={{ marginTop: 22 }}><div className="panel-heading"><div><h2>Blocked areas <span className="count">{blockedAreas.length}</span></h2><p>Block a whole city/area by name. Nobody there can save an address or place an order — matched on the address's city.</p></div></div>
              <div style={{ padding: '18px 22px' }}>
                <form className="editor" style={{ marginBottom: 0 }} onSubmit={e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); if (!f.name.trim()) return; e.target.reset(); action(() => api('/admin/blocked-areas', { method: 'POST', body: { name: f.name.trim(), reason: f.reason?.trim() || null } }), 'Area blocked'); }}>
                  <div className="form-grid">
                    <Field label="Area / city name" name="name" maxLength={80} placeholder="e.g. Sanjay Nagar" required/>
                    <Field label="Reason (optional)" name="reason" maxLength={200} placeholder="Repeated fake returns"/>
                  </div>
                  <Button disabled={busy}>Block this area</Button>
                </form>
              </div>
              <div className="table-scroll"><table><thead><tr><th>Area</th><th>Reason</th><th>Blocked on</th><th>Actions</th></tr></thead><tbody>
                {blockedAreas.map(a => <tr key={a.id}>
                  <td><strong style={{ textTransform: 'capitalize' }}>{a.name}</strong></td>
                  <td>{a.reason || <span className="muted">—</span>}</td>
                  <td><small>{new Date(a.createdAt).toLocaleDateString('en-IN')}</small></td>
                  <td><div className="row-actions"><button className="danger-text" disabled={busy} onClick={() => action(() => api(`/admin/blocked-areas/${a.id}`, { method: 'DELETE' }), 'Area unblocked')}>Unblock</button></div></td>
                </tr>)}
              </tbody></table></div>
              {!blockedAreas.length && <Empty text="No area is blocked"/>}</section>
            <section className="panel" style={{ marginTop: 22 }}><div className="panel-heading"><div><h2>Where returns come from</h2><p>Orders and refunds by PIN code — the most refunds first.</p></div></div>
              <div className="table-scroll"><table><thead><tr><th>PIN code</th><th>Orders</th><th>Refunds</th><th>Cancelled</th><th>Refund rate</th><th>Actions</th></tr></thead><tbody>
                {pinStats.map(s => { const rate = s.orders ? Math.round((s.refunds / s.orders) * 100) : 0; const blocked = blockedPins.some(b => b.pincode === s.pincode); return <tr key={s.pincode}>
                  <td><strong>{s.pincode}</strong></td><td>{s.orders}</td><td>{s.refunds}</td><td>{s.cancelled}</td>
                  <td><Badge>{`${rate}%`}</Badge></td>
                  <td><div className="row-actions">{blocked ? <button className="danger-text" disabled={busy} onClick={() => action(() => api(`/admin/blocked-pincodes/${s.pincode}`, { method: 'DELETE' }), 'PIN code unblocked')}>Unblock</button> : <button disabled={busy} onClick={() => action(() => api('/admin/blocked-pincodes', { method: 'POST', body: { pincode: s.pincode, reason: `${rate}% of orders refunded` } }), 'PIN code blocked')}>Block</button>}</div></td>
                </tr>; })}
              </tbody></table></div>
              {!pinStats.length && <Empty text="No orders yet"/>}</section>
          </>}
          {page === 'Staff' && <section className="panel"><div className="panel-heading"><div><h2>Panel logins <span className="count">{staff.length}</span></h2><p>Packing and sales teams sign in on this same page and see only their own screens.</p></div></div>
            <div className="table-scroll"><table><thead><tr><th>Person</th><th>Team</th><th>Status</th><th>Added</th><th>Actions</th></tr></thead><tbody>
              {staff.map(s => <tr key={s.id}>
                <td><strong>{s.name || '—'}</strong><small>{s.email}</small></td>
                <td><Badge>{{ ADMIN: 'Admin', PACKING: 'Packing team', SALES: 'Sales team' }[s.role]}</Badge></td>
                <td><Badge>{s.enabled ? 'Active' : 'Disabled'}</Badge>{s.onHoliday && <small style={{ color: '#ad7937', fontWeight: 600 }}>On holiday</small>}</td>
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
          {page === 'Invoice' && <SettingsPage settings={settings} busy={busy} action={action}/>}
          {page === 'Settings' && <AccountSettingsPage me={me} role={role} theme={theme} setTheme={changeTheme} busy={busy} action={action} onPasswordChanged={token => { sessionStorage.setItem('ntsa-token', token); setSession(token); }} goStaff={() => go('Staff')}/>}
        </>}
        <footer>NTSA <span>·</span> Shop smarter. Live better.<span className="footer-right">Your everyday commerce companion</span></footer>
      </main>
    </div>
    {toast && <div role="status" className="toast"><Check size={18}/>{toast}</div>}
    {modal && <Modal title={({ Products: modal.data ? 'Edit product' : 'New product', 'Wholesale products': modal.data ? 'Edit wholesale product' : 'New wholesale product', Categories: modal.data ? 'Edit category' : 'New category', Vendors: modal.data ? 'Edit partner' : 'New wholesale partner', Sellers: `Edit ${modal.data?.shopName}`, Banners: modal.data ? 'Edit banner' : 'New banner', Coupons: modal.data ? 'Edit coupon' : 'New coupon', Order: 'Order details', Delete: 'Remove record', Reset: 'Reset vendor password', SellerReset: `Reset password · ${modal.data?.shopName}`, Messages: `Messages · ${modal.data?.name}`, Checkout: 'Place wholesale order', Pack: `Order #${modal.data?.id?.slice(0, 10).toUpperCase()}`, Staff: 'New staff login', StaffEdit: 'Edit staff login', StaffReset: 'Reset staff password', Application: modal.data?.shopName, Approve: `Approve ${modal.data?.shopName}`, Reject: `Reject ${modal.data?.shopName}`, Penalty: `Penalty · ${modal.data?.shopName}`, AdminReview: 'Add a review', ReportProduct: `Report to support · ${modal.data?.name}` })[modal.type]} close={() => !busy && setModal(null)}>
      {error && <div role="alert" className="alert">{error}</div>}
      {['Products', 'Wholesale products', 'Categories', 'Vendors', 'Sellers', 'Banners', 'Coupons'].includes(modal.type) && <Editor type={modal.type} data={modal.data} categories={categories} busy={busy} onSubmit={body => action(async () => {
        const path = { Products: 'products', 'Wholesale products': 'products', Categories: 'categories', Vendors: 'vendors', Sellers: 'sellers', Banners: 'banners', Coupons: 'coupons' }[modal.type];
        await api(`/admin/${path}${modal.data ? `/${modal.data.id}` : ''}`, { method: modal.data ? (['Vendors', 'Sellers'].includes(modal.type) ? 'PATCH' : 'PUT') : 'POST', body });
        setModal(null);
      })}/>}
      {modal.type === 'Pack' && <PackSlip order={toPack.find(o => o.id === modal.data.id) || modal.data} busy={busy} admin={isAdmin} onPackItem={item => action(() => api(`/admin/order-items/${item.id}/pack`, { method: 'POST' }), `Packed ${item.name} for ${item.seller?.shopName}`)} onPacked={() => action(async () => { await api(`/packing/orders/${modal.data.id}/packed`, { method: 'POST' }); setModal(null); }, 'Marked packed, the admin has been told')}/>}
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
      {modal.type === 'SellerReset' && <ResetPassword vendor={{ ...modal.data, name: modal.data.shopName }} busy={busy} onSubmit={password => action(async () => { await api(`/admin/sellers/${modal.data.id}/password`, { method: 'POST', body: { password } }); setModal(null); }, 'Password updated')}/>}
      {modal.type === 'Penalty' && <PenaltyManager seller={modal.data} busy={busy} onApply={(amount, reason, done) => action(async () => { await api(`/admin/sellers/${modal.data.id}/penalty`, { method: 'POST', body: { amountPaise: paise(amount), reason } }); done(); }, 'Penalty applied')} onRemove={(id, done) => action(async () => { await api(`/admin/sellers/${modal.data.id}/penalties/${id}`, { method: 'DELETE' }); done(); }, 'Penalty removed')}/>}
      {modal.type === 'AdminReview' && <AdminReviewForm products={products} busy={busy} onSubmit={({ productId, body }) => action(async () => { await api(`/admin/products/${productId}/reviews`, { method: 'POST', body }); setModal(null); }, 'Review added')}/>}
      {modal.type === 'ReportProduct' && <form className="editor" onSubmit={e => { e.preventDefault(); const note = new FormData(e.target).get('note').trim(); if (!note) return; action(async () => { await api(`/admin/products/${modal.data.id}/report`, { method: 'POST', body: { note } }); setModal(null); }, 'Sent to the support team'); }}>
        <p className="muted">Flag “{modal.data.name}”{modal.data.seller?.shopName ? ` (${modal.data.seller.shopName})` : ''} for the support team to review. They can message the seller and hide the product if needed.</p>
        <Field label="What's the issue?"><textarea name="note" required maxLength={1000} rows={4} placeholder="e.g. Misleading title, wrong images, pricing looks off…"/></Field>
        <Button disabled={busy}>Report to support</Button>
      </form>}
      {modal.type === 'Messages' && <VendorMessages vendor={modal.data}/>}
      {modal.type === 'Order' && <OrderDetails order={orders.find(o => o.id === modal.data.id) || modal.data} admin={isAdmin} busy={busy} action={action} next={next} onCancel={reason => action(async () => { await api(`${isAdmin ? '/admin' : ''}/orders/${modal.data.id}/cancel`, { method: 'POST', body: { reason } }); setModal(null); }, 'Order cancelled, stock put back')} onSetDelivery={isAdmin ? ((body, done) => action(async () => { await api(`/admin/orders/${modal.data.id}/delivery`, { method: 'PATCH', body }); done(); }, 'Delivery details saved')) : null} onSetExtras={isAdmin ? ((extras, done) => action(async () => { await api(`/admin/orders/${modal.data.id}/invoice-extras`, { method: 'PATCH', body: { extras } }); done(); }, 'Bill updated')) : null}/>}
      {modal.type === 'Checkout' && <WholesaleCheckout items={cartItems} total={cartTotal} limits={me?.limits} busy={busy} onSubmit={body => action(async () => { await api('/orders', { method: 'POST', body }); setCart({}); setModal(null); go('Orders'); }, 'Wholesale order placed')}/>}
    </Modal>}
  </div>;
}
// What the packing team works from: who it goes to, and exactly what to put
// in the box. Cancelled orders say so in red so nothing gets packed by mistake.
// Applying penalties to a seller and seeing the ones already on them, so a
// mistaken fine can be taken back. The list reloads itself after each change.
function PenaltyManager({ seller, busy, onApply, onRemove }) {
  const [list, setList] = useState(null), [total, setTotal] = useState(seller.penaltyPaise || 0);
  const load = () => api(`/admin/sellers/${seller.id}/penalties`).then(setList).catch(() => setList([]));
  useEffect(() => { load(); }, []);
  return <>
    <p className="muted">A fine for a late or mishandled order. It shows on {seller.shopName}'s own earnings with the reason. Total so far: <strong>{money(total)}</strong>.</p>
    <form className="editor" onSubmit={e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); onApply(f.amount, f.reason.trim(), () => { e.target.reset(); setTotal(t => t + paise(f.amount)); load(); }); }}>
      <Field label="Amount (₹)" name="amount" type="number" min="1" step="0.01" required/>
      <Field label="Reason — shown to the seller"><textarea name="reason" required maxLength={300} rows={2} placeholder="e.g. Order #A1B2 not packed for 3 days"/></Field>
      <Button disabled={busy}>Apply penalty</Button>
    </form>
    {list === null ? <p className="muted" style={{ marginTop: 18 }}>Loading…</p> : list.length > 0 && <div style={{ marginTop: 22 }}>
      <h3 style={{ marginBottom: 10 }}>Penalties so far</h3>
      <div className="table-scroll"><table><thead><tr><th>Date</th><th>Amount</th><th>Reason</th><th></th></tr></thead>
        <tbody>{list.map(p => <tr key={p.id}>
          <td><small>{new Date(p.createdAt).toLocaleDateString('en-IN')}</small></td>
          <td><strong>{money(p.amountPaise)}</strong></td>
          <td>{p.reason}</td>
          <td><button className="danger-text" disabled={busy} onClick={() => onRemove(p.id, () => { setTotal(t => t - p.amountPaise); load(); })}>Remove</button></td>
        </tr>)}</tbody>
      </table></div>
    </div>}
  </>;
}
// The admin seeding a review on a product -- a star rating, the words, a name
// to show, and an optional photo (uploaded the same way product photos are).
// A three-dots actions menu for a table row. Keeps a row tidy when it has more
// than a couple of actions: the dots open a dropdown with every option. The
// menu is portalled to the body and fixed-positioned so the table's scroll box
// never clips it. `items` is [{ label, onClick, danger?, disabled? }], and a
// null/false entry is skipped so callers can inline conditionals.
function RowMenu({ items }) {
  const list = items.filter(Boolean);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', close); window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); window.removeEventListener('keydown', onKey); };
  }, [open]);
  const toggle = e => { e.stopPropagation(); const r = btnRef.current.getBoundingClientRect(); setPos({ top: r.bottom + 4, right: Math.max(8, window.innerWidth - r.right) }); setOpen(o => !o); };
  return <>
    <button ref={btnRef} type="button" className="icon-button kebab" aria-label="More actions" aria-haspopup="true" aria-expanded={open} onClick={toggle}><MoreVertical size={18}/></button>
    {open && pos && createPortal(<div className="kebab-menu" style={{ top: pos.top, right: pos.right }} onClick={e => e.stopPropagation()}>
      {list.map((it, i) => <button key={i} type="button" className={it.danger ? 'danger-text' : ''} disabled={it.disabled} onClick={() => { setOpen(false); it.onClick(); }}>{it.label}</button>)}
    </div>, document.body)}
  </>;
}
function AdminReviewForm({ products, busy, onSubmit }) {
  const [productId, setProductId] = useState('');
  const [rating, setRating] = useState(5);
  const [image, setImage] = useState(''), [uploading, setUploading] = useState(false), [error, setError] = useState('');
  return <form className="editor" onSubmit={e => {
    e.preventDefault(); setError('');
    const f = Object.fromEntries(new FormData(e.target));
    if (!productId) { setError('Choose a product'); return; }
    onSubmit({ productId, body: { rating: Number(rating), comment: f.comment.trim(), authorName: f.authorName.trim(), images: image ? [image] : [] } });
  }}>
    <Field label="Product"><select value={productId} onChange={e => setProductId(e.target.value)} required><option value="" disabled>Choose a product</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}{p.seller?.shopName ? ` — ${p.seller.shopName}` : ''}</option>)}</select></Field>
    <Field label="Rating"><select value={rating} onChange={e => setRating(e.target.value)}>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5 - n)} ({n})</option>)}</select></Field>
    <Field label="Reviewer name — shown on the review" name="authorName" required maxLength={60} placeholder="e.g. Ramesh K."/>
    <Field label="Review"><textarea name="comment" required maxLength={1000} rows={3} placeholder="Great product, delivered on time…"/></Field>
    {image && <img className="product-image" src={image} alt="" style={{ marginBottom: 12 }}/>}
    <Field label={uploading ? 'Uploading…' : 'Photo — optional'} type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={async e => {
      if (!e.target.files[0]) return; setUploading(true); setError('');
      try { const form = new FormData(); form.append('image', e.target.files[0]); form.append('watermark', 'false'); const r = await api('/admin/images', { method: 'POST', body: form }); setImage(r.url); }
      catch (err) { setError(err.message); } finally { setUploading(false); }
    }}/>
    {error && <div role="alert" className="alert">{error}</div>}
    <Button disabled={busy || uploading}>Add review</Button>
  </form>;
}
function PackSlip({ order, busy, admin, onPackItem, onPacked }) {
  const a = order.address || {};
  const [invoiceBusy, setInvoiceBusy] = useState(false), [invoiceError, setInvoiceError] = useState('');
  async function viewBill() {
    setInvoiceBusy(true); setInvoiceError('');
    try { await openInvoice(order.id, '/packing/orders'); } catch (e) { setInvoiceError(e.message); } finally { setInvoiceBusy(false); }
  }
  // A seller packs their own lines from their own panel -- NTSA's lines
  // (no seller) are implicitly ready, since packing them is this screen's
  // whole job. The button is blocked until every seller's line is too.
  const pendingSellers = [...new Set(order.items.filter(i => i.sellerId && !i.packedAt).map(i => i.seller?.shopName))];
  return <div className="order-detail">
    {order.status === 'CANCELLED' && <div className="alert" role="alert"><strong>CANCELLED — do not pack this order.</strong></div>}
    <div className="detail-summary"><strong>{order.vendorId ? 'Wholesale order' : 'Customer order'}</strong><Badge>{order.status}</Badge></div>
    <h3>Pack this</h3>
    {order.items.map(i => <div key={i.id} className="line-item"><div><strong>{i.name}</strong>{(i.size || i.color) && <small className="variant">{[i.size && `Size / option: ${i.size}`, i.color && `Color: ${i.color}`].filter(Boolean).join(' · ')}</small>}<small>{i.sellerId ? (i.packedAt ? `✓ Packed by ${i.seller?.shopName}` : `Waiting on ${i.seller?.shopName} to pack this`) : 'NTSA’s own stock'}</small>{admin && i.sellerId && !i.packedAt && order.status === 'PLACED' && <button className="text-button" style={{ display: 'inline', padding: 0 }} disabled={busy} onClick={() => onPackItem(i)}>Pack it for them</button>}</div><strong>× {i.quantity}</strong></div>)}
    <div className="line-item"><strong>Total pieces</strong><strong>{order.items.reduce((s, i) => s + i.quantity, 0)}</strong></div>
    <h3>Deliver to</h3>
    <p><strong>{a.name}</strong> · {a.phone}<br/>{a.line1}, {a.city}, {a.state} {a.postalCode}</p>
    <p className="muted">Payment: {order.paymentMethod} · Order value {money(order.totalPaise)} · Placed {new Date(order.createdAt).toLocaleString('en-IN')}</p>
    {invoiceError && <div className="alert" role="alert">{invoiceError}</div>}
    {pendingSellers.length > 0 && <p className="danger-text">Waiting on {pendingSellers.join(', ')} to pack their item{pendingSellers.length > 1 ? 's' : ''} first.</p>}
    <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
      <Button secondary onClick={() => window.print()}>Print slip</Button>
      <Button secondary disabled={invoiceBusy} onClick={viewBill}><FileText size={16}/>{invoiceBusy ? 'Opening…' : 'View bill'}</Button>
      {order.status === 'PLACED' && <Button disabled={busy || pendingSellers.length > 0} onClick={onPacked}><Check size={16}/>Mark packed</Button>}
    </div>
  </div>;
}
// The company letterhead every invoice is printed with -- one row, filled
// in once. Blank fields still produce a working invoice, just a plainer one.
// Who gets the NTSA logo stamped on their product photos. The switch decides
// it for future uploads; photos already saved keep whatever they were made
// with. One row per shop, plus NTSA's own stock.
function ProductLabelPage({ sellers, settings, query, setQuery, busy, onToggleSeller, onToggleOwn }) {
  const q = query.toLowerCase();
  const shown = sellers.filter(s => s.shopName.toLowerCase().includes(q));
  const Toggle = ({ on, onChange }) => <button type="button" role="switch" aria-checked={on} className={`wm-toggle ${on ? 'on' : ''}`} disabled={busy} onClick={() => onChange(!on)}><span/></button>;
  return <section className="panel">
    <div className="panel-heading">
      <div><h2>Product label <span className="count">{sellers.length}</span></h2><p>Turn the small corner NTSA logo on or off per shop. It applies to photos uploaded from now on.</p></div>
      <div className="search"><Search size={17}/><input aria-label="Search shops" placeholder="Search shops…" value={query} onChange={e => setQuery(e.target.value)}/></div>
    </div>
    <div className="table-scroll"><table>
      <thead><tr><th>Shop</th><th>Products</th><th>NTSA logo on photos</th></tr></thead>
      <tbody>
        {(!q || 'ntsa own stock'.includes(q)) && <tr><td><strong>NTSA (own stock)</strong><small>Products with no seller</small></td><td>—</td><td><Toggle on={settings?.watermarkOwn !== false} onChange={onToggleOwn}/></td></tr>}
        {shown.map(s => <tr key={s.id}>
          <td><strong>{s.shopName}</strong>{s.onHoliday && <span className="holiday-tag">On holiday{s.holidayDays ? ` · ${s.holidayDays}d` : ''}</span>}<small>{s.ownerName}</small></td>
          <td>{s._count?.products ?? 0}</td>
          <td><Toggle on={s.watermark !== false} onChange={v => onToggleSeller(s, v)}/></td>
        </tr>)}
      </tbody>
    </table></div>
    {!shown.length && !q && <Empty text="No sellers yet"/>}
  </section>;
}
// Support workspace: the ticket inbox. Sellers raise tickets, admins flag
// products -- support replies, resolves, and reopens them here.
function SupportTicketsPage({ tickets, query, setQuery, busy, onReply, onResolve, onReopen }) {
  const [openId, setOpenId] = useState(null);
  const [filter, setFilter] = useState('OPEN');
  const q = query.toLowerCase();
  const shown = tickets.filter(t => (filter === 'ALL' || t.status === filter)
    && (t.subject.toLowerCase().includes(q) || (t.seller?.shopName || '').toLowerCase().includes(q)));
  const openCount = tickets.filter(t => t.status === 'OPEN').length;
  return <section className="panel">
    <div className="panel-heading">
      <div><h2>Support tickets <span className="count">{openCount} open</span></h2><p>Seller requests and products flagged for review. Reply to the raiser, then resolve.</p></div>
      <div className="search"><Search size={17}/><input aria-label="Search tickets" placeholder="Search subject or shop…" value={query} onChange={e => setQuery(e.target.value)}/></div>
    </div>
    <div className="order-filters"><div className="tabs" style={{ margin: 0, width: 'auto' }}>{[['OPEN', 'Open'], ['RESOLVED', 'Resolved'], ['ALL', 'All']].map(([v, label]) => <button key={v} type="button" className={filter === v ? 'selected' : ''} onClick={() => setFilter(v)}>{label}</button>)}</div></div>
    <div className="table-scroll"><table>
      <thead><tr><th>Subject</th><th>From</th><th>Status</th><th>Updated</th><th></th></tr></thead>
      <tbody>
        {shown.map(t => <React.Fragment key={t.id}>
          <tr>
            <td><strong>{t.subject}</strong>{t.productId && <small>Flagged product</small>}</td>
            <td>{t.raisedByRole === 'SELLER' ? (t.seller?.shopName || 'Seller') : 'Admin'}{t.rating ? <small>Rated {'★'.repeat(t.rating)}</small> : null}</td>
            <td><Badge>{t.status === 'OPEN' ? 'Open' : 'Resolved'}</Badge></td>
            <td><small>{new Date(t.updatedAt).toLocaleString('en-IN')}</small></td>
            <td><button className="text-button" onClick={() => setOpenId(openId === t.id ? null : t.id)}>{openId === t.id ? 'Hide' : 'Open'} <ChevronRight size={14}/></button></td>
          </tr>
          {openId === t.id && <tr className="ticket-thread-row"><td colSpan={5}><SupportThread ticket={t} busy={busy} onReply={onReply} onResolve={onResolve} onReopen={onReopen}/></td></tr>}
        </React.Fragment>)}
      </tbody>
    </table></div>
    {!shown.length && <Empty text="No tickets here"/>}
  </section>;
}
function SupportThread({ ticket, busy, onReply, onResolve, onReopen }) {
  const [text, setText] = useState('');
  const msgs = ticket.messages || [];
  return <div className="support-thread">
    <div className="support-messages">
      {msgs.map((m, i) => <div key={i} className={`support-msg ${m.sender === 'SELLER' ? 'from-seller' : 'from-support'}`}>
        <div className="support-msg-head"><strong>{m.name || m.sender}</strong><small>{new Date(m.at).toLocaleString('en-IN')}</small></div>
        <p>{m.body}</p>
      </div>)}
    </div>
    {ticket.status === 'RESOLVED' && ticket.rating ? <p className="muted">Seller rated this {'★'.repeat(ticket.rating)}{ticket.feedback ? ` — “${ticket.feedback}”` : ''}</p> : null}
    {ticket.status === 'OPEN' ? <form className="support-reply" onSubmit={e => { e.preventDefault(); const body = text.trim(); if (!body) return; onReply(ticket, body, () => setText('')); }}>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={2} maxLength={1000} placeholder="Reply to the raiser…"/>
      <div className="support-reply-actions"><Button disabled={busy || !text.trim()}>Send reply</Button><button type="button" className="text-button" disabled={busy} onClick={() => onResolve(ticket)}>Mark resolved</button></div>
    </form> : <button type="button" className="text-button" disabled={busy} onClick={() => onReopen(ticket)}>Reopen ticket</button>}
  </div>;
}
// Support's view of seller products -- they can hide a reported product from
// sale and restore it once the seller fixes it.
// The support team's shop view: a directory of sellers with how to reach them,
// then "See products" opens one seller's shelf where support can hide/restore
// a product or place it (top, bottom, or normal).
function SupportProductsPage({ sellers, products, query, setQuery, busy, onHide, onRestore, onFeature }) {
  const [openId, setOpenId] = useState(null);
  const q = query.toLowerCase();
  const open = sellers.find(s => s.id === openId);
  if (open) {
    const theirs = products.filter(p => p.seller && p.sellerId === open.id);
    return <section className="panel">
      <div className="panel-heading">
        <div><button className="text-button" onClick={() => setOpenId(null)}>← All sellers</button><h2 style={{ marginTop: 6 }}>{open.shopName} <span className="count">{theirs.length}</span></h2><p>{open.ownerName} · {open.phone}{open.email ? ` · ${open.email}` : ''}</p></div>
      </div>
      <div className="table-scroll"><table>
        <thead><tr><th>Product</th><th>Price</th><th>Placement</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {theirs.map(p => <tr key={p.id}>
            <td><div className="product-cell"><ProductImage product={p}/><div><strong>{p.name}</strong><small>{p.category?.name}</small></div></div></td>
            <td>{money(p.pricePaise)}</td>
            <td>{p.featuredRank > 0 ? <Badge>Top</Badge> : p.featuredRank < 0 ? <Badge>Bottom</Badge> : <small className="muted">Normal</small>}</td>
            <td><Badge>{p.active === false ? 'Disabled' : 'Active'}</Badge></td>
            <td><div className="row-actions">
              {p.featuredRank > 0
                ? <button disabled={busy} onClick={() => onFeature(p, 'none')}>Unpin</button>
                : <button disabled={busy} onClick={() => onFeature(p, 'top')}>Move to top</button>}
              {p.featuredRank < 0
                ? <button disabled={busy} onClick={() => onFeature(p, 'none')}>Unbury</button>
                : <button disabled={busy} onClick={() => onFeature(p, 'bottom')}>Move to bottom</button>}
              {p.active === false
                ? <button disabled={busy} onClick={() => onRestore(p)}>Show</button>
                : <button className="danger-text" disabled={busy} onClick={() => onHide(p)}>Hide</button>}
            </div></td>
          </tr>)}
        </tbody>
      </table></div>
      {!theirs.length && <Empty text="This seller has no products yet"/>}
    </section>;
  }
  const shown = sellers.filter(s => s.shopName.toLowerCase().includes(q) || s.ownerName.toLowerCase().includes(q) || (s.phone || '').includes(q));
  return <section className="panel">
    <div className="panel-heading">
      <div><h2>Sellers <span className="count">{sellers.length}</span></h2><p>Open a seller to manage their products — hide, restore, or change where they show.</p></div>
      <div className="search"><Search size={17}/><input aria-label="Search sellers" placeholder="Search shop, owner or phone…" value={query} onChange={e => setQuery(e.target.value)}/></div>
    </div>
    <div className="table-scroll"><table>
      <thead><tr><th>Shop</th><th>Contact</th><th>Verification</th><th>Products</th><th></th></tr></thead>
      <tbody>
        {shown.map(s => <tr key={s.id}>
          <td><strong>{s.shopName}</strong>{s.onHoliday && <span className="holiday-tag">On holiday</span>}<small>{s.ownerName}</small></td>
          <td>{s.phone}{s.email && <small>{s.email}</small>}</td>
          <td><span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><span className={`verify-chip ${s.gstVerified ? 'ok' : ''}`}>GST {s.gstVerified ? '✓' : '—'}</span><span className={`verify-chip ${s.aadharVerified ? 'ok' : ''}`}>Aadhaar {s.aadharVerified ? '✓' : '—'}</span></span></td>
          <td>{s._count?.products ?? 0}</td>
          <td><button disabled={busy} onClick={() => { setOpenId(s.id); setQuery(''); }}>See products</button></td>
        </tr>)}
      </tbody>
    </table></div>
    {!shown.length && <Empty text="No sellers"/>}
  </section>;
}
// The Pages screen: each panel lists the pages it's showing, with a toggle to
// take one off. "Add page" puts a previously removed page back onto a panel.
// A panel's home page isn't listed, so a panel is never left with nothing.
const PANEL_LABEL = { SELLER: 'Seller panel', PACKING: 'Packing panel', SALES: 'Sales panel', SUPPORT: 'Support panel' };
function PagesPage({ config, busy, onSave }) {
  const [adding, setAdding] = useState(false);
  const [addPanel, setAddPanel] = useState('SUPPORT');
  const isHidden = (panel, key) => config.some(r => r.panel === panel && r.key === key && r.enabled === false);
  const adminGranted = (panel, key) => config.some(r => r.panel === panel && r.key === `admin:${key}` && r.enabled === true);
  const Toggle = ({ onChange }) => <button type="button" role="switch" aria-checked="true" className="wm-toggle on" disabled={busy} onClick={onChange}><span/></button>;
  // The pages a given panel can still be given: its own removed pages, plus any
  // admin pages not yet shared into it (staff panels only).
  const addableFor = panel => [
    ...PANEL_CATALOG[panel].filter(([key]) => isHidden(panel, key)).map(([key, label]) => ({ key, label, admin: false })),
    ...(ADMIN_PAGE_PANELS.includes(panel) ? SHAREABLE_ADMIN_PAGES.filter(([k]) => !adminGranted(panel, k)).map(([k, label]) => ({ key: `admin:${k}`, label: `${label} (admin page)`, admin: true })) : []),
  ];
  return <section className="panel">
    <div className="panel-heading">
      <div><h2>Pages</h2><p>The pages each panel is showing. Switch one off to take it off that panel; use Add page to put a page back or share an admin page into a staff panel. Changes apply the next time that panel loads.</p></div>
      <Button onClick={() => setAdding(true)}><Plus size={17}/>Add page</Button>
    </div>
    <div style={{ padding: '6px 24px 20px' }}>
      {Object.entries(PANEL_CATALOG).map(([panel, pages]) => {
        const active = [
          ...pages.filter(([key]) => !isHidden(panel, key)).map(([key, label]) => ({ key, label, admin: false })),
          ...(ADMIN_PAGE_PANELS.includes(panel) ? SHAREABLE_ADMIN_PAGES.filter(([k]) => adminGranted(panel, k)).map(([k, label]) => ({ key: `admin:${k}`, label: `${label} (admin page)`, admin: true })) : []),
        ];
        return <div key={panel} className="pages-group">
          <h3>{PANEL_LABEL[panel]}</h3>
          {active.map(a => <div className="settle-row" key={a.key}><span>{a.label}</span><Toggle onChange={() => onSave([{ panel, key: a.key, enabled: false }], () => {})}/></div>)}
          {!active.length && <p className="muted" style={{ margin: '4px 0' }}>No optional pages right now — add one above.</p>}
        </div>;
      })}
    </div>
    {adding && <Modal title="Add a page to a panel" close={() => !busy && setAdding(false)}>
      <div className="editor">
        <Field label="Which panel?"><select value={addPanel} onChange={e => setAddPanel(e.target.value)}>{Object.keys(PANEL_CATALOG).map(p => <option key={p} value={p}>{PANEL_LABEL[p]}</option>)}</select></Field>
        {addableFor(addPanel).length ? <>
          <p className="muted">Pick a page to add to {PANEL_LABEL[addPanel]}.</p>
          {addableFor(addPanel).map(a => <div className="settle-row" key={a.key}><span>{a.label}</span><Button secondary disabled={busy} onClick={() => onSave([{ panel: addPanel, key: a.key, enabled: true }], () => setAdding(false))}>Add</Button></div>)}
        </> : <p className="muted">Every available page is already on this panel.</p>}
      </div>
    </Modal>}
  </section>;
}
// The real settings: who you are, your password, and how the panel looks.
function AccountSettingsPage({ me, role, theme, setTheme, busy, action, onPasswordChanged, goStaff }) {
  const [error, setError] = useState('');
  const roleLabel = { ADMIN: 'Administrator', PACKING: 'Packing team', SALES: 'Sales team' }[role] || role;
  return <>
    <section className="panel" style={{ marginBottom: 22 }}>
      <div className="panel-heading"><div><h2>Appearance</h2><p>Choose how the panel looks on this device.</p></div></div>
      <div style={{ padding: '18px 24px', display: 'flex', gap: 12 }}>
        {[['light', 'Light', Image], ['dark', 'Dark', ShieldCheck]].map(([v, label]) => <button key={v} type="button" className={`theme-choice ${theme === v ? 'selected' : ''}`} onClick={() => setTheme(v)}>
          <span className={`theme-swatch ${v}`}/>{label}{theme === v && <Check size={15}/>}
        </button>)}
      </div>
    </section>
    <section className="panel" style={{ marginBottom: 22 }}>
      <div className="panel-heading"><div><h2>My account</h2><p>You're signed in as {roleLabel}.</p></div></div>
      <div style={{ padding: '18px 24px' }}>
        <div className="settle-row"><span>Name</span><strong>{me?.name || '—'}</strong></div>
        <div className="settle-row"><span>Email</span><strong>{me?.email || '—'}</strong></div>
        <div className="settle-row"><span>Role</span><strong>{roleLabel}</strong></div>
      </div>
    </section>
    <section className="panel" style={{ marginBottom: 22 }}>
      <div className="panel-heading"><div><h2>Change password</h2><p>Changing it signs you out of every other device.</p></div></div>
      <form className="editor" style={{ padding: '18px 24px' }} onSubmit={e => {
        e.preventDefault(); setError('');
        const f = Object.fromEntries(new FormData(e.target));
        if (f.newPassword !== f.confirm) { setError('The new passwords do not match'); return; }
        action(async () => { const r = await api('/me/password', { method: 'POST', body: { currentPassword: f.current, newPassword: f.newPassword } }); e.target.reset(); onPasswordChanged(r.token); }, 'Password changed');
      }}>
        <PasswordField label="Current password" name="current" required autoComplete="current-password"/>
        <div className="form-grid">
          <PasswordField label="New password (min 8 characters)" name="newPassword" required minLength={8} autoComplete="new-password"/>
          <PasswordField label="Confirm new password" name="confirm" required minLength={8} autoComplete="new-password"/>
        </div>
        {error && <div role="alert" className="alert">{error}</div>}
        <Button disabled={busy}>Change password</Button>
      </form>
    </section>
    {role === 'ADMIN' && <section className="panel">
      <div className="panel-heading"><div><h2>Team logins</h2><p>Create and manage packing, sales and admin accounts.</p></div></div>
      <div style={{ padding: '18px 24px' }}><Button secondary onClick={goStaff}><UserCog size={16}/>Go to Staff</Button></div>
    </section>}
  </>;
}
function SettingsPage({ settings, busy, action }) {
  const [logoUrl, setLogoUrl] = useState(settings?.logoUrl || '');
  const [uploading, setUploading] = useState(false), [error, setError] = useState('');
  const [cols, setCols] = useState(() => settings?.invoiceColumns?.length ? settings.invoiceColumns : DEFAULT_INVOICE_COLUMNS);
  const setColAt = (i, patch) => setCols(cs => cs.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  const removeColAt = i => setCols(cs => cs.filter((_, idx) => idx !== i));
  const moveColAt = (i, dir) => setCols(cs => { const j = i + dir; if (j < 0 || j >= cs.length) return cs; const n = [...cs]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const addCustomCol = () => setCols(cs => [...cs, { key: `custom:${Math.random().toString(36).slice(2, 8)}`, label: 'New column', show: true, source: { type: 'attribute', attributeLabel: '' } }]);
  const isBuiltIn = key => ['item', 'variant', 'hsn', 'qty', 'rate', 'amount'].includes(key);
  useEffect(() => { setLogoUrl(settings?.logoUrl || ''); setCols(settings?.invoiceColumns?.length ? settings.invoiceColumns : DEFAULT_INVOICE_COLUMNS); }, [settings]);
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
        invoiceTerms: f.invoiceTerms?.trim() || null, invoiceBankDetails: f.invoiceBankDetails?.trim() || null,
        invoiceColumns: cols.map(c => ({ key: c.key, label: c.label.trim() || c.key, show: c.key === 'item' || c.key === 'amount' ? true : !!c.show, ...(isBuiltIn(c.key) ? {} : { source: c.source?.type === 'constant' ? { type: 'constant', value: (c.source.value || '').trim() } : { type: 'attribute', attributeLabel: (c.source?.attributeLabel || '').trim() } }) })),
      } }), 'Invoice settings saved');
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
      <h3 style={{ margin: '14px 0 6px' }}>Invoice columns</h3>
      <p className="muted" style={{ marginBottom: 10 }}>Build the bill's table however you like. Tick what shows, rename anything, drag the order with the arrows, and add your own columns — each pulling its value from a product detail or a fixed value. Item and Amount always show; Variant prints as a small line under the item.</p>
      <div style={{ marginBottom: 12 }}>
        {cols.map((c, i) => <div key={c.key} className="col-builder-row">
          <div className="col-move"><button type="button" className="icon-button" aria-label="Move up" disabled={i === 0} onClick={() => moveColAt(i, -1)}>↑</button><button type="button" className="icon-button" aria-label="Move down" disabled={i === cols.length - 1} onClick={() => moveColAt(i, 1)}>↓</button></div>
          <label className="checkbox" style={{ margin: 0 }}><input type="checkbox" checked={c.key === 'item' || c.key === 'amount' ? true : !!c.show} disabled={c.key === 'item' || c.key === 'amount'} onChange={e => setColAt(i, { show: e.target.checked })}/></label>
          <input className="col-label" value={c.label} maxLength={24} onChange={e => setColAt(i, { label: e.target.value })} aria-label="Column name"/>
          {isBuiltIn(c.key)
            ? <small className="muted col-source">{{ item: 'the product name', variant: 'size / colour / condition', hsn: 'each product’s HSN code', qty: 'quantity ordered', rate: 'unit price', amount: 'line total' }[c.key] || ''}</small>
            : <div className="col-source custom"><select value={c.source?.type || 'attribute'} onChange={e => setColAt(i, { source: e.target.value === 'constant' ? { type: 'constant', value: c.source?.value || '' } : { type: 'attribute', attributeLabel: c.source?.attributeLabel || '' } })}><option value="attribute">From product detail</option><option value="constant">Same value for all</option></select>{c.source?.type === 'constant' ? <input placeholder="e.g. Made in India" value={c.source?.value || ''} maxLength={60} onChange={e => setColAt(i, { source: { type: 'constant', value: e.target.value } })}/> : <input placeholder="Detail name, e.g. Warranty" value={c.source?.attributeLabel || ''} maxLength={50} onChange={e => setColAt(i, { source: { type: 'attribute', attributeLabel: e.target.value } })}/>}</div>}
          {!isBuiltIn(c.key) && <button type="button" className="icon-button danger-text" aria-label="Remove column" onClick={() => removeColAt(i)}><X size={15}/></button>}
        </div>)}
      </div>
      <button type="button" className="button secondary" style={{ marginBottom: 18 }} onClick={addCustomCol}><Plus size={15}/>Add a column</button>
      <h3 style={{ margin: '4px 0 6px' }}>Live preview</h3>
      <div className="bill-preview">
        <table><thead><tr>{cols.filter(c => c.key === 'item' || c.key === 'amount' ? true : (c.show && c.key !== 'variant')).map(c => <th key={c.key} style={{ textAlign: c.key === 'item' ? 'left' : 'right' }}>{c.label}</th>)}</tr></thead>
          <tbody><tr>{cols.filter(c => c.key === 'item' || c.key === 'amount' ? true : (c.show && c.key !== 'variant')).map(c => <td key={c.key} style={{ textAlign: c.key === 'item' ? 'left' : 'right' }}>{{ item: 'Sample product', hsn: '8517', qty: '1', rate: '₹999.00', amount: '₹999.00' }[c.key] ?? (c.source?.type === 'constant' ? (c.source.value || '—') : (c.source?.attributeLabel ? `«${c.source.attributeLabel}»` : '—'))}</td>)}</tr></tbody>
        </table>
        {cols.some(c => c.key === 'variant' && c.show) && <small className="muted" style={{ padding: '0 10px 8px' }}>…with a “128GB · Black” variant line under each item.</small>}
      </div>
      <Field label="Terms & conditions — printed at the bottom of every invoice"><textarea name="invoiceTerms" defaultValue={settings.invoiceTerms || ''} maxLength={1500} rows={2} placeholder="e.g. Goods once sold will only be taken back under the return policy."/></Field>
      <Field label="Bank / payment details — printed at the bottom of every invoice"><textarea name="invoiceBankDetails" defaultValue={settings.invoiceBankDetails || ''} maxLength={600} rows={2} placeholder="e.g. HDFC Bank · A/C 1234567890 · IFSC HDFC0001234"/></Field>
      {error && <div role="alert" className="alert">{error}</div>}
      <Button disabled={busy || uploading}>Save invoice settings</Button>
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
    <Field label="Team"><select name="role" defaultValue={data?.role || 'PACKING'} required><option value="PACKING">Packing team — sees only orders to pack</option><option value="SALES">Sales team — signs up new sellers</option><option value="SUPPORT">Support team — handles seller tickets</option><option value="ADMIN">Admin — full access</option></select></Field>
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
  const [role, setRole] = useState('ADMIN'), [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <div className="login"><section className="login-story"><div className="brand"><img className="brand-logo" src="/ntsa_logo.png" alt="NTSA"/></div><div><div className="eyebrow">GOOD BUSINESS STARTS HERE</div><h1>Everything you need.<br/><span>Room to grow.</span></h1><p>Your store, your partners, your next big idea.<br/>Bring it all together with NTSA.</p><div className="login-tags"><span><Check size={16}/>Simple operations</span><span><Check size={16}/>Stronger partnerships</span></div></div><small>Shop smarter. Live better.</small></section><section className="login-form"><div><div className="eyebrow">WELCOME TO YOUR WORKSPACE</div><h2>Let’s get you settled.</h2><p>Sign in to manage your everyday business.</p><div className="tabs"><button type="button" className={role === 'ADMIN' ? 'selected' : ''} onClick={() => { setRole('ADMIN'); setError(''); }}>Workspace team</button><button type="button" className={role === 'VENDOR' ? 'selected' : ''} onClick={() => { setRole('VENDOR'); setError(''); }}>Wholesale partner</button></div><form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); const data = new FormData(e.target); try { const r = await api('/auth/login', { method: 'POST', body: { role, username: data.get('username'), password: data.get('password') } }); onLogin(r.token, r.role); } catch (err) { setError(err.message); } finally { setBusy(false); } }}><Field label={role === 'ADMIN' ? 'Email address' : 'Username'} name="username" type={role === 'ADMIN' ? 'email' : 'text'} placeholder={role === 'ADMIN' ? 'you@company.com' : 'Your assigned username'} required autoComplete="username"/><PasswordField label="Password" name="password" placeholder="Enter your password" required autoComplete="current-password"/>{error && <div role="alert" className="alert">{error}</div>}<Button disabled={busy}>{busy ? 'Signing in…' : 'Sign in to workspace'}<ArrowUpRight size={18}/></Button></form><p className="login-help"><ShieldCheck size={17}/>{role === 'ADMIN' ? 'Staff and admins sign in here.' : 'Your wholesale account is created by the NTSA team.'}</p></div></section></div>;
}
function Editor({ type, data, categories, busy, onSubmit }) {
  const [images, setImages] = useState(data?.images?.join('\n') || ''), [uploading, setUploading] = useState(false), [error, setError] = useState('');
  const [videos, setVideos] = useState(data?.videos || []), [uploadingVideo, setUploadingVideo] = useState(false);
  const [colorImageMap, setColorImageMap] = useState(() => ({ ...(data?.colorImages || {}) }));
  const [uploadingColor, setUploadingColor] = useState(null);
  const uploadColorImage = async (color, file) => {
    setUploadingColor(color);
    try {
      const form = new FormData(); form.append('image', file);
      const r = await api('/admin/images', { method: 'POST', body: form });
      setColorImageMap(m => ({ ...m, [color]: r.url }));
    } catch (err) { setError(err.message); } finally { setUploadingColor(null); }
  };
  const [attributes, setAttributes] = useState(data?.attributes?.length ? data.attributes : [{ label: '', value: '' }]);
  const setAttr = (i, key, value) => setAttributes(rows => rows.map((r, idx) => idx === i ? { ...r, [key]: value } : r));
  // Options (sizes / storage / ...) and their optional per-option prices, in rupees while editing.
  const [showCondition, setShowCondition] = useState(!!data?.condition && data.condition !== 'NEW');
  const [condition, setCondition] = useState(data?.condition || 'NEW');
  // Refurbished/used grades are their own axis, priced like colours (an extra
  // over the base) -- so a product keeps its capacity option AND its colours
  // when it's marked refurbished, and the grade just adds its extra on top.
  const gradeMode = showCondition && condition !== 'NEW';
  const [sizes, setSizes] = useState(data?.sizes?.join(', ') || '');
  const [sizePrices, setSizePrices] = useState(() => Object.fromEntries(Object.entries(data?.sizePrices || {}).map(([k, v]) => [k, { retail: v.pricePaise / 100, wholesale: v.wholesalePaise / 100, mrp: v.mrpPaise ? v.mrpPaise / 100 : '' }])));
  const sizeList = sizes.split(',').map(x => x.trim()).filter(Boolean);
  const setSizePrice = (size, key, value) => setSizePrices(p => ({ ...p, [size]: { ...p[size], [key]: value } }));
  const [grades, setGrades] = useState(data?.conditionGrades?.join(', ') || '');
  const gradeList = grades.split(',').map(x => x.trim()).filter(Boolean);
  const [gradeExtras, setGradeExtras] = useState(() => Object.fromEntries(Object.entries(data?.conditionGradeExtraPaise || {}).map(([k, v]) => [k, v / 100])));
  const setGradeExtra = (g, value) => setGradeExtras(p => ({ ...p, [g]: value }));
  const toggleGrade = g => setGrades(prev => {
    const picked = prev.split(',').map(x => x.trim()).filter(Boolean);
    const next = picked.includes(g) ? picked.filter(x => x !== g) : [...picked, g];
    return GRADES.filter(x => next.includes(x)).join(', ');
  });
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
  // The per-option / per-grade price grid; placed in the options block for a
  // normal product, or right under the grade tick-boxes for a graded one.
  const priceTable = sizeList.length > 0 ? <Field label="Price per option — a bigger option should cost more. Type what it costs extra and the prices fill in, or write them yourself.">
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
        ? <small>Every option costs the same right now. Is the bigger one really the same price?</small>
        : null}
  </Field> : null;
  return <form className="editor" onSubmit={e => { e.preventDefault(); setError(''); const f = Object.fromEntries(new FormData(e.target)); try {
    if (type === 'Products' || type === 'Wholesale products') {
      const colorImagesOut = Object.fromEntries(colorList.filter(c => colorImageMap[c]).map(c => [c, colorImageMap[c]]));
      const cleanAttributes = attributes.map(a => ({ label: a.label.trim(), value: a.value.trim() })).filter(a => a.label && a.value);
      const colorExtraPaise = Object.fromEntries(colorList.filter(c => Number(colorExtras[c]) > 0).map(c => [c, paise(colorExtras[c])]));
      const optionPrices = Object.fromEntries(sizeList.filter(s => String(sizePrices[s]?.retail ?? '').trim()).map(s => {
        const o = sizePrices[s];
        if (!String(o.wholesale ?? '').trim()) throw new Error(`Enter a wholesale price for ${s}, or clear its retail price`);
        return [s, { pricePaise: paise(o.retail), wholesalePaise: paise(o.wholesale), mrpPaise: String(o.mrp ?? '').trim() ? paise(o.mrp) : null }];
      }));
      onSubmit({ name: f.name, description: f.description, sku: f.sku?.trim() || null, hsn: f.hsn?.trim() || null, pricePaise: paise(f.retail), wholesalePaise: paise(f.wholesale), mrpPaise: f.mrp ? paise(f.mrp) : null, marketPricePaise: f.market ? paise(f.market) : null, stock: Number(f.stock), categoryId: f.categoryId, images: images.split('\n').map(x => x.trim()).filter(Boolean), videos, colors: f.colors.split(',').map(x => x.trim()).filter(Boolean), sizes: sizeList, sizeLabel: f.sizeLabel?.trim() || 'Size', sizePrices: Object.keys(optionPrices).length ? optionPrices : null, colorImages: Object.keys(colorImagesOut).length ? colorImagesOut : null, colorExtraPaise: Object.keys(colorExtraPaise).length ? colorExtraPaise : null, conditionGrades: gradeMode ? gradeList : [], conditionGradeExtraPaise: gradeMode ? (() => { const m = Object.fromEntries(gradeList.filter(g => Number(gradeExtras[g]) > 0).map(g => [g, paise(gradeExtras[g])])); return Object.keys(m).length ? m : null; })() : null, attributes: cleanAttributes, deal: f.deal === 'on', condition, conditionNote: f.conditionNote?.trim() || null, audience: f.audience });
    }
    else if (type === 'Categories') onSubmit({ name: f.name, icon: data?.icon || 'shopping_bag', refundWindowHours: Number(f.refundWindowHours), allowsUsedStock: f.allowsUsedStock === 'on' });
    // Cleared optional fields are sent as null so an edit actually removes them.
    else if (type === 'Banners') onSubmit({ title: f.title, subtitle: f.subtitle || null, imageUrl: f.imageUrl || null, videoUrl: f.videoUrl || null, backgroundColor: f.backgroundColor || null, buttonText: f.buttonText || 'Shop Now', sortOrder: Number(f.sortOrder) || 0, active: f.active === 'on' });
    else if (type === 'Coupons') onSubmit({ code: f.code, description: f.description || '', discountType: f.discountType, value: f.discountType === 'PERCENT' ? Number(f.value) : paise(f.value), minOrderPaise: Number(f.minOrderPaise) > 0 ? paise(f.minOrderPaise) : 1, maxDiscountPaise: Number(f.maxDiscountPaise) > 0 ? paise(f.maxDiscountPaise) : null, usageLimit: f.usageLimit ? Number(f.usageLimit) : null, expiresAt: f.expiresAt ? new Date(f.expiresAt).toISOString() : undefined, active: f.active === 'on' });
    else if (type === 'Sellers') onSubmit({ shopName: f.shopName, ownerName: f.ownerName, email: f.email || null, phone: f.phone, gstNumber: f.gstNumber || null, aadharNumber: f.aadharNumber || null, gstVerified: f.gstVerified === 'on', aadharVerified: f.aadharVerified === 'on', commissionPercent: Number(f.commissionPercent) });
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
    {['Products', 'Wholesale products'].includes(type) && <><Field label="Description"><textarea name="description" defaultValue={data?.description} required maxLength={5000} onChange={e => checkSuggestion(e.target.form)}/></Field><div className="form-grid"><Field label="SKU — your own stock code, optional" name="sku" defaultValue={data?.sku || ''} maxLength={60} placeholder="e.g. NTSA-SHT-005"/><Field label="HSN / SAC code — optional, prints on the tax invoice" name="hsn" defaultValue={data?.hsn || ''} maxLength={20} placeholder="e.g. 8517"/></div><div className="form-grid"><Field label="Retail price (₹)" name="retail" type="number" min="0.01" step="0.01" defaultValue={data ? data.pricePaise / 100 : ''} required/><Field label="Wholesale price (₹)" name="wholesale" type="number" min="0.01" step="0.01" defaultValue={data ? data.wholesalePaise / 100 : ''} required/><Field label="MRP (₹) — optional, shows a strikethrough discount" name="mrp" type="number" min="0.01" step="0.01" defaultValue={data?.mrpPaise ? data.mrpPaise / 100 : ''}/><Field label="Market price (₹) — optional, what it sells for elsewhere" name="market" type="number" min="0.01" step="0.01" defaultValue={data?.marketPricePaise ? data.marketPricePaise / 100 : ''}/><Field label="Stock quantity" name="stock" type="number" min="0" step="1" defaultValue={data?.stock ?? 0} required/><p className="muted">Returns are allowed for as long as the chosen category says. Change that on the Categories page.</p></div><Field label="Category"><select name="categoryId" value={categoryId} onChange={e => setCategoryId(e.target.value)} required><option value="" disabled>Select a category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
    {suggestion && suggestion.id !== categoryId && <p className="muted" style={{ marginTop: -10 }}>This sounds like it belongs in <strong>{suggestion.name}</strong>. <button type="button" className="text-button" style={{ display: 'inline', padding: 0 }} onClick={() => { setCategoryId(suggestion.id); setSuggestion(null); }}>Use this category</button></p>}<div className="form-grid"><Field label="Colors — comma separated, optional" name="colors" value={colors} onChange={e => setColors(e.target.value)} placeholder="Black, White, Blue"/><Field label="Options (sizes, storage…) — comma separated, optional" name="sizes" value={sizes} onChange={e => setSizes(e.target.value)} placeholder="6, 7, 8  or  128GB, 256GB"/></div>
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
        <Field label="Option name shown to shoppers" name="sizeLabel" defaultValue={data?.sizeLabel || 'Size'} maxLength={30} placeholder="Size, Storage, RAM…" required/>
        {priceTable}
      </>}<Field label="Image URLs — one per line, up to 5"><textarea value={images} onChange={e => setImages(e.target.value)} placeholder="https://…"/></Field><Field label={uploading ? 'Uploading…' : 'Or upload a photo (max 5 MB) — the NTSA logo is stamped on automatically'} type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={async e => { if (!e.target.files[0]) return; setUploading(true); try { if (images.split('\n').filter(Boolean).length >= 5) throw new Error('Maximum five images'); const form = new FormData(); form.append('image', e.target.files[0]); const r = await api('/admin/images', { method: 'POST', body: form }); setImages(v => [v, r.url].filter(Boolean).join('\n')); } catch (err) { setError(err.message); } finally { setUploading(false); } }}/>
      <Field label={uploadingVideo ? 'Uploading…' : 'Product videos — up to 3 short clips (3-5s each, max 25 MB)'}>
        {videos.length > 0 && <div className="video-list">{videos.map((url, i) => <div key={i} className="video-chip"><video src={url} muted playsInline preload="metadata"/><button type="button" className="icon-button danger-text" aria-label="Remove video" onClick={() => setVideos(vs => vs.filter((_, idx) => idx !== i))}><X size={14}/></button></div>)}</div>}
        {videos.length < 3 && <input type="file" accept="video/mp4,video/webm,video/quicktime" disabled={uploadingVideo} onChange={async e => { if (!e.target.files[0]) return; setUploadingVideo(true); setError(''); try { const form = new FormData(); form.append('video', e.target.files[0]); const r = await api('/admin/videos', { method: 'POST', body: form }); setVideos(vs => [...vs, r.url]); } catch (err) { setError(err.message); } finally { setUploadingVideo(false); e.target.value = ''; } }}/>}
      </Field>
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
        <Field label="Condition"><select name="condition" value={condition} onChange={e => setCondition(e.target.value)}><option value="NEW">New</option><option value="REFURBISHED">Refurbished</option><option value="OPEN_BOX">Open box — unused, box opened</option><option value="USED">Used</option></select></Field>
        {gradeMode && <><Field label="Condition grades — tick the ones you're selling. The shopper picks one; Fair is the base price, better grades cost extra."><div className="grade-picker">{GRADES.map(g => <label key={g} className="grade-chip"><input type="checkbox" checked={gradeList.includes(g)} onChange={() => toggleGrade(g)}/>{g}</label>)}</div></Field>{gradeList.length > 0 && <Field label="Grade price difference — what each grade costs on top of the base price. Leave the cheapest (usually Fair) blank."><div className="attribute-rows">{gradeList.map(g => <div className="option-price-row" key={g}><strong>{g}</strong><input type="number" min="0" step="0.01" placeholder="+ Extra ₹" aria-label={`${g} extra over the base price`} value={gradeExtras[g] ?? ''} onChange={e => setGradeExtra(g, e.target.value)}/></div>)}</div></Field>}</>}
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
    {type === 'Sellers' && <>
      <p className="muted">Seller ID: <strong>{data.username}</strong> · use “Reset password” to change the password.</p>
      <div className="form-grid">
        <Field label="Shop name" name="shopName" defaultValue={data.shopName} required maxLength={100}/>
        <Field label="Owner name" name="ownerName" defaultValue={data.ownerName} required maxLength={100}/>
      </div>
      <div className="form-grid">
        <Field label="Email" name="email" type="email" defaultValue={data.email || ''} maxLength={200}/>
        <Field label="Phone" name="phone" type="tel" defaultValue={data.phone || ''} placeholder="+91XXXXXXXXXX" required/>
        <Field label="Aadhaar number" name="aadharNumber" defaultValue={data.aadharNumber || ''} pattern="[0-9]{12}" title="12 digits" placeholder="12-digit Aadhaar"/>
        <Field label="GST number" name="gstNumber" defaultValue={data.gstNumber || ''} pattern="[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][0-9A-Za-z][zZ][0-9A-Za-z]" title="15-character GST number, e.g. 08ABCDE1234F1Z5" placeholder="08ABCDE1234F1Z5"/>
      </div>
      <p className="muted" style={{ marginBottom: 6 }}>Tick these once you have seen the documents yourself.</p>
      <label className="checkbox"><input type="checkbox" name="gstVerified" defaultChecked={data.gstVerified}/>GST number verified</label>
      <label className="checkbox"><input type="checkbox" name="aadharVerified" defaultChecked={data.aadharVerified}/>Aadhaar verified</label>
      <Field label="Commission (%) — what NTSA keeps from each of this seller's sales" name="commissionPercent" type="number" min="0" max="100" step="1" defaultValue={data.commissionPercent ?? 10} required/>
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
// The admin-vendor chat. `self` flips it to the wholesale partner's own view:
// same thread, but reading/posting through the vendor's own routes.
function VendorMessages({ vendor, self }) {
  const [thread, setThread] = useState(null), [reply, setReply] = useState(''), [sending, setSending] = useState(false), [error, setError] = useState('');
  const [attachments, setAttachments] = useState([]), [uploading, setUploading] = useState(false);
  const listPath = self ? '/vendor/messages' : `/admin/vendors/${vendor.id}/messages`;
  const attachPath = self ? '/vendor/attachments' : '/admin/attachments';
  const mine = self ? 'VENDOR' : 'ADMIN';
  useEffect(() => { api(listPath).then(setThread).catch(err => setError(err.message)); }, [vendor?.id, self]);
  async function attach(file) {
    if (!file) return;
    if (attachments.length >= 4) { setError('Up to four attachments per message'); return; }
    setUploading(true); setError('');
    try { const form = new FormData(); form.append('file', file); const { url } = await api(attachPath, { method: 'POST', body: form }); setAttachments(a => [...a, url]); }
    catch (err) { setError(err.message); } finally { setUploading(false); }
  }
  async function send() {
    if (!reply.trim() && !attachments.length) return;
    setSending(true); setError('');
    try {
      const msg = await api(listPath, { method: 'POST', body: { body: reply.trim(), attachments } });
      setThread(t => [...(t || []), msg]); setReply(''); setAttachments([]);
    } catch (err) { setError(err.message); } finally { setSending(false); }
  }
  return <div className="messages-thread">
    <div className="messages-scroll">
      {thread === null ? <p className="muted">Loading conversation…</p> : thread.length === 0 ? <p className="muted">{self ? 'No messages yet. Send the NTSA team a note below.' : 'No messages yet from this partner.'}</p> : thread.map(m => <div key={m.id} className={`message-bubble ${m.sender === mine ? 'from-admin' : 'from-vendor'}`}>{m.body && <p>{m.body}</p>}{!!m.attachments?.length && <div className="message-media">{m.attachments.map(url => <Attachment key={url} url={url}/>)}</div>}<small>{m.sender === mine ? 'You' : (self ? 'NTSA' : vendor.name)} · {new Date(m.createdAt).toLocaleString()}</small></div>)}
    </div>
    {error && <div className="alert">{error}</div>}
    {!!attachments.length && <div className="message-media pending">{attachments.map(url => <div key={url} className="pending-attachment"><Attachment url={url}/><button type="button" aria-label="Remove attachment" onClick={() => setAttachments(a => a.filter(u => u !== url))}>×</button></div>)}</div>}
    <div className="message-compose">
      <input placeholder={self ? 'Message the NTSA team…' : 'Reply to this partner…'} value={reply} onChange={e => setReply(e.target.value)} maxLength={1000} onKeyDown={e => e.key === 'Enter' && send()}/>
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
function OrderDetails({ order, admin, busy, action, next, onCancel, onSetDelivery, onSetExtras }) {
  const [otp, setOtp] = useState(''), [code, setCode] = useState(''), [cancelling, setCancelling] = useState(false), [editingDelivery, setEditingDelivery] = useState(false);
  const [invoiceBusy, setInvoiceBusy] = useState(false), [invoiceError, setInvoiceError] = useState('');
  const [editingBill, setEditingBill] = useState(false), [extras, setExtras] = useState(() => (order.invoiceExtras || []).map(e => ({ label: e.label, amount: e.amountPaise / 100 })));
  async function viewBill() {
    setInvoiceBusy(true); setInvoiceError('');
    try { await openInvoice(order.id); } catch (e) { setInvoiceError(e.message); } finally { setInvoiceBusy(false); }
  }
  // Admin can call off any order up to delivery; a wholesale buyer only their
  // own, and only before it's packed (the backend enforces the same).
  const cancellable = onCancel && !['DELIVERED', 'CANCELLED'].includes(order.status) && (admin || ['PENDING_PAYMENT', 'PLACED'].includes(order.status));
  const localDate = v => v ? new Date(v).toISOString().slice(0, 10) : '';
  return <div className="order-detail"><div className="detail-summary"><strong>#{order.id.slice(-8).toUpperCase()}</strong><Badge>{order.status}</Badge></div>
    <div style={{ margin: '2px 0 16px', display: 'flex', gap: 10, flexWrap: 'wrap' }}><Button secondary disabled={invoiceBusy} onClick={viewBill}><FileText size={15}/>{invoiceBusy ? 'Opening…' : 'View / download bill'}</Button>{admin && onSetExtras && order.status !== 'CANCELLED' && <Button secondary onClick={() => setEditingBill(v => !v)}><Plus size={15}/>Edit the bill</Button>}</div>
    {invoiceError && <div className="alert" role="alert">{invoiceError}</div>}
    {admin && onSetExtras && editingBill && <div className="editor" style={{ marginBottom: 16, padding: 14, background: '#fafbfc', borderRadius: 10 }}>
      <p className="muted" style={{ marginBottom: 8 }}>Add charges or discounts to this bill. Use a minus for a discount (e.g. −50). The letterhead, columns and terms are set once on the Settings page.</p>
      <div className="attribute-rows">{extras.map((e, i) => <div className="attribute-row" key={i}>
        <input placeholder="Label (e.g. Handling)" value={e.label} maxLength={40} onChange={ev => setExtras(xs => xs.map((x, idx) => idx === i ? { ...x, label: ev.target.value } : x))}/>
        <input type="number" step="0.01" placeholder="Amount ₹ (− for discount)" value={e.amount} onChange={ev => setExtras(xs => xs.map((x, idx) => idx === i ? { ...x, amount: ev.target.value } : x))}/>
        <button type="button" className="icon-button" aria-label="Remove line" onClick={() => setExtras(xs => xs.filter((_, idx) => idx !== i))}><X size={16}/></button>
      </div>)}</div>
      <button type="button" className="button secondary" style={{ marginTop: 8 }} onClick={() => setExtras(xs => [...xs, { label: '', amount: '' }])}><Plus size={15}/>Add a line</button>
      <div style={{ marginTop: 12 }}><Button disabled={busy} onClick={() => onSetExtras(extras.filter(e => e.label.trim() && String(e.amount).trim()).map(e => ({ label: e.label.trim(), amountPaise: Math.round(Number(e.amount) * 100) })), () => setEditingBill(false))}>Save bill changes</Button></div>
    </div>}
    {order.items.map(i => <div key={i.id} className="line-item"><div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>{i.image ? <img className="product-image" src={i.image} alt={i.name}/> : <div className="product-image placeholder"><Package size={18}/></div>}<div><strong>{i.name}</strong>{(i.size || i.color) && <small className="variant">{[i.size && `Size / option: ${i.size}`, i.color && `Color: ${i.color}`].filter(Boolean).join(' · ')}</small>}<small>{i.quantity} × {money(i.unitPaise)} · {i.refundWindowHours}h refund window</small><small>{i.sellerName ? `Sold by ${i.sellerName}` : 'NTSA’s own stock'}</small></div></div><strong>{money(i.unitPaise * i.quantity)}</strong></div>)}<div className="line-item"><strong>Total · {order.paymentMethod}</strong><strong>{money(order.totalPaise)}</strong></div><h3>Delivery address</h3><p>{order.address.name} · {order.address.phone}<br/>{order.address.line1}, {order.address.city}, {order.address.state} {order.address.postalCode}</p>{order.deliveredAt && <p>Delivered: {new Date(order.deliveredAt).toLocaleString()}</p>}
    {(order.deliveryPartner || order.expectedDeliveryAt) && order.status !== 'CANCELLED' && <p className="muted">{order.deliveryPartner && <>Delivery partner: <strong>{order.deliveryPartner}</strong></>}{order.deliveryPartner && order.expectedDeliveryAt && <br/>}{order.expectedDeliveryAt && <>Expected by: <strong>{new Date(order.expectedDeliveryAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</strong></>}</p>}
    {admin && onSetDelivery && !['DELIVERED', 'CANCELLED'].includes(order.status) && (editingDelivery
      ? <form className="editor" style={{ marginTop: 10 }} onSubmit={e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); onSetDelivery({ deliveryPartner: f.partner.trim() || null, expectedDeliveryAt: f.eta ? new Date(f.eta + 'T18:00:00').toISOString() : null }, () => setEditingDelivery(false)); }}>
          <div className="form-grid"><Field label="Delivery partner" name="partner" defaultValue={order.deliveryPartner || ''} maxLength={120} placeholder="e.g. NTSA Express / Delhivery"/><Field label="Expected delivery date" name="eta" type="date" defaultValue={localDate(order.expectedDeliveryAt)}/></div>
          <div style={{ display: 'flex', gap: 10 }}><Button secondary type="button" onClick={() => setEditingDelivery(false)}>Cancel</Button><Button disabled={busy}>Save</Button></div>
        </form>
      : <p><button className="text-button" style={{ display: 'inline', padding: 0 }} onClick={() => setEditingDelivery(true)}>{order.deliveryPartner || order.expectedDeliveryAt ? 'Edit delivery partner / ETA' : 'Set delivery partner / ETA'}</button></p>)}
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
