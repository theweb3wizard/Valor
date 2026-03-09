# **App Name**: Valor

## Core Features:

- Genkit AI Message Evaluation Flow: A Genkit flow leveraging the Gemini model that acts as a tool to analyze Telegram messages. It returns a quality score (0-10), a one-sentence reason, and a 'should_tip' boolean (true if score 7+), based on criteria like clarity, information value, and problem-solving, while penalizing low-quality content. It outputs structured JSON.
- Real-time Telegram Monitoring and Notification: A Telegram bot that monitors group messages in real-time. For each message, it calls the Genkit AI Evaluation Flow. If a tip is warranted ('should_tip' is true), it logs the event and notifies the group with a confirmation message.
- Autonomous Agent Activity Log Dashboard: A clean web UI providing a live feed of all message evaluations. Each entry displays username, message preview, quality score, reason, tip status, and timestamp. This dashboard serves as proof of the agent's autonomous operation.
- Simulated USDT Tipping: A temporary layer that simulates USDT tips by logging 'TIP SENT: 2 USDT to @username' with a pending status in the Activity Log Dashboard, in lieu of actual wallet integration.

## Style Guidelines:

- Primary color: Warm amber/gold (#F5A623) for key elements, reflecting merit, worth, and reward.
- Background color: Deep dark (#0F1117) to provide a sophisticated, premium feel and maintain focus.
- Secondary color: Clean white text for readability against the dark background.
- Body and headline font: 'Inter' (sans-serif) for its modern, clean, and objective aesthetic, suitable for technical output and clear readability.
- Use sleek, minimalist icons that align with themes of intelligence, analysis, quality assessment (e.g., stars, badges, AI brain symbols), and communication.
- Implement a structured and clean layout specifically for the Activity Log Dashboard, prioritizing clarity and ease of comprehension for the AI's feedback.
- Incorporate subtle loading animations or transition effects to provide user feedback during the AI message evaluation process, indicating activity without distraction.