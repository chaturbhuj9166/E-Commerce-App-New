import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LayoutDashboard, Package, ShoppingBag, LogOut, Plus, ArrowUpRight, ChevronRight, Check, Menu, ShieldCheck, Wallet, Store, Search, BadgeCheck, Truck } from 'lucide-react';
import { api, money, paise } from './api';
import { Button, Field, PasswordField, Badge, Empty, Modal, Stat, ProductImage, CONDITION_LABEL } from './ui';
import './style.css';

/// The seller panel: its own site, signed into with the username and
/// password the NTSA admin hands out. A shop only ever sees its own stock
/// and its own sales here.
function App() {
  const [session, setSession] = useState(() => sessionStorage.getItem('ntsa-token'));
  const [me, setMe] = useState(null), [page, setPage] = useState('Overview');
  const [products, setProducts] = useState([]), [orders, setOrders] = useState([]), [summary, setSummary] = useState(null), [categories, setCategories] = useState([]);
  const [error, setError] = useState(''), [toast, setToast] = useState(''), [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false), [modal, setModal] = useState(null), [query, setQuery] = useState(''), [mobileNav, setMobileNav] = useState(false);

  function logout() { sessionStorage.removeItem('ntsa-token'); setSession(null); setMe(null); setModal(null); setError(''); }
  async function load() {
    setLoading(true);
    try {
      const [account, p, o, s, c] = await Promise.all([api('/me'), api('/seller/products'), api('/seller/orders'), api('/seller/summary'), api('/categories')]);
      setMe(account); setProducts(p); setOrders(o); setSummary(s); setCategories(c);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { if (session) load(); }, [session]);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timer); } }, [toast]);
  async function action(fn, message = 'Changes saved') {
    if (busy) return; setBusy(true); setError('');
    try { await fn(); setToast(message); await load(); setModal(null); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  if (!session) return <Login onLogin={token => { sessionStorage.setItem('ntsa-token', token); setSession(token); }}/>;
  const nav = [['Overview', LayoutDashboard], ['My products', Package], ['My orders', ShoppingBag]];
  const shown = products.filter(p => `${p.name} ${p.category?.name}`.toLowerCase().includes(query.toLowerCase()));
  function go(name) { setPage(name); setQuery(''); setMobileNav(false); }

  return <div className="app-shell">
    <aside className={mobileNav ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><Store/><span>N<span className="accent">T</span>SA<span className="brand-dot">.</span></span></div>
      <div className="workspace-label">SELLER WORKSPACE</div>
      <nav>{nav.map(([name, Icon]) => <button key={name} className={page === name ? 'nav-item active' : 'nav-item'} onClick={() => go(name)}><Icon size={19}/><span>{name}</span>{name === 'My orders' && orders.length > 0 && <small>{orders.length}</small>}</button>)}</nav>
      <div className="sidebar-note"><ShieldCheck size={24}/><strong>Your shop on NTSA.</strong><p>Add what you sell, and watch the orders come in.</p></div>
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
              <Stat icon={Wallet} label="Earned" value={money(summary?.earnedPaise)} note="From orders already delivered"/>
              <Stat icon={Truck} label="On the way" value={money(summary?.awaitingPaise)} note="Ordered, not yet delivered"/>
              <Stat icon={ShoppingBag} label="Pieces sold" value={summary?.piecesSold ?? 0} note={`Across ${summary?.orders ?? 0} order(s)`}/>
              <Stat icon={Package} label="Products listed" value={summary?.products ?? 0} note={`${summary?.outOfStock ?? 0} out of stock`}/>
            </div>
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
                  <button className="danger-text" onClick={() => action(() => api(`/seller/products/${p.id}`, { method: 'DELETE' }), 'Product removed')}>Remove</button>
                </div></td>
              </tr>)}</tbody>
            </table></div>
            {!shown.length && <Empty text={products.length ? 'No products found' : 'Add the first thing you want to sell'}/>}
          </section>}

          {page === 'My orders' && <section className="panel">
            <div className="panel-heading"><div><h2>My orders <span className="count">{orders.length}</span></h2><p>Every line a buyer has ordered from your shop. NTSA packs and delivers.</p></div><button className="text-button" onClick={load}>Refresh</button></div>
            <OrderTable orders={orders} full/>
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
  </div>;
}

function OrderTable({ orders, full }) {
  return orders.length ? <div className="table-scroll"><table>
    <thead><tr><th>Item</th><th>Order</th><th>Qty</th><th>Value</th><th>Status</th></tr></thead>
    <tbody>{orders.map(o => <tr key={o.id}>
      <td><div className="product-cell">{o.image ? <img className="product-image" src={o.image} alt=""/> : <div className="product-image placeholder"><Package/></div>}<div><strong>{o.name}</strong>{(o.size || o.color) && <small>{[o.size, o.color].filter(Boolean).join(' · ')}</small>}</div></div></td>
      <td><strong>#{o.orderId.slice(-8).toUpperCase()}</strong><small>{o.buyer} · {new Date(o.placedAt).toLocaleDateString('en-IN')}</small></td>
      <td>{o.quantity}</td>
      <td>{money(o.unitPaise * o.quantity)}{full && <small>{money(o.unitPaise)} each</small>}</td>
      <td><Badge>{o.status}</Badge></td>
    </tr>)}</tbody>
  </table></div> : <Empty text="Your first order will show up here"/>;
}

