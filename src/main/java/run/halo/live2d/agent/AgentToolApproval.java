package run.halo.live2d.agent;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum AgentToolApproval {
    DEFAULT("default"),
    NEVER("never"),
    ALWAYS("always");

    private final String value;

    AgentToolApproval(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator
    public static AgentToolApproval from(String value) {
        if (value != null) {
            for (var approval : values()) {
                if (approval.value.equals(value)) {
                    return approval;
                }
            }
        }
        return DEFAULT;
    }
}
