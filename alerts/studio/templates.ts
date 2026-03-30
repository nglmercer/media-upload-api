import { AlertBuilder } from '../src';
import type { AlertTemplate } from './types';

export const TemplateRegistry: Record<string, AlertTemplate> = {
  follow: {
    id: 'follow',
    fields: [
      { id: 'user', label: 'Username', type: 'text', default: 'Antigravity' },
      { id: 'pfp', label: 'Avatar URL', type: 'image', default: 'https://i.pravatar.cc/150?u=studio' }
    ],
    build: (v, c) => new AlertBuilder()
      .id('follow-' + Date.now())
      .duration(c.duration)
      .container([
        { 
          type: 'image', id: 'avatar', src: v.pfp, behavior: 'reveal-pop', 
          style: { width: 110, height: 110, borderRadius: '50%', border: '4px solid #8b5cf6', boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)', overflow: 'hidden', objectFit: 'cover' } 
        },
        { 
          type: 'text', id: 'msg', content: `<span style="color:#d8b4fe">**${v.user}**</span> just followed!`, 
          behavior: 'text-reveal', html: true, 
          style: { fontSize: 26, marginLeft: 30, color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' } 
        }
      ], { layout: { display: 'flex', alignItems: 'center' } })
      .style({ 
        position: 'center', background: 'rgba(15, 23, 42, 0.98)', color: '#fff',
        borderRadius: 40, padding: '30px 60px', border: '1px solid rgba(139, 92, 246, 0.3)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
        animation: c.anim 
      })
      .build()
  },
  subscription: {
    id: 'subscription',
    fields: [
      { id: 'user', label: 'Subscriber', type: 'text', default: 'NewSub123' },
      { id: 'months', label: 'Months', type: 'number', default: 1 },
      { id: 'pfp', label: 'Avatar', type: 'image', default: 'https://i.pravatar.cc/150?u=sub' }
    ],
    build: (v, c) => new AlertBuilder()
      .id('sub-' + Date.now())
      .duration(c.duration)
      .container([
        { type: 'image', id: 'pfp', src: v.pfp, style: { width: 100, height: 100, borderRadius: 20, border: '3px solid #f59e0b', overflow: 'hidden', objectFit: 'cover' } },
        { 
          type: 'container', id: 'info', 
          children: [
            { type: 'text', id: 'name', content: v.user, style: { fontWeight: 900, fontSize: 36, color: '#fbbf24', textShadow: '0 0 10px rgba(245, 158, 11, 0.4)' } },
            { type: 'text', id: 'sub', content: `just subscribed for <b style="color:#fff">${v.months} month(s)</b>!`, html: true, style: { fontSize: 18, opacity: 0.9, marginTop: 4, color: '#ffffff' } }
          ],
          layout: { display: 'flex', flexDirection: 'column' },
          style: { marginLeft: '24px' }
        }
      ], { layout: { display: 'flex', alignItems: 'center' } })
      .style({ position: 'center', background: 'rgba(15, 23, 42, 0.98)', borderRadius: 32, padding: 40, animation: c.anim, border: '2px solid rgba(245, 158, 11, 0.5)' })
      .build()
  },
  donation: {
    id: 'donation',
    fields: [
      { id: 'user', label: 'Donor', type: 'text', default: 'BigSpender' },
      { id: 'amount', label: 'Amount', type: 'number', default: 500 },
      { id: 'icon', label: 'Alert Icon', type: 'image', default: 'https://cdn-icons-png.flaticon.com/512/4213/4213554.png' }
    ],
    build: (v, c) => new AlertBuilder()
      .id('donation-' + Date.now())
      .duration(c.duration)
      .container([
        { type: 'image', id: 'icon', src: v.icon, behavior: 'reveal-pop', style: { width: 140, filter: { dropShadow: '0 0 15px rgba(34, 197, 94, 0.4)' }, overflow: 'hidden', objectFit: 'cover' } },
        { 
          type: 'text', id: 'msg', content: `<span style="color:#4ade80">**${v.user}**</span> sent <span style="background:#22c55e; padding: 2px 8px; border-radius: 6px">$${v.amount}</span>`, 
          behavior: 'text-reveal', html: true, 
          style: { fontSize: 32, marginTop: 24, color: '#ffffff', textAlign: 'center' } 
        }
      ], { layout: { display: 'flex', flexDirection: 'column', alignItems: 'center' } })
      .style({ position: 'center', background: 'rgba(15, 23, 42, 0.98)', borderRadius: 50, padding: 60, animation: c.anim, border: '1px solid #22c55e' })
      .build()
  },
  gift: {
    id: 'gift',
    fields: [
      { id: 'user', label: 'Sender', type: 'text', default: 'GiftingPro' },
      { id: 'count', label: 'Gifts Count', type: 'number', default: 5 },
      { id: 'pfp', label: 'Sender Avatar', type: 'image', default: 'https://i.pravatar.cc/150?u=gift' },
      { id: 'item', label: 'Gift Item', type: 'image', default: 'https://cdn-icons-png.flaticon.com/512/4213/4213476.png' }
    ],
    build: (v, c) => new AlertBuilder()
      .id('gift-' + Date.now())
      .duration(c.duration)
      .container([
        { 
          type: 'container', id: 'avatars', 
          children: [
            { type: 'image', id: 'avatar', src: v.pfp, style: { width: 90, height: 90, borderRadius: '50%', border: '4px solid #ffffff', overflow: 'hidden', objectFit: 'cover' } },
            { type: 'image', id: 'item', src: v.item, behavior: 'gift-reveal', style: { width: 60, height: 60, position: 'absolute', bottom: -10, right: -10, filter: { dropShadow: '0 4px 8px rgba(0,0,0,0.5)' }, overflow: 'hidden', objectFit: 'cover' } }
          ],
          layout: { position: 'relative' }
        },
        { 
          type: 'container', id: 'text-info',
          children: [
            { type: 'text', id: 'name', content: v.user, style: { fontWeight: 900, fontSize: 30, color: '#ffffff' } },
            { 
              type: 'text', id: 'status', 
              content: `gifted <span style="color:#ec4899; font-weight:800">${v.count} months!</span>`, 
              behavior: v.count > 1 ? 'score-count' : undefined,
              behaviorData: { target: v.count },
              html: true,
              style: { opacity: 0.9, color: '#ffffff', marginTop: 4 } 
            }
          ],
          layout: { display: 'flex', flexDirection: 'column' },
          style: { marginLeft: '35px' }
        }
      ], { layout: { display: 'flex', alignItems: 'center' } })
      .style({ position: 'center', background: 'rgba(15, 41, 62, 0.98)', borderRadius: 40, padding: '35px 60px', animation: c.anim, border: '2px solid #ec4899' })
      .build()
  },
  milestone: {
    id: 'milestone',
    fields: [
      { id: 'title', label: 'Milestone Title', type: 'text', default: 'Channel Goal' },
      { id: 'current', label: 'Current Progress', type: 'number', default: 50 },
      { id: 'target', label: 'Target', type: 'number', default: 100 }
    ],
    build: (v, c) => new AlertBuilder()
      .id('milestone-' + Date.now())
      .duration(c.duration)
      .container([
        { type: 'text', id: 't', content: v.title, style: { fontSize: 24, fontWeight: 800, marginBottom: 20, color: '#ffffff' } },
        { 
          type: 'container', id: 'bar-wrap', 
          children: [
            { 
              type: 'spacer', id: 'bar', size: '0%', 
              behavior: 'progress-fill',
              behaviorData: { target: `${(v.current / v.target) * 100}%`, delay: 800 },
              style: { height: 16, background: 'linear-gradient(90deg, #6366f1, #a855f7)', borderRadius: 8 } 
            }
          ],
          style: { width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden', height: 16, border: '1px solid rgba(255,255,255,0.1)' }
        },
        { 
          type: 'text', id: 'p', 
          content: `0 / ${v.target}`, 
          behavior: 'score-count',
          behaviorData: { target: v.current },
          style: { fontSize: 20, opacity: 0.9, marginTop: 16, color: '#ffffff', fontWeight: 600 } 
        }
      ], { layout: { display: 'flex', flexDirection: 'column', alignItems: 'center' } })
      .style({ position: 'center', background: 'rgba(15, 23, 42, 0.98)', borderRadius: 28, padding: 40, width: 400, animation: c.anim, border: '1px solid rgba(99, 102, 241, 0.5)' })
      .build()
  },
  video: {
    id: 'video',
    fields: [
      { id: 'title', label: 'Main Text', type: 'text', default: 'BIG NEWS!' },
      { id: 'user', label: 'User Name', type: 'text', default: 'Viewer123' },
      { id: 'video', label: 'Cinematic Video', type: 'video', default: '' }
    ],
    build: (v, c) => new AlertBuilder()
      .id('video-alert-' + Date.now())
      .duration(c.duration)
      .container([
        { 
          type: 'container', id: 'vid-wrap', 
          children: [
            { 
              type: 'video', id: 'main-vid', src: v.video, autoplay: true, muted: true,
              style: { width: '100%', height: '100%', borderRadius: 24, objectFit: 'cover' }
            },
            {
               type: 'container', id: 'overlay',
               children: [
                 { type: 'text', id: 't', content: v.title, style: { fontSize: 42, fontWeight: 900, color: '#fff', textShadow: '0 0 20px rgba(0,0,0,0.8)' } },
                 { type: 'text', id: 'u', content: `BY <span style="color:#6366f1">${v.user}</span>`, html: true, style: { fontSize: 20, fontWeight: 700, marginTop: 10, letterSpacing: 2 } }
               ],
               layout: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 0, left: 0 },
               style: { width: '100%', height: '100%', background: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%)' }
            }
          ],
          layout: { position: 'relative' },
          style: { width: 500, height: 280, borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' }
        }
      ], { layout: { display: 'flex', justifyContent: 'center' } })
      .style({ position: 'center', background: 'transparent', animation: c.anim })
      .build()
  },
  cinematic: {
    id: 'cinematic',
    fields: [
      { id: 'user', label: 'Username', type: 'text', default: 'ViewerName' },
      { id: 'msg', label: 'Message', type: 'text', default: 'JOINED THE CLUB!' },
      { id: 'video', label: 'Background Video (WebM)', type: 'video', default: '' },
      { id: 'color', label: 'Accent Color', type: 'text', default: '#6366f1' }
    ],
    build: (v, c) => new AlertBuilder()
      .id('cinematic-' + Date.now())
      .duration(c.duration)
      .container([
         { 
           type: 'video', id: 'bg', src: v.video, autoplay: true, muted: true,
           style: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -1 } 
         },
         {
           type: 'container', id: 'content',
           children: [
             { 
               type: 'text', id: 'user', content: v.user.toUpperCase(), 
               style: { fontSize: 48, fontWeight: 950, color: v.color, letterSpacing: 4, textShadow: `0 0 30px ${v.color}88` } 
             },
             { 
               type: 'text', id: 'msg', content: v.msg, 
               style: { fontSize: 24, fontWeight: 700, color: '#fff', marginTop: 10, opacity: 0.9, letterSpacing: 8 } 
             },
             {
               type: 'spacer', id: 'line', size: '0%', 
               behavior: 'progress-fill',
               behaviorData: { target: '100%', delay: 1000, duration: 2000 },
               style: { height: 4, background: v.color, marginTop: 30, borderRadius: 2, boxShadow: `0 0 15px ${v.color}` }
             }
           ],
           layout: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
           style: { width: '100%', height: '100%', background: 'linear-gradient(90deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.8) 100%)', backdropFilter: 'blur(5px)' }
         }
      ], { layout: { position: 'relative' } })
      .style({ position: 'center', width: 800, height: 400, background: '#000', borderRadius: 0, border: `2px solid ${v.color}`, overflow: 'hidden', animation: c.anim })
      .build()
  }
};
