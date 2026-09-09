export function StepIndicator({ steps, currentStep }: { steps: string[]; currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((label, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={`h-8 w-8 grid place-items-center rounded-full text-xs font-bold border transition-colors ${done ? 'bg-white text-black border-white' : active ? 'bg-primary text-black border-primary' : 'bg-white/5 border-white/10 text-zinc-500'}`}>
              {done ? '✓' : i+1}
            </div>
            <span className={`text-xs font-medium hidden sm:inline tracking-wide ${active ? 'text-white' : done ? 'text-zinc-300' : 'text-zinc-500'}`}>{label}</span>
            {i < steps.length-1 && <div className={`hidden sm:block h-px w-8 ${done ? 'bg-white' : 'bg-white/10'}`} />}
          </div>
        );
      })}
    </div>
  );
}
