import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import './AuthLogin';
import './AuthRegister';
import './ProfileStats';

@customElement('auth-dashboard')
export class AuthDashboard extends LitElement {
    @state() private authenticated = !!localStorage.getItem('session_id');
    @state() private activeTab: 'login' | 'signup' = 'login';

    static styles = css`
        :host { 
            display: block; 
            width: 100%;
            max-width: 400px; 
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
            min-height: 380px;
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
                    <profile-stats @logout=${() => this.authenticated = false}></profile-stats>
                </div>
            `;
        }

        return html`
            <div class="card">
                <div class="tabs">
                    <div class="tab ${this.activeTab === 'login' ? 'active' : ''}" 
                         @click=${() => this.activeTab = 'login'}>Login</div>
                    <div class="tab ${this.activeTab === 'signup' ? 'active' : ''}" 
                         @click=${() => this.activeTab = 'signup'}>Signup</div>
                </div>
                <div class="content">
                    ${this.activeTab === 'login' 
                        ? html`<auth-login @switch-tab=${(e: CustomEvent) => this.activeTab = e.detail}></auth-login>` 
                        : html`<auth-register @switch-tab=${(e: CustomEvent) => this.activeTab = e.detail}></auth-register>`}
                </div>
            </div>
        `;
    }
}
