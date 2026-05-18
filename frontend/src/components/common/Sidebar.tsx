import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Cable as ConnectionsIcon,
  AccountTree as WorkflowsIcon,
  ReceiptLong as TransactionsIcon,
  Route as ChannelsIcon,
  Transform as MappingsIcon,
  People as UsersIcon,
  History as AuditIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 240;

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

const platformItems = [
  { name: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { name: 'Connections', path: '/connections', icon: <ConnectionsIcon /> },
  { name: 'Workflows', path: '/workflows', icon: <WorkflowsIcon /> },
  { name: 'Transactions', path: '/transactions', icon: <TransactionsIcon /> },
  { name: 'Channels', path: '/channels', icon: <ChannelsIcon /> },
  { name: 'Mappings', path: '/mappings', icon: <MappingsIcon /> },
];

const adminItems = [
  { name: 'Users', path: '/users', icon: <UsersIcon /> },
  { name: 'Audit Log', path: '/audit-log', icon: <AuditIcon /> },
  { name: 'Settings', path: '/settings', icon: <SettingsIcon /> },
];

const Sidebar: React.FC<SidebarProps> = ({ open }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: 'background.paper',
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
          InterExchange
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Data Integration Platform
        </Typography>
      </Box>
      <Divider />
      
      <Box sx={{ overflow: 'auto' }}>
        <Typography variant="overline" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
          PLATFORM
        </Typography>
        <List>
          {platformItems.map((item) => (
            <ListItem key={item.name} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigate(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.name} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider />
        <Typography variant="overline" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
          ADMINISTRATION
        </Typography>
        <List>
          {adminItems.map((item) => (
            <ListItem key={item.name} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigate(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.name} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
      <Box sx={{ mt: 'auto', p: 2 }}>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body2" color="primary" sx={{ cursor: 'pointer' }}>
          System Health
        </Typography>
        <Typography variant="body2" color="primary" sx={{ cursor: 'pointer', mt: 1 }}>
          Documentation
        </Typography>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
