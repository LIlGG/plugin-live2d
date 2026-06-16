package run.halo.live2d.agent;

public enum AgentAccessMode {
    ANONYMOUS_CHAT("anonymous_chat", true, false, false),
    ANONYMOUS_CHAT_AGENT("anonymous_chat_agent", true, true, false),
    AUTHENTICATED_CHAT("authenticated_chat", false, false, true),
    AUTHENTICATED_CHAT_AGENT("authenticated_chat_agent", false, true, true);

    private final String value;
    private final boolean anonymousChatAllowed;
    private final boolean agentAllowed;
    private final boolean authenticationRequired;

    AgentAccessMode(String value, boolean anonymousChatAllowed, boolean agentAllowed,
        boolean authenticationRequired) {
        this.value = value;
        this.anonymousChatAllowed = anonymousChatAllowed;
        this.agentAllowed = agentAllowed;
        this.authenticationRequired = authenticationRequired;
    }

    public String value() {
        return value;
    }

    public boolean anonymousChatAllowed() {
        return anonymousChatAllowed;
    }

    public boolean agentAllowed() {
        return agentAllowed;
    }

    public boolean authenticationRequired() {
        return authenticationRequired;
    }

    public static AgentAccessMode from(String value, boolean legacyAnonymous) {
        if (value != null) {
            for (var mode : values()) {
                if (mode.value.equals(value)) {
                    return mode;
                }
            }
        }
        return legacyAnonymous ? ANONYMOUS_CHAT : AUTHENTICATED_CHAT;
    }
}
