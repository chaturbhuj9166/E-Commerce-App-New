// The Overview page: real numbers, charted. Every figure here comes from
// already-loaded order/product data or the /admin/reports endpoint -- there
// is nothing decorative or made up (a stat with no real history, like
// "active products", gets a plain count instead of a fake trend line).
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpRight, Check, ShoppingBag, Package, Users, Wallet, Clock3, ClipboardList, AlertTriangle, UserPlus, Store, Bell } from 'lucide-react';
import { money } from '../api';
import { Badge, Empty, ProductImage } from '../ui';
import { OrderTable } from './shared';

const NAVY = '#163041', ORANGE = '#ffac50', GREEN = '#499b76', BLUE = '#5d8fc2', AMBER = '#d79a3c', RED = '#b15d5d';
const STATUS_COLOR = { DELIVERED: GREEN, PLACED: BLUE, PACKED: AMBER, SHIPPED: AMBER, OUT_FOR_DELIVERY: AMBER, CANCELLED: RED, PENDING_PAYMENT: '#9aa8b0' };

function Sparkline({ data, dataKey, color }) {
  if (!data?.length) return null;
  return <ResponsiveContainer width="100%" height={40}>
    <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
      <defs><linearGradient id={`spark-${dataKey}-${color}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.35}/><stop offset="100%" stopColor={color} stopOpacity={0}/></linearGradient></defs>
      <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#spark-${dataKey}-${color})`} isAnimationActive={false}/>
    </AreaChart>
  </ResponsiveContainer>;
}

function TrendStat({ icon: Icon, label, value, changePct, note }) {
  const up = changePct > 0, flat = changePct === 0;
  return <section className="stat">
    <div className="stat-top"><span>{label}</span><Icon size={19}/></div>
    <strong>{value}</strong>
    {changePct !== undefined
      ? <p className={flat ? 'muted' : up ? 'trend-up' : 'trend-down'}>{flat ? '' : up ? '↑ ' : '↓ '}{flat ? 'No change' : `${Math.abs(changePct)}%`} <span className="muted-inline">vs last period</span></p>
      : <p>{note}</p>}
  </section>;
}

