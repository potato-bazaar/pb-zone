# PB Zone — Game Economy & Scoring Logic

Functional Requirements Document — Coin vs PB Points

## 1. Executive Rule

PB Zone has two independent reward systems: **PB Coins** are spendable game currency; **PB Points** (shown as PB Score on the leaderboard) measure competitive achievement. Coins must never be convertible into Points.

| PB Coins | PB Points / PB Score |
| --- | --- |
| Spendable; used for boosters, extra moves, cosmetics and gifts. | Non-spendable; used for leaderboard ranking and achievement progress. |
| Persistent balance. | Season score resets each leaderboard season; lifetime Points remain. |
| Can reward participation. | Must reward skill, accuracy, speed, difficulty and successful objectives. |
| May continue after daily Point cap. | Subject to daily and game-specific Point caps. |

## 2. Global Economy Rules

- Coins reward engagement; Points reward performance.
- Wrong answers and failed attempts normally give 0 Points, not negative Points.
- Coins cannot be exchanged for Points and cannot affect leaderboard position.
- Purchasing a booster with Coins never directly awards Points.
- Daily Point caps are enforced server-side. Coin earning can continue after the Point cap.
- Season Points determine leaderboard rank. Lifetime Points determine permanent reward milestones.
- The server is authoritative for wallets, scores, streaks, rewards and prize eligibility.
- Every scoring event must have a unique event/session ID so it cannot be credited twice.

## 3. Player Data Model

| Field | Purpose | Example |
| --- | --- | --- |
| pb_coins_balance | Spendable wallet | 2,450 |
| season_points | Current leaderboard score | 3,850 |
| lifetime_points | Permanent achievement progress | 18,450 |
| daily_points_earned | All-game Points earned today | 620 |
| game_daily_points | Points earned today in one game | 180 |
| streak_count | Current successful streak | 5 |
| season_rank | Current rank | #18 |
| highest_reward_unlocked | Latest lifetime milestone | PB Cap |

## 4. Recommended Global Controls

| Control | Recommended value | Why |
| --- | --- | --- |
| Global daily Point ceiling | 1,000 | Stops unlimited grinding. |
| Quiz cap/day | 300 | High-value knowledge game. |
| Tater Match cap/day | 300 | Puzzle skill. |
| Spud Run cap/day | 250 | Reflex/endurance. |
| Scramble cap/day | 250 | Speed + knowledge. |
| Guess Potato Disease cap/day | 300 | Agronomy knowledge. |
| Fix the Puzzle cap/day | 250 | Logic. |
| Connect Potatoes cap/day | 250 | Sequence/pattern. |
| Potato Stack cap/day | 200 | Timing. |
| Basket Blitz cap/day | 200 | Speed/accuracy. |
| Mash Master cap/day | 200 | Timing/rhythm. |

## 5. Game Summary Matrix

| Game | Skill | Main PB Point driver | Main Coin driver | Daily Point cap |
| --- | --- | --- | --- | --- |
| Quiz | Knowledge + speed | Correct answer, difficulty, speed, streak | Correct answers + completion + streak | 300 |
| Tater Match | Pattern recognition | Matches, combos, stars, efficiency | Matches + completion | 300 |
| Spud Run | Reflex + endurance | Distance, objectives, avoidance | Distance + collectibles + completion | 250 |
| Scramble | Knowledge + speed | Correct word, difficulty, speed, streak | Attempts + correct + completion | 250 |
| Guess Potato Disease | Agronomy knowledge | Diagnosis, clues, speed | Completion + correct diagnosis | 300 |
| Fix the Puzzle | Logic + spatial skill | Accuracy, moves, speed | Completion + perfect solve | 250 |
| Connect Potatoes | Sequence + pattern | Correct links, accuracy, speed | Completed chain + streak | 250 |
| Potato Stack | Timing + precision | Height, perfect landings | Height + completion | 200 |
| Basket Blitz | Speed + sorting | Correct items, combos, speed | Items + completion | 200 |
| Mash Master | Timing + rhythm | Timing quality, combos | Actions + completion | 200 |

## 6. Quiz — Detailed Scoring

| Difficulty | Base Points | Coins/correct | Suggested timer |
| --- | --- | --- | --- |
| Easy | 5 | 2 | 10 sec |
| Medium | 8 | 3 | 10 sec |
| Hard | 12 | 4 | 12 sec |
| Expert | 20 | 5 | 15 sec |

| Event | PB Points | PB Coins | Rule |
| --- | --- | --- | --- |
| Correct answer | Difficulty base | +2 to +5 | Primary skill reward. |
| Answer in fastest band | +5 | +1 | 0–2 sec. |
| Fast answer | +3 | +1 | 2–4 sec. |
| Normal speed | +2 | 0 | 4–7 sec. |
| Slow valid answer | +1 | 0 | Final valid time band. |
| Timeout / wrong | 0 | 0 | No penalty. |
| 3-correct streak | +3 | +3 | Bonus. |
| 5-correct streak | +8 | +5 | Bonus. |
| 7+ streak | +12/question | +5/question | Bonus is capped. |
| Complete 10 questions | +10 | +10 | Completion reward. |
| Perfect 10/10 | +25 | +20 | Additional bonus. |

