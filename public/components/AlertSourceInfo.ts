import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { LocalizeController } from '../../client/locales/locales';

@customElement('alert-source-info')
export class AlertSourceInfo extends LitElement {
    private i18n = new LocalizeController(this);
    @state() private copied = false;

    static styles = css`
        :host {
            display: block;
            margin-top: 24px;
        }
        .card {
            background: var(--card-bg);
            padding: 1.5rem;
            border-radius: var(--radius-main);
            box-shadow: var(--shadow);
            border: 1px solid var(--input-border);
            transition: 0.3s;
        }
        h2 {
            margin: 0 0 1rem;
            font-size: 1.25rem;
            color: var(--primary);
            font-family: 'Outfit', sans-serif;
        }
        .url-box {
            display: flex;
            align-items: center;
            background: var(--input-bg);
            padding: 4px 4px 4px 12px;
            border-radius: 10px;
            border: 1px solid var(--input-border);
            gap: 8px;
        }
        code {
            flex: 1;
            font-family: monospace;
            font-size: 0.85rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: var(--text-main);
        }
        .btn-copy {
            background: var(--bg-gradient);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 0.8rem;
            transition: all 0.2s;
        }
        .btn-copy:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }
        .btn-copy:active {
            transform: scale(0.95);
        }
    `;

    async copyUrl() {
        const token = localStorage.getItem('session_id');
        if (!token) return;
        
        const url = `${window.location.origin}/alerts/player?token=${token}`;
        await navigator.clipboard.writeText(url);
        
        this.copied = true;
        setTimeout(() => this.copied = false, 2000);
    }

    render() {
        const token = localStorage.getItem('session_id');
        if (!token) return html``;

        const url = `${window.location.origin}/alerts/player?token=${token}`;

        return html`
            <div class="card">
                <h2>${this.i18n.t('auth.obsTitle')}</h2>
                <div class="url-box">
                    <code>${url}</code>
                    <button class="btn-copy" @click=${this.copyUrl}>
                        ${this.copied ? this.i18n.t('auth.copied') : this.i18n.t('auth.copyUrl')}
                    </button>
                </div>
            </div>
        `;
    }
}
