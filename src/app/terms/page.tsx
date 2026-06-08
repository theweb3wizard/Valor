import Image from 'next/image';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-block mb-8">
          <Image src="/logo.svg" alt="Valor" width={80} height={20} className="h-5 w-auto" priority />
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-8 mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: June 7, 2026</p>

        <section className="space-y-6 text-muted-foreground leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
            <p>By using Valor (&quot;the Service&quot;), you agree to these Terms of Service. If you do not agree, do not use the Service.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">2. Description of Service</h2>
            <p>Valor is an AI-powered platform that automatically evaluates Telegram messages and rewards quality contributions with USDC cryptocurrency on the Base blockchain. The Service operates autonomously — no human intervention is required for tipping decisions.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">3. Eligibility</h2>
            <p>You must be at least 18 years old to use the Service. By using the Service, you represent that you meet this requirement and that your use complies with all applicable laws in your jurisdiction.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">4. Community Admin Responsibilities</h2>
            <p>As a community admin, you are responsible for:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Funding the treasury wallet with USDC on Base network</li>
              <li>Configuring scoring thresholds and tip amounts appropriate for your community</li>
              <li>Ensuring your community&apos;s rules and culture are compatible with automated rewards</li>
              <li>Complying with all applicable laws regarding cryptocurrency tipping and rewards</li>
              <li>Maintaining the security of your Telegram bot token</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">5. Contributor Terms</h2>
            <p>As a contributor receiving tips, you understand that:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Tips are discretionary and based on AI evaluation — there is no guarantee of payment for any message</li>
              <li>Cryptocurrency transactions on Base network are irreversible once confirmed</li>
              <li>You are responsible for any taxes owed on tips received</li>
              <li>Withdrawals to external wallets are processed through the Coinbase CDP and subject to network fees</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">6. Fees and Payments</h2>
            <p>Valor offers paid subscription plans (Starter, Pro, Business) processed through Paddle. Subscription fees are charged monthly and are non-refundable except as outlined in our Refund Policy. Cryptocurrency network fees (gas) for USDC transfers are paid from the community treasury.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">7. Prohibited Uses</h2>
            <p>You may not use Valor for:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Any illegal activity or transaction</li>
              <li>Gaming or manipulating the AI evaluation system</li>
              <li>Spamming, fraud, or deceptive practices</li>
              <li>Harassment, abuse, or harmful content</li>
              <li>Violating Telegram&apos;s Terms of Service</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">8. Limitation of Liability</h2>
            <p>Valor is provided &quot;as is&quot; without warranty of any kind. To the maximum extent permitted by law, we are not liable for any damages arising from your use of the Service, including but not limited to loss of funds, data, or business interruption. The total liability of Valor shall not exceed the amount paid by you in the 12 months preceding the claim.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">9. Changes to Terms</h2>
            <p>We may update these terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms. We will notify community admins of material changes via email.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">10. Contact</h2>
            <p>For questions about these terms: <a href="mailto:hello@valorapp.com" className="text-primary underline-offset-2 hover:underline">hello@valorapp.com</a></p>
          </div>
        </section>
      </div>
    </div>
  );
}
