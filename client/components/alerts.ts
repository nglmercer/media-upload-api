/**
 * Dialog Module
 * 
 * Provides async dialog functions (alert, confirm, prompt, modal)
 * that work with the AppDialog web component.
 * 
 * These functions replace native browser dialogs with customizable
 * dialog components that support theming and localization.
 * 
 * @example
 * ```typescript
 * // Show an alert
 * await alert('Operation complete');
 * 
 * // Show a confirmation
 * const confirmed = await confirm('Are you sure?');
 * 
 * // Show a prompt
 * const name = await prompt('What is your name?', { 
 *   defaultValue: 'Guest' 
 * });
 * ```
 * 
 * @module lib/dialog
 */

import { DialogOptions, DialogTheme, DialogResult,AppDialog } from './Dialog';
console.log(AppDialog)
/**
 * Module-level state
 */

/** Cached reference to the dialog element */
let dialogElement: AppDialog | null = null;

/** Default theme for new dialogs */
let defaultTheme: DialogTheme = 'dark';

/**
 * Get or create the dialog element
 * 
 * Ensures the AppDialog component exists in the DOM.
 * Creates it lazily on first use.
 * 
 * @returns The AppDialog element
 */
function getDialogElement(): AppDialog {
  if (!dialogElement) {
    dialogElement = document.createElement('app-dialog') as AppDialog;
    document.body.appendChild(dialogElement);
  }
  return dialogElement;
}

/**
 * Show an alert dialog
 * 
 * Async replacement for window.alert() with customizable options.
 * Displays a message with a single OK button.
 * 
 * @param message - The message to display
 * @param options - Optional dialog configuration
 * @returns Promise that resolves when dialog closes
 * 
 * @example
 * ```typescript
 * await alert('Your changes have been saved');
 * ```
 */
export async function alert(
  message: string,
  options?: Partial<DialogOptions>
) {
  const dialog = getDialogElement();
  const result = await dialog.open({
    message,
    type: 'alert',
    title: options?.title,
    theme: options?.theme || 'dark',
    confirmText: options?.confirmText || 'OK',
    showClose: options?.showClose ?? false,
    closeOnOverlayClick: options?.closeOnOverlayClick ?? false,
    closeOnEscape: options?.closeOnEscape ?? true,
    danger: options?.danger || false,
    ...options,
  });
  
  // For alert, we just wait for it to close
  return result;
}

/**
 * Show a confirmation dialog
 * 
 * Async replacement for window.confirm() with customizable options.
 * Displays a message with Confirm and Cancel buttons.
 * 
 * @param message - The message to display
 * @param options - Optional dialog configuration
 * @returns true if confirmed, false if cancelled
 * 
 * @example
 * ```typescript
 * const deleteIt = await confirm('Delete this item?');
 * if (deleteIt) { /* do deletion *\/ }
 * ```
 */
export async function confirm(
  message: string,
  options?: Partial<DialogOptions>
): Promise<boolean> {
  const dialog = getDialogElement();
  const result = await dialog.open({
    message,
    type: 'confirm',
    title: options?.title,
    theme: options?.theme || 'dark',
    confirmText: options?.confirmText,
    cancelText: options?.cancelText,
    showClose: options?.showClose ?? true,
    closeOnOverlayClick: options?.closeOnOverlayClick ?? true,
    closeOnEscape: options?.closeOnEscape ?? true,
    danger: options?.danger || false,
    ...options,
  });
  
  return result === true;
}

/**
 * Show a prompt dialog
 * 
 * Async replacement for window.prompt() with customizable options.
 * Displays a message with an input field.
 * 
 * @param message - The message to display
 * @param options - Optional dialog configuration
 * @returns The input value if confirmed, null if cancelled
 * 
 * @example
 * ```typescript
 * const name = await prompt('What is your name?');
 * ```
 */
export async function prompt(
  message: string,
  options?: Partial<DialogOptions>
): Promise<string | null> {
  const dialog = getDialogElement();
  const result = await dialog.open({
    message,
    type: 'prompt',
    title: options?.title || 'Input',
    theme: options?.theme || 'dark',
    confirmText: options?.confirmText || 'Submit',
    cancelText: options?.cancelText || 'Cancel',
    placeholder: options?.placeholder || '',
    defaultValue: options?.defaultValue || '',
    showClose: options?.showClose ?? true,
    closeOnOverlayClick: options?.closeOnOverlayClick ?? true,
    closeOnEscape: options?.closeOnEscape ?? true,
    ...options,
  });
  
  return result as string | null;
}

/**
 * Show a custom modal dialog
 * 
 * Displays a fully customizable modal with multiple buttons.
 * 
 * @param options - Configuration for the modal
 * @returns The result based on button clicked
 * 
 * @example
 * ```typescript
 * const result = await modal({
 *   title: 'Choose an option',
 *   message: 'What would you like to do?',
 *   customButtons: [
 *     { text: 'Option A', action: 'a' },
 *     { text: 'Option B', action: 'b' },
 *   ]
 * });
 * ```
 */
export async function modal(
  options: DialogOptions
): Promise<DialogResult> {
  const dialog = getDialogElement();
  const result = await dialog.open({
    type: 'modal',
    ...options,
  });
  
  return result;
}

/**
 * Set the default theme for all dialogs
 * 
 * @param theme - The theme to use ('light' | 'dark' | 'system')
 */
export function setDialogTheme(theme: DialogTheme): void {
  defaultTheme = theme;
}

/**
 * Get the current default theme
 * 
 * @returns The current default theme
 */
export function getDialogTheme(): DialogTheme {
  return defaultTheme;
}

/**
 * Replace window.alert with our custom alert
 * 
 * This makes all alert() calls use the custom dialog.
 * Useful for migration from native dialogs.
 */
export function patchGlobalAlert(): void {
  if (typeof window !== 'undefined') {
    (window as any).alert = alert;
  }
}

/**
 * Replace window.confirm with our custom confirm
 * 
 * This makes all confirm() calls use the custom dialog.
 * Useful for migration from native dialogs.
 */
export function patchGlobalConfirm(): void {
  if (typeof window !== 'undefined') {
    (window as any).confirm = confirm;
  }
}

/**
 * Replace window.prompt with our custom prompt
 * 
 * This makes all prompt() calls use the custom dialog.
 * Useful for migration from native dialogs.
 */
export function patchGlobalPrompt(): void {
  if (typeof window !== 'undefined') {
    (window as any).prompt = prompt;
  }
}

/**
 * Patch all global dialog functions
 * 
 * Replaces window.alert, window.confirm, and window.prompt
 * with custom implementations.
 */
export function patchAllGlobals(): void {
  patchGlobalAlert();
  patchGlobalConfirm();
  patchGlobalPrompt();
}
