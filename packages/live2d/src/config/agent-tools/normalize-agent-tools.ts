import type {
  AgentBrowserAction,
  AgentCommentCapability,
  AgentRuntimeConfig,
  AgentToolApproval,
  AgentToolAuth,
  AgentToolConfig,
} from "@/live2d/config/agent-tools/agent-tool-config";
import {
  isRecord,
  pickBoolean,
  pickNumber,
  pickString,
} from "@/live2d/config/normalize-helpers";
import { isNotEmptyString } from "@/live2d/utils/isString";

const ACTION_TYPES = new Set([
  "navigate",
  "scroll-to",
  "highlight",
  "dispatch-event",
  "registered",
]);

const TOOL_NAME_PATTERN = /^[a-z][a-z0-9_]{2,63}$/;

const pickApproval = (value: unknown): AgentToolApproval =>
  value === "never" || value === "always" ? value : "default";

const pickAuth = (value: unknown): AgentToolAuth =>
  value === "authenticated" ? "authenticated" : "none";

const pickCommentCapability = (value: unknown): AgentCommentCapability =>
  value === "off" || value === "submit" ? value : "assist";

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isNotEmptyString);
};

const normalizeObjectStringArray = (
  value: unknown,
  objectKey: string,
): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) =>
    isRecord(item) && isNotEmptyString(item[objectKey])
      ? [item[objectKey]]
      : [],
  );
};

const normalizeAction = (value: unknown): AgentBrowserAction | undefined => {
  if (!isRecord(value)) {
    return;
  }
  const type = pickString(value.type);
  if (!type || !ACTION_TYPES.has(type)) {
    return;
  }
  if (type === "navigate") {
    const url = pickString(value.url);
    if (!url) {
      return;
    }
    return {
      ...pickMessages(value),
      type,
      url,
      target: value.target === "_blank" ? "_blank" : "_self",
    };
  }
  if (type === "scroll-to" || type === "highlight") {
    const selector = pickString(value.selector);
    if (!selector) {
      return;
    }
    return {
      ...pickMessages(value),
      type,
      selector,
      ...(type === "scroll-to"
        ? { behavior: value.behavior === "auto" ? "auto" : "smooth" }
        : { duration: pickNumber(value.duration) }),
    } as AgentBrowserAction;
  }
  if (type === "dispatch-event") {
    const event = pickString(value.event);
    if (!event) {
      return;
    }
    return { ...pickMessages(value), type, event };
  }
  if (type === "registered") {
    return { ...pickMessages(value), type };
  }
  return;
};

const pickMessages = (value: Record<string, unknown>) => ({
  pendingMessage: pickString(value.pendingMessage),
  successMessage: pickString(value.successMessage),
  errorMessage: pickString(value.errorMessage),
});

const normalizeTool = (value: unknown): AgentToolConfig | undefined => {
  if (!isRecord(value)) {
    return;
  }
  const name = pickString(value.name);
  const description = pickString(value.description);
  const action = normalizeAction(value.action);
  if (!name || !TOOL_NAME_PATTERN.test(name) || !description || !action) {
    return;
  }
  const inputSchema = isRecord(value.inputSchema)
    ? value.inputSchema
    : { type: "object", properties: {} };
  return {
    name,
    description,
    inputSchema,
    approval: pickApproval(value.approval),
    requiredAuth: pickAuth(value.requiredAuth),
    actionType: action.type,
    action,
    testInput: value.testInput,
  };
};

export const normalizeAgentRuntimeConfig = (
  input: unknown,
): AgentRuntimeConfig => {
  const source = isRecord(input) ? input : {};
  const builtIn = isRecord(source.builtIn) ? source.builtIn : {};
  const toolSecurity = isRecord(source.toolSecurity) ? source.toolSecurity : {};
  const haloSearch = isRecord(source.haloSearch) ? source.haloSearch : {};
  const haloResourceDetail = isRecord(source.haloResourceDetail)
    ? source.haloResourceDetail
    : {};
  const allowedTypes = normalizeStringArray(haloSearch.allowedTypes);

  return {
    builtIn: {
      pageContext: pickBoolean(builtIn.pageContext, true) ?? true,
      haloNavigation: pickBoolean(builtIn.haloNavigation, true) ?? true,
      haloContentSearch: pickBoolean(builtIn.haloContentSearch, true) ?? true,
      networkAccess: pickBoolean(builtIn.networkAccess, false) ?? false,
      commentCapability: pickCommentCapability(builtIn.commentCapability),
    },
    aiTools: Array.isArray(source.aiTools)
      ? source.aiTools.flatMap((tool) => {
          const normalized = normalizeTool(tool);
          return normalized ? [normalized] : [];
        })
      : [],
    toolSecurity: {
      allowedExternalOrigins: normalizeStringArray(
        toolSecurity.allowedExternalOrigins,
      ).concat(
        normalizeObjectStringArray(
          toolSecurity.allowedExternalOrigins,
          "origin",
        ),
      ),
      allowNewTab: pickBoolean(toolSecurity.allowNewTab, false) ?? false,
    },
    haloSearch: {
      allowedTypes:
        allowedTypes.length > 0
          ? allowedTypes
          : ["post.content.halo.run", "singlepage.content.halo.run"],
      defaultLimit: pickNumber(haloSearch.defaultLimit) ?? 5,
    },
    haloResourceDetail: {
      maxContentChars: pickNumber(haloResourceDetail.maxContentChars) ?? 3000,
    },
  };
};
