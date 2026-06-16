package run.halo.live2d.agent;

import java.util.Set;

public final class AgentBrowserActionType {
    public static final String NAVIGATE = "navigate";
    public static final String SCROLL_TO = "scroll-to";
    public static final String HIGHLIGHT = "highlight";
    public static final String DISPATCH_EVENT = "dispatch-event";
    public static final String REGISTERED = "registered";

    public static final Set<String> SUPPORTED = Set.of(
        NAVIGATE,
        SCROLL_TO,
        HIGHLIGHT,
        DISPATCH_EVENT,
        REGISTERED
    );

    private AgentBrowserActionType() {
    }
}
