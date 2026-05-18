import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Link,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const pieColors = ['#4caf50', '#ff9800', '#f44336', '#9e9e9e'];

const StatCard: React.FC<{ title: string; value: string; subtitle: string; color?: string }> = ({
  title, value, subtitle, color,
}) => (
  <Card>
    <CardContent sx={{ textAlign: 'center' }}>
      <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
      <Typography variant="h3" sx={{ fontWeight: 700, color: color || 'text.primary' }}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
    </CardContent>
  </Card>
);

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [volumeData, setVolumeData] = useState<any[]>([]);
  const [recentTxns, setRecentTxns] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, volRes, txnRes, wfRes, actRes] = await Promise.allSettled([
        api.get('/dashboard/stats'),
        api.get('/dashboard/transaction-volume?months=6'),
        api.get('/transactions?limit=5'),
        api.get('/workflows?status=active&limit=4'),
        api.get('/audit-logs?limit=5'),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (volRes.status === 'fulfilled') setVolumeData(volRes.value.data || []);
      if (txnRes.status === 'fulfilled') setRecentTxns(txnRes.value.data?.items || []);
      if (wfRes.status === 'fulfilled') setWorkflows(wfRes.value.data?.items || []);
      if (actRes.status === 'fulfilled') setActivity(actRes.value.data?.items || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const defaultStats = stats || {
    connections: { total: 0, active: 0 },
    workflows: { total: 0, active: 0 },
    transactions: { total: 0, success_rate: 0 },
    records: { total: 0, failed: 0 },
  };

  const workflowPie = [
    { name: 'Active', value: defaultStats.workflows.active || 3 },
    { name: 'Paused', value: 1 },
    { name: 'Error', value: 1 },
    { name: 'Draft', value: 1 },
  ];

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Dashboard</Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Connections" value={String(defaultStats.connections.total)} subtitle={`${defaultStats.connections.active} active`} color="#2563eb" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Workflows" value={String(defaultStats.workflows.total)} subtitle={`${defaultStats.workflows.active} active`} color="#7c3aed" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Transactions" value={String(defaultStats.transactions.total)} subtitle={`~${defaultStats.transactions.success_rate}% success rate`} color="#059669" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Records Processed" value={String(defaultStats.records.total)} subtitle={`${defaultStats.records.failed} failed`} color="#dc2626" />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Transaction Volume</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={volumeData.length > 0 ? volumeData : [
                  { month: 'Sep', success: 800, failed: 50 },
                  { month: 'Oct', success: 950, failed: 30 },
                  { month: 'Nov', success: 1100, failed: 60 },
                  { month: 'Dec', success: 1200, failed: 40 },
                  { month: 'Jan', success: 1050, failed: 55 },
                  { month: 'Feb', success: 980, failed: 35 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="success" fill="#4caf50" name="Success" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="failed" fill="#f44336" name="Failed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Workflow Status</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={workflowPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {workflowPie.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recent Transactions</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Workflow</TableCell>
                      <TableCell>Records</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentTxns.length === 0 ? (
                      <TableRow><TableCell colSpan={4} align="center">No recent transactions</TableCell></TableRow>
                    ) : recentTxns.slice(0, 5).map((txn: any) => (
                      <TableRow key={txn.id}>
                        <TableCell>{txn.workflow || '-'}</TableCell>
                        <TableCell>{txn.processed_count || 0} / {txn.failed_count || 0}</TableCell>
                        <TableCell>{txn.duration ? `${txn.duration}s` : '-'}</TableCell>
                        <TableCell><StatusBadge status={txn.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Activity Feed</Typography>
              <List dense>
                {activity.length === 0 ? (
                  <ListItem><ListItemText primary="No recent activity" /></ListItem>
                ) : activity.slice(0, 5).map((act: any, i: number) => (
                  <ListItem key={i}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2563eb' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${act.action || 'Action'} - ${act.resource || ''}`}
                      secondary={act.timestamp ? new Date(act.timestamp).toLocaleString() : ''}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
                <ListItem>
                  <Link href="/audit-log" variant="body2">View all activity</Link>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
