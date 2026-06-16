package run.halo.live2d.agent;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;

public record NormalizedAgentTool(
    String name,
    String description,
    Map<String, Object> inputSchema,
    AgentToolApproval approval,
    AgentToolAuth requiredAuth,
    String actionType,
    JsonNode action,
    JsonNode testInput
) {
}
