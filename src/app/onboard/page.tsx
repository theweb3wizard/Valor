'use client';
import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { StepIndicator } from '@/components/onboarding/StepIndicator';
import { StepNameCommunity } from '@/components/onboarding/steps/StepNameCommunity';
import { StepConnectBot } from '@/components/onboarding/steps/StepConnectBot';
import { StepAddToGroup } from '@/components/onboarding/steps/StepAddToGroup';
import { StepFundTreasury } from '@/components/onboarding/steps/StepFundTreasury';

const STEPS = ['Name', 'Connect', 'Install', 'Fund'];

export default function OnboardPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [communityName, setCommunityName] = useState('');
  const [botToken, setBotToken] = useState('');
  const [botUsername, setBotUsername] = useState('');
  const [communityId, setCommunityId] = useState('');
  const [treasuryAddress, setTreasuryAddress] = useState('');

  const handleNameNext = useCallback((name: string) => { setCommunityName(name); setCurrentStep(1); }, []);
  const handleBotVerified = useCallback((token: string, username: string) => { setBotToken(token); setBotUsername(username); setCurrentStep(2); }, []);
  const handleCommunityCreated = useCallback((id: string, address: string) => { setCommunityId(id); setTreasuryAddress(address); setCurrentStep(3); }, []);

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 mesh-glow opacity-50" />
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <Card className="relative w-full max-w-xl border-white/10 bg-zinc-900/80 backdrop-blur-xl rounded-[28px] overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-violet-600 via-primary to-emerald-500" />
        <CardContent className="pt-8 pb-8">
          <div className="text-center mb-6">
            <p className="text-xs tracking-[0.2em] text-zinc-500">ONBOARD • FREE FOREVER</p>
            <h1 className="text-2xl mt-1">Launch your community</h1>
            <p className="text-sm text-zinc-500">60s • deterministic treasury • Base</p>
          </div>
          <StepIndicator steps={STEPS} currentStep={currentStep} />
          {currentStep === 0 && <StepNameCommunity onNext={handleNameNext} />}
          {currentStep === 1 && <StepConnectBot onNext={handleBotVerified} />}
          {currentStep === 2 && <StepAddToGroup communityName={communityName} botToken={botToken} botUsername={botUsername} onCreated={handleCommunityCreated} />}
          {currentStep === 3 && <StepFundTreasury communityId={communityId} treasuryAddress={treasuryAddress} botUsername={botUsername} />}
        </CardContent>
      </Card>
    </div>
  );
}
