import { css } from 'lit';

export const mediaLibraryStyles = css`
  :host {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    backdrop-filter: blur(4px);
  }

  /* ── Modal Shell ─────────────────────────────────── */
  .modal {
    background: linear-gradient(145deg, #1a1a22 0%, #15151e 100%);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 1rem;
    width: 100%;
    max-width: 58rem;
    display: flex;
    flex-direction: column;
    max-height: 92vh;
    color: white;
    box-shadow: 0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04);
    overflow: hidden;
  }
  .modal.with-details {
    max-width: 72rem;
  }

  /* ── Header ──────────────────────────────────────── */
  .header {
    padding: 1.25rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    background: rgba(255,255,255,0.02);
    flex-shrink: 0;
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .header h2 {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0;
    background: linear-gradient(135deg, #fff 0%, #c084fc 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .header-count {
    font-size: 0.75rem;
    color: #6b7280;
    background: rgba(255,255,255,0.06);
    padding: 0.2rem 0.5rem;
    border-radius: 0.25rem;
  }
  .header-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .view-toggle-btn {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
    color: #6b7280;
    cursor: pointer;
    border-radius: 0.375rem;
    padding: 0.375rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, color 0.15s;
  }
  .view-toggle-btn:hover { background: rgba(255,255,255,0.12); color: white; }
  .view-toggle-btn.active { background: rgba(145,70,255,0.2); color: #c084fc; border-color: rgba(145,70,255,0.3); }
  .header-close {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
    color: #9ca3af;
    cursor: pointer;
    border-radius: 0.375rem;
    padding: 0.375rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, color 0.15s;
  }
  .header-close:hover { background: rgba(255,255,255,0.12); color: white; }

  /* ── Toolbar ─────────────────────────────────────── */
  .toolbar {
    padding: 1rem 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .search-wrapper {
    position: relative;
    flex: 1;
    min-width: 140px;
  }
  .search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #6b7280;
    pointer-events: none;
    width: 1rem;
    height: 1rem;
  }
  .search-input {
    width: 100%;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem 0.5rem 2.25rem;
    color: white;
    font-size: 0.875rem;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s, background 0.15s;
  }
  .search-input::placeholder { color: #6b7280; }
  .search-input:focus { border-color: #a970ff; background: rgba(169,112,255,0.06); }

  .filter-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .sort-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .sort-container label { font-size: 0.8rem; font-weight: 600; color: #9ca3af; white-space: nowrap; }
  .sort-select {
    background: rgba(255,255,255,0.9);
    color: black;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 0.5rem;
    padding: 0.5rem 0.625rem;
    font-size: 0.8rem;
    outline: none;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .sort-select:focus { border-color: #a970ff; }

  /* ── Storage / Upload row ─────────────────────────── */
  .stats-bar {
    padding: 0.75rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    flex-shrink: 0;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .storage-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .storage-label { font-size: 0.8rem; font-weight: 600; color: #c084fc; }
  .storage-bar-wrap {
    width: 120px;
    height: 4px;
    background: rgba(255,255,255,0.1);
    border-radius: 2px;
    overflow: hidden;
  }
  .storage-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #9146ff, #c084fc);
    border-radius: 2px;
    transition: width 0.4s ease;
  }
  .storage-text { font-size: 0.75rem; color: #9ca3af; }

  .btn-upload {
    background: linear-gradient(135deg, #9146ff, #7c3aed);
    border: none;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    transition: opacity 0.15s, transform 0.1s;
    white-space: nowrap;
  }
  .btn-upload:hover { opacity: 0.9; transform: translateY(-1px); }
  .btn-upload.disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  /* ── Content / Grid ──────────────────────────────── */
  .content {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem 1.5rem;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.12) transparent;
  }
  .content::-webkit-scrollbar { width: 6px; }
  .content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }

  .content-split {
    display: flex;
    gap: 1.5rem;
    overflow: hidden;
  }
  .content-main {
    flex: 1;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.12) transparent;
  }
  .content-main::-webkit-scrollbar { width: 6px; }
  .content-main::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    position: relative;
  }
  @media (max-width: 600px) { .grid { grid-template-columns: repeat(2, 1fr); } }

  /* ── Footer ──────────────────────────────────────── */
  .footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid rgba(255,255,255,0.07);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    background: rgba(255,255,255,0.02);
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .pagination { display: flex; gap: 0.375rem; align-items: center; }
  .page-btn {
    min-width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.375rem;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.08);
    color: #9ca3af;
    cursor: pointer;
    font-size: 0.8rem;
    padding: 0 0.375rem;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .page-btn:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: white; border-color: rgba(255,255,255,0.15); }
  .page-btn.active { background: #9146ff; color: white; border-color: #9146ff; }
  .page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .page-info { font-size: 0.75rem; color: #6b7280; padding: 0 0.25rem; }

  .footer-actions { display: flex; gap: 0.625rem; align-items: center; }
  .btn-cancel {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.1);
    color: #9ca3af;
    font-weight: 600;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background 0.15s, color 0.15s;
  }
  .btn-cancel:hover { background: rgba(255,255,255,0.08); color: white; }
  .btn-add {
    background: linear-gradient(135deg, #9146FF, #7c3aed);
    border: none;
    color: white;
    font-weight: 700;
    padding: 0.5rem 1.25rem;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    transition: opacity 0.15s, transform 0.1s;
  }
  .btn-add:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
  .btn-add:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  /* ── States ───────────────────────────────────────── */
  .loader {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 4rem;
    color: #6b7280;
    flex-direction: column;
    gap: 1rem;
  }
  .spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid rgba(255,255,255,0.08);
    border-top-color: #9146ff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .empty-state {
    display: flex;
    justify-content: center;
    padding: 4rem;
    color: #6b7280;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    text-align: center;
  }
  .empty-state svg { opacity: 0.3; }
  .empty-state p { margin: 0; font-size: 0.875rem; }
  .empty-state small { color: #4b5563; font-size: 0.75rem; }

  .error-msg {
    color: #f87171;
    background: rgba(248,113,113,0.08);
    border: 1px solid rgba(248,113,113,0.2);
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  /* ── Drag and Drop ───────────────────────────────────── */
  .modal.dragging {
    pointer-events: none;
  }
  .modal.dragging > * {
    pointer-events: auto;
  }

  .drop-overlay {
    position: absolute;
    inset: 0;
    background: rgba(145, 70, 255, 0.15);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    border: 3px dashed #9146ff;
    border-radius: 0.75rem;
    margin: 0.25rem;
    animation: pulse-border 1.5s ease-in-out infinite;
  }
  @keyframes pulse-border {
    0%, 100% { border-color: #9146ff; }
    50% { border-color: #c084fc; }
  }
  .drop-overlay-content {
    text-align: center;
    color: #c084fc;
  }
  .drop-overlay-content svg {
    margin-bottom: 0.75rem;
    animation: bounce 1s ease-in-out infinite;
  }
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  .drop-overlay-content h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1.25rem;
    font-weight: 700;
  }
  .drop-overlay-content p {
    margin: 0;
    font-size: 0.875rem;
    color: #9ca3af;
  }

  /* ── Upload Progress ──────────────────────────────────── */
  .upload-progress {
    background: rgba(255,255,255,0.03);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    padding: 0.75rem 1.5rem;
    max-height: 200px;
    overflow-y: auto;
  }
  .upload-progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  .upload-progress-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: #c084fc;
  }
  .upload-progress-error {
    font-size: 0.75rem;
    color: #f87171;
  }
  .upload-progress-list {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  .upload-item {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.5rem 0.625rem;
    background: rgba(255,255,255,0.04);
    border-radius: 0.375rem;
    border: 1px solid rgba(255,255,255,0.06);
  }
  .upload-item.completed {
    border-color: rgba(34, 197, 94, 0.3);
    background: rgba(34, 197, 94, 0.05);
  }
  .upload-item.error {
    border-color: rgba(248, 113, 113, 0.3);
    background: rgba(248, 113, 113, 0.05);
  }
  .upload-item-icon {
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #9ca3af;
  }
  .upload-item.completed .upload-item-icon {
    color: #22c55e;
  }
  .upload-item.error .upload-item-icon {
    color: #f87171;
  }
  .upload-item-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }
  .upload-item-name {
    font-size: 0.8rem;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .upload-item-size {
    font-size: 0.7rem;
    color: #6b7280;
  }
  .upload-item-error {
    font-size: 0.7rem;
    color: #f87171;
  }
  .upload-item-progress {
    width: 60px;
    height: 4px;
    background: rgba(255,255,255,0.1);
    border-radius: 2px;
    overflow: hidden;
    flex-shrink: 0;
  }
  .upload-item-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #9146ff, #c084fc);
    border-radius: 2px;
    transition: width 0.3s ease;
  }
`;
