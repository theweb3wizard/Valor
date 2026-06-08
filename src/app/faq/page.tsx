import Image from 'next/image';
import Link from 'next/link';

const faqs = [
  {
    q: 'What is Valor?',
    a: 'Valor is an AI agent that lives in your Telegram group. It reads every message, evaluates its quality using AI (Gemini 2.5 Flash), and automatically sends USDC tips to contributors who provide genuine value. No commands, no voting, no humans in the loop.',
  },
  {
    q: 'How is Valor different from a tipping bot?',
    a: 'Tipping bots like tip.cc wait for someone to type a command like /tip @user. Valor is an autonomous agent — it watches, evaluates, and decides on its own. It rewards merit continuously, not when someone remembers to tip.',
  },
  {
    q: 'Do I need to know anything about crypto to use Valor?',
    a: 'As a community admin, you need to fund a treasury wallet with USDC on the Base network. This requires basic familiarity with cryptocurrency wallets and transfers. As a contributor, you just need a Telegram account — Valor creates a wallet for you automatically.',
  },
  {
    q: 'What does Valor cost?',
    a: 'Valor offers a Free plan (1 community, 100 evaluations/month, 10 tips/month). Paid plans start at $29/month for Starter and $79/month for Pro. All plans include AI evaluation and USDC tipping. You only pay Vercel infrastructure costs on top.',
  },
  {
    q: 'Which blockchain does Valor use?',
    a: 'Valor uses the Base network (Coinbase L2) for all USDC transfers. This keeps transaction fees extremely low (typically under $0.01 per transfer). The network is configured via the CDP_NETWORK_ID environment variable.',
  },
  {
    q: 'Is Valor safe to add to my group?',
    a: 'Yes. Valor does not store private keys or seed phrases — wallets are managed by the Coinbase CDP. The bot only reads messages that are sent to the group (it cannot read your DMs with other members). All tipping is subject to configurable rate limits and cooldown periods.',
  },
  {
    q: 'How does the AI decide who gets tipped?',
    a: 'Gemini 2.5 Flash evaluates each message and returns a quality score from 0 to 10. Messages that score at or above your community\'s threshold (default: 7) get tipped. The AI rewards accurate answers, technical explanations, and genuine insight. It penalizes spam, self-promotion, and low-effort content.',
  },
  {
    q: 'Can I adjust the scoring?',
    a: 'Yes. Community admins can configure: minimum score threshold, tip amounts for different score ranges, daily tip limit per user, and a 30-minute cooldown between tips. You can also provide custom context to help the AI understand your community.',
  },
  {
    q: 'How do contributors claim their USDC?',
    a: 'When a contributor receives a tip, Valor posts a message in the group with a link to the claim page. Contributors visit the link, enter their destination EVM wallet address, and withdraw their USDC. No registration or login required.',
  },
  {
    q: 'What happens if the treasury runs out of USDC?',
    a: 'Valor checks the treasury balance before every tip. If the balance is insufficient, the tip is recorded as &quot;failed&quot; with reason &quot;insufficient treasury.&quot; The admin receives a notification to refill the treasury. No invalid transactions are attempted.',
  },
  {
    q: 'Can I use Valor with multiple Telegram groups?',
    a: 'Yes. Valor supports multiple communities under a single account. Each community has its own bot, treasury wallet, and configuration. The Free plan includes 1 community, Starter includes 1, Pro includes 5, and Business includes unlimited communities.',
  },
  {
    q: 'What data does Valor collect?',
    a: 'Valor collects Telegram user IDs, usernames, and message text for evaluation. Message text is sent to Gemini for scoring and is not stored after evaluation — only the score and reason are saved. We also store wallet addresses for tipping. See our full <Link href="/privacy" className="text-primary underline-offset-2 hover:underline">Privacy Policy</Link>.',
  },
  {
    q: 'How do I get started?',
    a: '1. Sign up at <Link href="/login" className="text-primary underline-offset-2 hover:underline">valorapp.com</Link> 2. Create a bot via Telegram\'s @BotFather 3. Add the bot to your group as an admin 4. Fund the treasury wallet with USDC on Base. That\'s it — valor starts evaluating and tipping immediately.',
  },
  {
    q: 'What if something goes wrong?',
    a: 'Valor has multiple safety layers: idempotency keys prevent duplicate tips, rate limits prevent abuse, treasury balance checks prevent failed transfers, and all errors are logged with full context. If you encounter an issue, contact us at hello@valorapp.com.',
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-block mb-8">
          <Image src="/logo.svg" alt="Valor" width={80} height={20} className="h-5 w-auto" priority />
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-8 mb-2">Frequently Asked Questions</h1>
        <p className="text-sm text-muted-foreground mb-8">Everything you need to know about Valor.</p>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <details key={i} className="rounded-xl border border-border bg-card overflow-hidden">
              <summary className="px-6 py-4 cursor-pointer font-medium text-foreground hover:bg-muted/50 transition-colors list-none flex items-center justify-between">
                {faq.q}
                <span className="text-muted-foreground shrink-0 ml-4">+</span>
              </summary>
              <div className="px-6 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
