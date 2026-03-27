/**
 * Lit Components Module
 * 
 * Centralized exports for Lit web component utilities.
 * Provides decorators, base classes, and template helpers.
 * 
 * This module serves as the main entry point for Lit functionality
 * across the framework, ensuring consistent imports.
 * 
 * @module litcomponents
 * @version 2.0.0
 */

import { LitElement, html, css, nothing, render, PropertyValues } from 'lit';
import { customElement, property, state, query, queryAll } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

/**
 * Component Decorator
 * 
 * Shorthand for @customElement decorator.
 * 
 * @example
 * ```typescript
 * @Component('my-element')
 * export class MyElement extends LitElement {
 *   // ...
 * }
 * ```
 * 
 * @param tagName - The custom element tag name
 * @returns Class decorator function
 */
export function Component(tagName: string) {
  return customElement(tagName);
}

// =============================================================================
// Lit Core Re-exports
// =============================================================================

/**
 * Base class for Lit web components
 */
export { LitElement };

/**
 * Lit template literal tag for creating templates
 */
export { html };

/**
 * Lit CSS template literal tag for component styles
 */
export { css };

/**
 * Lit directive for conditional rendering (renders nothing when falsy)
 */
export { nothing };

/**
 * Lit render function for manual rendering
 */
export { render };

// =============================================================================
// Lit Decorators
// =============================================================================

/**
 * Decorator for declaring reactive properties
 * 
 * @example
 * ```typescript
 * @property({ type: String })
 * name: string = 'World';
 * ```
 */
export { property };

/**
 * Decorator for declaring internal reactive state
 * 
 * @example
 * ```typescript
 * @state()
 * private count: number = 0;
 * ```
 */
export { state };

/**
 * Decorator for querying a single element in the shadow DOM
 * 
 * @example
 * ```typescript
 * @query('#input')
 * private inputEl!: HTMLInputElement;
 * ```
 */
export { query };

/**
 * Decorator for querying multiple elements in the shadow DOM
 * 
 * @example
 * ```typescript
 * @queryAll('.item')
 * private items!: NodeListOf<HTMLElement>;
 * ```
 */
export { queryAll };

// =============================================================================
// Lit Directives
// =============================================================================

/**
 * Directive for binding inline styles as objects
 * 
 * @example
 * ```typescript
 * styleMap({ color: 'red', fontSize: '16px' })
 * ```
 */
export { styleMap };

// =============================================================================
// Lit Types
// =============================================================================

/**
 * Type for property change values in willUpdate/lupdated callbacks
 */
export { type PropertyValues };

// =============================================================================
// Base Component
// =============================================================================

/**
 * Base Component with common utilities
 * 
 * Extend this class to add common functionality to all components.
 * Currently provides no additional methods but can be extended.
 * 
 * @example
 * ```typescript
 * export class MyBaseComponent extends BaseComponent {
 *   // Common functionality for all components
 * }
 * ```
 */
export class BaseComponent extends LitElement {
  // Add common methods or styles here as needed
}
