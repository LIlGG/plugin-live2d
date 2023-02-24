package run.halo.live2d;

import com.nimbusds.jose.util.JSONObjectUtils;

import java.text.ParseException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Component;
import run.halo.app.core.extension.Theme;
import run.halo.app.extension.ConfigMap;
import run.halo.app.extension.ExtensionClient;
import run.halo.app.infra.SystemSetting;

/**
 * @author LIlGG
 * @since 2022-12-12
 */
@Component
public class ThemeFetcher {

    private final ExtensionClient extensionClient;

    public ThemeFetcher(ExtensionClient extensionClient) {
        this.extensionClient = extensionClient;
    }

    public Optional<String> getActiveThemeName() {
        final Map<String, String> configMap = this.extensionClient
                .fetch(ConfigMap.class, SystemSetting.SYSTEM_CONFIG)
                .map(ConfigMap::getData)
                .orElse(new HashMap<>());
        try {
            Map<String, Object> activeJson = JSONObjectUtils.parse(configMap.get("theme"));
            return Optional.ofNullable((String) activeJson.get("active"));
        } catch (ParseException e) {
            e.printStackTrace();
        }
        return Optional.empty();
    }
}
