import { html, css, LitElement,unsafeCSS } from 'lit';
import { Component, property, state, query } from './litcomponents';
import { LocalizeController } from '../locales/locales';
import styles from './Dialog.css?inline';
import { WidgetEvents, WidgetEventTypes } from '../events';
export type DialogTheme = 'light' | 'dark' | 'system';
export type DialogType = 'alert' | 'confirm' | 'prompt' | 'modal';
export type DialogResult = boolean | string | null;

export interface DialogOptions {
  title?: string;
  message: string;
  type?: DialogType;
  theme?: DialogTheme;
  confirmText?: string;
  cancelText?: string;
  placeholder?: string;
  defaultValue?: string;
  showClose?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  danger?: boolean;
}

export interface DialogCloseEvent extends CustomEvent {
  detail: {
    result: DialogResult;
    action: 'confirm' | 'cancel' | 'close';
  };
}

declare global {
  interface HTMLElementEventMap {
    'dialog-close': DialogCloseEvent;
  }
}

@Component('app-dialog')
export class AppDialog extends LitElement {
  @property({ type: String }) title = '';
  @property({ type: String }) message = '';
  @property({ type: String }) type: DialogType = 'alert';
  @property({ type: String }) theme: DialogTheme = 'dark';
  @property({ type: String }) confirmText = '';
  @property({ type: String }) cancelText = '';
  @property({ type: String }) placeholder = '';
  @property({ type: String }) defaultValue = '';
  @property({ type: Boolean }) showClose = true;
  @property({ type: Boolean }) closeOnOverlayClick = true;
  @property({ type: Boolean }) closeOnEscape = true;
  @property({ type: Boolean }) danger = false;

  @state() private _isOpen = false;
  @state() private _inputValue = '';
  @state() private _theme: 'light' | 'dark' = 'dark';

  // Localization controller
  localizer = new LocalizeController(this);

  @query('#dialog-input') private _inputElement!: HTMLInputElement;
  @query('#dialog-overlay') private _overlayElement!: HTMLDivElement;

  private _resolvePromise: ((value: DialogResult) => void) | null = null;

  static styles = css`
  :host {
    display: contents;
  }
  ${unsafeCSS(styles)}
  `;

  connectedCallback() {
    super.connectedCallback();
    this._updateTheme();
    this._addGlobalListeners();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._removeGlobalListeners();
  }

  private _addGlobalListeners() {
    document.addEventListener('keydown', this._handleKeyDown);
  }

  private _removeGlobalListeners() {
    document.removeEventListener('keydown', this._handleKeyDown);
  }

  private _handleKeyDown = (e: KeyboardEvent) => {
    if (!this._isOpen) return;
    
    if (this.closeOnEscape && e.key === 'Escape') {
      this._handleCancel();
    }
    
    if (e.key === 'Enter' && this.type !== 'prompt') {
      if (e.shiftKey || e.ctrlKey || !e.altKey) {
        this._handleConfirm();
      }
    }
  };

  private _updateTheme() {
    if (this.theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this._theme = prefersDark ? 'dark' : 'light';
    } else {
      this._theme = this.theme as 'light' | 'dark';
    }
  }

  public open(options: DialogOptions): Promise<DialogResult> {
    this.title = options.title || '';
    this.message = options.message;
    this.type = options.type || 'alert';
    this.theme = options.theme || 'dark';
    
    // Use localized default texts if not provided
    if (!options.confirmText) {
      this.confirmText = this.localizer.t(`dialog.${this.type === 'alert' ? 'ok' : 'confirm'}`);
    } else {
      this.confirmText = options.confirmText;
    }
    
    if (!options.cancelText) {
      this.cancelText = this.localizer.t('dialog.cancel');
    } else {
      this.cancelText = options.cancelText;
    }
    
    if (!options.placeholder && this.type === 'prompt') {
      this.placeholder = this.localizer.t('dialog.placeholder.default');
    } else {
      this.placeholder = options.placeholder || '';
    }
    this.defaultValue = options.defaultValue || '';
    this.showClose = options.showClose !== undefined ? options.showClose : true;
    this.closeOnOverlayClick = options.closeOnOverlayClick !== undefined ? options.closeOnOverlayClick : true;
    this.closeOnEscape = options.closeOnEscape !== undefined ? options.closeOnEscape : true;
    this.danger = options.danger || false;
    
    this._inputValue = this.defaultValue;
    this._updateTheme();
    
    this._isOpen = true;
    this.requestUpdate();
    
    WidgetEvents.emit(WidgetEventTypes.DIALOG_OPEN, { type: this.type, title: this.title });
    
    // Focus input for prompt
    setTimeout(() => {
      if (this.type === 'prompt' && this._inputElement) {
        this._inputElement.focus();
        this._inputElement.select();
      }
    }, 100);
    
    return new Promise((resolve) => {
      this._resolvePromise = resolve;
    });
  }

