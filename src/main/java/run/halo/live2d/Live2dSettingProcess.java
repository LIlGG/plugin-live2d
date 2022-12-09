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

    private final Map<String, JsonNode> settingMap;

    private ObjectNode configNode;

    public Live2dSettingProcess(SettingFetcher settingFetcher) {
        this.settingMap = settingFetcher.getValues();
        initConfigNode();
    }

    public void initConfigNode() {
        this.configNode = new ObjectNode(this);
        settingMap.forEach((group, jsonNode) -> {
            JsonNode node = settingMap.get(group);
            log.debug("{} group save settingMap json {}", group, node.toPrettyString());
            if (jsonNode instanceof ObjectNode) {
                configNode.setAll((ObjectNode) node);
            }
        });
        // 移除不必要的参数
        this.configNode.remove("slots");
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
