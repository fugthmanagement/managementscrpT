# FUGTH local GGUF business agent

## What was implemented

Each business website can select **Verified facts only**, **Local GGUF**, or **Off** in Website Maker and can assign a **0.5B** or **1.5B** model. The choice is stored with that site's published profile.

The public assistant retrieves only the **publicly published information belonging to that same business UID**: name, description, about text, listed services, public hours, area, business contact details and approved FAQ entries. It does not query private Firestore customers, calls, passwords, invoices, medical data, or entire Google Drive accounts.

A fast rule/keyword relevance filter executes before inference. Obvious unrelated history, math, politics, entertainment, DIY advice, prompt-injection instructions, and unrelated product questions are rejected. Weak business-keyword matches can optionally use a separately secured 0.5B relevance model. The chosen main model receives a short evidence-only prompt, and answers with unsupported numbers or weak evidentiary overlap are discarded. If no facts exist or the model is unavailable, the visitor receives a conservative deterministic answer. No mechanism guarantees an LLM never hallucinates: the strongest safety mode is Verified facts only.

## Hugging Face and llama.cpp

The connected Hugging Face identity is https://huggingface.co/fugthchat but the actual two GGUF **repository IDs and filenames are not yet verified**. Upload the models and ensure their licenses permit commercial use. A model repository stores files; Hugging Face storage alone does NOT run an inference API. The model must be served by an always-on computer or hosted inference provider.

Choose an instruction-tuned model and test a 4-bit quantization such as Q4_K_M. Install the llama.cpp executable for your computer and place the GGUF on local disk.

Example 1.5B server (replace filename and key with actual values):

    llama-server -m "C:/models/your-1.5b-q4.gguf" --alias fugth-1.5b --host 127.0.0.1 --port 8080 --api-key LONG_RANDOM_SECRET --ctx-size 2048

Optional separate 0.5B instance (memory permitting):

    llama-server -m "C:/models/your-0.5b-q4.gguf" --alias fugth-0.5b --host 127.0.0.1 --port 8081 --api-key LONG_RANDOM_SECRET --ctx-size 1536

Alternatively use a model router that accepts aliases for both models on one endpoint. On a Celeron N3160 and 8 GB RAM, run just one model initially, since two concurrent engines can be slow and consume memory. Text chat should be tested before real-time voice calling.

llama.cpp supports a compatible POST /v1/chat/completions endpoint. Test it locally with a non-sensitive prompt and confirm GET /v1/models returns the configured alias.

**Never publicly expose a plain-HTTP or unauthenticated server.** Bind llama.cpp to 127.0.0.1 and use a secured HTTPS reverse proxy/tunnel with a stable hostname and API-key authentication. Vercel cannot access localhost on your home computer. Keep the API token on the server only, never inside a website.

## Vercel production environment variables

Set these server-side (no NEXT_PUBLIC prefix):

| Variable | Value |
|---|---|
| FUGTH_LOCAL_AGENT_URL | An HTTPS endpoint such as https://your-protected-model-host.example/v1 |
| FUGTH_LOCAL_AGENT_API_KEY | The long random key matching the serving proxy |
| FUGTH_LOCAL_AGENT_MODEL_1_5B | 1.5B model alias, e.g. fugth-1.5b |
| FUGTH_LOCAL_AGENT_MODEL_0_5B | 0.5B model alias, e.g. fugth-0.5b |
| FUGTH_LOCAL_AGENT_GATE_URL | Optional independent HTTPS endpoint for small-model classification |

Redeploy after changing production environment variables. Open Dashboard -> Website Maker -> Your site's own business agent. Select Local GGUF, choose a model and **save/publish** the website. The UI includes an authenticated server-readiness check and lists missing settings. If not configured the assistant uses published facts only.

The server imposes an in-memory rate limit of 12 requests per site/client in five minutes. It is NOT a durable global rate limit across multiple serverless instances; add a managed edge/WAF or Redis limiter before broad traffic. No visitor conversation is written to the FUGTH database by the public chat route, though the independent inference server may keep logs depending on how you configure it.

## Google redirect mismatch

Google Cloud Console -> Google Auth Platform -> Clients -> the Web OAuth client matching the one shown in FUGTH Settings -> Connections. Add this exact **Authorized redirect URI**:

    https://www.fugthmanagement.space/api/integrations/google/callback

The app now exposes the effective URI and OAuth client ID in Settings -> Connections. It prefers the canonical production callback even when the visitor starts from the apex domain. GOOGLE_OAUTH_REDIRECT_URI can override the redirect only to a trusted HTTPS callback. The same URI must be authorized in Google Cloud, exactly matching scheme, host, path and slash.

Also enable **Google Calendar API** and **Google Drive API** in the same Cloud project; these are separate from the redirect fix. Configure Branding, Audience, Data Access and external app test users or Google OAuth verification as needed. If testing, the test Google account must be explicitly included in Test users.

Vercel integration access currently does not permit inspecting or updating this project's production secrets; a project admin must verify them. Never paste the Google Client Secret or model API key in public tickets, chat or source.

## Regression tests / limitations

- What services do you offer? -> only those listed for this business.
- Is your business open on Sunday? -> use published hours only.
- Can you repair an appliance that isn't listed? -> cannot confirm, contact staff.
- What caused the French Revolution? -> business-only refusal before LLM.
- Are you licensed? with no published proof -> cannot confirm.
- Can you book me Tuesday? -> contact or REQUEST only; no confirmed calendar booking from this text chatbot.

Future work: approved owner-uploaded knowledge chunks, embeddings and reranking for larger datasets, durable per-tenant retrieval indices, real-time streaming audio transport, dedicated transcription/TTS servers, durable rate limits and latency benchmarks. Training a voice agent with your Pierre script is separate from the public business Q&A mode.
