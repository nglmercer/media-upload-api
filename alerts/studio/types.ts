export interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'image' | 'video';
  default: any;
}

export interface AlertTemplate {
  id: string;
  fields: TemplateField[];
  build: (values: Record<string, any>, config: { anim: any, duration: number }) => any;
}
