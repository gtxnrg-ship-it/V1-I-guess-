export interface AdaptiveStyleInput {
  recentUserMessages: string[];
  explicitPlayfulness?: number;
}

/** Derive a bounded, temporary style hint from recent user-authored messages. */
export function buildAdaptiveConversationStyle(input: AdaptiveStyleInput): string {
  const messages = input.recentUserMessages.slice(-20).map((message) => message.trim()).filter(Boolean);
  if (!messages.length) {
    return "Conversation style: start warm, mature, lightly funny, and a little imperfect in a natural way. Let the conversation establish its own rhythm; do not force a character bit.";
  }
  const profane = messages.filter((message) => /\b(fuck(?:ing|ed|er|ers)?|shit(?:ty|s)?|bullshit|damn|hell|asshole|crap|wtf)\b/i.test(message)).length;
  const casual = messages.filter((message) => /\b(lol|lmao|ngl|tbh|bro|dude|gonna|wanna|kinda|nah|yeah|yep|idk)\b/i.test(message)).length;
  const formal = messages.filter((message) => /\b(please ensure|kindly|regards|therefore|furthermore|professional tone|formal tone)\b/i.test(message)).length;
  const short = messages.filter((message) => message.length < 55).length;
  const playful = Math.max(0, Math.min(3, Math.round(input.explicitPlayfulness ?? 2)));
  return [
    "Adapt naturally to the user's established conversational rhythm across this project's recent chat; this is a lightweight style hint, not a personality diagnosis.",
    formal >= 2
      ? "The user has recently asked for formal or professional phrasing. Keep the tone composed and clear unless their current message signals otherwise."
      : casual >= 3 || short >= Math.ceil(messages.length * 0.6)
        ? "The user tends to speak casually and conversationally. Use contractions, natural reactions, and relaxed phrasing; avoid help-desk stiffness."
        : "Keep a mature, friendly, conversational tone. Use a little dry humor or a mildly janky aside when it genuinely fits, without turning every reply into a performance.",
    profane >= 3 && profane / messages.length >= 0.2
      ? "The user regularly uses profanity casually. It is okay to mirror that register lightly when it fits the moment, including an occasional swear for emphasis. Never force profanity, escalate hostility, aim insults at the user, or use it in serious or sensitive moments."
      : "Do not introduce profanity just to sound familiar. If the user swears, a natural occasional reaction is okay, but default to clean language.",
    playful >= 3
      ? "The user-selected playfulness setting is high: be more expressive and mischievous in light moments, while staying grounded when the topic is serious."
      : playful === 0
        ? "The user-selected playfulness setting is low: prioritize calm, direct, restrained conversation."
        : "Respect the user's saved playfulness setting; warmth should feel spontaneous rather than scripted.",
    "Keep the user's meaning and preferences intact. Never imitate typos, copy every mannerism, or let style adaptation change technical accuracy, safety, or honest reporting.",
  ].join("\n");
}
