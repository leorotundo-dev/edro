/**
 * Shared ApexCharts theme utility
 *
 * Usage:
 *   import { baseChartOptions, CHART_COLORS } from '@/utils/chartTheme';
 *   import { useThemeMode } from '@/contexts/ThemeContext';
 *
 *   const { isDark } = useThemeMode();
 *   const options: ApexCharts.ApexOptions = {
 *     ...baseChartOptions(isDark),
 *     // page-specific overrides
 *   };
 */

export const CHART_COLORS = {
  primary:   '#ff6600',
  teal:      '#13DEB9',
  yellow:    '#FFAE1F',
  red:       '#FA896B',
  blue:      '#5D87FF',
  purple:    '#a855f7',
  green:     '#16a34a',
  neutral:   '#a3a3a3',
} as const;

/** Semantic palette for ordered series (use by index) */
export const SERIES_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.teal,
  CHART_COLORS.blue,
  CHART_COLORS.yellow,
  CHART_COLORS.purple,
  CHART_COLORS.red,
];

export function baseChartOptions(isDark: boolean): ApexCharts.ApexOptions {
  const gridColor   = isDark ? '#2d2d2d' : '#e5e7eb';
  const labelColor  = isDark ? '#a3a3a3' : '#6b7280';
  const bgColor     = isDark ? '#1c1c1c' : '#ffffff';
  const tooltipTheme = isDark ? 'dark' : 'light' as const;

  return {
    chart: {
      fontFamily: "'Space Grotesk', sans-serif",
      toolbar:    { show: false },
      background: 'transparent',
      animations: { enabled: true, speed: 300 },
    },
    grid: {
      borderColor: gridColor,
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { left: 8, right: 8 },
    },
    xaxis: {
      axisBorder: { show: false },
      axisTicks:  { show: false },
      labels: {
        style: {
          colors: labelColor,
          fontSize: '11px',
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 500,
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: labelColor,
          fontSize: '11px',
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 500,
        },
      },
    },
    tooltip: {
      theme: tooltipTheme,
      style: {
        fontSize:   '12px',
        fontFamily: "'Space Grotesk', sans-serif",
      },
    },
    legend: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize:   '12px',
      fontWeight: 500,
      labels: {
        colors: labelColor,
      },
      markers: {
        size: 7,
      },
    },
    dataLabels: {
      style: {
        fontSize:   '11px',
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 600,
      },
    },
    stroke: {
      width: 2,
    },
    fill: {
      opacity: 1,
    },
    states: {
      hover: {
        filter: { type: 'lighten', value: 0.05 },
      },
      active: {
        filter: { type: 'darken', value: 0.1 },
      },
    },
  };
}
