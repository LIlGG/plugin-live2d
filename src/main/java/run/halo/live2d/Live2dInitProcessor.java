package run.halo.live2d;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.thymeleaf.context.ITemplateContext;
import org.thymeleaf.model.IModel;
import org.thymeleaf.model.IModelFactory;
import org.thymeleaf.processor.element.IElementModelStructureHandler;
import reactor.core.publisher.Mono;
import run.halo.app.theme.dialect.TemplateHeadProcessor;

/**
 * Halo-Plugin-Live2d，适用于 Halo 2.x 版本。本插件主要作用于主题端，为主题端提供一个简单快速的看板娘功能。
 *
 * <p>
 * 插件开发参照 <a href="https://github.com/stevenjoezhang/live2d-widget">live2d-widget</a> 开发。
 * 并对 live2d-widget 中绝大部分内容进行了修改
 * </p>
 *
 * <p>
 * 插件安装启动后，将会在 Halo Console 端生成自定义配置页面，用于用户填写 Live2d 的相关配置。
 * 而实际的插件运作，将会在用户打开站点<b>任意页面</b>时生效。由于 Live2d 一般不属于网站核心内容，因此 Live2d
 * 将在网站其他内容加载完成之后再进行初始化，尽量保证不阻塞页面运行。
 * </p>
 *
 * @author LIlGG
 * @version 1.0.1
 * @see <a href="https://github.com/stevenjoezhang/live2d-widget">live2d-widget</a>
 * @since 2022-11-30
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class Live2dInitProcessor implements TemplateHeadProcessor {

    private final static String LIVE2D_LOAD_TIME = "defer";
    private final static String HALO_CONFIG_ELEMENT_ID = "plugin-live2d-config";
    private final static String LIVE2D_BOOTSTRAP_ENTRY = "live2d/live2d.js";
    private final static String VITE_CLIENT_ENTRY = "/@vite/client";
    private final static String VITE_HALO_ENTRY = "/src/halo.ts";

    /**
     * 插件静态资源地址
     */
    private final static String LIVE2D_SOURCE_PATH = "/plugins/PluginLive2d/assets/static/";

    /**
     * 适用于主题的 tips 路径
     */
    private final static String THEME_TIPS_PATH_TEMPLATE = "/themes/%s/assets/live2d/tips.json";

    private final ThemeFetcher themeFetcher;

    private final Live2dSetting live2dSetting;

    @Override
    public Mono<Void> process(ITemplateContext context, IModel model,
        IElementModelStructureHandler structureHandler) {
        return themeFetcher.getActiveThemeLive2dTipsPath(THEME_TIPS_PATH_TEMPLATE)
            .flatMap(live2dSetting::getPublicConfig)
            .map(config -> {
                ((ObjectNode) config).put("assetPath", LIVE2D_SOURCE_PATH);
                return config;
            })
            .flatMap(config -> {
                final IModelFactory modelFactory = context.getModelFactory();
                return live2dBootstrapScript(config).flatMap(script -> {
                    model.add(modelFactory.createText(script));
                    return Mono.empty();
                });
            })
            .then();
    }

    private Mono<CharSequence> live2dBootstrapScript(JsonNode config) {
        return Mono.zip(
                this.live2dSetting.getValue("advanced", "loadTime")
                    .map(node -> node.asText(LIVE2D_LOAD_TIME))
                    .defaultIfEmpty(LIVE2D_LOAD_TIME),
                resolveBootstrapLoaderScript()
            )
            .map(tuple -> """
                <script id="%1$s" type="application/json">%2$s</script>
                <script type="module">
                    %3$s
                </script>
                """.formatted(
                HALO_CONFIG_ELEMENT_ID,
                escapeJsonForScript(config.toString()),
                wrapBootstrapLoader(tuple.getT1(), tuple.getT2())
            ));
    }

    private Mono<String> resolveBootstrapLoaderScript() {
        return Mono.zip(
                this.live2dSetting.getValue("advanced", "useFrontendDevServer")
                    .map(node -> node.asBoolean(false))
                    .defaultIfEmpty(false),
                this.live2dSetting.getValue("advanced", "frontendDevServerUrl")
                    .map(node -> normalizeDevServerUrl(node.asText()))
                    .defaultIfEmpty("http://localhost:5173")
            )
            .map(tuple -> tuple.getT1()
                ? devServerBootstrapScript(tuple.getT2())
                : productionBootstrapScript());
    }

    private String wrapBootstrapLoader(String loadTime, String bootstrapScript) {
        String template = """
            const bootstrap = () => {
                %s
            };
            if (%s) {
                bootstrap();
            } else {
                %s
            }
            """;

        if (LIVE2D_LOAD_TIME.equals(loadTime)) {
            return template.formatted(
                bootstrapScript,
                "document.readyState !== 'loading'",
                "document.addEventListener('DOMContentLoaded', bootstrap, { once: true });");
        }

        return template.formatted(
            bootstrapScript,
            "document.readyState === 'complete'",
            "window.addEventListener('load', bootstrap, { once: true });");
    }

    private String productionBootstrapScript() {
        return """
            import("%s")
              .catch((error) => console.error("[PluginLive2d] Failed to load Live2D bootstrap module.", error));
            """.formatted(LIVE2D_SOURCE_PATH + LIVE2D_BOOTSTRAP_ENTRY);
    }

    private String devServerBootstrapScript(String devServerUrl) {
        return """
            Promise.all([
              import("%1$s"),
              import("%2$s")
            ])
              .catch((error) => console.error("[PluginLive2d] Failed to load Live2D dev server bootstrap module.", error));
            """.formatted(devServerUrl + VITE_CLIENT_ENTRY, devServerUrl + VITE_HALO_ENTRY);
    }

    private String normalizeDevServerUrl(String url) {
        if (url == null || url.isBlank()) {
            return "http://localhost:5173";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    private String escapeJsonForScript(String json) {
        return json.replace("</", "<\\/");
    }
}
