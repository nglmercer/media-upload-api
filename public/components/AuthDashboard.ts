import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { LocalizeController, setLocale } from '../../client/locales/locales';
import './AuthLogin';
import './AuthRegister';
import './ProfileStats';
import '../../client/index';

@customElement('auth-dashboard')
export class AuthDashboard extends LitElement {
    @state() private authenticated = !!localStorage.getItem('session_id');
    @state() private activeTab: 'login' | 'signup' = 'login';
    @state() private showLibrary = false;
    private i18n: LocalizeController = new LocalizeController(this);

    static styles = css`
        :host {
            display: block;
            width: 100%;
            max-width: 960px;
            margin: 0 auto;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        .card {
            background: var(--card-bg);
            border-radius: var(--radius-main);
            box-shadow: var(--shadow);
            overflow: hidden;
            transition: all 0.3s ease;
            animation: slideUp 0.5s ease-out;
            display: flex;
            flex-direction: column;
        }
        .tabs {
            display: flex;
            padding: 10px;
            gap: 10px;
        }
        .tab {
            flex: 1;
            padding: 12px;
            text-align: center;
            cursor: pointer;
            border-radius: var(--radius-inner);
            font-weight: 600;
            transition: all 0.2s;
            color: var(--text-muted);
        }
        .tab.active {
            background: var(--bg-gradient);
            color: white;
            box-shadow: 0 4px 12px rgba(192, 38, 211, 0.2);
        }
        .content {
            padding: 24px;
            min-height: 400px; /* FIXED HEIGHT to prevent jumps */
            display: flex;
            flex-direction: column;
        }
        
        .lang-switcher {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-top: 20px;
            font-size: 0.8em;
            color: var(--text-muted);
        }
        .lang-btn {
            cursor: pointer;
            opacity: 0.6;
            transition: opacity 0.2s;
        }
        .lang-btn.active {
            opacity: 1;
            font-weight: bold;
            color: var(--primary);
        }

        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;

    constructor() {
        super();
        window.addEventListener('auth-changed', (e: any) => {
            this.authenticated = !!e.detail;
        });
    }

    render() {
        if (this.authenticated) {
            return html`
                <div class="card" style="max-width: 800px; margin: 0 auto;">
                    <profile-stats
                        @logout=${() => this.authenticated = false}
                        @open-files=${() => this.showLibrary = true}
                    >
                        <slot></slot>
                    </profile-stats>
                </div>
                ${this.showLibrary ? html`
                    <media-library
                        type="all"
                        mode="picker"
                        @media-close=${() => this.showLibrary = false}
                        @media-select=${(e: CustomEvent) => this.handleMediaSelect(e)}
                    ></media-library>
                ` : ''}
            `;
        }

        return html`
            <div class="card">
                <div class="tabs">
                    <div class="tab ${this.activeTab === 'login' ? 'active' : ''}" 
                         @click=${() => this.activeTab = 'login'}>${this.i18n.t('auth.login')}</div>
                    <div class="tab ${this.activeTab === 'signup' ? 'active' : ''}" 
                         @click=${() => this.activeTab = 'signup'}>${this.i18n.t('auth.signup')}</div>
                </div>
                <div class="content">
                    ${this.activeTab === 'login' 
                        ? html`<auth-login @switch-tab=${(e: any) => this.activeTab = e.detail}></auth-login>` 
                        : html`<auth-register @switch-tab=${(e: any) => this.activeTab = e.detail}></auth-register>`}
                </div>
            </div>

            <div class="lang-switcher">
                <span class="lang-btn ${this.i18n.locale === 'es' ? 'active' : ''}" 
                      @click=${() => setLocale('es')}>ES</span>
                |
                <span class="lang-btn ${this.i18n.locale === 'en' ? 'active' : ''}" 
                      @click=${() => setLocale('en')}>EN</span>
            </div>
        `;
    }

    private async handleMediaSelect(e: CustomEvent) {
        const { selected: file } = e.detail;
        console.log('[Dashboard] Selected file for alert:', file);
        this.showLibrary = false;

        const token = localStorage.getItem('session_id') || '';
        const payload: any = {
            duration: 5000,
            volume: 1,
            muted: false
        };

        if (file.category === 'video') payload.video = file.url;
        else if (file.category === 'audio') payload.audio = file.url;
        else if (file.category === 'image') payload.image = file.url;

        try {
            const res = await fetch('/api/alerts/trigger', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                console.log('Alert triggered successfully');
            } else {
                console.error('Failed to trigger alert:', result.error);
            }
        } catch (err) {
            console.error('Error triggering alert:', err);
        }
    }
}
