'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { getTextPreview } from '@/lib/utils/html';

interface ModerationItem {
  _id: string;
  type: 'post' | 'comment';
  reportCount?: number;
  item: {
    _id: string;
    title?: string;
    content: string;
    authorName?: string;
    createdAt: string;
  };
}

export function ModerationQueue() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const { toast } = useToast();

  useEffect(() => {
    fetchQueue();
  }, [activeTab]);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/moderation/queue?status=${activeTab}&type=all`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (itemId: string, itemType: 'post' | 'comment', action: 'approve' | 'remove') => {
    try {
      const response = await fetch('/api/moderation/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          itemId,
          itemType,
          action,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Review completed',
          description: `Item ${action === 'approve' ? 'approved' : 'removed'}`,
        });
        fetchQueue();
      } else {
        throw new Error('Failed to review item');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to review item',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="pending">Pending Review</TabsTrigger>
        <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
      </TabsList>
      <TabsContent value={activeTab} className="mt-6">
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No items in queue</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={item.type === 'post' ? 'default' : 'secondary'}>
                          {item.type}
                        </Badge>
                        {item.reportCount && item.reportCount > 0 && (
                          <Badge variant="destructive">
                            {item.reportCount} report{item.reportCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      {item.item.title && (
                        <CardTitle className="mb-2">{item.item.title}</CardTitle>
                      )}
                      <CardDescription>
                        <p className="line-clamp-2">{getTextPreview(item.item.content || '', 200)}</p>
                        <p className="text-xs mt-2">
                          By {item.item.authorName || 'Unknown'} •{' '}
                          {formatDistanceToNow(new Date(item.item.createdAt), { addSuffix: true })}
                        </p>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReview(item._id, item.type, 'approve')}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleReview(item._id, item.type, 'remove')}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={item.type === 'post' ? `/p/${item._id}` : '#'}>
                        View
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

