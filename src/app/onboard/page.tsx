'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { StepIndicator } from '@/components/onboarding/StepIndicator';
import { StepNameCommunity } from '@/components/onboarding/steps/StepNameCommunity';
import { StepConnectBot } from '@/components/onboarding/steps/StepConnectBot';
import { StepAddToGroup } from '@/components/onboarding/steps/StepAddToGroup';
import { StepFundTreasury } from '@/components/onboarding/steps/StepFundTreasury';

const STEPS = ['Name', 'Connect Bot', 'Install', 'Fund'];

export default function OnboardPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [communityName, setCommunityName] = useState('');
  const [botToken, setBotToken] = useState('');
  const [botUsername, setBotUsername] = useState('');
  const [communityId, setCommunityId] = useState('');
  const [treasuryAddress, setTreasuryAddress] = useState('');

  const handleNameNext = useCallback((name: string) => {
    setCommunityName(name);
    setCurrentStep(1);
  }, []);

  const handleBotVerified = useCallback((token: string, username: string) => {
    setBotToken(token);
    setBotUsername(username);
    setCurrentStep(2);
  }, []);

  const handleCommunityCreated = useCallback((id: string, address: string) => {
    setCommunityId(id);
    setTreasuryAddress(address);
    setCurrentStep(3);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="pt-8 pb-8">
          <StepIndicator steps={STEPS} currentStep={currentStep} />

          {currentStep === 0 && <StepNameCommunity onNext={handleNameNext} />}
          {currentStep === 1 && <StepConnectBot onNext={handleBotVerified} />}
          {currentStep === 2 && (
            <StepAddToGroup
              communityName={communityName}
              botToken={botToken}
              botUsername={botUsername}
              onCreated={handleCommunityCreated}
            />
          )}
          {currentStep === 3 && (
            <StepFundTreasury
              communityId={communityId}
              treasuryAddress={treasuryAddress}
              botUsername={botUsername}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
