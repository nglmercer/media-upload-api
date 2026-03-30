import type { MediaLibrary } from '../../client/index';
import { resolveMediaUrl } from '../../client/config';
import { AlertExporter } from '../src';
import { TriggerAlert } from '../src/components/TriggerAlert';
import { TemplateRegistry } from './templates';

export class StudioEngine {
  private currentValues: Record<string, any> = {};
  private templateSelect: HTMLSelectElement;
  private fieldsContainer: HTMLElement;
  private launchBtn: HTMLElement;
  private copyBtn: HTMLElement;
  private selector: any;

  constructor() {
    this.templateSelect = document.getElementById('templateSelector') as HTMLSelectElement;
    this.fieldsContainer = document.getElementById('dynamicFields')!;
    this.launchBtn = document.getElementById('launchAlert')!;
    this.copyBtn = document.getElementById('exportJson')!;
    this.selector = document.getElementById('selector') as any;

    if (!this.templateSelect || !this.fieldsContainer || !this.launchBtn || !this.copyBtn || !this.selector) {
      console.warn('[StudioEngine] Missing DOM elements');
      return;
    }

    this.setupEventListeners();
    this.initialize();
  }

  private setupEventListeners() {
    this.templateSelect.addEventListener('change', () => this.handleTemplateChange());
    this.launchBtn.addEventListener('click', () => this.launchPreview());
    this.copyBtn.addEventListener('click', () => this.exportJson());
  }

  private initialize() {
    const defaultTemplate = TemplateRegistry[this.templateSelect.value];
    if (defaultTemplate) {
      defaultTemplate.fields.forEach(f => this.currentValues[f.id] = f.default);
      this.renderFields();
    }
  }

  private handleTemplateChange() {
    const template = TemplateRegistry[this.templateSelect.value];
    if (!template) return;
    template.fields.forEach(f => this.currentValues[f.id] = f.default);
    this.renderFields();
  }

  private openMedia(type: 'image' | 'video' | 'sound'): Promise<any> {
    this.selector.type = type;
    this.selector.classList.add('visible');
    return new Promise((resolve) => {
      const onSelect = (e: CustomEvent) => {
        resolve(e.detail);
        this.selector.classList.remove('visible');
        this.selector.removeEventListener('media-select', onSelect);
      };
      this.selector.addEventListener('media-select', onSelect);
      this.selector.addEventListener('media-close', () => this.selector.classList.remove('visible'), { once: true });
    });
  }

  private renderFields() {
    const template = TemplateRegistry[this.templateSelect.value];
    if (!template) return;

    this.fieldsContainer.innerHTML = '';
    template.fields.forEach(f => {
      const group = document.createElement('div');
      group.className = 'form-group';
      group.innerHTML = `<label>${f.label}</label>`;

      if (f.type === 'image' || f.type === 'video') {
        const btn = document.createElement('button');
        btn.className = 'btn-secondary';
        btn.style.width = '100%';
        const selection = this.currentValues[f.id];
        btn.textContent = selection?.name || 'Select Asset';
        btn.addEventListener('click', async () => {
          const detail = await this.openMedia(f.type === 'image' ? 'image' : 'video');
          this.currentValues[f.id] = detail;
          btn.textContent = (detail as any).name || 'Selected ✓';
        });
        group.appendChild(btn);
      } else {
        const input = document.createElement('input');
        input.type = f.type === 'number' ? 'number' : 'text';
        input.value = this.currentValues[f.id] ?? f.default;
        this.currentValues[f.id] = f.type === 'number' ? parseInt(input.value) : input.value;
        input.addEventListener('input', () => {
          this.currentValues[f.id] = f.type === 'number' ? parseInt(input.value) : input.value;
        });
        group.appendChild(input);
      }
      this.fieldsContainer.appendChild(group);
    });
  }

  private getUrl(val: any) {
    const raw = typeof val === 'object' ? val.url : val;
    return resolveMediaUrl(raw);
  }

  private buildCurrentConfig() {
    const template = TemplateRegistry[this.templateSelect.value];
    const entryTypeInput = document.getElementById('entryAnim') as HTMLSelectElement;
    const entryType = entryTypeInput?.value || 'slide-down';
    const durationInput = document.getElementById('alertDuration') as HTMLInputElement;
    const duration = parseInt(durationInput?.value || '7000');

    const anim = {
      type: entryType.split('-')[0] as any,
      direction: entryType.split('-')[1] as any,
      duration: 0.8
    };

    const valuesForBuild: Record<string, any> = {};
    Object.keys(this.currentValues).forEach(k => {
      const field = template.fields.find(f => f.id === k);
      const isMedia = field?.type === 'image' || field?.type === 'video';
      valuesForBuild[k] = isMedia ? this.getUrl(this.currentValues[k]) : this.currentValues[k];
    });

    return template.build(valuesForBuild, { anim, duration });
  }

  private launchPreview() {
    const config = this.buildCurrentConfig();
    const el = document.createElement('trigger-alert') as TriggerAlert;
    const previewArea = document.getElementById('previewArea');
    if (previewArea) {
      previewArea.innerHTML = '';
      el.config = JSON.parse(AlertExporter.toJson(config));
      previewArea.appendChild(el);
    }
  }

  private exportJson() {
    const config = this.buildCurrentConfig();
    const json = AlertExporter.toJson(config);
    navigator.clipboard.writeText(json).then(() => {
      const originalText = this.copyBtn.textContent;
      this.copyBtn.textContent = 'JSON Copied!';
      setTimeout(() => this.copyBtn.textContent = originalText, 2000);
    });
  }
}
