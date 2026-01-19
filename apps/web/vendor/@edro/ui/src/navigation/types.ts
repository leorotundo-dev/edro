import type { AnchorHTMLAttributes, ComponentType, ReactNode } from 'react';

export interface NavItem {
  href: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  badge?: ReactNode;
  description?: string;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export interface LinkComponentProps extends Omit<AnchorHTMLAttributes<HTMLElement>, 'href'> {
  href: string;
  children: ReactNode;
  className?: string;
}

export type LinkComponent = ComponentType<LinkComponentProps>;
