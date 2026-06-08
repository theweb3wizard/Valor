interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-12">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
              i <= currentStep
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {i + 1}
          </div>
          <span
            className={`text-sm hidden sm:inline ${
              i <= currentStep ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {label}
          </span>
          {i < steps.length - 1 && (
            <div
              className={`hidden sm:block h-px w-8 ${
                i < currentStep ? 'bg-primary' : 'bg-border'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
