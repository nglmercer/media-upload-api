import '../client/index';
import type { MediaLibrary } from '../client/index';
import { resolveMediaUrl } from '../client/config';
import { AlertBuilder, AlertExporter } from './src';
import { registerBehaviors } from './behaviors';
import { TriggerAlert, registerOrReplace } from './src/components/TriggerAlert';

// 1. Initialize
registerBehaviors();
registerOrReplace('trigger-alert', TriggerAlert);

// --- Alert Template Registry ---
window.addEventListener('message', (event) => {
  console.log(event.data);
});

interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'image' | 'video';
  default: any;
}

interface AlertTemplate {
  id: string;
  fields: TemplateField[];
  build: (values: Record<string, any>, config: { anim: any, duration: number }) => any;
}

const TemplateRegistry: Record<string, AlertTemplate> = {
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
            { type: 'spacer', id: 'bar', size: `${(v.current / v.target) * 100}%`, style: { height: 16, background: 'linear-gradient(90deg, #6366f1, #a855f7)', borderRadius: 8 } }
          ],
          style: { width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden', height: 16, border: '1px solid rgba(255,255,255,0.1)' }
        },
        { type: 'text', id: 'p', content: `${v.current} / ${v.target} <small style="opacity:0.6; margin-left:10px">(${(v.current / v.target * 100).toFixed(0)}%)</small>`, html: true, style: { fontSize: 16, opacity: 0.9, marginTop: 16, color: '#ffffff', fontWeight: 600 } }
      ], { layout: { display: 'flex', flexDirection: 'column', alignItems: 'center' } })
      .style({ position: 'center', background: 'rgba(15, 23, 42, 0.98)', borderRadius: 28, padding: 40, width: 400, animation: c.anim, border: '1px solid rgba(99, 102, 241, 0.5)' })
      .build()
  }
};

// --- Studio Engine ---

function init() {
  const templateSelect = document.getElementById('templateSelector') as HTMLSelectElement;
  const fieldsContainer = document.getElementById('dynamicFields');
  const launchBtn = document.getElementById('launchAlert');
  const copyBtn = document.getElementById('exportJson');
  const selector = document.getElementById('selector') as any;

  if (!templateSelect || !fieldsContainer || !launchBtn || !copyBtn || !selector) return;

  const currentValues: Record<string, any> = {};

  const openMedia = (type: 'image' | 'video' | 'sound') => {
    selector.type = type;
    selector.classList.add('visible');
    return new Promise((resolve) => {
      const onSelect = (e: CustomEvent) => {
        resolve(e.detail);
        selector.classList.remove('visible');
        selector.removeEventListener('media-select', onSelect);
      };
      selector.addEventListener('media-select', onSelect);
      selector.addEventListener('media-close', () => selector.classList.remove('visible'), { once: true });
    });
  };

  const renderFields = () => {
    const templateId = templateSelect.value;
    const template = TemplateRegistry[templateId];
    if (!template) return;

    fieldsContainer.innerHTML = '';
    template.fields.forEach(f => {
      const group = document.createElement('div');
      group.className = 'form-group';
      group.innerHTML = `<label>${f.label}</label>`;

      if (f.type === 'image' || f.type === 'video') {
        const btn = document.createElement('button');
        btn.className = 'btn-secondary';
        btn.style.width = '100%';
        const selection = currentValues[f.id];
        btn.textContent = selection?.name || 'Select Asset';
        btn.addEventListener('click', async () => {
          const detail = await openMedia(f.type === 'image' ? 'image' : 'video');
          currentValues[f.id] = detail as  {url: string, name: string, id: string} ;
          btn.textContent = (detail as {url: string, name: string, id: string}).name || 'Selected ✓';
        });
        group.appendChild(btn);
      } else {
        const input = document.createElement('input');
        input.type = f.type === 'number' ? 'number' : 'text';
        input.value = currentValues[f.id] ?? f.default;
        currentValues[f.id] = f.type === 'number' ? parseInt(input.value) : input.value;
        input.addEventListener('input', () => {
          currentValues[f.id] = f.type === 'number' ? parseInt(input.value) : input.value;
        });
        group.appendChild(input);
      }
      fieldsContainer.appendChild(group);
    });
  };

  const getUrl = (val: any) => {
    const raw = typeof val === 'object' ? val.url : val;
    return resolveMediaUrl(raw);
  };

  const buildCurrentConfig = () => {
    const templateId = templateSelect.value;
    const template = TemplateRegistry[templateId];
    const entryTypeInput = document.getElementById('entryAnim') as HTMLSelectElement;
    const entryType = entryTypeInput?.value || 'slide-down';
    const durationInput = document.getElementById('alertDuration') as HTMLInputElement;
    const duration = parseInt(durationInput?.value || '7000');

    const anim = {
      type: entryType.split('-')[0] as any,
      direction: entryType.split('-')[1] as any,
      duration: 0.8
    };

    // Prepare values for building (resolve relative paths to full URLs only for media)
    const valuesForBuild: Record<string, any> = {};
    Object.keys(currentValues).forEach(k => {
      const field = template.fields.find(f => f.id === k);
      const isMedia = field?.type === 'image' || field?.type === 'video';
      valuesForBuild[k] = isMedia ? getUrl(currentValues[k]) : currentValues[k];
    });

    return template.build(valuesForBuild, { anim, duration });
  };

  templateSelect.addEventListener('change', () => {
    // Reset values for new template defaults
    const template = TemplateRegistry[templateSelect.value];
    template.fields.forEach(f => currentValues[f.id] = f.default);
    renderFields();
  });

  launchBtn.addEventListener('click', () => {
    const config = buildCurrentConfig();
    const el = document.createElement('trigger-alert') as TriggerAlert;
    // Clear preview area first
    const previewArea = document.getElementById('previewArea');
    if (previewArea) {
      previewArea.innerHTML = '';
      el.config = JSON.parse(AlertExporter.toJson(config));
      previewArea.appendChild(el);
    }
  });

  copyBtn.addEventListener('click', () => {
    const config = buildCurrentConfig();
    const json = AlertExporter.toJson(config);
    navigator.clipboard.writeText(json).then(() => {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'JSON Copied!';
      setTimeout(() => copyBtn.textContent = originalText, 2000);
    });
  });

  // Initial render
  const template = TemplateRegistry[templateSelect.value];
  template.fields.forEach(f => currentValues[f.id] = f.default);
  renderFields();
}

document.addEventListener('DOMContentLoaded', init);