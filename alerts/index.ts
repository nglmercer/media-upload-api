export { AlertBuilder, createAlert } from './src/builder/AlertBuilder';
export { TriggerAlert } from './src/components/TriggerAlert';
export { AlertElementComponent } from './src/components/AlertElement';
export { AlertBehaviorRegistry } from './src/registry/BehaviorRegistry';
export { AlertExporter, AlertStyleExporter } from './src/exporter';
export { 
  animateElement, 
  animateElementOut, 
  animateStagger,
  setupElementInteractions,
} from './src/animations';
export type { 
  AlertConfig, 
  AlertElement,
  AlertTextElement,
  AlertImageElement,
  AlertVideoElement,
  AlertAudioElement,
  AlertButtonElement,
  AlertContainerElement,
  AlertSpacerElement,
  AlertElementStyle,
  AlertElementLayout,
  AlertElementAnimation,
  AlertElementInteraction,
  AlertElementTransform,
  AlertElementFilter,
  AlertStyle,
  AlertStyleAnimation,
  AlertStyleVariables,
  FlexDirection,
  FlexWrap,
  JustifyContent,
  AlignItems,
} from './src/styles/types';
export { 
  styleToVariables,
  elementStyleToCSS,
  elementLayoutToCSS,
  transformToString,
  filterToString,
} from './src/styles/types';