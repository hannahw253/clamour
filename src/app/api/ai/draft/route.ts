import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { buildPrompt, checkSuggestion, validateRequest } from "@/lib/ai/rules";

/**
 * POST /api/ai/draft (north star, document 7). Reshapes a prepared message with Claude on
 * Amazon Bedrock in London. Off until the owner adds keys to Vercel:
 *   BEDROCK_ACCESS_KEY_ID, BEDROCK_SECRET_ACCESS_KEY (an IAM user allowed bedrock:InvokeModel only)
 *   BEDROCK_REGION (default eu-west-2), BEDROCK_MODEL_ID (default anthropic.claude-sonnet-5)
 *   AI_DAILY_CAP (default 300 requests a day across the prototype)
 * Vercel reserves the usual AWS_* names, hence the BEDROCK_* ones.
 *
 * The prototype has no sign-in, so facts come from the browser and limits are per address.
 * The real route reads facts from the database for a signed-in member who can see the issue.
 */

const enabled = () => !!(process.env.BEDROCK_ACCESS_KEY_ID && process.env.BEDROCK_SECRET_ACCESS_KEY) && process.env.AI_ENABLED !== "false";

const error = (status: number, code: string, message: string) => Response.json({ error: { code, message } }, { status });

// Best-effort limits. Serverless instances don't share memory, so the daily cap is also set in AWS billing alerts.
const perAddress = new Map<string, number[]>();
let day = "";
let today = 0;

function allow(address: string): boolean {
  const now = Date.now();
  const d = new Date().toISOString().slice(0, 10);
  if (d !== day) {
    day = d;
    today = 0;
  }
  if (today >= Number(process.env.AI_DAILY_CAP ?? 300)) return false;
  const recent = (perAddress.get(address) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= 20) return false;
  recent.push(now);
  perAddress.set(address, recent);
  today++;
  return true;
}

export async function GET() {
  return Response.json({ enabled: enabled() });
}

export async function POST(request: Request) {
  if (!enabled()) return error(503, "ai_off", "AI help isn't switched on yet.");

  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allow(address)) return error(429, "rate_limited", "You've used AI help a lot in the last hour. Try again later.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(400, "bad_request", "Send a JSON body.");
  }
  const req = validateRequest(body);
  if (typeof req === "string") return error(400, "bad_request", req);

  const { system, user } = buildPrompt(req);
  const client = new BedrockRuntimeClient({
    region: process.env.BEDROCK_REGION ?? "eu-west-2",
    credentials: {
      accessKeyId: process.env.BEDROCK_ACCESS_KEY_ID!,
      secretAccessKey: process.env.BEDROCK_SECRET_ACCESS_KEY!,
    },
  });

  try {
    const out = await client.send(
      new ConverseCommand({
        modelId: process.env.BEDROCK_MODEL_ID ?? "anthropic.claude-sonnet-5",
        system: [{ text: system }],
        messages: [{ role: "user", content: [{ text: user }] }],
        inferenceConfig: { maxTokens: 1500, temperature: 0.3 },
      }),
    );
    const text = out.output?.message?.content?.map((c) => ("text" in c ? c.text : "")).join("") ?? "";
    const checked = checkSuggestion(req, text);
    if (!checked.ok) {
      console.warn("ai_draft_rejected", checked.reason);
      return error(422, "ai_rejected", "The suggestion didn't pass our checks, so your message hasn't changed. Try another option.");
    }
    return Response.json(req.mode === "translate" ? { translation: checked.text } : { body: checked.text });
  } catch (e) {
    console.error("ai_draft_failed", e instanceof Error ? e.name : "unknown");
    return error(502, "ai_failed", "AI help couldn't finish just now. Your message hasn't changed.");
  }
}
