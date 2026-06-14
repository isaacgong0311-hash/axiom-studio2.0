# About Axiom Studio

## Inspiration

Every physics student knows the feeling: you memorize a formula, plug in the numbers, get the "right" answer — and still have no idea what actually happened. I'd spent years treating physics as a pile of equations to recall instead of a world to explore. The problem isn't that students aren't smart; it's that real labs are expensive, rare, and most of us never get to *touch* the thing we're studying.

I kept thinking about that gap between **knowing the formula** and **having intuition**. You can recite that a pendulum's period is

$$T = 2\pi\sqrt{\frac{L}{g}}$$

but until you double the length and *watch* your gut feeling about time quietly break, it doesn't really live in your head. I wanted to build the lab I wished I'd had — one that runs in any browser, costs nothing, and turns "memorize this" into "go find out."

## What it does

**Axiom Studio** turns any browser into a real physics lab. No account, no setup — just open it and start experimenting. Every experiment follows the same loop:

1. **Predict** — you commit to an answer *before* anything runs.
2. **Experiment** — you adjust parameters with sliders and run a real simulation.
3. **Understand** — **Axion**, an AI tutor, looks at your *specific* numbers and your *specific* prediction and explains exactly why what happened, happened.

It ships with four modules:

- **Projectile Motion** — find the launch angle that outranges them all. Range is maximized at $45^\circ$ because $R = \dfrac{v^2 \sin(2\theta)}{g}$ peaks when $\sin(2\theta) = 1$.
- **Pendulum** — discover that the period barely cares about swing angle; it's the length that matters.
- **Collisions** — momentum always survives the hit ($\sum m_i v_i$ is conserved), but kinetic energy has other plans.
- **Orbital Mechanics (3D)** — fling a planet and find the razor line between orbit, crash, and escape, where the circular-orbit speed $v_c = \sqrt{\dfrac{GM}{r}}$ and escape speed $v_{esc} = \sqrt{2}\,v_c$.

## How I built it

The whole thing is a browser-based app, so anyone with a link can use it instantly. The core is a set of **real physics engines**, not canned animations — the simulations integrate the actual equations of motion every frame.

For anything with curved or coupled dynamics (especially orbits), naive Euler integration drifts badly and "stable" orbits slowly spiral away. So I used **4th-order Runge–Kutta (RK4)** integration, which advances the state $y$ by sampling the derivative four times per step:

$$y_{n+1} = y_n + \frac{h}{6}\left(k_1 + 2k_2 + 2k_3 + k_4\right)$$

That keeps orbits stable and the readouts trustworthy, which matters because Axion's explanations are only as honest as the numbers behind them.

The **three-step learning loop** (predict → experiment → understand) is the heart of the UX: locking in a prediction first is what makes the "aha" land when the simulation disagrees with you. **Axion** ties it together by reading the live simulation state and the student's own prediction, then generating an explanation tailored to that exact run instead of a generic textbook paragraph.

The whole project is deployed and live at **axiom-studio20.vercel.app**.

## Challenges I faced

- **Making the physics *real*, not faked.** It's tempting to hard-code a pretty parabola. Getting genuine engines — and getting them numerically stable — was the hard part. The orbits module especially fell apart until I moved to RK4; before that, a "circular" orbit would visibly decay.
- **Designing for intuition, not just correctness.** A simulation that's accurate but overwhelming teaches nothing. Deciding *which* parameters to expose, what to put in the readouts, and how to frame each challenge took as much iteration as the code.
- **Making the AI tutor specific.** The easy version of an "AI tutor" just restates the formula. Getting Axion to actually reference the student's numbers and their prediction — to say *why your guess was off* — was the difference between a gimmick and something genuinely useful.
- **The prediction-first flow.** Forcing a commitment before the simulation runs is pedagogically powerful but easy to make annoying. Tuning that interaction so it feels like curiosity, not a quiz, was surprisingly delicate.

## What I learned

- **Intuition is built, not told.** The single biggest lesson: the learning happens in the *gap* between your prediction and reality. Designing around that gap changed everything about the product.
- **Numerical methods matter more than I expected.** I went in thinking the equations were the hard part; I came out understanding that *how you integrate them* (Euler vs. RK4) is what separates a toy from a tool.
- **Good explanations are personalized.** Generic correctness is cheap; relevance is what teaches. Pointing the AI at the learner's own data was the highest-leverage decision I made.
- **Constraints are a feature.** "Runs in any browser, free, no account" forced simplicity that made the whole thing better.

## What's next

- More modules (waves, circuits, thermodynamics) on the same predict → experiment → understand loop.
- Saveable experiments and shareable challenge links so teachers can assign them.
- Deeper Axion follow-ups — letting students keep asking "but what if…" and have the simulation answer.

---

*Built for DHS Hacks. Try it live: https://axiom-studio20.vercel.app*
