// A longer look at the same numbers the Overview charts -- revenue over
// time, what's actually selling, and the payment-collected/pending split.
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { money } from '../api';
import { Empty, Stat } from '../ui';
import { Wallet, ShoppingBag, TrendingUp, Clock3 } from 'lucide-react';

const GREEN = '#499b76', ORANGE = '#ffac50';

export function ReportsPage({ reports, reportsDays, setReportsDays, loadingReports }) {
  const s = reports?.summary;
  // revenuePaise is paise -- convert to plain rupees before charting, or
  // the axis and tooltip read 100x too high.
  const revenueByDay = (reports?.revenueByDay || []).map(d => ({ ...d, date: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), revenue: Math.round(d.revenuePaise / 100) }));
  const topProducts = reports?.topProducts || [];
  return <>
    <div className="panel-heading">
      <div><h2>Reports</h2><p>Revenue, payments and your best sellers</p></div>
      <div className="range-tabs">{[7, 30, 90, 365].map(d => <button key={d} className={reportsDays === d ? 'selected' : ''} onClick={() => setReportsDays(d)}>{d === 365 ? '1 Year' : d === 90 ? '3 Months' : `${d} Days`}</button>)}</div>
    </div>
    <div className="stats" style={{ marginTop: 18 }}>
      <Stat icon={Wallet} label="Revenue" value={money(s?.revenuePaise)} note={`${s?.revenueChangePct >= 0 ? '+' : ''}${s?.revenueChangePct ?? 0}% vs last period`}/>
      <Stat icon={ShoppingBag} label="Orders" value={s?.orders ?? 0} note={`${s?.ordersChangePct >= 0 ? '+' : ''}${s?.ordersChangePct ?? 0}% vs last period`}/>
      <Stat icon={TrendingUp} label="Average order value" value={money(s?.avgOrderValuePaise)} note="Per order, this period"/>
      <Stat icon={Clock3} label="Payments pending" value={money(s?.pendingPaise)} note="Cash on Delivery, not yet collected"/>
    </div>
    <div className="overview-grid">
      <section className="panel">
        <div className="panel-heading"><h2>Revenue trend</h2></div>
        <div style={{ padding: '0 10px 10px' }}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueByDay} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs><linearGradient id="report-revenue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GREEN} stopOpacity={0.3}/><stop offset="100%" stopColor={GREEN} stopOpacity={0}/></linearGradient></defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8b9aa3' }} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
              <YAxis tick={{ fontSize: 10, fill: '#8b9aa3' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`}/>
              <Tooltip formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e1e8ed' }}/>
              <Area type="monotone" dataKey="revenue" stroke={GREEN} strokeWidth={2} fill="url(#report-revenue)" isAnimationActive={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {!revenueByDay.length && !loadingReports && <Empty text="No orders in this period yet"/>}
      </section>
      <section className="panel">
        <div className="panel-heading"><h2>Top products</h2><p>By units sold</p></div>
        <div style={{ padding: '0 10px 10px' }}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topProducts} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: '#8b9aa3' }} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: '#44586a' }} axisLine={false} tickLine={false} tickFormatter={v => v.length > 16 ? v.slice(0, 16) + '…' : v}/>
              <Tooltip formatter={(v, n) => [n === 'quantity' ? `${v} sold` : money(v), '']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e1e8ed' }}/>
              <Bar dataKey="quantity" fill={ORANGE} radius={[0, 6, 6, 0]} isAnimationActive={false}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {!topProducts.length && !loadingReports && <Empty text="No sales in this period yet"/>}
      </section>
    </div>
  </>;
}
