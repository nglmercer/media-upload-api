import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { API } from '../api';

@customElement('auth-login')
export class AuthLogin extends LitElement {
    @state() private identifier = '';
    @state() private password = '';
    @state() private loading = false;
    @state() private error = '';

    static styles = css`
        :host { 
            display: block; 
            color: var(--text-main);
        }
        h2 { 
            margin-top: 0; 
            text-align: center;
            font-family: 'Outfit', sans-serif;
            font-size: 2em;
            margin-bottom: 30px;
        }
        .input-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            font-size: 0.9em;
            color: var(--text-muted);
            margin-bottom: 8px;
        }
        input { 
            width: 100%; 
            padding: 14px; 
            border-radius: var(--radius-inner); 
            border: 1px solid var(--input-border); 
            background: var(--input-bg); 
            color: var(--text-main); 
            box-sizing: border-box; 
            outline: none;
            transition: all 0.2s;
            font-size: 1em;
        }
        input:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(192, 38, 211, 0.1);
        }
        .forgot {
            text-align: right;
            margin-top: -10px;
            margin-bottom: 25px;
        }
        .forgot a {
            color: var(--primary);
            text-decoration: none;
            font-size: 0.85em;
        }
        button { 
            width: 100%; 
            padding: 16px; 
            border-radius: var(--radius-inner); 
            border: none; 
            background: var(--bg-gradient); 
            color: white; 
            font-weight: 700; 
            font-size: 1em;
            cursor: pointer; 
            transition: all 0.3s; 
            font-family: 'Inter', sans-serif;
            box-shadow: 0 4px 12px rgba(192, 38, 211, 0.2);
        }
        button:hover { 
            transform: translateY(-2px);
            box-shadow: 0 6px 15px rgba(192, 38, 211, 0.3);
            filter: brightness(1.1);
        }
        button:active {
            transform: translateY(0);
        }
        button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .error { 
            color: #ef4444; 
            font-size: 0.85em; 
            margin-top: 15px; 
            text-align: center;
        }
    `;

    async login() {
        if (this.loading) return;
        this.loading = true;
        this.error = '';
        try {
            const res = await API.post('/api/auth/login', { 
                identifier: this.identifier, 
                password: this.password 
            });
            if (res.success) {
                localStorage.setItem('session_id', res.sessionId);
                window.dispatchEvent(new CustomEvent('auth-changed', { detail: res }));
            } else {
                this.error = res.message;
            }
        } catch (e) {
            this.error = "Connection error";
        } finally {
            this.loading = false;
        }
    }

    render() {
        return html`
            <div class="input-group">
                <input type="text" placeholder="Email or Username" @input=${(e: any) => this.identifier = e.target.value}>
            </div>
            <div class="input-group">
                <input type="password" placeholder="Password" @input=${(e: any) => this.password = e.target.value}>
            </div>
            <div class="forgot">
                <a href="#">Forgot password?</a>
            </div>
            <button @click=${this.login} ?disabled=${this.loading}>Login</button>
            ${this.error ? html`<div class="error">${this.error}</div>` : ''}
            <div class="footer">
                Not a member? <span @click=${() => this.dispatchEvent(new CustomEvent('switch-tab', { detail: 'signup' }))}>Signup now</span>
            </div>
        `;
    }
}
