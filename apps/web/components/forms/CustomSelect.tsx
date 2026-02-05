'use client';

import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import FormHelperText from '@mui/material/FormHelperText';
import type { SelectProps } from '@mui/material/Select';

type CustomSelectProps = SelectProps & {
  helperText?: string;
  fullWidth?: boolean;
};

export default function CustomSelect({
  label,
  helperText,
  error,
  fullWidth = true,
  children,
  ...props
}: CustomSelectProps) {
  return (
    <FormControl fullWidth={fullWidth} error={error} size="small">
      {label && <InputLabel>{label}</InputLabel>}
      <Select label={label} {...props}>
        {children}
      </Select>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
}
