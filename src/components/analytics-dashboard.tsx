'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface AnalyticsData {
  totals: {
    posts: number;
    comments: number;
    topics: number;
    users: number;
  };
  recent: {
    posts: number;
    comments: number;
    period: string;
  };
  aiVsHuman: {
    ai: number;
    human: number;
    aiPercentage: string;
  };
  topTopics: Array<{
    _id: string;
    name: string;
    slug: string;
    postCount: number;
    followerCount: number;
  }>;
  growth: {
    postsByDay: Array<{
      date: string;
      count: number;
    }>;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics/community?period=${period}`, {
        credentials: 'include',
      });
      const analyticsData = await response.json();
      if (response.ok) {
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const aiVsHumanData = [
    { name: 'AI Generated', value: data.aiVsHuman.ai },
    { name: 'User Created', value: data.aiVsHuman.human },
  ];

  return (
    <div className="space-y-6">
      <Tabs value={period} onValueChange={setPeriod}>
        <TabsList>
          <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
          <TabsTrigger value="30d">Last 30 Days</TabsTrigger>
          <TabsTrigger value="90d">Last 90 Days</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{data.totals.posts.toLocaleString()}</CardTitle>
            <CardDescription>Total Posts</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{data.totals.comments.toLocaleString()}</CardTitle>
            <CardDescription>Total Comments</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{data.totals.topics.toLocaleString()}</CardTitle>
            <CardDescription>Topics</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{data.totals.users.toLocaleString()}</CardTitle>
            <CardDescription>Users</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Post Growth</CardTitle>
            <CardDescription>Posts created over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.growth.postsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI vs Human Content</CardTitle>
            <CardDescription>{data.aiVsHuman.aiPercentage}% AI generated</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={aiVsHumanData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {aiVsHumanData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Topics</CardTitle>
          <CardDescription>Most active topics by post count</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.topTopics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="postCount" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

