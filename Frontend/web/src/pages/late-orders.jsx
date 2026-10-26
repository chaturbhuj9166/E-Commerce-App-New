// Late orders: the red box at the top of Overview/Orders, and the list it
// opens. An order is late when it's past the delivery date the customer was
// promised and hasn't been delivered. From each row the admin can call or
// WhatsApp the delivery team or the sellers involved without leaving the page.
import React, { useState } from 'react';
import { AlertTriangle, ArrowUpRight, Phone, MessageCircle, Truck, Store, PackageX } from 'lucide-react';
import { money } from '../api';
import { Badge, Button, Empty } from '../ui';

// Numbers saved without a country code are Indian mobiles (10 digits).
const digits = s => String(s || '').replace(/\D/g, '');
const intl = s => { const d = digits(s); return d.length === 10 ? `91${d}` : d; };
const telHref = s => `tel:+${intl(s)}`;
const waHref = (s, text) => `https://wa.me/${intl(s)}?text=${encodeURIComponent(text)}`;

const shortId = id => id.slice(-8).toUpperCase();
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const lateText = o => o.daysLate >= 1 ? plural(o.daysLate, 'day') : plural(Math.max(1, o.hoursLate), 'hour');
const dueText = o => new Date(o.dueAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const statusText = s => s.replaceAll('_', ' ').toLowerCase();

// What the admin sends to the delivery team, and to a seller, about one order.
const teamMessage = o => `Order #${shortId(o.id)} for ${o.customer.name}${o.customer.city ? `, ${o.customer.city}` : ''} was due on ${dueText(o)} and is ${lateText(o)} late (status: ${statusText(o.status)}${o.deliveryPartner ? `, partner: ${o.deliveryPartner}` : ''}). Please update us on where it is and deliver it as soon as possible.`;
const sellerMessage = (o, seller) => `Hello ${seller.shopName}, order #${shortId(o.id)} that includes your product(s) was due on ${dueText(o)} and is ${lateText(o)} late. ${o.unpackedCount > 0 ? 'Your items are not marked packed yet - please pack and hand them over immediately.' : 'Please check on your side and help us get it delivered.'}`;

/** The red box. Renders nothing while no order is late. */
export function LateOrdersBanner({ late, onOpen }) {
  if (!late?.count) return null;
  return <button type="button" className="late-banner" onClick={onOpen}>
    <AlertTriangle size={24}/>
    <div>
      <strong>{late.count === 1 ? '1 order is running late' : `${late.count} orders are running late`}</strong>
      <span>The oldest is {plural(late.oldestDaysLate, 'day')} past its delivery date. See which orders and contact the delivery team or the sellers.</span>
    </div>
    <span className="late-banner-cta">View &amp; contact <ArrowUpRight size={16}/></span>
  </button>;
}

function ContactButtons({ phone, message, label }) {
  if (!phone) return <span className="late-no-phone">No number</span>;
  return <span className="late-contact">
    <a className="late-btn" href={telHref(phone)} aria-label={`Call ${label}`}><Phone size={13}/>Call</a>
    <a className="late-btn wa" href={waHref(phone, message)} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${label}`}><MessageCircle size={13}/>Message</a>
  </span>;
}

/** The list inside the modal. */
export function LateOrdersPanel({ late, busy, onSavePhone, onOpenOrder }) {
  const [phone, setPhone] = useState(late?.deliveryTeamPhone || '');
  const [error, setError] = useState('');
  const team = late?.deliveryTeamPhone;

  function save(e) {
    e.preventDefault();
    const cleaned = phone.replace(/[\s-]/g, '');
    if (cleaned && !/^\+?[0-9]{10,15}$/.test(cleaned)) { setError('Enter a valid phone number, e.g. 9876543210'); return; }
    setError(''); onSavePhone(cleaned);
  }

  return <div className="late-panel">
    <form className="late-team" onSubmit={save}>
      <label className="field" style={{ margin: 0, flex: 1 }}>
        <span><Truck size={13} style={{ verticalAlign: -2 }}/> Delivery team's number {team ? '' : '(add it to call or message them from here)'}</span>
        <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" placeholder="e.g. 9876543210" maxLength={16}/>
      </label>
      <Button disabled={busy || phone.replace(/[\s-]/g, '') === (team || '')}>Save</Button>
    </form>
    {error && <div role="alert" className="alert" style={{ margin: '0 0 14px' }}>{error}</div>}

    {!late?.orders?.length ? <Empty text="No late orders right now"/> : late.orders.map(o => <article className="late-card" key={o.id}>
      <header>
        <div className="late-card-title">
          <strong>#{shortId(o.id)}</strong>
          <Badge>{o.status}</Badge>
          <span className="late-chip">{lateText(o)} late</span>
        </div>
        <small>Due {dueText(o)} · placed {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {money(o.totalPaise)}</small>
      </header>
      <div className="late-card-body">
        <div>
          <strong>{o.customer.name}</strong>{o.customer.city ? <small>{o.customer.city}{o.customer.phone ? ` · ${o.customer.phone}` : ''}</small> : null}
          <small>{o.items.map(i => `${i.quantity} × ${i.name}`).join(', ')}</small>
          {o.deliveryPartner && <small>Delivery partner: {o.deliveryPartner}</small>}
          {o.unpackedCount > 0 && <small className="late-warn"><PackageX size={12} style={{ verticalAlign: -2 }}/> {plural(o.unpackedCount, 'item')} not packed by the seller yet</small>}
        </div>
        <div className="late-actions">
          <div className="late-row"><span><Truck size={13}/> Delivery team</span><ContactButtons phone={team} message={teamMessage(o)} label="the delivery team"/></div>
          {o.sellers.length
            ? o.sellers.map(s => <div className="late-row" key={s.id}><span><Store size={13}/> {s.shopName}</span><ContactButtons phone={s.phone} message={sellerMessage(o, s)} label={s.shopName}/></div>)
            : <div className="late-row"><span className="muted" style={{ margin: 0 }}>NTSA's own stock — no seller to contact</span></div>}
          <button type="button" className="text-button late-open" onClick={() => onOpenOrder(o.id)}>View order <ArrowUpRight size={14}/></button>
        </div>
      </div>
    </article>)}
  </div>;
}
