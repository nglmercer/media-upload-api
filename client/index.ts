import { html, LitElement } from 'lit';
import { Component, property, state } from './components/litcomponents';
import { LocalizeController } from './locales/locales';
import { createBrowserClient } from '../src/client/index'
import type { FileItem,FileTypes } from '../src/client/index';
import { FileCategory } from '../src/client/index';
import { confirm } from './components/alerts';
import { mediaLibraryStyles } from './styles';
// Register sub-component
import './components/itemlibrary';
import type { MediaLibraryItem } from './components/itemlibrary';
import { resolveServiceUrl, normalizeMediaUrl } from './config';
import type { MediaUploadClient } from '../src/client/index';
import { WidgetEvents, WidgetEventTypes } from './events';

@Component('media-library')
export class MediaLibrary extends LitElement {
  // ── Public API ──────────────────────────────────────────────────────────
  /** Filter files by type shown in the grid */
  @property({ type: String }) type: 'image' | 'sound' | 'video' = 'image';

  /**
   * The currently-selected URL in the parent (used to pre-highlight the
   * matching item when the library first opens).
   */
  @property({ type: String }) selectedUrl: string | null = null;

  /** Callback – called when user confirms selection (url, name) */
  @property({ attribute: false }) onSelect: (url: string, name: string) => void = () => {};

  /** Callback – called when the modal is closed without selecting */
  @property({ attribute: false }) onClose: () => void = () => {};

  // ── Internal state ──────────────────────────────────────────────────────
  @state() private selectedItem: string | null = null;
  @state() private currentPage = 1;
  @state() private sortBy: 'date' | 'name' | 'size' = 'date';
  @state() private searchQuery = '';
  @state() private items: FileItem[] = [];
  @state() private loading = true;
  @state() private uploading = false;
  @state() private error: string | null = null;
  @state() private quotaUsed = 0;
  @state() private quotaMax = 0;
  @state() private isDragging = false;
  @state() private uploadQueue: { file: File; progress: number; error?: string; completed: boolean }[] = [];
  private apiClient!: MediaUploadClient;

  /**
   * ID of the item whose audio is currently playing.
   * Kept here (not in the child) so the parent can stop the old
   * player when a new card is selected — without needing queryAll
   * across shadow boundaries.
   */
  @state() private playingItemId: string | null = null;

  private readonly ITEMS_PER_PAGE = 6;
  private _localize = new LocalizeController(this);

  // ── Styles ──────────────────────────────────────────────────────────────
  static styles = mediaLibraryStyles;

  // ── Lifecycle ───────────────────────────────────────────────────────────
  connectedCallback() {
    super.connectedCallback();
    const baseUrl = resolveServiceUrl('media-upload-api');
    const token = localStorage.getItem('session_id') || undefined;
    this.apiClient = createBrowserClient({ baseUrl, token });
    this.fetchFiles();
    this.fetchQuota();

    // Emit global open event
    WidgetEvents.emit(WidgetEventTypes.ML_OPEN, { type: this.type });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Emit global close event
    WidgetEvents.emit(WidgetEventTypes.ML_CLOSE, {});
  }

  /**
   * Once items arrive, try to sync the pre-selection from `selectedUrl`.
   * We only do this once (when `selectedItem` is still null).
   */
  updated(changedProperties: Map<string, unknown>) {
    const itemsArrived = changedProperties.has('items') && this.items.length > 0;
    const urlChanged   = changedProperties.has('selectedUrl');

    if ((itemsArrived || urlChanged) && this.selectedUrl && !this.selectedItem) {
      this._syncSelectionFromUrl();
    }
  }

  private _syncSelectionFromUrl() {
    const match = this.items.find(f => this.apiClient.files.getUrl(f) === this.selectedUrl);
    if (!match) return;

    this.selectedItem = match.id;

    // Jump to the page that contains the pre-selected item
    const ordered = this._filteredAndSorted();
    const idx = ordered.findIndex(i => i.id === match.id);
    if (idx >= 0) {
      const targetPage = Math.floor(idx / this.ITEMS_PER_PAGE) + 1;
      if (this.currentPage !== targetPage) this.currentPage = targetPage;
    }
  }