export function OverviewPage({ isAdmin, me, vendors, orders, products, toPack, applications, notifications, reports, reportsDays, setReportsDays, loadingReports, go, openModal }) {
  const pendingApplications = applications.filter(a => a.status === 'PENDING').length;
  const lowStock = products.filter(p => p.stock < 10);
  const s = reports?.summary;
  // revenuePaise is paise, like everywhere else in the app -- the chart
  // needs plain rupees, or its axis and tooltip would read 100x too high.
  const revenueByDay = (reports?.revenueByDay || []).map(d => ({ ...d, date: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), revenue: Math.round(d.revenuePaise / 100) }));
  const statusBreakdown = reports?.statusBreakdown || [];
  const totalStatusOrders = statusBreakdown.reduce((sum, r) => sum + r.count, 0);

  const tasks = [
    { icon: ClipboardList, label: 'Pack orders', note: 'Orders ready to pack', count: toPack.length, onClick: () => go('To pack') },
    { icon: AlertTriangle, label: 'Restock low-stock products', note: `${lowStock.length} products low on stock`, count: lowStock.length, onClick: () => go('Products') },
    { icon: UserPlus, label: 'Review seller requests', note: 'Applications awaiting a decision', count: pendingApplications, onClick: () => go('Sellers') },
    { icon: Store, label: 'Wholesale partners', note: 'Active vendor accounts', count: vendors.filter(v => v.enabled).length, onClick: () => go('Vendors') },
  ];

  return <>
    <section className="hero">
      <div>
        <div className="hero-kicker"><span/> YOUR BUSINESS, AT A GLANCE</div>
        <h2>Small details.<br/>Big possibilities.</h2>
        <p>Keep your shelves ready and your customers happy.</p>
        <button className="button" onClick={() => go('Products')}>Manage your products<ArrowUpRight size={17}/></button>
      </div>
      <div className="hero-art" aria-hidden="true"><div className="orbit"/><div className="parcel parcel-back"/><div className="parcel parcel-front"><ShoppingBag size={52} strokeWidth={1.2}/></div><div className="art-tag"><Check size={15}/>Made for everyday</div><span className="sparkle">✦</span></div>
    </section>

    <div className="panel-heading" style={{ margin: '28px 0 0' }}>
      <div><h2>Sales overview</h2><p>Revenue and payments, last {reportsDays} days</p></div>
      <div className="range-tabs">{[7, 30, 90, 365].map(d => <button key={d} className={reportsDays === d ? 'selected' : ''} onClick={() => setReportsDays(d)}>{d === 365 ? '1 Year' : d === 90 ? '3 Months' : `${d} Days`}</button>)}</div>
    </div>

    <div className="stats" style={{ marginTop: 14 }}>
      <TrendStat icon={Wallet} label="Total revenue" value={money(s?.revenuePaise)} changePct={s?.revenueChangePct} />
      <TrendStat icon={ShoppingBag} label="Total orders" value={s?.orders ?? 0} changePct={s?.ordersChangePct} />
      <section className="stat payments-stat">
        <div className="stat-top"><span>Payments</span><Clock3 size={19}/></div>
        <strong>{money(s?.collectedPaise)}</strong>
        <p className="muted">collected</p>
        <p className="pending-line"><span className="dot amber"/>{money(s?.pendingPaise)} pending (COD, not yet delivered)</p>
      </section>
      <TrendStat icon={Package} label="Active products" value={products.length} note={`${lowStock.length} running low on stock`}/>
    </div>

    <div className="overview-grid">
      <section className="panel">
        <div className="panel-heading"><div><h2>Revenue</h2><p>{reportsDays === 7 ? 'Last 7 days' : reportsDays === 30 ? 'Last 30 days' : reportsDays === 90 ? 'Last 3 months' : 'Last year'}</p></div></div>
        <div style={{ padding: '0 10px 10px' }}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueByDay} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs><linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GREEN} stopOpacity={0.3}/><stop offset="100%" stopColor={GREEN} stopOpacity={0}/></linearGradient></defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8b9aa3' }} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
              <YAxis tick={{ fontSize: 10, fill: '#8b9aa3' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`}/>
              <Tooltip formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} labelFormatter={l => l} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e1e8ed' }}/>
              <Area type="monotone" dataKey="revenue" stroke={GREEN} strokeWidth={2} fill="url(#revenue-fill)" isAnimationActive={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {!revenueByDay.length && !loadingReports && <Empty text="No orders in this period yet"/>}
      </section>
      <section className="panel">
        <div className="panel-heading"><div><h2>Order status</h2><p>Last {reportsDays} days</p></div></div>
        {totalStatusOrders > 0 ? <div className="donut-wrap">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusBreakdown} dataKey="count" nameKey="status" innerRadius={58} outerRadius={82} paddingAngle={2} isAnimationActive={false}>
                {statusBreakdown.map(r => <Cell key={r.status} fill={STATUS_COLOR[r.status] || '#9aa8b0'}/>)}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e1e8ed' }}/>
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-center"><strong>{totalStatusOrders}</strong><span>Total orders</span></div>
          <ul className="donut-legend">{statusBreakdown.map(r => <li key={r.status}><span className="dot" style={{ background: STATUS_COLOR[r.status] || '#9aa8b0' }}/>{r.status.replaceAll('_', ' ')}<em>{Math.round((r.count / totalStatusOrders) * 100)}%</em></li>)}</ul>
        </div> : <Empty text="No orders in this period yet"/>}
      </section>
    </div>

    <div className="overview-grid">
      <section className="panel">
        <div className="panel-heading"><div><h2>Recent orders</h2><p>Your latest customer activity</p></div><button className="text-button" onClick={() => go('Orders')}>View all <ArrowUpRight size={15}/></button></div>
        <OrderTable orders={orders.slice(0, 5)} onOpen={o => openModal({ type: 'Order', data: o })}/>
      </section>
      <section className="panel stock-panel">
        <div className="panel-heading"><div><h2>Low stock products</h2><p>A quick look at your inventory</p></div><button className="text-button" onClick={() => go('Products')}>View all <ArrowUpRight size={15}/></button></div>
        {lowStock.slice(0, 4).map(p => <div className="stock-row" key={p.id}><ProductImage product={p}/><div><strong>{p.name}</strong><small>{p.sku || p.category?.name}</small></div><Badge>{`${p.stock} left`}</Badge></div>)}
        {!lowStock.length && <Empty text="Everything is well stocked"/>}
      </section>
    </div>

    <div className="overview-grid">
      <section className="panel">
        <div className="panel-heading"><div><h2>Today's tasks</h2></div></div>
        <div className="task-list">{tasks.map(t => <button className="task-row" key={t.label} onClick={t.onClick}><t.icon size={18}/><div><strong>{t.label}</strong><small>{t.note}</small></div><span className="count">{t.count}</span></button>)}</div>
      </section>
      <section className="panel">
        <div className="panel-heading"><div><h2>Recent notifications</h2></div><Bell size={20}/></div>
        {notifications.length ? notifications.slice(0, 5).map(n => <div className="bell-item" key={n.id}><strong>{n.title}</strong><p>{n.body}</p><small>{new Date(n.createdAt).toLocaleString('en-IN')}</small></div>) : <Empty text="Nothing yet"/>}
      </section>
    </div>
  </>;
}