function Login({ onLogin }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <div className="login">
    <section className="login-story">
      <div className="brand"><Store/><span>NTSA.</span></div>
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
  const allowsUsedStock = !!categories.find(c => c.id === categoryId)?.allowsUsedStock;
  const category = categories.find(c => c.id === categoryId);
  const [sizes, setSizes] = useState(data?.sizes?.join(', ') || '');
  const sizeList = sizes.split(',').map(x => x.trim()).filter(Boolean);
  const [sizePrices, setSizePrices] = useState(() => Object.fromEntries(Object.entries(data?.sizePrices || {}).map(([k, v]) => [k, { retail: v.pricePaise / 100, mrp: v.mrpPaise ? v.mrpPaise / 100 : '' }])));
  const setSizePrice = (size, key, value) => setSizePrices(p => ({ ...p, [size]: { ...p[size], [key]: value } }));
  const applyExtra = (form, size, extra) => {
    const add = Number(extra);
    if (!Number.isFinite(add)) return;
    const retail = Number(form.retail?.value), mrp = Number(form.mrp?.value);
    if (!Number.isFinite(retail)) { setError('Fill in the price above first'); return; }
    setSizePrices(p => ({ ...p, [size]: { retail: (retail + add).toFixed(2), mrp: mrp > 0 ? (mrp + add).toFixed(2) : '' } }));
  };

  return <form className="editor" onSubmit={e => {
    e.preventDefault(); setError('');
    const f = Object.fromEntries(new FormData(e.target));
    try {
      const optionPrices = Object.fromEntries(sizeList.filter(s => String(sizePrices[s]?.retail ?? '').trim()).map(s => {
        const o = sizePrices[s];
        // A seller sets one price; NTSA's wholesale rate is not theirs to set.
        return [s, { pricePaise: paise(o.retail), wholesalePaise: paise(o.retail), mrpPaise: String(o.mrp ?? '').trim() ? paise(o.mrp) : null }];
      }));
      onSubmit({
        name: f.name, description: f.description,
        pricePaise: paise(f.retail), wholesalePaise: paise(f.retail),
        mrpPaise: f.mrp ? paise(f.mrp) : null,
        stock: Number(f.stock), categoryId: f.categoryId,
        images: images.split('\n').map(x => x.trim()).filter(Boolean),
        colors: f.colors.split(',').map(x => x.trim()).filter(Boolean),
        sizes: sizeList, sizeLabel: f.sizeLabel?.trim() || 'Size',
        sizePrices: Object.keys(optionPrices).length ? optionPrices : null,
        attributes: [], audience: 'RETAIL',
        condition: f.condition || 'NEW', conditionNote: f.conditionNote?.trim() || null,
      });
    } catch (err) { setError(err.message); }
  }}>
    <Field label="Product name" name="name" defaultValue={data?.name} required maxLength={100}/>
    <Field label="Description"><textarea name="description" defaultValue={data?.description} required maxLength={5000} placeholder="What it is, what it's made of, what's in the box…"/></Field>
    <div className="form-grid">
      <Field label="Selling price (₹)" name="retail" type="number" min="0.01" step="0.01" defaultValue={data ? data.pricePaise / 100 : ''} required/>
      <Field label="MRP (₹) — optional, shows a strikethrough discount" name="mrp" type="number" min="0.01" step="0.01" defaultValue={data?.mrpPaise ? data.mrpPaise / 100 : ''}/>
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
    {category && <p className="muted">Anything in {category.name} can be returned within {category.refundWindowHours} hours. NTSA sets that per category.</p>}
    <div className="form-grid">
      <Field label="Colours — comma separated, optional" name="colors" defaultValue={data?.colors?.join(', ') || ''} placeholder="Black, White, Blue"/>
      <Field label="Options (sizes, storage…) — comma separated, optional" name="sizes" value={sizes} onChange={e => setSizes(e.target.value)} placeholder="6, 7, 8  or  128GB, 256GB"/>
    </div>
    {sizeList.length > 0 && <>
      <Field label="Option name shown to shoppers" name="sizeLabel" defaultValue={data?.sizeLabel || 'Size'} maxLength={30} placeholder="Size, Storage, Weight…" required/>
      <Field label="Price per option — a bigger option should cost more. Type what it costs extra and the price fills in.">
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
      </Field>
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
        <Field label="Condition"><select name="condition" defaultValue={data?.condition || 'NEW'}><option value="NEW">New</option><option value="REFURBISHED">Refurbished</option><option value="OPEN_BOX">Open box — unused, box opened</option><option value="USED">Used</option></select></Field>
        <Field label="Condition note — shown to the shopper (optional)" name="conditionNote" defaultValue={data?.conditionNote || ''} maxLength={200} placeholder="e.g. Box opened for testing, product unused"/>
      </>}
    {error && <div role="alert" className="alert">{error}</div>}
    <Button disabled={busy || uploading}>{busy ? 'Saving…' : data ? 'Save changes' : 'Add product'}</Button>
  </form>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
