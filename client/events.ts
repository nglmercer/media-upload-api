/**
 * Global Event Emitter using window.postMessage
 * 
 * Provides a unified event channel for all widget components.
 * Events are broadcast via window.postMessage and can be
 * intercepted/debugged from the browser console or parent window.
 * 
 * @example
 * // Listen for events from anywhere
 * WidgetEvents.on('ml:select', (detail) => {
 *   console.log('Item selected:', detail);
 * });
 * 
 * // Emit events
 * WidgetEvents.emit('ml:select', { id: '123', name: 'test.png' });
 * 
 * // Debug: in browser console
 * window.addEventListener('message', (e) => console.log(e.data));
 */

export type EventCallback<T = unknown> = (detail: T) => void;

const EVENT_PREFIX = 'widget:';

export const WidgetEvents = {
  /**
   * Subscribe to an event
   */
  on<T = unknown>(event: string, callback: EventCallback<T>): () => void {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === `${EVENT_PREFIX}${event}`) {
        callback(e.data.detail as T);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  },

  /**
   * Subscribe to an event once
   */
  once<T = unknown>(event: string, callback: EventCallback<T>): void {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === `${EVENT_PREFIX}${event}`) {
        callback(e.data.detail as T);
        window.removeEventListener('message', handler);
      }
    };
    window.addEventListener('message', handler);
  },

  /**
   * Emit an event to all listeners
   */
  emit<T = unknown>(event: string, detail: T): void {
    window.postMessage({
      type: `${EVENT_PREFIX}${event}`,
      detail,
    }, '*');
  },

  /**
   * Emit an event and wait for responses (request-response pattern)
   */
  emitAndWait<T = unknown, R = unknown>(event: string, detail: T, timeout = 5000): Promise<R> {
    const requestId = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Event ${event} timed out`));
      }, timeout);

      const responses: R[] = [];
      let settled = false;

      const handler = (e: MessageEvent) => {
        if (e.data?.type === `${EVENT_PREFIX}${event}:response` && 
            e.data?.requestId === requestId) {
          responses.push(e.data.detail as R);
        }
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        window.removeEventListener('message', handler);
      };

      window.addEventListener('message', handler);
      
      window.postMessage({
        type: `${EVENT_PREFIX}${event}`,
        requestId,
        detail,
      }, '*');

      // Resolve after first response or timeout
      setTimeout(() => {
        if (responses.length > 0) {
          cleanup();
          resolve(responses[0]);
        }
      }, 100);
    });
  },

  /**
   * Subscribe to all widget events (debugging)
   */
  onAny(callback: (event: string, detail: unknown) => void): () => void {
    const handler = (e: MessageEvent) => {
      if (e.data?.type?.startsWith(EVENT_PREFIX)) {
        const event = e.data.type.slice(EVENT_PREFIX.length);
        callback(event, e.data.detail);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  },
};

// Predefined event types for type safety
export const WidgetEventTypes = {
  // Media Library Item events
  ML_SELECT: 'ml:select',
  ML_DELETE: 'ml:delete',
  ML_PLAY_START: 'ml:play-start',
  ML_PLAY_STOP: 'ml:play-stop',
  
  // Media Library container events
  ML_OPEN: 'ml:open',
  ML_CLOSE: 'ml:close',
  ML_SELECT_FINAL: 'ml:select-final',
  ML_UPLOAD_START: 'ml:upload-start',
  ML_UPLOAD_PROGRESS: 'ml:upload-progress',
  ML_UPLOAD_COMPLETE: 'ml:upload-complete',
  ML_UPLOAD_ERROR: 'ml:upload-error',
  
  // Dialog events
  DIALOG_OPEN: 'dialog:open',
  DIALOG_CLOSE: 'dialog:close',
  DIALOG_CONFIRM: 'dialog:confirm',
  DIALOG_CANCEL: 'dialog:cancel',
  
  // General widget events
  WIDGET_READY: 'widget:ready',
  WIDGET_ERROR: 'widget:error',
  LOCALE_CHANGE: 'locale:change',
} as const;

// Type exports
export type WidgetEventType = typeof WidgetEventTypes[keyof typeof WidgetEventTypes];

export interface MLSelectDetail {
  item: unknown;
  id: string;
  name: string;
  url: string;
}

export interface MLDeleteDetail {
  id: string;
}

export interface MLPlayDetail {
  id: string;
}

export interface MLSelectFinalDetail {
  url: string;
  name: string;
}

export interface MLUploadProgressDetail {
  fileName: string;
  progress: number;
  completed: boolean;
  error?: string;
}

export interface DialogCloseDetail {
  result: unknown;
  action: 'confirm' | 'cancel' | 'close';
}