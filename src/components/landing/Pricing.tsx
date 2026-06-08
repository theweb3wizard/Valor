import Link from 'next/link';

interface PlanCard {
  name: string;
  price: string;
  description: string;
  communities: string;
  evaluations: string;
  tips: string;
  popular?: boolean;
  cta: string;
  href: string;
}

const plans: PlanCard[] = [
  {
    name: 'Free',
    price: '$0',
    description: 'For small communities getting started',
    communities: '1 community',
    evaluations: '100 / month',
    tips: '10 / month',
    cta: 'Get started',
    href: '/login',
  },
  {
    name: 'Starter',
    price: '$29',
    description: 'For growing communities',
    communities: '1 community',
    evaluations: '2,000 / month',
    tips: '200 / month',
    cta: 'Subscribe',
    href: '/login',
  },
  {
    name: 'Pro',
    price: '$79',
    description: 'For serious community builders',
    communities: '5 communities',
    evaluations: '10,000 / month',
    tips: '1,000 / month',
    popular: true,
    cta: 'Subscribe',
    href: '/login',
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-4">
          Simple, transparent pricing
        </h2>
        <p className="text-muted-foreground text-center mb-16 max-w-lg mx-auto">
          Pay only for what you use. All plans include AI evaluation and USDC tipping.
        </p>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl border ${
                plan.popular ? 'border-primary' : 'border-border'
              } bg-card p-8 space-y-6`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Most Popular
                </span>
              )}
              <div>
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  {plan.communities}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  {plan.evaluations}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  {plan.tips}
                </li>
              </ul>
              <Link
                href={plan.href}
                className={`block text-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                  plan.popular
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border border-border text-foreground hover:bg-muted'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          Need unlimited communities?{' '}
          <a href="mailto:hello@valorapp.com" className="text-primary underline-offset-2 hover:underline">
            Talk to us →
          </a>
        </div>

        <div className="mt-16 flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
          <span>⚡ Built on Base — sub-cent transactions</span>
          <span>🤖 Powered by Gemini AI</span>
          <span>🏦 Paddle Merchant of Record — VAT handled globally</span>
        </div>
      </div>
    </section>
  );
}
