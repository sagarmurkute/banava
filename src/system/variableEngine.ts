import type {
  Variable,
  VariableCollection,
  VariableMode,
  DesignSystemVariables,
  VariableType,
} from '../types/document';
import { generateId } from '../utils/id';

export function createDefaultVariables(): DesignSystemVariables {
  const lightModeId = 'mode_light';
  const darkModeId = 'mode_dark';

  const modes: VariableMode[] = [
    { id: darkModeId, name: 'Dark Theme' },
    { id: lightModeId, name: 'Light Theme' },
  ];

  const variables: Record<string, Variable> = {
    'var_brand_primary': {
      id: 'var_brand_primary',
      name: 'brand.primary',
      type: 'color',
      valuesByMode: {
        [darkModeId]: '#6366f1',
        [lightModeId]: '#4f46e5',
      },
      description: 'Main interactive brand accent color',
    },
    'var_bg_surface': {
      id: 'var_bg_surface',
      name: 'surface.background',
      type: 'color',
      valuesByMode: {
        [darkModeId]: '#0f131c',
        [lightModeId]: '#ffffff',
      },
      description: 'Page surface canvas background',
    },
    'var_card_surface': {
      id: 'var_card_surface',
      name: 'surface.card',
      type: 'color',
      valuesByMode: {
        [darkModeId]: '#181e2e',
        [lightModeId]: '#f8fafc',
      },
      description: 'Elevated card background color',
    },
    'var_text_primary': {
      id: 'var_text_primary',
      name: 'text.primary',
      type: 'color',
      valuesByMode: {
        [darkModeId]: '#ffffff',
        [lightModeId]: '#0f172a',
      },
      description: 'Primary text color',
    },
    'var_text_secondary': {
      id: 'var_text_secondary',
      name: 'text.secondary',
      type: 'color',
      valuesByMode: {
        [darkModeId]: '#94a3b8',
        [lightModeId]: '#64748b',
      },
      description: 'Secondary muted text color',
    },
    'var_spacing_sm': {
      id: 'var_spacing_sm',
      name: 'spacing.sm',
      type: 'number',
      valuesByMode: {
        [darkModeId]: 8,
        [lightModeId]: 8,
      },
      description: 'Small gap/padding unit (8px)',
    },
    'var_spacing_md': {
      id: 'var_spacing_md',
      name: 'spacing.md',
      type: 'number',
      valuesByMode: {
        [darkModeId]: 16,
        [lightModeId]: 16,
      },
      description: 'Medium gap/padding unit (16px)',
    },
    'var_spacing_lg': {
      id: 'var_spacing_lg',
      name: 'spacing.lg',
      type: 'number',
      valuesByMode: {
        [darkModeId]: 24,
        [lightModeId]: 24,
      },
      description: 'Large section padding unit (24px)',
    },
    'var_radius_md': {
      id: 'var_radius_md',
      name: 'radius.md',
      type: 'number',
      valuesByMode: {
        [darkModeId]: 8,
        [lightModeId]: 8,
      },
      description: 'Standard button & input corner radius',
    },
  };

  const collectionId = 'col_tokens_default';
  const collections: Record<string, VariableCollection> = {
    [collectionId]: {
      id: collectionId,
      name: 'Core Design Tokens',
      modes,
      defaultModeId: darkModeId,
      variableIds: Object.keys(variables),
    },
  };

  return {
    variables,
    collections,
    activeModeIdByCollection: {
      [collectionId]: darkModeId,
    },
  };
}

export function resolveVariableValue(
  variableId: string,
  variablesState: DesignSystemVariables,
  preferredModeId?: string
): any {
  const variable = variablesState.variables[variableId];
  if (!variable) return undefined;

  if (preferredModeId && variable.valuesByMode[preferredModeId] !== undefined) {
    return variable.valuesByMode[preferredModeId];
  }

  // Look up collection active mode
  for (const col of Object.values(variablesState.collections)) {
    if (col.variableIds.includes(variableId)) {
      const activeModeId =
        variablesState.activeModeIdByCollection[col.id] || col.defaultModeId;
      if (variable.valuesByMode[activeModeId] !== undefined) {
        return variable.valuesByMode[activeModeId];
      }
    }
  }

  // Fallback to first available value
  const firstKey = Object.keys(variable.valuesByMode)[0];
  return firstKey ? variable.valuesByMode[firstKey] : undefined;
}

export function createVariable(
  name: string,
  type: VariableType,
  valuesByMode: Record<string, any>,
  collectionId: string,
  variablesState: DesignSystemVariables,
  description?: string
): { nextState: DesignSystemVariables; newVariable: Variable } {
  const newId = generateId('var');
  const newVar: Variable = {
    id: newId,
    name,
    type,
    valuesByMode,
    description,
  };

  const nextVars = { ...variablesState.variables, [newId]: newVar };
  const targetCol = variablesState.collections[collectionId];
  const nextCols = targetCol
    ? {
        ...variablesState.collections,
        [collectionId]: {
          ...targetCol,
          variableIds: [...targetCol.variableIds, newId],
        },
      }
    : variablesState.collections;

  return {
    nextState: {
      ...variablesState,
      variables: nextVars,
      collections: nextCols,
    },
    newVariable: newVar,
  };
}
