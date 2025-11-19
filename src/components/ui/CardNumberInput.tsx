'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CardNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
}

export default function CardNumberInput({
  value,
  onChange,
  placeholder = "1234 5678 9012 3456",
  className,
  disabled = false,
  error = false
}: CardNumberInputProps) {
  const [displayValue, setDisplayValue] = useState(value);

  // Format the card number with spaces for display (every 4 digits)
  const formatCardNumber = useCallback((cardNumber: string) => {
    // Remove all non-digit characters
    const cleaned = cardNumber.replace(/\D/g, '');
    
    // Add spaces every 4 digits
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    
    return formatted;
  }, []);

  // Clean the card number (remove all spaces) for the actual value
  const cleanCardNumber = useCallback((cardNumber: string) => {
    return cardNumber.replace(/\D/g, '');
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Clean the input (remove spaces and non-digits)
    const cleanedValue = cleanCardNumber(inputValue);
    
    // Limit to 16 digits
    const limitedValue = cleanedValue.slice(0, 16);
    
    // Format for display
    const formattedValue = formatCardNumber(limitedValue);
    
    // Update display value
    setDisplayValue(formattedValue);
    
    // Call onChange with the clean value (no spaces)
    onChange(limitedValue);
  }, [onChange, cleanCardNumber, formatCardNumber]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true)) {
      return;
    }
    
    // Ensure that it is a number and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
  }, []);

  return (
    <Input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={cn(
        "font-mono tracking-wider",
        error && "border-red-500 focus:border-red-500",
        className
      )}
      disabled={disabled}
      maxLength={19} // 16 digits + 3 spaces
    />
  );
}
