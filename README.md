# Axiom Studio

> **Physics you can actually touch.**

Axiom Studio turns any browser into a real physics lab — no account, no setup, free. Every experiment follows one loop: **Predict → Experiment → Understand**, with an AI tutor (**Axion**) that reads your own numbers and explains exactly why what happened, happened.

🚀 **Live:** https://axiom-studio20.vercel.app
🏆 Built for **DHS Hacks**

## The four modules

- **Projectile Motion** — kinematics; find the angle that outranges them all.
- **Pendulum** — harmonic motion; the period cares about length, not swing angle.
- **Collisions** — conservation laws; momentum survives, kinetic energy may not.
- **Orbital Mechanics (3D)** — gravitation; the razor line between orbit, crash, and escape.

The simulations run genuine physics engines with **4th-order Runge–Kutta (RK4)** integration — not canned animations — so the readouts stay trustworthy and Axion's explanations stay honest.

## Demo

A 2:10 walkthrough video plus submission write-ups live in [`demo/`](demo):

- [`Axiom_Studio_Demo.mp4`](demo/Axiom_Studio_Demo.mp4) — 1080p demo video with voiceover + captions
- [`ABOUT.md`](demo/ABOUT.md) — full write-up (inspiration, build, challenges, learnings)
- [`DEMO_SCRIPT.md`](demo/DEMO_SCRIPT.md) — narration script with timestamps
- [`YOUTUBE_DESCRIPTION.md`](demo/YOUTUBE_DESCRIPTION.md) · [`TAGLINES.md`](demo/TAGLINES.md)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment

The Axion AI tutor uses the Groq API. Create a `.env.local` with:

```bash
GROQ_API_KEY=your_key_here
```

## Tech stack

- **Next.js** (App Router) + React
- **RK4 integration** for stable, accurate physics
- **Groq API** powering the Axion tutor
- Deployed on **Vercel**
