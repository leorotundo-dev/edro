'use client';

import TextField from '@mui/material/TextField';
import type { TextFieldProps } from '@mui/material/TextField';

type CustomTextFieldProps = TextFieldProps & {
  fullWidth?: boolean;
};

export default function CustomTextField({ fullWidth = true, ...props }: CustomTextFieldProps) {
  return <TextField fullWidth={fullWidth} {...props} />;
}
