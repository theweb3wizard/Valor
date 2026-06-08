export function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Install the bot',
      description: 'Add Valor to your Telegram group in 60 seconds. No commands to configure.',
    },
    {
      number: '02',
      title: 'Fund the treasury',
      description:
        'Send USDC to your community wallet on Base. You control the budget entirely.',
    },
    {
      number: '03',
      title: 'Let Valor work',
      description:
        'AI evaluates every message. Top contributors get paid automatically. No humans in the loop.',
    },
  ];

  return (
    <section id="how-it-works" className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-4">
          How it works
        </h2>
        <p className="text-muted-foreground text-center mb-16 max-w-lg mx-auto">
          Three steps to start rewarding your best community members automatically.
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-xl border border-border bg-card p-8 space-y-4"
            >
              <span className="text-4xl font-bold text-primary/40">{step.number}</span>
              <h3 className="text-xl font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
