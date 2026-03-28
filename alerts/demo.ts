import '../client/index';
import { registerBehaviors } from './behaviors';
import { TriggerAlert, registerOrReplace } from './src/components/TriggerAlert';
import { StudioEngine } from './studio/engine';

/**
 * Alert Studio - Main Entry Point
 * 
 * This file bootstrap the Alert Studio workspace.
 * Registry and UI logic are modularized in ./studio
 */

// 1. Core Registration
registerBehaviors();
registerOrReplace('trigger-alert', TriggerAlert);

// 2. Event Listeners (Global)
window.addEventListener('message', (event) => {
  // Can be used to receive trigger data from Parent
  if (event.data?.type === 'studio:trigger') {
     console.log('[Studio] Received remote trigger:', event.data.payload);
  }
});

// 3. Initialize Studio Workspace
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Studio] Initializing Workspace...');
  new StudioEngine();
});