  public close(result: DialogResult = null, action: 'confirm' | 'cancel' | 'close' = 'close') {
    this._isOpen = false;
    this._resolvePromise?.(result);
    this._resolvePromise = null;
    this.requestUpdate();
    
    const detail = { result, action };
    this.dispatchEvent(new CustomEvent('dialog-close', {
      detail,
      bubbles: true,
      composed: true
    }));
    WidgetEvents.emit(WidgetEventTypes.DIALOG_CLOSE, detail);
  }

  private _handleOverlayClick(e: MouseEvent) {
    if (this.closeOnOverlayClick && e.target === this._overlayElement) {
      this._handleCancel();
    }
  }

  private _handleConfirm() {
    if (this.type === 'prompt') {
      this.close(this._inputValue, 'confirm');
    } else {
      this.close(true, 'confirm');
    }
  }

  private _handleCancel() {
    if (this.type === 'prompt') {
      this.close(null, 'cancel');
    } else {
      this.close(false, 'cancel');
    }
  }

  private _handleInputChange(e: Event) {
    this._inputValue = (e.target as HTMLInputElement).value;
  }

  private _getIcon(): string {
    switch (this.type) {
      case 'confirm':
      case 'modal':
        return '?';
      case 'prompt':
        return '?';
      case 'alert':
      default:
        return this.danger ? '!' : 'i';
    }
  }

  private _getIconClass(): string {
    if (this.danger) return 'error';
    switch (this.type) {
      case 'confirm':
      case 'modal':
        return 'question';
      case 'prompt':
        return 'question';
      default:
        return 'info';
    }
  }

  private _getDefaultTitle(): string {
    if (this.title) return this.title;
    
    switch (this.type) {
      case 'confirm':
        return this.localizer.t('dialog.title.confirm');
      case 'prompt':
        return this.localizer.t('dialog.title.input');
      case 'modal':
        return this.localizer.t('dialog.title.modal');
      default:
        return this.localizer.t('dialog.title.alert');
    }
  }

  render() {
    const title = this._getDefaultTitle();
    const iconClass = this._getIconClass();
    
    // Get localized button texts
    const confirmBtnText = this.confirmText || this.localizer.t(`dialog.${this.type === 'alert' ? 'ok' : 'confirm'}`);
    const cancelBtnText = this.cancelText || this.localizer.t('dialog.cancel');
    const inputPlaceholder = this.placeholder || this.localizer.t('dialog.placeholder.default');
    const closeLabel = this.localizer.t('dialog.close');
    
    return html`
      <div 
        id="dialog-overlay"
        class="dialog-overlay ${this._theme} ${this._isOpen ? 'open' : ''}"
        @click="${this._handleOverlayClick}"
      >
        <div class="dialog-container ${this._theme}" role="dialog" aria-modal="true">
          <div class="dialog-header">
            <h2 class="dialog-title">${title}</h2>
            ${this.showClose ? html`
              <button 
                class="dialog-close" 
                @click="${this._handleCancel}"
                aria-label="${closeLabel}"
              >
                ×
              </button>
            ` : ''}
          </div>
          
          <div class="dialog-body">
            ${this.type !== 'modal' ? html`
              <div class="dialog-icon ${iconClass}">
                ${this._getIcon()}
              </div>
            ` : ''}
            
            <p class="dialog-message">${this.message}</p>
            
            ${this.type === 'prompt' ? html`
              <input
                id="dialog-input"
                class="dialog-input"
                type="text"
                .value="${this._inputValue}"
                placeholder="${inputPlaceholder}"
                @input="${this._handleInputChange}"
                @keydown="${(e: KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    this._handleConfirm();
                  }
                }}"
              />
            ` : ''}
          </div>
          
          <div class="dialog-footer">
            ${this.type === 'alert' ? html`
              <button 
                class="btn ${this.danger ? 'btn-danger' : 'btn-primary'}"
                @click="${this._handleConfirm}"
              >
                ${confirmBtnText}
              </button>
            ` : html`
              <button 
                class="btn btn-secondary"
                @click="${this._handleCancel}"
              >
                ${cancelBtnText}
              </button>
              <button 
                class="btn ${this.danger ? 'btn-danger' : 'btn-primary'}"
                @click="${this._handleConfirm}"
              >
                ${confirmBtnText}
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }
}
