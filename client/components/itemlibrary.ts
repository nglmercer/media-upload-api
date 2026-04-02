import { html, LitElement, css,unsafeCSS } from 'lit';
import { Component, property, state } from './litcomponents';
import type { FileItem } from '../../src/client';
import { createBrowserClient } from '../../src/client';
import { style } from './stylesitem';
import { getBackendUrl } from '../config';
import { WidgetEvents, WidgetEventTypes } from '../events';
const apiClient = createBrowserClient({ baseUrl: getBackendUrl() });

/**
 * MediaLibraryItem — a single card in the MediaLibrary grid.
 *
 * Audio playback is managed here, but *coordinated* by the parent:
 *  - When this card starts playing it emits `ml-play-start { id }`.
 *  - When this card stops  it emits `ml-play-stop  { id }`.
 *  - The parent can call `stopAudio()` directly (using `data-id` selector).
 *  - The parent also passes `.isPlayingExternal` — when it becomes false
 *    while we are playing we know another card took over, so we stop.
 *
 * Events emitted:
 *   ml-select      { item: FileItem }
 *   ml-delete      { id: string }
 *   ml-play-start  { id: string }
 *   ml-play-stop   { id: string }
 */
@Component('media-library-item')
export class MediaLibraryItem extends LitElement {
  @property({ type: Object }) item!: FileItem;
  @property({ type: Boolean }) selected = false;
  /** Set to false by parent when another card starts playing */
  @property({ type: Boolean }) isPlayingExternal = false;
  /** Whether video should be muted (for image type) or unmuted (for video type) */
  @property({ type: Boolean }) muted = true;

  @state() private isPlaying = false;
  @state() private showCopied = false;

  private audio: HTMLAudioElement | null = null;
  private video: HTMLVideoElement | null = null;

  static styles = css`
    :host {
      display: block;
      min-width: 0;
    }
    ${unsafeCSS(style)}
  `;

  // ── Lifecycle ────────────────────────────────────────────────────────────

  updated(changed: Map<string, unknown>) {
    // When the parent clears our "playing slot", stop our audio
    if (changed.has('isPlayingExternal') && !this.isPlayingExternal && this.isPlaying) {
      this._stopAudioInternal();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopAudioInternal();
  }

  // ── Public API (called by parent via direct selector) ────────────────────

  /** Parent calls this to stop audio (e.g. when another card starts playing) */
  stopAudio() {
    this._stopAudioInternal();
  }

  // ── Private audio helpers ────────────────────────────────────────────────

  private _stopAudioInternal() {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';   // release media resource
      this.audio = null;
    }
    if (this.video) {
      this.video.pause();
      this.video.src = '';
      this.video = null;
    }
    if (this.isPlaying) {
      this.isPlaying = false;
      this._emitPlayStop();
    }
  }

  private _emitPlayStop() {
    const detail = { id: this.item.id };
    this.dispatchEvent(new CustomEvent('ml-play-stop', {
      detail,
      bubbles: true,
      composed: true,
    }));
    WidgetEvents.emit(WidgetEventTypes.ML_PLAY_STOP, detail);
  }

  private togglePlay(e: Event) {
    e.stopPropagation();

    if (this.isPlaying) {
      this._stopAudioInternal();
      return;
    }

    const url = apiClient.files.getUrl(this.item);
    const audio = new Audio(url);
    audio.volume = 0.7;

    audio.addEventListener('ended', () => {
      this.audio = null;
      this.isPlaying = false;
      this._emitPlayStop();
    });

    audio.play().catch(err => console.warn('[MediaLibraryItem] audio play failed:', err));

    this.audio = audio;
    this.isPlaying = true;

    const detail = { id: this.item.id };
    this.dispatchEvent(new CustomEvent('ml-play-start', {
      detail,
      bubbles: true,
      composed: true,
    }));
    WidgetEvents.emit(WidgetEventTypes.ML_PLAY_START, detail);
  }

  private toggleVideoPlay(e: Event, url: string) {
    e.stopPropagation();

    if (this.isPlaying) {
      this._stopAudioInternal();
      return;
    }

    const videoEl = this.shadowRoot?.querySelector('.preview-video') as HTMLVideoElement | null;
    if (!videoEl) return;

    videoEl.volume = 0.7;
    videoEl.muted = false;

    videoEl.addEventListener('ended', () => {
      this.video = null;
      this.isPlaying = false;
      this._emitPlayStop();
    }, { once: true });

    videoEl.play().catch(err => console.warn('[MediaLibraryItem] video play failed:', err));

    this.video = videoEl;
    this.isPlaying = true;

    const detail = { id: this.item.id };
    this.dispatchEvent(new CustomEvent('ml-play-start', {
      detail,
      bubbles: true,
      composed: true,
    }));
    WidgetEvents.emit(WidgetEventTypes.ML_PLAY_START, detail);
  }

