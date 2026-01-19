"use client";

import type { ReactNode } from "react";
import { Button, type ButtonProps } from "@edro/ui";

export type PrimaryButtonProps = ButtonProps & {
  children: ReactNode;
};

export function PrimaryButton({
  children,
  variant = "primary",
  size = "md",
  ...props
}: PrimaryButtonProps) {
  return (
    <Button variant={variant} size={size} {...props}>
      {children}
    </Button>
  );
}
