package run.halo.live2d;

import org.pf4j.PluginWrapper;
import org.springframework.stereotype.Component;
import run.halo.app.plugin.BasePlugin;

/**
 * @author LIlGG
 * @since 2022-11-30
 */
@Component
public class Live2dPlugin extends BasePlugin {

    public Live2dPlugin(PluginWrapper wrapper) {
        super(wrapper);
    }
}
