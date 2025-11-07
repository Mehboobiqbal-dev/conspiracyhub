'use client';
import React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { type GenerateEchoFeedAndBustItOutput } from "@/ai/flows/generate-echo-feed-and-bust-it";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bot, CheckCircle, Scale, MessageSquareQuote } from "lucide-react";

type SubmitOpinionAction = (
  prevState: any,
  formData: FormData
) => Promise<{ result: GenerateEchoFeedAndBustItOutput | null; error: string | null }>;

function FormContent() {
  const { pending } = useFormStatus();
  return (
    <>
      <Textarea
        id="opinion"
        name="opinion"
        placeholder="What's your hot take? e.g., 'Pineapple belongs on pizza.'"
        className="min-h-[100px] text-base"
        maxLength={280}
        required
        disabled={pending}
      />
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Max 280 characters.</p>
        <Button type="submit" disabled={pending} className="bg-accent text-accent-foreground hover:bg-accent/90">
          {pending ? "Busting..." : "Bust my Bubble"}
        </Button>
      </div>
    </>
  );
}

function OpinionForm({ onResult, submitOpinion }: { onResult: (state: { result: GenerateEchoFeedAndBustItOutput | null; error: string | null }) => void; submitOpinion: SubmitOpinionAction }) {
  const [state, formAction] = useFormState(submitOpinion, { result: null, error: null });

  React.useEffect(() => {
    onResult(state);
  }, [state, onResult]);
  
  return (
    <form action={formAction} className="space-y-4">
      <FormContent />
    </form>
  );
}

export default function DashboardPage({ submitOpinion }: { submitOpinion: SubmitOpinionAction }) {
  const [analysis, setAnalysis] = React.useState<{ result: GenerateEchoFeedAndBustItOutput | null; error: string | null }>({ result: null, error: null });
  
  return (
    <div className="container mx-auto max-w-4xl space-y-8">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Echo Chamber Simulator</CardTitle>
          <CardDescription>
            Enter an opinion and see how it gets amplified in a digital bubble, then watch as AI personas tear it down.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OpinionForm onResult={setAnalysis} submitOpinion={submitOpinion} />
        </CardContent>
      </Card>

      {analysis.error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{analysis.error}</p>
          </CardContent>
        </Card>
      )}

      {analysis.result && (
        <Card>
          <CardHeader className="relative">
            <CardTitle className="font-headline text-3xl">Meme Report</CardTitle>
            <CardDescription>Your opinion, stress-tested.</CardDescription>
            <div className="absolute right-6 top-6 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-primary">
                <Scale className="size-8" />
                <span className="text-4xl font-bold">{analysis.result.bubbleScore}/10</span>
              </div>
              <Badge variant="secondary">Bubble Score</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 font-headline text-xl text-primary">
                  <MessageSquareQuote />
                  Echo Feed
                </h3>
                <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
                  {analysis.result.echoFeed.map((echo, index) => (
                    <p key={index} className="text-sm">" {echo} "</p>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 font-headline text-xl text-green-600">
                  <Bot />
                  Bust Feed
                </h3>
                <div className="space-y-3 rounded-lg border bg-background p-4">
                  {analysis.result.bustFeed.map((bust, index) => (
                    <div key={index}>
                      <p className="text-sm">" {bust} "</p>
                      <div className="flex items-center gap-1 text-xs text-green-700">
                         <CheckCircle className="size-3" />
                         <span>Fact-checked</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <h3 className="font-headline text-xl mb-2">Shareable Summary</h3>
              <div className="rounded-lg bg-primary/10 p-4">
                <p className="italic text-primary-foreground/90">{analysis.result.memeReport}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