Quiz formula: Question Points = Difficulty Base + Speed Bonus + Streak Bonus. Quiz Points = sum of Question Points + Completion Bonus + Perfect Bonus.

## 7. Tater Match

| Action | PB Points | PB Coins | Notes |
| --- | --- | --- | --- |
| Match 3 | +3 | +2 | Basic. |
| Match 4 | +6 | +4 | Higher skill. |
| Match 5+ | +10 | +7 | Rare/high-value. |
| Combo | +3/combo | +2/combo | Cap combo bonus. |
| Special potato | +5 | +3 | Skill-created power piece. |
| Level complete | +10 | +15 | Completion. |
| 1-star | +10 | +5 | Efficiency. |
| 2-star | +20 | +10 | Better efficiency. |
| 3-star | +40 | +15 | Excellent. |
| Perfect level | +50 | +20 | Optional milestone. |

## 8. Spud Run

| Achievement | PB Points | PB Coins |
| --- | --- | --- |
| 100m | +2 | +3 |
| 500m | +8 | +8 |
| 1,000m | +15 | +15 |
| 1,500m finish | +30 | +30 |
| PB collectible | +1 | +1 |
| Obstacle avoided | +1 | +1 |
| Perfect section | +10 | +5 |
| No-collision run | +25 | +10 |
| New personal best | +30 | +15 |

Award distance Points at server-validated checkpoints rather than every meter/frame.

## 9. Scramble

| Event | PB Points | PB Coins |
| --- | --- | --- |
| Correct easy word | +8 | +3 |
| Correct hard word | +12 | +5 |
| Correct expert word | +18 | +7 |
| Fast answer | +3 | +1 |
| 3-word streak | +5 | +3 |
| 5-word streak | +10 | +5 |
| Complete round | +10 | +10 |
| Perfect round | +25 | +15 |
| Use hint | -2 potential | +0 |

## 10. Guess Potato Disease

Educational potato-crop identification game. Players identify disease/symptom scenarios; the game is not a substitute for professional agronomy diagnosis.

| Event | PB Points | PB Coins |
| --- | --- | --- |
| Correct — easy | +5 | +3 |
| Correct — medium | +8 | +4 |
| Correct — hard | +12 | +5 |
| Correct — expert | +20 | +7 |
| Correct before clue 2 | +5 | +2 |
| Correct after clue 2 | +2 | +1 |
| Correct after clue 3 | +1 | 0 |
| Wrong diagnosis | 0 | 0 |
| Complete session | +10 | +10 |
| Perfect session | +25 | +20 |

More clues reduce the maximum Point score for that case. Accuracy plus diagnostic efficiency is the competitive skill.

## 11. Fix the Puzzle

| Performance | PB Points | PB Coins |
| --- | --- | --- |
| Correct placement | +2 | +1 |
| 5 correct in sequence | +8 | +4 |
| Complete puzzle | +10 | +10 |
| Solve within target moves | +20 | +10 |
| Minimum-move solve | +35 | +15 |
| Under target time | +10 | +5 |
| Use hint | -3 potential | 0 |
| Wrong placement | 0 | 0 |

## 12. Connect Potatoes

Connect numbered potatoes in order: 1 → 2 → 3 → … → N while avoiding forbidden areas.

| Performance | PB Points | PB Coins |
| --- | --- | --- |
| Correct connection | +2 | +1 |
| Complete 1→N chain | +20 | +10 |
| Fast completion | +10 | +5 |
| No wrong connection | +15 | +5 |
| Perfect chain | +25 | +10 |
| Wrong connection | 0 | 0 |
| Restart | 0 | 0 |

## 13. Potato Stack

| Performance | PB Points | PB Coins |
| --- | --- | --- |
| Successful stack | +1 | +1 |
| Perfect landing | +3 | +2 |
| 10-potato stack | +10 | +5 |
| 20-potato stack | +20 | +10 |
| 25+ stack | +30 | +15 |
| Challenge complete | +15 | +10 |
| Personal best | +25 | +10 |

## 14. Basket Blitz

| Performance | PB Points | PB Coins |
| --- | --- | --- |
| Correct item | +2 | +1 |
| Fast correct item | +4 | +2 |
| 5-correct combo | +8 | +4 |
| 10-correct combo | +15 | +8 |
| Wrong item | 0 | 0 |
| Round complete | +10 | +10 |
| Perfect round | +25 | +15 |

## 15. Mash Master

| Performance | PB Points | PB Coins |
| --- | --- | --- |
| Good timing | +2 | +1 |
| Great timing | +4 | +2 |
| Perfect timing | +6 | +3 |
| 5-perfect streak | +10 | +5 |
| 10-perfect streak | +20 | +10 |
| Round complete | +10 | +10 |
| Perfect round | +25 | +15 |

## 16. Daily Challenge

