package run.halo.live2d.agent;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class AgentToolNormalizer {
    private static final Pattern TOOL_NAME_PATTERN = Pattern.compile("^[a-z][a-z0-9_]{2,63}$");
    private static final Set<String> SCALAR_TYPES = Set.of("string", "number", "integer",
        "boolean");
    private static final Set<String> PROPERTY_KEYWORDS = Set.of("type", "description", "enum",
        "default", "minimum", "maximum", "minLength", "maxLength");
    private static final Set<String> ROOT_KEYWORDS = Set.of("type", "properties", "required",
        "description");
    private static final Set<String> RESERVED_TOOL_NAMES = Set.of(
        "perform_live2d_action",
        "get_current_page_context",
        "open_halo_resource",
        "search_halo_resources",
        "get_halo_resource_detail",
        "get_latest_halo_resources",
        "get_categories",
        "get_tags",
        "get_posts_by_category",
        "get_posts_by_tag",
        "get_pages",
        "fetch_allowed_url",
        "open_comment_area",
        "get_recent_comments",
        "draft_comment",
        "submit_comment"
    );

    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<NormalizedAgentTool> normalizeCustomTools(AgentSettings settings) {
        if (settings == null) {
            return List.of();
        }
        List<NormalizedAgentTool> normalized = new ArrayList<>();
        Set<String> names = new HashSet<>(RESERVED_TOOL_NAMES);
        for (var tool : settings.normalizedAiTools()) {
            normalizeCustomTool(tool, names).ifPresent(normalized::add);
        }
        return List.copyOf(normalized);
    }

    public java.util.Optional<NormalizedAgentTool> normalizeCustomTool(
        AgentSettings.AgentToolConfig tool, Set<String> usedNames) {
        if (tool == null || !tool.enabled()) {
            return java.util.Optional.empty();
        }

        var name = StringUtils.trimToEmpty(tool.name()).toLowerCase(Locale.ROOT);
        if (!TOOL_NAME_PATTERN.matcher(name).matches()) {
            log.warn("Ignore invalid Agent tool name: {}", tool.name());
            return java.util.Optional.empty();
        }
        if (!usedNames.add(name)) {
            log.warn("Ignore duplicated or reserved Agent tool name: {}", name);
            return java.util.Optional.empty();
        }

        var description = StringUtils.trimToNull(tool.description());
        if (description == null) {
            log.warn("Ignore Agent tool {} because description is blank", name);
            return java.util.Optional.empty();
        }

        var inputSchema = normalizeSchema(tool.inputSchema());
        if (inputSchema == null) {
            log.warn("Ignore Agent tool {} because input schema is invalid", name);
            return java.util.Optional.empty();
        }

        var action = tool.action();
        var actionType = action == null || action.isNull() ? null : textValue(action, "type");
        if (!AgentBrowserActionType.SUPPORTED.contains(actionType)) {
            log.warn("Ignore Agent tool {} because action type is invalid: {}", name, actionType);
            return java.util.Optional.empty();
        }

        return java.util.Optional.of(new NormalizedAgentTool(
            name,
            description,
            inputSchema,
            tool.approval(),
            tool.requiredAuth(),
            actionType,
            action,
            tool.testInput()
        ));
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> normalizeSchema(JsonNode schema) {
        if (schema == null || schema.isNull()) {
            return Map.of("type", "object", "properties", Map.of());
        }
        if (!schema.isObject() || !"object".equals(textValue(schema, "type"))) {
            return null;
        }
        if (!allowedKeys(schema, ROOT_KEYWORDS)) {
            return null;
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("type", "object");
        putIfText(result, "description", textValue(schema, "description"));

        Map<String, Object> properties = new LinkedHashMap<>();
        var propertyNode = schema.get("properties");
        if (propertyNode != null && !propertyNode.isNull()) {
            if (!propertyNode.isObject()) {
                return null;
            }
            var fields = propertyNode.fields();
            while (fields.hasNext()) {
                var entry = fields.next();
                if (!entry.getValue().isObject()) {
                    return null;
                }
                var propertySchema = normalizePropertySchema(entry.getValue());
                if (propertySchema == null) {
                    return null;
                }
                properties.put(entry.getKey(), propertySchema);
            }
        }
        result.put("properties", properties);

        var required = schema.get("required");
        if (required != null && !required.isNull()) {
            if (!required.isArray()) {
                return null;
            }
            List<String> requiredNames = new ArrayList<>();
            required.forEach(item -> {
                if (item.isTextual() && properties.containsKey(item.asText())) {
                    requiredNames.add(item.asText());
                }
            });
            if (!requiredNames.isEmpty()) {
                result.put("required", requiredNames);
            }
        }
        return result;
    }

    private Map<String, Object> normalizePropertySchema(JsonNode schema) {
        if (!allowedKeys(schema, PROPERTY_KEYWORDS)) {
            return null;
        }
        var type = textValue(schema, "type");
        if (!SCALAR_TYPES.contains(type)) {
            return null;
        }
        Map<String, Object> result = objectMapper.convertValue(schema,
            new TypeReference<Map<String, Object>>() {
            });
        result.keySet().retainAll(PROPERTY_KEYWORDS);
        result.put("type", type);
        return result;
    }

    private boolean allowedKeys(JsonNode node, Set<String> allowed) {
        var fields = node.fieldNames();
        while (fields.hasNext()) {
            if (!allowed.contains(fields.next())) {
                return false;
            }
        }
        return true;
    }

    private void putIfText(Map<String, Object> target, String key, String value) {
        if (StringUtils.isNotBlank(value)) {
            target.put(key, value);
        }
    }

    private String textValue(JsonNode source, String field) {
        if (source == null || source.isNull()) {
            return null;
        }
        var value = source.get(field);
        return value == null || value.isNull() ? null : StringUtils.trimToNull(value.asText());
    }
}
