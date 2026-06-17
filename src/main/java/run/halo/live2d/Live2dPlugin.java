package run.halo.live2d;

import org.springframework.stereotype.Component;
import run.halo.app.plugin.BasePlugin;
import run.halo.app.plugin.PluginContext;
import run.halo.live2d.chat.ChatSecurityService;

/**
 * @author LIlGG
 * @since 2022-11-30
 */
@Component
public class Live2dPlugin extends BasePlugin {
    private final ChatSecurityService chatSecurityService;

    public Live2dPlugin(PluginContext context, ChatSecurityService chatSecurityService) {
        super(context);
        this.chatSecurityService = chatSecurityService;
    }

    @Override
    public void stop() {
        chatSecurityService.dispose();
    }
}
