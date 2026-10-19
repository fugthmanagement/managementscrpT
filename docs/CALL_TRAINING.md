# FUGTH Call Training

## Where it lives

Sign in with a verified FUGTH founder account and open **Cold Calling → Call Training**. The separate Pierre's Call Map tab and its real Firestore prospects stay unchanged.

## Using the simulator

1. Enter a practice business name and choose **Warm-up**, **Realistic**, **Hard**, or **Expert**.
2. Select the simulated prospect (friendly owner, busy contractor, skeptic, existing website, price-sensitive owner, gatekeeper, or a surprise persona).
3. Pick an existing Pierre sales approach from the five available scripts.
4. Press **Start practice call** to hear a fictional prospect greet you, when browser speech synthesis is supported.
5. Speak using the browser microphone with **Speak my answer**. Optional automatic turn-taking opens the mic after the prospect stops speaking. If speech recognition is unsupported or permission is denied, type your line and press Reply.
6. Realistic scripted rules adjust the buyer's next response to the trainee's words, objections, and difficulty. This is a deterministic simulator, **not an unrestricted generative AI model**.
7. The Live Coach suggests a next move. Open Pierre's original clickable branching map inline; you can manually select Yes/No branches or have it follow the simulated conversation.
8. Review a score by skill, a simulated outcome, an optional exported text transcript and locally saved recent scores.

## Privacy and cost boundaries

- No live calls, phone numbers, carrier forwarding, voice vendor API, Vapi, ElevenLabs, Google Voice, appointments or emails are created by this mode. Practice never writes prospect records to Firestore.
- FUGTH itself does **not receive or store** practice audio or full transcripts. But browser speech recognition (notably Chrome) **may send audio to the browser vendor's remote recognition service**, and therefore is not necessarily local or offline. The app says so.
- Only summarized results for the last 12 completed sessions are saved in the current browser's localStorage. They are removable with **Clear history**. A full transcript can be exported locally on demand.
- Mic/voices vary by browser. Desktop Chrome or Edge is a good starting point. Typed fallback works without speech support. Headphones reduce echo and accidentally transcribed computer voice.
- The original full Pierre map retains its original lead draft. A special practice-only iframe query mode isolates Call Training from that browser data; CRM documents are never modified through the simulator.

## Future optional computer-hosted speech engine

A later local gateway could use whisper.cpp or faster-whisper for streaming speech-to-text, Piper or another local TTS voice, and llama.cpp for a more flexible simulated prospect. It would require secured WebSockets, authentication, local deployment, device-specific performance testing and explicit opt-in. It was **not** implemented in this pass.

## Regression and rollout

- Pure scenario tests are in tests/call-training.test.mjs.
- The existing GitHub Actions build workflow was updated to run tests and the full Next.js build on commits to main.
- Manually test voice turns, typed fallback, stopping/restarting, mobile layout, and the original Pierre draft isolation.
- **Deployment verification remains separate:** a committed change is not necessarily live. Vercel has shown a build-rate-limit status and restricted project/team access. Confirm a new deployment for the final commit reaches READY before declaring this feature available on production.