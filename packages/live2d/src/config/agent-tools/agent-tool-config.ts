export type AgentAccessMode =
  | "anonymous_chat"
  | "anonymous_chat_agent"
  | "authenticated_chat"
  | "authenticated_chat_agent";

export type AgentToolApproval = "default" | "never" | "always";
export type AgentToolAuth = "none" | "authenticated";
export type AgentCommentCapability = "off" | "assist" | "submit";

export type AgentBrowserAction =
  | {
      type: "navigate";
      url: string;
      target?: "_self" | "_blank";
      pendingMessage?: string;
      successMessage?: string;
      errorMessage?: string;
    }
  | {
      type: "scroll-to";
      selector: string;
      behavior?: ScrollBehavior;
      pendingMessage?: string;
      successMessage?: string;
      errorMessage?: string;
    }
  | {
      type: "highlight";
      selector: string;
      duration?: number;
      pendingMessage?: string;
      successMessage?: string;
      errorMessage?: string;
    }
  | {
      type: "dispatch-event";
      event: string;
      pendingMessage?: string;
      successMessage?: string;
      errorMessage?: string;
    }
  | {
      type: "registered";
      pendingMessage?: string;
      successMessage?: string;
      errorMessage?: string;
    };

export interface AgentToolConfig {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  approval: AgentToolApproval;
  requiredAuth: AgentToolAuth;
  actionType: AgentBrowserAction["type"];
  action: AgentBrowserAction;
  testInput?: unknown;
}

export interface AgentRuntimeConfig {
  builtIn: {
    pageContext: boolean;
    haloNavigation: boolean;
    haloContentSearch: boolean;
    networkAccess: boolean;
    commentCapability: AgentCommentCapability;
  };
  aiTools: AgentToolConfig[];
  toolSecurity: {
    allowedExternalOrigins: string[];
    allowNewTab: boolean;
  };
  haloSearch: {
    allowedTypes: string[];
    defaultLimit: number;
  };
  haloResourceDetail: {
    maxContentChars: number;
  };
}
