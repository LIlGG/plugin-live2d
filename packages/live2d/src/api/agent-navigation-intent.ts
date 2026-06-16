import type { UIMessage } from "@halo-dev/ai-foundation-sdk";

export interface AgentAfterNavigationResume {
  message: string;
  historyMessages: UIMessage[];
}

export interface AgentAfterNavigationIntent {
  openChat: boolean;
  focusChatInput: boolean;
  resume?: AgentAfterNavigationResume;
  expiresAt: number;
}

const STORAGE_KEY = "live2d:agent-after-navigation";
const DEFAULT_TTL_MS = 15_000;
const DEFAULT_RESUME_MESSAGE =
  "我已经打开了新的页面，请基于当前页面继续完成上一条用户请求。必要时先查看当前页面上下文。";

export interface RememberAgentAfterNavigationOptions {
  resume?: {
    message?: string;
    historyMessages?: UIMessage[];
  };
}

export const rememberAgentAfterNavigationIntent = (
  options: RememberAgentAfterNavigationOptions = {},
  storage: Storage = window.sessionStorage,
): void => {
  const intent: AgentAfterNavigationIntent = {
    openChat: true,
    focusChatInput: true,
    expiresAt: Date.now() + DEFAULT_TTL_MS,
  };
  if (options.resume?.historyMessages?.length) {
    intent.resume = {
      message: options.resume.message?.trim() || DEFAULT_RESUME_MESSAGE,
      historyMessages: options.resume.historyMessages,
    };
  }
  storage.setItem(STORAGE_KEY, JSON.stringify(intent));
};

export const consumeAgentAfterNavigationIntent = (
  storage: Storage = window.sessionStorage,
): AgentAfterNavigationIntent | undefined => {
  const raw = storage.getItem(STORAGE_KEY);
  storage.removeItem(STORAGE_KEY);
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AgentAfterNavigationIntent>;
    if (typeof parsed.expiresAt !== "number" || parsed.expiresAt < Date.now()) {
      return undefined;
    }
    return {
      openChat: parsed.openChat === true,
      focusChatInput: parsed.focusChatInput !== false,
      resume: normalizeResume(parsed.resume),
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return undefined;
  }
};

const normalizeResume = (
  resume: unknown,
): AgentAfterNavigationResume | undefined => {
  if (typeof resume !== "object" || resume === null) {
    return undefined;
  }
  const candidate = resume as Partial<AgentAfterNavigationResume>;
  if (
    typeof candidate.message !== "string" ||
    !candidate.message.trim() ||
    !Array.isArray(candidate.historyMessages)
  ) {
    return undefined;
  }
  return {
    message: candidate.message.trim(),
    historyMessages: candidate.historyMessages,
  };
};