  // ── Selection / delete ───────────────────────────────────────────────────

  private handleSelect() {
    const detail = { item: this.item };
    this.dispatchEvent(new CustomEvent('ml-select', {
      detail,
      bubbles: true,
      composed: true,
    }));
    WidgetEvents.emit(WidgetEventTypes.ML_SELECT, {
      id: this.item.id,
      name: this.item.originalName,
      url: apiClient.files.getUrl(this.item),
    });
  }

  private handleDelete(e: Event) {
    e.stopPropagation();
    const detail = { id: this.item.id };
    this.dispatchEvent(new CustomEvent('ml-delete', {
      detail,
      bubbles: true,
      composed: true,
    }));
    WidgetEvents.emit(WidgetEventTypes.ML_DELETE, detail);
  }
  
  private handleCopyUrl(e: Event) {
    e.stopPropagation();
    const url = apiClient.files.getUrl(this.item);
    navigator.clipboard.writeText(url).then(() => {
      this.showCopied = true;
      setTimeout(() => this.showCopied = false, 1500);
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private formatDate(ts: number) {
    return new Date(ts).toLocaleDateString();
  }

  // ── Preview rendering ────────────────────────────────────────────────────

  private renderPreview() {
    const { item } = this;
    const url = apiClient.files.getUrl(item);

    if (item.mimeType?.startsWith('image/')) {
      return html`<img src="${url}" alt="${item.originalName}" loading="lazy" />`;
    }

    if (item.mimeType?.startsWith('video/')) {
      const url = apiClient.files.getUrl(item);
      return html`
        <video
          class="preview-video"
          src="${url}"
          ?muted="${this.muted}"
          playsinline
        ></video>
        ${!this.muted ? html`
          <button
            class="play-btn"
            @click="${(e: Event) => this.toggleVideoPlay(e, url)}"
            title="${this.isPlaying ? 'Pause' : 'Play with sound'}"
          >
            ${this.isPlaying
              ? html`<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6"  y="4" width="4" height="16" rx="1"/>
                  <rect x="14" y="4" width="4" height="16" rx="1"/>
                 </svg>`
              : html`<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                 </svg>`
            }
          </button>
        ` : ''}
      `;
    }

    // Audio / unknown
    const isAudio = item.mimeType?.startsWith('audio/')
      || item.mimeType?.includes('ogg')
      || item.mimeType?.includes('wav');

    if (isAudio) {
      return html`
        <div class="audio-preview">
          <svg class="audio-icon ${this.isPlaying ? 'playing' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>

          <div class="waveform ${this.isPlaying ? 'playing' : ''}">
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
          </div>
        </div>

        <button
          class="play-btn"
          @click="${this.togglePlay}"
          title="${this.isPlaying ? 'Pause' : 'Play preview'}"
        >
          ${this.isPlaying
            ? html`<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6"  y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
               </svg>`
            : html`<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
               </svg>`
          }
        </button>
      `;
    }

    // Generic file icon
    return html`
      <svg style="width:2rem;height:2rem;color:rgba(255,255,255,0.25)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    `;
  }

  // ── Main render ──────────────────────────────────────────────────────────

  render() {
    const { item } = this;
    return html`
      <div
        class="item ${this.selected ? 'selected' : ''}"
        @click="${this.handleSelect}"
      >
        ${this.selected ? html`
          <div class="selected-badge">
            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="3.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ` : ''}

        <button class="delete-btn" @click="${this.handleDelete}" title="Delete file">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>

        <button class="copy-btn" @click="${this.handleCopyUrl}" title="Copy URL">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" 
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          ${this.showCopied ? html`<div class="copy-feedback">Copiado!</div>` : ''}
        </button>

        <div class="preview-box">
          ${this.renderPreview()}
        </div>

        <div class="item-name" title="${item.originalName}">${item.originalName}</div>
        <div class="item-meta">
          <span>${this.formatDate(item.uploadedAt)}</span>
          <span class="dot">·</span>
          <span>${item.sizeFormatted}</span>
        </div>
      </div>
    `;
  }
}
