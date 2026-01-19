// Form validation utilities

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
  message?: string;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export interface ValidationErrors {
  [key: string]: string;
}

export function validateField(value: any, rules: ValidationRule): string | null {
  if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return rules.message || 'Este campo é obrigatório';
  }

  if (value && typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      return rules.message || `Mínimo de ${rules.minLength} caracteres`;
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      return rules.message || `Máximo de ${rules.maxLength} caracteres`;
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      return rules.message || 'Formato inválido';
    }
  }

  if (value && typeof value === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      return rules.message || `Valor mínimo: ${rules.min}`;
    }

    if (rules.max !== undefined && value > rules.max) {
      return rules.message || `Valor máximo: ${rules.max}`;
    }
  }

  if (rules.custom && !rules.custom(value)) {
    return rules.message || 'Valor inválido';
  }

  return null;
}

export function validateForm(data: any, rules: ValidationRules): ValidationErrors {
  const errors: ValidationErrors = {};

  Object.keys(rules).forEach((field) => {
    const error = validateField(data[field], rules[field]);
    if (error) {
      errors[field] = error;
    }
  });

  return errors;
}

export function hasErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

// Edital-specific validation rules
export const editalValidationRules: ValidationRules = {
  codigo: {
    required: true,
    minLength: 2,
    maxLength: 50,
    message: 'Código deve ter entre 2 e 50 caracteres',
  },
  titulo: {
    required: true,
    minLength: 5,
    maxLength: 200,
    message: 'Título deve ter entre 5 e 200 caracteres',
  },
  orgao: {
    required: true,
    minLength: 3,
    maxLength: 100,
    message: 'Órgão deve ter entre 3 e 100 caracteres',
  },
  numero_vagas: {
    required: true,
    min: 0,
    message: 'Número de vagas deve ser maior ou igual a 0',
  },
  taxa_inscricao: {
    min: 0,
    message: 'Taxa de inscrição deve ser maior ou igual a 0',
  },
};
