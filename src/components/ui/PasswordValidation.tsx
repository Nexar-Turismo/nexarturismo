'use client';

import { CheckCircle, XCircle } from 'lucide-react';

export interface PasswordValidationResult {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export const validatePassword = (password: string): PasswordValidationResult => {
  return {
    hasMinLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
};

export const isPasswordValid = (validation: PasswordValidationResult): boolean => {
  return (
    validation.hasMinLength &&
    validation.hasUppercase &&
    validation.hasLowercase &&
    validation.hasNumber &&
    validation.hasSpecialChar
  );
};

interface PasswordValidationProps {
  password: string;
  show?: boolean;
}

export default function PasswordValidation({ password, show = true }: PasswordValidationProps) {
  if (!show) return null;

  const validation = validatePassword(password);

  const rules = [
    {
      label: 'Al menos 8 caracteres',
      isValid: validation.hasMinLength,
    },
    {
      label: 'Al menos una letra mayúscula',
      isValid: validation.hasUppercase,
    },
    {
      label: 'Al menos una letra minúscula',
      isValid: validation.hasLowercase,
    },
    {
      label: 'Al menos un número',
      isValid: validation.hasNumber,
    },
    {
      label: 'Al menos un carácter especial',
      isValid: validation.hasSpecialChar,
    },
  ];

  return (
    <div className="mt-2 space-y-1.5">
      {rules.map((rule, index) => (
        <div
          key={index}
          className={`flex items-center space-x-2 text-xs transition-colors ${
            rule.isValid
              ? 'text-green-600 dark:text-green-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {rule.isValid ? (
            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
          ) : (
            <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          <span>{rule.label}</span>
        </div>
      ))}
    </div>
  );
}

