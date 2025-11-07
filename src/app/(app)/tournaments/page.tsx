'use client';

import React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createAIOpponentsForTournament, type CreateAIOpponentsForTournamentOutput } from "@/ai/flows/create-ai-opponents-for-tournaments";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Bot, Users } from "lucide-react";
import Image from 'next/image';
import { PlaceHolderImages } from "@/lib/placeholder-images";

type State = {
  result: CreateAIOpponentsForTournamentOutput | null;
  error: string | null;
};

async function createOpponentsAction(prevState: State, formData: FormData): Promise<State> {
  const tournamentName = formData.get("tournamentName") as string;
  const numberOfAIOpponents = Number(formData.get("numberOfAIOpponents"));

  if (!tournamentName || !numberOfAIOpponents) {
    return { result: null, error: "Tournament name and number of opponents are required." };
  }

  try {
    const result = await createAIOpponentsForTournament({ tournamentName, numberOfAIOpponents });
    return { result, error: null };
  } catch (e) {
    console.error(e);
    return { result: null, error: "Failed to create opponents. Please try again." };
  }
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
      {pending ? "Generating Opponents..." : "Generate AI Opponents"}
    </Button>
  );
}

export default function TournamentsPage() {
  const initialState: State = { result: null, error: null };
  const [state, formAction] = useFormState(createOpponentsAction, initialState);
  const [opponentCount, setOpponentCount] = React.useState(8);
  const tournamentBanner = PlaceHolderImages.find(img => img.id === 'tournament-banner');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-headline text-3xl">Global Tournaments</h2>
        <p className="text-muted-foreground">
          Compete in weekly events on trending topics. First, let's create some AI opponents for the bracket.
        </p>
      </div>

      <Card>
        {tournamentBanner && (
            <Image 
                src={tournamentBanner.imageUrl}
                alt="Tournament Banner"
                width={1200}
                height={300}
                data-ai-hint={tournamentBanner.imageHint}
                className="aspect-[4/1] w-full rounded-t-lg object-cover"
            />
        )}
        <CardHeader>
          <CardTitle>Weekly Trending Tournament: The Singularity Sprint</CardTitle>
          <CardDescription>A debate tournament about the future of AI.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Create Bot Opponents</CardTitle>
              <CardDescription>Fill the tournament bracket with some fresh AI talent.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={formAction} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="tournamentName">Tournament Name</Label>
                  <Input id="tournamentName" name="tournamentName" defaultValue="The Singularity Sprint" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numberOfAIOpponents">Number of Opponents: {opponentCount}</Label>
                  <Input id="numberOfAIOpponents" name="numberOfAIOpponents" type="hidden" value={opponentCount} />
                  <Slider
                    defaultValue={[opponentCount]}
                    max={32}
                    min={4}
                    step={1}
                    onValueChange={(value) => setOpponentCount(value[0])}
                  />
                </div>
                <SubmitButton />
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="min-h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users /> Generated Roster</CardTitle>
              <CardDescription>The AI opponents ready to enter the arena.</CardDescription>
            </CardHeader>
            <CardContent>
              {state.error && <p className="text-destructive">{state.error}</p>}
              {state.result ? (
                <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                  {state.result.aiOpponentNames.map((name, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Bot className="size-4 text-primary" />
                      <span>{name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Your generated opponents will appear here.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
