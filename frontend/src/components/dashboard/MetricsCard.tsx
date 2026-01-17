/**
 * Metrics Card Component
 *
 * Displays a single metric with icon, label, value, and trend.
 */

import React from 'react';
import { Card, CardContent, Box, Typography, useTheme } from '@mui/material';
import { TrendingUp, TrendingDown, Remove } from '@mui/icons-material';

export interface MetricsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactElement;
  trend?: {
    value: number;
    label?: string;
  };
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  loading?: boolean;
  onClick?: () => void;
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  icon,
  trend,
  color = 'primary',
  loading = false,
  onClick,
}) => {
  const theme = useTheme();

  const getTrendIcon = () => {
    if (!trend) return null;

    if (trend.value > 0) {
      return <TrendingUp fontSize="small" />;
    } else if (trend.value < 0) {
      return <TrendingDown fontSize="small" />;
    }
    return <Remove fontSize="small" />;
  };

  const getTrendColor = () => {
    if (!trend) return 'text.secondary';

    if (trend.value > 0) return 'success.main';
    if (trend.value < 0) return 'error.main';
    return 'text.secondary';
  };

  const getColorValue = () => {
    return theme.palette[color].main;
  };

  const getBackgroundColor = () => {
    return theme.palette[color].light;
  };

  if (loading) {
    return (
      <Card
        sx={{
          height: '100%',
          opacity: 0.7,
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Loading...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8],
        } : {},
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          {/* Left: Icon and Value */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Typography>
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', color: getTrendColor() }}>
                  {getTrendIcon()}
                  <Typography variant="caption" sx={{ fontWeight: 600, ml: 0.5 }}>
                    {Math.abs(trend.value)}%
                  </Typography>
                </Box>
                {trend.label && (
                  <Typography variant="caption" color="text.secondary">
                    {trend.label}
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          {/* Right: Icon */}
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 3,
              backgroundColor: getBackgroundColor(),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: getColorValue(),
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default MetricsCard;
