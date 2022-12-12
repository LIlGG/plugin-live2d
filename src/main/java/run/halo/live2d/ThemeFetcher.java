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

    private final Map<String, String> configMap;

    public ThemeFetcher(ExtensionClient extensionClient) {
        this.extensionClient = extensionClient;
        this.configMap = extensionClient.fetch(ConfigMap.class, SystemSetting.SYSTEM_CONFIG)
            .map(ConfigMap::getData)
            .orElse(new HashMap<>());
    }

    public Optional<String> getActiveThemeName() {
        try {
            Map<String, Object> activeJson = JSONObjectUtils.parse(configMap.get("theme"));
            return Optional.ofNullable((String) activeJson.get("active"));
        } catch (ParseException e) {
            e.printStackTrace();
        }
        return Optional.empty();
    }

    public Optional<Theme> getActiveTheme() {
        Optional<String> activeThemeNameOptional = getActiveThemeName();
        if (activeThemeNameOptional.isPresent()) {
            String activeThemeName = activeThemeNameOptional.get();
            return this.extensionClient.fetch(Theme.class, activeThemeName);
        }
        return Optional.empty();
    }
}
