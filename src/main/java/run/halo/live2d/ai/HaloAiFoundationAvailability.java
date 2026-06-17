package run.halo.live2d.ai;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.ClassUtils;
import reactor.core.publisher.Mono;
import run.halo.app.core.extension.Plugin;
import run.halo.app.extension.ReactiveExtensionClient;

@Component
@RequiredArgsConstructor
public class HaloAiFoundationAvailability {

    private static final String AI_FOUNDATION_PLUGIN_NAME = "ai-foundation";
    private static final String AI_MODEL_SERVICE_CLASS = "run.halo.aifoundation.AiModelService";

    private final ReactiveExtensionClient client;

    public Mono<Boolean> isEnabled() {
        return client.fetch(Plugin.class, AI_FOUNDATION_PLUGIN_NAME)
            .map(this::isStarted)
            .defaultIfEmpty(false)
            .onErrorReturn(false);
    }

    public static boolean isClassPresent(ClassLoader classLoader) {
        var targetClassLoader = classLoader == null
            ? HaloAiFoundationAvailability.class.getClassLoader()
            : classLoader;
        return ClassUtils.isPresent(AI_MODEL_SERVICE_CLASS, targetClassLoader);
    }

    private boolean isStarted(Plugin plugin) {
        return plugin.getSpec() != null
            && Boolean.TRUE.equals(plugin.getSpec().getEnabled())
            && plugin.getStatus() != null
            && Plugin.Phase.STARTED.equals(plugin.getStatus().getPhase());
    }
}
