'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface AIAssistButtonProps {
  onContentGenerated: (content: string) => void;
  topic?: string;
  type?: 'conspiracy' | 'opinion';
}

export function AIAssistButton({ onContentGenerated, topic, type = 'conspiracy' }: AIAssistButtonProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Prompt required',
        description: 'Please enter a prompt for AI generation',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          topic: topic || prompt,
          context: prompt,
          historical: false,
        }),
      });

      const data = await response.json();
      if (response.ok && data.content) {
        onContentGenerated(data.content);
        setOpen(false);
        setPrompt('');
        toast({
          title: 'AI content generated',
          description: 'Content has been inserted into your editor',
        });
      } else {
        throw new Error(data.error || 'Failed to generate content');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate AI content',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Sparkles className="h-4 w-4 mr-2" />
          AI Assist
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>AI Content Assistant</DialogTitle>
          <DialogDescription>
            Let AI help you generate content for your {type === 'conspiracy' ? 'conspiracy theory' : 'opinion'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">What would you like AI to write about?</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., The hidden truth about moon landing, or Your opinion on climate change..."
              rows={4}
              disabled={loading}
            />
          </div>
          <Button onClick={handleGenerate} disabled={loading || !prompt.trim()} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Content
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

