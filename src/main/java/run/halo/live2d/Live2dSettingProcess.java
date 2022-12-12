package run.halo.live2d;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.Map;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import run.halo.app.plugin.SettingFetcher;
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

    private final Map<String, JsonNode> settingMap;

    private ObjectNode configNode;

    public Live2dSettingProcess(SettingFetcher settingFetcher,
                                ThemeFetcher themeFetcher) {
        this.settingMap = settingFetcher.getValues();
        this.themeFetcher = themeFetcher;
        initConfigNode();
    }

    public void initConfigNode() {
        this.configNode = new ObjectNode(this);
        settingMap.forEach((group, jsonNode) -> {
            JsonNode node = settingMap.get(group);
            log.debug("live2d config -> {} group save settingMap json {}", group, node.toPrettyString());
            if (jsonNode instanceof ObjectNode) {
                configNode.setAll((ObjectNode) node);
            }
        });
        // 移除不必要的参数
        this.configNode.remove("slots");
        setThemeLive2dTipsPath();
    }

    private void setThemeLive2dTipsPath() {
        themeFetcher.getActiveThemeName().ifPresent(activeThemeName -> {
            this.configNode.put("themeTipsPath", THEME_TIPS_PATH_TEMPLATE.formatted(activeThemeName));
        });
    }

    @Override
    public JsonNode getValue(String groupName, String key) {
        return settingMap.get(groupName).get(key);
    }

    @Override
    public Optional<JsonNode> getConfig() {
        return Optional.of(configNode);
    }
}
