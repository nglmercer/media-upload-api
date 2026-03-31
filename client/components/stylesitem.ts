import { css } from "lit";

export const style = css`
  .item {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 0.625rem;
  padding: 0.875rem;
  cursor: pointer;
  border: 2px solid transparent;
  transition:
    border-color 0.2s,
    background 0.2s,
    box-shadow 0.2s;
  position: relative;
  height: 100%;
  box-sizing: border-box;
  min-width: 0; /* Fix expansion by long names */
}
.item.selected {
  border-color: #a970ff;
  background: rgba(169, 112, 255, 0.08);
  box-shadow: 0 0 0 3px rgba(169, 112, 255, 0.2);
}
.item:hover:not(.selected) {
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.06);
}

/* ── Preview box ──────────────────────────────────── */
.preview-box {
  aspect-ratio: 16/9;
  background: #0d0d14;
  border-radius: 0.375rem;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}
.preview-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.preview-box video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.preview-box .preview-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* ── Audio card ──────────────────────────────────── */
.audio-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  width: 100%;
  height: 100%;
  padding: 0.5rem;
  box-sizing: border-box;
}
.audio-icon {
  width: 2.25rem;
  height: 2.25rem;
  color: rgba(255, 255, 255, 0.3);
  transition: color 0.2s;
}
.audio-icon.playing {
  color: #a970ff;
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(0.94);
  }
}

/* Waveform bars */
.waveform {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 20px;
}
.wave-bar {
  width: 3px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  height: 5px;
}
.waveform.playing .wave-bar {
  background: #a970ff;
  animation: wave 0.8s ease-in-out infinite;
}
.wave-bar:nth-child(1) {
  animation-delay: 0s;
}
.wave-bar:nth-child(2) {
  animation-delay: 0.1s;
}
.wave-bar:nth-child(3) {
  animation-delay: 0.2s;
}
.wave-bar:nth-child(4) {
  animation-delay: 0.3s;
}
.wave-bar:nth-child(5) {
  animation-delay: 0.15s;
}
@keyframes wave {
  0%,
  100% {
    height: 4px;
  }
  50% {
    height: 16px;
  }
}

/* Play / pause floating button */
.play-btn {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  background: rgba(145, 70, 255, 0.9);
  border: none;
  border-radius: 50%;
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  transition:
    background 0.15s,
    transform 0.1s;
  z-index: 5;
  padding: 0;
}
.play-btn:hover {
  background: #a970ff;
  transform: scale(1.1);
}

/* Delete button */
.delete-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(239, 68, 68, 0.8);
  color: white;
  border: none;
  border-radius: 0.25rem;
  width: 1.5rem;
  height: 1.5rem;
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  padding: 0;
  transition: background 0.15s;
}
.delete-btn:hover {
  background: rgb(239, 68, 68);
}
.item:hover .delete-btn {
  display: flex;
}

/* Selected check badge */
.selected-badge {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  background: #9146ff;
  border-radius: 50%;
  width: 1.125rem;
  height: 1.125rem;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

/* Item info */
.item-name {
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: rgba(255, 255, 255, 0.9);
}
.item-meta {
  font-size: 0.7rem;
  color: #6b7280;
  margin-top: 0.2rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}
.item-meta .dot {
  opacity: 0.4;
}
`;