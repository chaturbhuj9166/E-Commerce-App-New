// The small pieces every page is built from. Kept apart from main.jsx so a
// new page can be written in its own file without touching the shell.
import React, { useState } from 'react';
import { Package, X, Eye, EyeOff } from 'lucide-react';

export function Button({ children, secondary, ...props }) { return <button className={secondary ? 'button secondary' : 'button'} {...props}>{children}</button>; }
export function Field({ label, children, ...props }) { return <label className="field"><span>{label}</span>{children || <input {...props}/>}</label>; }
export function PasswordField({ label, ...props }) {
  const [visible, setVisible] = useState(false);
  return <label className="field"><span>{label}</span><div className="password-input"><input {...props} type={visible ? 'text' : 'password'}/><button type="button" className="icon-button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(v => !v)}>{visible ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>;
}
export function Badge({ children }) { return <span className={`badge ${['DELIVERED', 'APPROVED', 'Active'].includes(children) ? 'green' : ['CANCELLED', 'REJECTED', 'Disabled'].includes(children) ? 'red' : ''}`}>{String(children).replaceAll('_', ' ')}</span>; }
export function Empty({ text = 'Nothing here yet.' }) { return <div className="empty"><Package size={36}/><h3>{text}</h3><p>New activity will appear here.</p></div>; }
export function Modal({ title, close, children }) { return <div className="overlay" onClick={close}><section role="dialog" aria-modal="true" aria-label={title} className="modal" onClick={e => e.stopPropagation()}><header><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={close}><X/></button></header>{children}</section></div>; }
export function Stat({ icon: Icon, label, value, note }) { return <section className="stat"><div className="stat-top"><span>{label}</span><Icon size={19}/></div><strong>{value}</strong><p>{note}</p></section>; }
export function ProductImage({ product }) { return product.images?.[0] ? <img className="product-image" src={product.images[0]} alt={product.name} onError={e => { e.currentTarget.style.visibility = 'hidden'; }}/> : <div className="product-image placeholder"><Package/></div>; }
// How a product's condition reads on screen; NEW says nothing at all.
export const CONDITION_LABEL = { REFURBISHED: 'Refurbished', OPEN_BOX: 'Open box', USED: 'Used' };
