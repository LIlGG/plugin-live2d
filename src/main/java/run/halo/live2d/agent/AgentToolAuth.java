package run.halo.live2d.agent;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum AgentToolAuth {
    NONE("none"),
    AUTHENTICATED("authenticated");

    private final String value;

    AgentToolAuth(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator
    public static AgentToolAuth from(String value) {
        return from(value, NONE);
    }

    public static AgentToolAuth from(String value, AgentToolAuth defaultValue) {
        if (value != null) {
            for (var auth : values()) {
                if (auth.value.equals(value)) {
                    return auth;
                }
            }
        }
        return defaultValue;
    }
}
