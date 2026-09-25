import type {
  ColorStyle,
  TextStyle,
  EffectStyle,
  DesignSystemStyles,
  SceneObject,
  TextObject,
} from '../types/document';
import { generateId } from '../utils/id';

export function createDefaultStyles(): DesignSystemStyles {
  return {
    colorStyles: {
      'style_color_primary': {
        id: 'style_color_primary',
        name: 'Brand / Primary 500',
        color: '#6366f1',
        opacity: 100,
        description: 'Main brand primary accent color',
      },
      'style_color_secondary': {
        id: 'style_color_secondary',
        name: 'Brand / Secondary',
        color: '#3b82f6',
        opacity: 100,
        description: 'Secondary action and link color',
      },
      'style_color_success': {
        id: 'style_color_success',
        name: 'Semantic / Success',
        color: '#10b981',
        opacity: 100,
        description: 'Positive state & badge color',
      },
      'style_color_danger': {
        id: 'style_color_danger',
        name: 'Semantic / Danger',
        color: '#ef4444',
        opacity: 100,
        description: 'Destructive action & error state',
      },
      'style_color_bg_dark': {
        id: 'style_color_bg_dark',
        name: 'Surface / Background Dark',
        color: '#0f131c',
        opacity: 100,
        description: 'Primary dark canvas background',
      },
      'style_color_card_dark': {
        id: 'style_color_card_dark',
        name: 'Surface / Card Dark',
        color: '#181e2e',
        opacity: 100,
        description: 'Dark surface container color',
      },
      'style_color_text_primary': {
        id: 'style_color_text_primary',
        name: 'Text / Primary Light',
        color: '#ffffff',
        opacity: 100,
        description: 'Primary high-contrast heading text',
      },
      'style_color_text_muted': {
        id: 'style_color_text_muted',
        name: 'Text / Muted Gray',
        color: '#94a3b8',
        opacity: 100,
        description: 'Secondary description & label text',
      },
    },
    textStyles: {
      'style_text_h1': {
        id: 'style_text_h1',
        name: 'Typography / Heading 1',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 32,
        fontWeight: 800,
        lineHeight: 1.2,
        letterSpacing: -0.5,
        description: 'Main page & hero title',
      },
      'style_text_h2': {
        id: 'style_text_h2',
        name: 'Typography / Heading 2',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 24,
        fontWeight: 700,
        lineHeight: 1.25,
        letterSpacing: -0.2,
        description: 'Section headers and card titles',
      },
      'style_text_body_lg': {
        id: 'style_text_body_lg',
        name: 'Typography / Body Large',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 1.5,
        letterSpacing: 0,
        description: 'Prominent paragraph text',
      },
      'style_text_body_md': {
        id: 'style_text_body_md',
        name: 'Typography / Body Medium',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 14,
        fontWeight: 400,
        lineHeight: 1.4,
        letterSpacing: 0,
        description: 'Default body text and form labels',
      },
      'style_text_btn': {
        id: 'style_text_btn',
        name: 'Typography / Button Label',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 14,
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: 0.2,
        description: 'Action button text',
      },
      'style_text_caption': {
        id: 'style_text_caption',
        name: 'Typography / Caption',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 12,
        fontWeight: 500,
        lineHeight: 1.3,
        letterSpacing: 0,
        description: 'Secondary hints & badges',
      },
    },
    effectStyles: {
      'style_effect_card': {
        id: 'style_effect_card',
        name: 'Elevation / Card Shadow',
        type: 'drop-shadow',
        x: 0,
        y: 8,
        blur: 24,
        spread: 0,
        color: 'rgba(0, 0, 0, 0.35)',
        description: 'Standard card elevation',
      },
      'style_effect_glow': {
        id: 'style_effect_glow',
        name: 'Elevation / Brand Glow',
        type: 'drop-shadow',
        x: 0,
        y: 0,
        blur: 20,
        spread: 2,
        color: 'rgba(99, 102, 241, 0.4)',
        description: 'Accent primary button glow',
      },
    },
  };
}

export function applyColorStyleToObject(
  _obj: SceneObject,
  style: ColorStyle,
  target: 'fill' | 'stroke' = 'fill'
): Partial<SceneObject> {
  if (target === 'fill') {
    return {
      fillStyleId: style.id,
      fill: style.color,
      opacity: style.opacity,
    };
  } else {
    return {
      strokeStyleId: style.id,
      stroke: style.color,
      strokeOpacity: style.opacity,
    };
  }
}

export function applyTextStyleToObject(
  _obj: TextObject,
  style: TextStyle
): Partial<TextObject> {
  return {
    textStyleId: style.id,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
  };
}

export function createColorStyle(
  name: string,
  color: string,
  opacity = 100,
  description?: string
): ColorStyle {
  return {
    id: generateId('cstyle'),
    name,
    color,
    opacity,
    description,
  };
}

export function createTextStyle(
  name: string,
  params: Omit<TextStyle, 'id' | 'name'>
): TextStyle {
  return {
    id: generateId('tstyle'),
    name,
    ...params,
  };
}

export function createEffectStyle(
  name: string,
  params: Omit<EffectStyle, 'id' | 'name'>
): EffectStyle {
  return {
    id: generateId('estyle'),
    name,
    ...params,
  };
}
