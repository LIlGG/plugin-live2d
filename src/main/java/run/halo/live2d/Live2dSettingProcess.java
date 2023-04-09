package run.halo.live2d;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import run.halo.app.plugin.SettingFetcher;

import java.util.Map;
import java.util.Optional;

/**
 * Live2d 配置处理器
 *
 * @author LIlGG
 * @since 2022-12-04
 */
@Component
@Slf4j
public class Live2dSettingProcess extends JsonNodeFactory implements Live2dSetting {

    /**
     * 适用于主题的 tips 路径
     */
    private final static String THEME_TIPS_PATH_TEMPLATE = "/themes/%s/assets/live2d/tips.json";

    private final ThemeFetcher themeFetcher;

    private final SettingFetcher settingFetcher;

    private ObjectNode configNode;

    private Map<String, JsonNode> settingMap;

    public Live2dSettingProcess(SettingFetcher settingFetcher,
                                ThemeFetcher themeFetcher) {
        this.settingFetcher = settingFetcher;
        this.themeFetcher = themeFetcher;
        initConfigNode();
    }

    public ObjectNode initConfigNode() {
        this.settingMap = settingFetcher.getValues();
        this.configNode = new ObjectNode(this);
        settingMap.forEach((group, jsonNode) -> {
            JsonNode node = settingMap.get(group);
            if (log.isDebugEnabled()) {
                log.debug("live2d config -> {} group save settingMap json {}", group, node.toPrettyString());
            }
            if (jsonNode instanceof ObjectNode) {
                configNode.setAll((ObjectNode) node);
            }
        });
        // 移除不必要的参数
        configNode.remove("slots");
        setThemeLive2dTipsPath(configNode);
        return configNode;
    }

    private void setThemeLive2dTipsPath(ObjectNode configNode) {
        this.themeFetcher.getActiveThemeName().ifPresent(activeThemeName -> {
            configNode.put("themeTipsPath", THEME_TIPS_PATH_TEMPLATE.formatted(activeThemeName));
        });
    }

    @Override
    public JsonNode getGroup(String groupName) {
        return this.settingMap.getOrDefault(groupName, new ObjectNode(this));
    }

    @Override
    public JsonNode getValue(String groupName, String key) {
        return getGroup(groupName).get(key);
    }

    @Override
    public Optional<JsonNode> getConfig() {
        initConfigNode();
        if (log.isDebugEnabled()) {
            log.debug("live2d config -> {}", this.configNode.toPrettyString());
        }
        return Optional.of(this.configNode);
    }
}
