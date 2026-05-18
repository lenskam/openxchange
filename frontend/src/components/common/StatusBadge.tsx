import React from 'react';
import { Chip } from '@mui/material';

const statusColors: Record<string, 'success' | 'default' | 'error' | 'warning' | 'info'> = {
  active: 'success',
  inactive: 'default',
  error: 'error',
  pending: 'warning',
  processing: 'info',
  success: 'success',
  failed: 'error',
  enabled: 'success',
  disabled: 'default',
  paused: 'warning',
  draft: 'default',
};

interface StatusBadgeProps {
  status: string;
  label?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const color = statusColors[status.toLowerCase()] || 'default';
  return (
    <Chip
      label={label || status}
      color={color}
      size="small"
      variant="outlined"
      sx={{ fontWeight: 500, textTransform: 'capitalize' }}
    />
  );
};

export default StatusBadge;