| Rule | Recommended logic |
| --- | --- |
| Frequency | One featured challenge per day. |
| Coin reward | +50 Coins, configurable. |
| Point reward | +75 PB Points, configurable. |
| Repeat | Replay may earn Coins; first successful completion only grants Daily Challenge Points. |
| Leaderboard | Daily Challenge Points count toward season score. |
| Server control | Challenge, eligibility and reset time are server-controlled. |

## 17. Streak Logic

| Streak | Coin bonus | Point bonus | Reset |
| --- | --- | --- | --- |
| 3 | +3 | +3 | Wrong/failed action |
| 5 | +5 | +8 | Wrong/failed action |
| 7 | +8 | +12 | Wrong/failed action |
| 10+ | +10 | +15 | Wrong/failed action |

Do not allow unlimited multiplier growth. Streak bonuses are capped and should have a daily ceiling.

## 18. Reward Milestones

| Lifetime PB Points | Unlock | Type |
| --- | --- | --- |
| 100 | PB Rookie Badge | Digital |
| 250 | PB Sticker Pack | Digital |
| 500 | PB Bottle | Basic gift |
| 1,000 | PB Cap / Pen | Basic gift |
| 2,500 | PB Bag | Physical gift |
| 5,000 | PB Champion Badge | Digital status |
| 10,000 | Premium PB Gift | Campaign-dependent |

Milestones use lifetime Points, so a monthly leaderboard reset does not remove previously earned achievements.

## 19. Monthly Leaderboard & Mega Prizes

| Rank | Qualification | Example prize |
| --- | --- | --- |
| #1 | Highest Season PB Score | Mobile phone / mega prize |
| #2 | Second-highest Season PB Score | Headphones / mega prize |
| #3 | Third-highest Season PB Score | Earbuds / mega prize |
| #4+ | All other ranked players | Keep all unlocked milestone rewards |

Prize inventory and eligibility must be configurable per season/campaign.

Tie-breakers: 1) more perfect performances; 2) higher validated accuracy; 3) earlier time reaching final score.

## 20. Anti-Farming & Anti-Cheat

- No Coins → Points conversion.
- No paid item directly grants leaderboard Points.
- Repeated replay of the same question/level cannot create unlimited Points.
- Daily Point caps are enforced server-side.
- Only first completion of a Daily Challenge grants its Point bonus.
- Personal-best bonuses are granted only after server validation.
- Question pools randomize and avoid immediate repeats.
- Game sessions should carry a server-issued session ID and version/seed where applicable.
- Impossible completion times, abnormal input rates or altered game state should invalidate the run.
- Invalid runs credit neither Coins nor Points.

## 21. Example Player Journey

| Moment | Coins | Season Points | Lifetime Points |
| --- | --- | --- | --- |
| Start day | 2,000 | 1,200 | 8,500 |
| Complete Quiz | 2,045 | 1,292 | 8,592 |
| Buy booster | 1,945 | 1,292 | 8,592 |
| Reach 500-point milestone | 1,980 | 1,500 | 8,800 |
| Season ends | 1,980 | Final: 7,850 | 15,650 |
| New season | 1,980 | 0 | 15,650 |

## 22. API / Ledger Requirements

| Record | Minimum fields |
| --- | --- |
| Coin transaction | player_id, event_id, game_id, delta, reason, timestamp |
| Point transaction | player_id, event_id, game_id, session_id, delta, breakdown, timestamp |
| Game session | session_id, player_id, game_id, version, start/end, outcome, validation_status |
| Season score | player_id, season_id, season_points, rank |
| Reward unlock | player_id, reward_id, threshold, unlocked_at, fulfilment_status |
| Prize eligibility | player_id, season_id, final_rank, validation_status, prize_id |

## 23. Product UX Rules

- Show Coins in the top wallet area and Points in score/leaderboard contexts.
- After every game show both rewards separately: "+XX PB Coins" and "+YY PB Points".
- Show progress toward the next lifetime reward: e.g. "420 / 500 Points → PB Bottle".
- Show leaderboard movement after a Point-bearing game: "#21 → #17".
- When daily Points are capped, say "Daily Points complete — keep playing to earn Coins."
- Never use the same icon, label or visual treatment for Coins and Points.

## 24. Final Economy Loop

PLAY → EARN COINS → USE COINS → IMPROVE/PLAY → EARN PB POINTS → UNLOCK GIFTS → CLIMB LEADERBOARD → TOP 3 → MEGA PRIZE

Recommended product principle: Coins create the short-term engagement loop; PB Points create the long-term achievement and competition loop. This prevents PB Zone from becoming pay-to-win while keeping every game rewarding.

---

## Implementation notes (client prototype)

- Points state lives in `src/lib/pb/pbPoints.ts` and is exposed through `PbPointsProvider`. The server is authoritative in production; the client mirrors the data model so screens work before the API exists.
- Scoring rules per game live in `src/lib/pb/scoring.ts`. Caps, milestones, season and prizes live in `src/data/pbEconomy.ts`.
- Potato Ninja is not in the FRD. It is scored as a timing/reflex game with a 200 PB daily cap until the FRD covers it.
