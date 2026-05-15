package run.halo.live2d;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import run.halo.app.plugin.ReactiveSettingFetcher;

/**
 * Live2d 配置处理器
 *
 * @author LIlGG
 * @since 2022-12-04
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class Live2dSettingProcess implements Live2dSetting {
    private static final List<String> BASE_FIELDS = List.of(
        "modelId", "modelTexturesId", "isForceUseDefaultConfig", "isTools", "tools");
    private static final List<String> API_FIELDS = List.of("apiPath", "hitokotoApi");
    private static final List<String> TIPS_FIELDS = List.of(
        "firstOpenSite", "backSite", "backSiteTip", "copyContent", "copyContentTip",
        "openConsole", "openConsoleTip", "selectorTips", "tipsPath");
    private static final List<String> ADVANCED_FIELDS = List.of(
        "consoleShowStatu", "photoName", "live2dLocation");
    private static final List<String> AI_CHAT_PUBLIC_FIELDS = List.of(
        "chunkTimeout", "showChatMessageTimeout", "requestAcceptedMessage", "chatContextRounds");

    private final ReactiveSettingFetcher settingFetcher;

    @Override
    public Mono<JsonNode> getGroup(String groupName) {
        return this.settingFetcher.get(groupName);
    }

    @Override
    public Mono<JsonNode> getValue(String groupName, String key) {
        return getGroup(groupName).map(group -> group.get(key));
    }

    @Override
    public Mono<JsonNode> getPublicConfig(String themeTipsPath) {
        return settingFetcher.getValues().map(data -> {
            ObjectNode objectNode = JsonNodeFactory.instance.objectNode();
            copyFields(objectNode, data.get("base"), BASE_FIELDS);
            copyFields(objectNode, data.get("api"), API_FIELDS);
            copyFields(objectNode, data.get("tips"), TIPS_FIELDS);
            copyFields(objectNode, data.get("advanced"), ADVANCED_FIELDS);
            copyAiChatFields(objectNode, data.get("aichat"));
            copyCustomTools(objectNode, data.get("customTools"));
            if (themeTipsPath != null && !themeTipsPath.isBlank()) {
                objectNode.put("themeTipsPath", themeTipsPath);
            }
            return objectNode;
        });
    }

    private void copyFields(ObjectNode target, JsonNode source, List<String> fields) {
        if (source == null || source.isNull()) {
            return;
        }
        fields.forEach(field -> {
            var value = source.get(field);
            if (value != null && !value.isNull()) {
                target.set(field, value);
            }
        });
    }

    private void copyAiChatFields(ObjectNode target, JsonNode source) {
        if (source == null || source.isNull()) {
            return;
        }

        var isAiChat = source.get("isAiChat");
        if (isAiChat != null && !isAiChat.isNull()) {
            target.set("isAiChat", isAiChat);
        }

        var aiChatBaseSetting = source.get("aiChatBaseSetting");
        if (aiChatBaseSetting == null || aiChatBaseSetting.isNull()) {
            return;
        }

        copyFields(target, aiChatBaseSetting, AI_CHAT_PUBLIC_FIELDS);
    }

    private void copyCustomTools(ObjectNode target, JsonNode source) {
        if (source == null || source.isNull()) {
            return;
        }

        var customTools = source.get("customTools");
        if (customTools == null || !customTools.isArray()) {
            return;
        }

        ArrayNode normalizedTools = JsonNodeFactory.instance.arrayNode();
        customTools.forEach(tool -> {
            ObjectNode normalizedTool = normalizeCustomTool(tool);
            if (normalizedTool != null) {
                normalizedTools.add(normalizedTool);
            }
        });

        if (normalizedTools.size() > 0) {
            target.set("customTools", normalizedTools);
        }
    }

    private ObjectNode normalizeCustomTool(JsonNode tool) {
        String name = textValue(tool, "name");
        String action = textValue(tool, "action");
        if (name == null || action == null) {
            return null;
        }

        ObjectNode actionNode = normalizeCustomToolAction(tool, action);
        if (actionNode == null) {
            return null;
        }

        ObjectNode normalizedTool = JsonNodeFactory.instance.objectNode();
        normalizedTool.put("name", name);
        putText(normalizedTool, "icon", textValue(tool, "icon"));
        copyField(normalizedTool, tool, "priority");
        normalizedTool.set("action", actionNode);
        return normalizedTool;
    }

    private ObjectNode normalizeCustomToolAction(JsonNode tool, String actionType) {
        ObjectNode actionNode = JsonNodeFactory.instance.objectNode();
        switch (actionType) {
            case "send-message" -> {
                String messageText = textValue(tool, "messageText");
                if (messageText == null) {
                    return null;
                }
                actionNode.put("type", actionType);
                actionNode.put("text", messageText);
                copyField(actionNode, tool, "messageTimeout", "timeout");
                copyField(actionNode, tool, "messagePriority", "priority");
                return actionNode;
            }
            case "widget-visibility" -> {
                String visibilityMode = textValue(tool, "visibilityMode");
                if (visibilityMode == null) {
                    visibilityMode = "toggle";
                }
                actionNode.put("type", actionType);
                actionNode.put("mode", visibilityMode);
                return actionNode;
            }
            case "toggle-chat", "switch-model", "switch-texture", "screenshot" -> {
                actionNode.put("type", actionType);
                putText(actionNode, "screenshotName", textValue(tool, "screenshotName"));
                return actionNode;
            }
            case "open-url" -> {
                String openUrl = textValue(tool, "openUrl");
                if (openUrl == null) {
                    return null;
                }
                actionNode.put("type", actionType);
                actionNode.put("url", openUrl);
                actionNode.put("target",
                    "_self".equals(textValue(tool, "openUrlTarget")) ? "_self" : "_blank");
                return actionNode;
            }
            case "emit-event" -> {
                String eventName = textValue(tool, "eventName");
                if (eventName == null) {
                    return null;
                }
                actionNode.put("type", actionType);
                actionNode.put("eventName", eventName);
                putText(actionNode, "detail", textValue(tool, "eventDetail"));
                return actionNode;
            }
            case "load-model" -> {
                var modelId = tool.get("targetModelId");
                if (modelId == null || modelId.isNull()) {
                    return null;
                }
                actionNode.put("type", actionType);
                actionNode.set("modelId", modelId);
                copyField(actionNode, tool, "targetModelTexturesId", "modelTexturesId");
                putText(actionNode, "message", textValue(tool, "targetModelMessage"));
                return actionNode;
            }
            default -> {
                return null;
            }
        }
    }

    private void copyField(ObjectNode target, JsonNode source, String field) {
        copyField(target, source, field, field);
    }

    private void copyField(ObjectNode target, JsonNode source, String field, String targetField) {
        if (source == null || source.isNull()) {
            return;
        }

        var value = source.get(field);
        if (value != null && !value.isNull()) {
            target.set(targetField, value);
        }
    }

    private void putText(ObjectNode target, String field, String value) {
        if (value != null && !value.isBlank()) {
            target.put(field, value);
        }
    }

    private String textValue(JsonNode source, String field) {
        if (source == null || source.isNull()) {
            return null;
        }

        var value = source.get(field);
        if (value == null || value.isNull()) {
            return null;
        }

        String text = value.asText();
        return text == null || text.isBlank() ? null : text;
    }
}
