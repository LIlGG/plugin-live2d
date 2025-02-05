package run.halo.live2d;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.Arrays;
import java.util.Objects;
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
        return this.live2dSetting.getConfig()
            .flatMap(config -> themeFetcher.getActiveThemeName()
                .map(themeName -> {
                    ((ObjectNode) config).put("tips",
                        String.format(THEME_TIPS_PATH_TEMPLATE, themeName));
                    return config;
                })
                .map(this::preprocessConfig)
            )
            .flatMap(config -> {
                final IModelFactory modelFactory = context.getModelFactory();
                return live2dAutoloadScript(config).flatMap(script -> {
                    model.add(modelFactory.createText(script));
                    return Mono.empty();
                });
            }).then();
    }

    private JsonNode preprocessConfig(JsonNode config) {
        ((ObjectNode) config).remove(Arrays.asList("proxySetting", "openAiSetting"));
        ((ObjectNode) config.get("aiChatBaseSetting")).remove(
            Arrays.asList("isAnonymous", "systemMessage"));
        return config;
    }

    private Mono<CharSequence> live2dAutoloadScript(JsonNode config) {
        String template = """
            live2d.init("%1$s", %2$s)
            """.formatted(LIVE2D_SOURCE_PATH, config.toPrettyString());
        return this.live2dSetting.getValue("advanced", "loadTime")
            .map(node -> node.asText(LIVE2D_LOAD_TIME))
            .map(loadTime -> """
                <script src="%1$sjs/live2d-autoload.min.js" %2$s></script>
                <script type="text/javascript">
                    %3$s
                </script>
                """.formatted(LIVE2D_SOURCE_PATH, loadTime, loadLive2d(loadTime, template))
            );
    }

    private CharSequence loadLive2d(String loadTime, String loadingScript) {
        String template;
        if (Objects.equals(loadTime, LIVE2D_LOAD_TIME)) {
            template = """
                document.addEventListener('DOMContentLoaded', () => {
                    %s
                })
                """;
        } else {
            template = """
                window.onload = function() {
                    %s
                }
                """;
        }
        return template.formatted(loadingScript);
    }
}
