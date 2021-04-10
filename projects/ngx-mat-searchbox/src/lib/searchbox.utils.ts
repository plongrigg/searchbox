import { AbstractControl } from '@angular/forms';

export const isNumber = (value: any): boolean => {
  if (!isValid(value)) { return false; }
  return typeof value === 'number' && isFinite(value);
};

export const isNumeric = (value: string): boolean => {
  return !Number.isNaN(Number(value));
};

/**
 * Type guard to ensure a value is not null or undefined
 * @param input value to be checked
 */
export const isValid = <T>(input: T | null | undefined): input is T => {
  return input !== undefined && input !== null;
};

/**
 * Enables or disables all controls (form propagates to child controls)
 * @param enable true to enable, false to disable
 */
export const enableControls = (control: AbstractControl, enable: boolean): void => {
  enable ? control.enable({ emitEvent: false }) : control.disable({ emitEvent: false });
};

/**
 * Remove excluded characters from input string
 */
export const strip = (input: string, removes: string[]): string => {
  if (!removes || removes.length === 0) { return input; }
  let output = input;
  removes.forEach(remove => {
    const tremove = remove?.trimRight() ?? '';
    if (!tremove) { return; }
    while (output.includes(tremove)) {
      output = output.replace(tremove, '');
    }
  });
  return output;
};


