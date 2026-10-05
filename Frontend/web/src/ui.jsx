// The small pieces every page is built from. Kept apart from main.jsx so a
// new page can be written in its own file without touching the shell.
import React, { useState, useEffect } from 'react';
import { Package, X, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';

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
// A product thumbnail. With photos it opens a full-size lightbox on click
// (and steps through every photo the product has); without, a placeholder.
export function ProductImage({ product, zoom = true }) {
  const images = (product.images || []).filter(Boolean);
  const [at, setAt] = useState(null);
  if (!images[0]) return <div className="product-image placeholder"><Package/></div>;
  const open = zoom && at !== null;
  return <>
    <img className={`product-image${zoom ? ' zoomable' : ''}`} src={images[0]} alt={product.name}
      onClick={zoom ? () => setAt(0) : undefined}
      onError={e => { e.currentTarget.style.visibility = 'hidden'; }}/>
    {open && <Lightbox images={images} start={at} title={product.name} close={() => setAt(null)}/>}
  </>;
}
// A full-screen photo viewer: click the backdrop or press Esc to close, and
// step through with the arrows (or arrow keys) when there's more than one.
export function Lightbox({ images, start = 0, title, close }) {
  const [i, setI] = useState(start);
  const many = images.length > 1;
  const step = d => setI(n => (n + d + images.length) % images.length);
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') close(); else if (many && e.key === 'ArrowRight') step(1); else if (many && e.key === 'ArrowLeft') step(-1); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [many, images.length]);
  return <div className="lightbox" onClick={close}>
    <button className="lightbox-close icon-button" aria-label="Close" onClick={close}><X size={22}/></button>
    {many && <button className="lightbox-nav prev icon-button" aria-label="Previous photo" onClick={e => { e.stopPropagation(); step(-1); }}><ChevronLeft size={28}/></button>}
    <img className="lightbox-img" src={images[i]} alt={title ? `${title} (${i + 1} of ${images.length})` : ''} onClick={e => e.stopPropagation()}/>
    {many && <button className="lightbox-nav next icon-button" aria-label="Next photo" onClick={e => { e.stopPropagation(); step(1); }}><ChevronRight size={28}/></button>}
    {many && <div className="lightbox-count" onClick={e => e.stopPropagation()}>{i + 1} / {images.length}</div>}
  </div>;
}
// How a product's condition reads on screen; NEW says nothing at all.
export const CONDITION_LABEL = { REFURBISHED: 'Refurbished', OPEN_BOX: 'Open box', USED: 'Used' };
