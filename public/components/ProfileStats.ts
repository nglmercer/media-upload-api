import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { API } from '../api';
import { LocalizeController } from '../../client/locales/locales';

@customElement('profile-stats')
export class ProfileStats extends LitElement {
    @state() private user: any = null;
    @state() private stats: any = null;
    @state() private loading = true;
    private i18n = new LocalizeController(this);

    static styles = css`
        :host { 
            display: block; 
            color: var(--text-main);
            padding: 24px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
        }
        h2 { 
            margin: 0; 
            font-family: 'Outfit', sans-serif;
            font-size: 1.8em;
            background: var(--bg-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .user-id {
            font-size: 0.8em;
            color: var(--text-muted);
            font-family: monospace;
            margin-top: 4px;
        }
        .grid { 
            display: grid; 
            grid-template-columns: 1fr; 
            gap: 20px; 
        }
        .stat-card { 
            background: var(--input-bg); 
            padding: 20px; 
            border-radius: var(--radius-inner); 
            border: 1px solid var(--input-border);
        }
        .label { 
            font-size: 0.85em; 
            color: var(--text-muted); 
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .value { 
            font-size: 1.8em; 
            font-weight: 700; 
            margin-top: 8px;
            font-family: 'Outfit', sans-serif;
        }
        .progress-bar {
            height: 8px;
            background: var(--body-bg);
            border-radius: 4px;
            margin-top: 15px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background: var(--bg-gradient);
            border-radius: 4px;
            transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .logout { 
            padding: 8px 16px; 
            border: 1px solid #ef4444; 
            border-radius: var(--radius-inner); 
            color: #ef4444; 
            background: transparent;
            cursor: pointer; 
            font-weight: 600;
            font-size: 0.9em;
            transition: all 0.2s;
        }
        .logout:hover { 
            background: #ef4444; 
            color: white; 
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            color: var(--text-muted);
        }
    `;

    connectedCallback() {
        super.connectedCallback();
        this.loadData();
    }

    async loadData() {
        try {
            const [info, quota] = await Promise.all([
                API.get('/api/auth/info'),
                API.get('/api/quota')
            ]);
            this.user = info;
            this.stats = quota;
        } catch (e) {
            console.error("Failed to load profile data", e);
        } finally {
            this.loading = false;
        }
    }

    logout() {
        localStorage.removeItem('session_id');
        window.dispatchEvent(new CustomEvent('auth-changed', { detail: null }));
        this.dispatchEvent(new CustomEvent('logout'));
    }

    render() {
        if (this.loading) return html`<div class="loading">${this.i18n.t('auth.loading')}</div>`;
        if (!this.user) return html`<div class="loading">Error</div>`;
        
        const fileProgress = Math.min(100, (this.stats?.usedFiles / this.stats?.maxFiles) * 100 || 0);
        const storageProgress = Math.min(100, (this.stats?.usedStorage / this.stats?.maxStorage) * 100 || 0);

        return html`
            <div class="header">
                <div>
                   <h2>${this.i18n.t('auth.welcome', { name: this.user.label || 'User' })}</h2>
                   <div class="user-id">ID: ${this.user.userId}</div>
                </div>
                <button class="logout" @click=${this.logout}>${this.i18n.t('auth.logout')}</button>
            </div>
            
            <div class="grid">
                <div class="stat-card">
                    <div class="label">${this.i18n.t('auth.filesStored')}</div>
                    <div class="value">${this.stats?.usedFiles ?? 0} <span style="font-size: 0.5em; color: var(--text-muted);">/ ${this.stats?.maxFiles ?? '∞'}</span></div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${fileProgress}%"></div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="label">${this.i18n.t('auth.storageCapacity')}</div>
                    <div class="value">${((this.stats?.usedStorage ?? 0) / 1024 / 1024).toFixed(1)} <span style="font-size: 0.5em; color: var(--text-muted);">MB</span></div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${storageProgress}%; opacity: 0.8;"></div>
                    </div>
                </div>
            </div>
        `;
    }
}
