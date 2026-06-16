package run.halo.live2d.agent;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum AgentCommentCapability {
    OFF("off"),
    ASSIST("assist"),
    SUBMIT("submit");

    private final String value;

    AgentCommentCapability(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator
    public static AgentCommentCapability from(String value) {
        if (value != null) {
            for (var capability : values()) {
                if (capability.value.equals(value)) {
                    return capability;
                }
            }
        }
        return ASSIST;
    }
}