  // ── Data fetching ───────────────────────────────────────────────────────
  private async fetchFiles() {
    this.loading = true;
    this.error = null;
    try {
      const result = await this.apiClient.files.list({ pageSize: 100 });
      this.items = result.files.filter(f => {
        if (!f.mimeType) return false;
        if (this.type === 'image') {
          return f.mimeType.startsWith('image/');
        }
        if (this.type === 'sound') {
          return f.mimeType.startsWith('audio/') ||
                 f.mimeType.includes('ogg') ||
                 f.mimeType.includes('wav');
        }
        if (this.type === 'video') {
          return f.mimeType.startsWith('video/');
        }
        return true;
      });
    } catch (err: unknown) {
      console.error('[MediaLibrary] fetchFiles:', err);
      this.error = err instanceof Error ? err.message : 'Error fetching files';
    } finally {
      this.loading = false;
    }
  }

  private async fetchQuota() {
    try {
      const q = await this.apiClient.quota.get();
      this.quotaUsed = q.usedStorage;
      this.quotaMax  = q.maxStorage;
    } catch {
      // Non-fatal — hide quota bar gracefully
    }
  }

  // ── Event handlers ──────────────────────────────────────────────────────
  private handleDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = true;
  }

  private handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the modal entirely
    const rect = this.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      this.isDragging = false;
    }
  }

  private handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  private handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;

    const files = e.dataTransfer?.files;
    if (!files?.length) return;

    this.processFiles(Array.from(files));
  }

  private async processFiles(files: File[]) {
    if (!files.length) return;

    // Initialize upload queue with all files
    this.uploadQueue = files.map(file => ({
      file,
      progress: 0,
      completed: false
    }));

    this.uploading = true;
    this.error = null;

    WidgetEvents.emit(WidgetEventTypes.ML_UPLOAD_START, { count: files.length });

    // Upload files in parallel with progress tracking
    const uploadPromises = files.map(async (file, index) => {
      try {
        let category: FileTypes = FileCategory.OTHER;
        if (file.type.startsWith('image/')) category = FileCategory.IMAGE;
        else if (file.type.startsWith('video/')) category = FileCategory.VIDEO;
        else if (file.type.startsWith('audio/')) category = FileCategory.AUDIO;

        // Simulate progress updates (the actual API might handle this differently)
        this.uploadQueue = this.uploadQueue.map((item, i) =>
          i === index ? { ...item, progress: 50 } : item
        );
        WidgetEvents.emit(WidgetEventTypes.ML_UPLOAD_PROGRESS, { fileName: file.name, progress: 50, completed: false });

        await this.apiClient.files.upload(file, { category });

        this.uploadQueue = this.uploadQueue.map((item, i) =>
          i === index ? { ...item, progress: 100, completed: true } : item
        );
        WidgetEvents.emit(WidgetEventTypes.ML_UPLOAD_PROGRESS, { fileName: file.name, progress: 100, completed: true });
      } catch (err: any) {
        this.uploadQueue = this.uploadQueue.map((item, i) =>
          i === index ? { ...item, error: err.message || 'Upload failed', progress: 0 } : item
        );
        WidgetEvents.emit(WidgetEventTypes.ML_UPLOAD_ERROR, { fileName: file.name, error: err.message });
      }
    });

    try {
      await Promise.all(uploadPromises);
      await Promise.all([this.fetchFiles(), this.fetchQuota()]);
      WidgetEvents.emit(WidgetEventTypes.ML_UPLOAD_COMPLETE, { count: files.length });
    } catch (err: any) {
      this.error = err.message ?? 'Error uploading files';
      WidgetEvents.emit(WidgetEventTypes.ML_UPLOAD_ERROR, { fileName: '', error: err.message });
    } finally {
      // Clear queue after a short delay to show completion
      setTimeout(() => {
        this.uploadQueue = [];
        this.uploading = false;
      }, 1500);
    }
  }

  private async handleUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files?.length) return;

    const files = Array.from(input.files);
    this.processFiles(files);
    input.value = ''; // Reset input to allow re-uploading same file
  }

  private async handleDelete(e: CustomEvent<{ id: string }>) {
    const confirmed = await confirm('Are you sure you want to delete this file?');
    if (!confirmed) return;
    try {
      await this.apiClient.files.delete(e.detail.id);
      if (this.selectedItem === e.detail.id) this.selectedItem = null;
      if (this.playingItemId === e.detail.id) this.playingItemId = null;
      await Promise.all([this.fetchFiles(), this.fetchQuota()]);
    } catch (err: any) {
      alert('Error deleting file: ' + err.message);
      WidgetEvents.emit(WidgetEventTypes.ML_UPLOAD_ERROR, { fileName: '', error: err.message });
    }
  }

  /**
   * Handle item selection from ml-select event.
   * Signals the previously-playing item to stop via property change —
   * MediaLibraryItem watches `playingExternal` to stop itself.
   * This avoids queryAll across shadow DOM boundaries.
   */
  private handleItemSelect(e: CustomEvent<{ item: FileItem }>) {
    const { item } = e.detail;
    this.selectedItem = item.id;
  }

  /**
   * Audio state is managed inside MediaLibraryItem.
   * The parent tracks which item is "playing" via this event so it can
   * tell previously-playing cards to stop when a new one starts.
   */
  private handleItemPlayStart(e: CustomEvent<{ id: string }>) {
    if (this.playingItemId && this.playingItemId !== e.detail.id) {
      // Find the old playing element and stop it via a custom event
      const old = this.shadowRoot?.querySelector(
        `media-library-item[data-id="${this.playingItemId}"]`
      ) as MediaLibraryItem | null;
      old?.stopAudio();
    }
    this.playingItemId = e.detail.id;
  }

  private handleItemPlayStop(e: CustomEvent<{ id: string }>) {
    if (this.playingItemId === e.detail.id) {
      this.playingItemId = null;
    }
  }

  private handleConfirmSelection() {
    const selected = this.items.find(i => i.id === this.selectedItem);
    if (!selected) return;

    const url  = normalizeMediaUrl(this.apiClient.files.getUrl(selected)) || '';
    const name = selected.originalName;

    this.onSelect(url, name);
    this.dispatchEvent(new CustomEvent('media-select', {
      detail: { url, name, selected },
      bubbles: true,
      composed: true,
    }));
    WidgetEvents.emit(WidgetEventTypes.ML_SELECT_FINAL, { url, name, selected });
  }

  private handleClose() {
    this.onClose();
    this.dispatchEvent(new CustomEvent('media-close', {
      bubbles: true,
      composed: true,
    }));
    WidgetEvents.emit(WidgetEventTypes.ML_CLOSE, {});
  }

  // ── Computed (pure, no side-effects) ────────────────────────────────────
  private _filteredAndSorted(): FileItem[] {
    const q = this.searchQuery.toLowerCase().trim();
    const filtered = q
      ? this.items.filter(f => f.originalName.toLowerCase().includes(q))
      : this.items;

    return [...filtered].sort((a, b) => {
      switch (this.sortBy) {
        case 'name': return a.originalName.localeCompare(b.originalName);
        case 'size': return b.size - a.size;
        default:     return b.uploadedAt - a.uploadedAt;
      }
    });
  }

  private get storagePercent(): number {
    return this.quotaMax > 0 ? Math.min((this.quotaUsed / this.quotaMax) * 100, 100) : 0;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 MB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  // ── Render helpers ──────────────────────────────────────────────────────
  private renderDropOverlay() {
    return html`
      <div class="drop-overlay">
        <div class="drop-overlay-content">
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
          <h3>Drop files here</h3>
          <p>Release to upload multiple files</p>
        </div>
      </div>
    `;
  }

  private renderHeader() {
    return html`
      <div class="header">
        <h2>${this._localize.t('media.resourceLibrary')}</h2>
        <button class="header-close" @click="${this.handleClose}" title="Close">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;
  }

  private renderToolbar() {
    return html`
      <div class="toolbar">
        <div class="search-wrapper">
          <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            class="search-input"
            type="text"
            placeholder="${this._localize.t('media.search') || 'Search files...'}"
            .value="${this.searchQuery}"
            @input="${(e: Event) => {
              this.searchQuery = (e.target as HTMLInputElement).value;
              this.currentPage = 1;
            }}"
          />
        </div>

        <div class="sort-container">
          <label>${this._localize.t('media.sortBy')}</label>
          <select
            class="sort-select"
            .value="${this.sortBy}"
            @change="${(e: Event) => {
              this.sortBy = (e.target as HTMLSelectElement).value as 'date' | 'name' | 'size';
              this.currentPage = 1;
            }}"
          >
            <option value="date">${this._localize.t('media.dateAdded')}</option>
            <option value="name">${this._localize.t('media.name')}</option>
            <option value="size">${this._localize.t('media.size')}</option>
          </select>
        </div>
      </div>
    `;
  }

  private renderStatsBar() {
    const hasUploads = this.uploadQueue.length > 0;
    const completedCount = this.uploadQueue.filter(u => u.completed).length;
    const errorCount = this.uploadQueue.filter(u => u.error).length;

    return html`
      <div class="stats-bar">
        <div class="storage-info">
          <span class="storage-label">${this._localize.t('media.storage')}</span>
          ${this.quotaMax > 0 ? html`
            <div class="storage-bar-wrap">
              <div class="storage-bar-fill" style="width: ${this.storagePercent}%"></div>
            </div>
            <span class="storage-text">${this.formatBytes(this.quotaUsed)} / ${this.formatBytes(this.quotaMax)}</span>
          ` : ''}
        </div>

        <label class="btn-upload ${this.uploading ? 'disabled' : ''}">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
          </svg>
          ${this.uploading
            ? (this._localize.t('media.uploading') || `Uploading ${completedCount}/${this.uploadQueue.length}...`)
            : this._localize.t('media.uploadFile')}
          <input
            type="file"
            style="display:none"
            @change="${this.handleUpload}"
            accept="${this.type === 'sound' ? 'audio/*,.ogg,.wav,.mp3,video/*' : 'image/*,video/*'}"
            ?disabled="${this.uploading}"
            multiple
          />
        </label>
      </div>
      ${hasUploads ? this.renderUploadProgress() : ''}
    `;
  }

  private renderUploadProgress() {
    return html`
      <div class="upload-progress">
        <div class="upload-progress-header">
          <span class="upload-progress-title">
            ${this.uploadQueue.some(u => u.completed) 
              ? `Uploaded ${this.uploadQueue.filter(u => u.completed).length} of ${this.uploadQueue.length} files`
              : `Uploading ${this.uploadQueue.length} file(s)...`}
          </span>
          ${this.uploadQueue.some(u => u.error) 
            ? html`<span class="upload-progress-error">${this.uploadQueue.filter(u => u.error).length} failed</span>`
            : ''}
        </div>
        <div class="upload-progress-list">
          ${this.uploadQueue.map((item, index) => html`
            <div class="upload-item ${item.completed ? 'completed' : ''} ${item.error ? 'error' : ''}">
              <div class="upload-item-icon">
                ${item.completed ? html`
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                ` : item.error ? html`
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                ` : html`
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                  </svg>
                `}
              </div>
              <div class="upload-item-info">
                <span class="upload-item-name">${item.file.name}</span>
                ${item.error 
                  ? html`<span class="upload-item-error">${item.error}</span>`
                  : item.completed
                    ? html`<span class="upload-item-size">${this.formatBytes(item.file.size)}</span>`
                    : html`<span class="upload-item-size">${this.formatBytes(item.file.size)}</span>`
                }
              </div>
              ${!item.completed && !item.error ? html`
                <div class="upload-item-progress">
                  <div class="upload-item-progress-fill" style="width: ${item.progress}%"></div>
                </div>
              ` : ''}
            </div>
          `)}
        </div>
      </div>
    `;
  }

  private renderGrid(currentItems: FileItem[]) {
    if (this.loading) {
      return html`
        <div class="loader">
          <div class="spinner"></div>
          <span>${this._localize.t('preview.loading')}</span>
        </div>
      `;
    }

    if (currentItems.length === 0) {
      const hasSearch = this.searchQuery.trim().length > 0;
      return html`
        <div class="empty-state">
          <svg style="width:3rem;height:3rem" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <p>${hasSearch ? 'No files match your search.' : 'No files uploaded yet.'}</p>
          ${!hasSearch ? html`<small>Upload your first file using the button above.</small>` : ''}
        </div>
      `;
    }

    return html`
      <div class="grid">
        ${currentItems.map(item => html`
          <media-library-item
            data-id="${item.id}"
            .item="${item}"
            .selected="${this.selectedItem === item.id}"
            .isPlayingExternal="${this.playingItemId === item.id}"
            .muted="${this.type === 'image'}"
            @ml-select="${this.handleItemSelect}"
            @ml-delete="${this.handleDelete}"
            @ml-play-start="${this.handleItemPlayStart}"
            @ml-play-stop="${this.handleItemPlayStop}"
          ></media-library-item>
        `)}
      </div>
    `;
  }

  private renderPagination(totalPages: number) {
    if (totalPages <= 1) return html``;

    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    return html`
      <div class="pagination">
        <button
          class="page-btn"
          ?disabled="${this.currentPage === 1}"
          @click="${() => { this.currentPage--; }}"
        >&lsaquo;</button>

        ${pages.map(p => html`
          <button
            class="page-btn ${this.currentPage === p ? 'active' : ''}"
            @click="${() => { this.currentPage = p; }}"
          >${p}</button>
        `)}

        <button
          class="page-btn"
          ?disabled="${this.currentPage === totalPages}"
          @click="${() => { this.currentPage++; }}"
        >&rsaquo;</button>

        <span class="page-info">${this.currentPage} / ${totalPages}</span>
      </div>
    `;
  }

  // ── Main render (NO side-effects) ───────────────────────────────────────
  render() {
    const allItems   = this._filteredAndSorted();
    const totalPages = Math.max(1, Math.ceil(allItems.length / this.ITEMS_PER_PAGE));
    // Clamp page safely — use Math.min, not mutation inside render
    const safePage   = Math.min(this.currentPage, totalPages);
    const start      = (safePage - 1) * this.ITEMS_PER_PAGE;
    const pageItems  = allItems.slice(start, start + this.ITEMS_PER_PAGE);

    return html`
      <div 
        class="modal ${this.isDragging ? 'dragging' : ''}"
        @dragenter="${this.handleDragEnter}"
        @dragleave="${this.handleDragLeave}"
        @dragover="${this.handleDragOver}"
        @drop="${this.handleDrop}"
      >
        ${this.isDragging ? this.renderDropOverlay() : ''}
        ${this.renderHeader()}
        ${this.renderToolbar()}
        ${this.renderStatsBar()}

        <div class="content">
          ${this.error ? html`<div class="error-msg">${this.error}</div>` : ''}
          ${this.renderGrid(pageItems)}
        </div>

        <div class="footer">
          ${this.renderPagination(totalPages)}

          <div class="footer-actions">
            <button class="btn-cancel" @click="${this.handleClose}">
              ${this._localize.t('app.cancel')}
            </button>
            <button
              class="btn-add"
              ?disabled="${!this.selectedItem}"
              @click="${this.handleConfirmSelection}"
            >
              ${this._localize.t('media.addToAlerts')}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}
