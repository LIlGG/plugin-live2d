package run.halo.live2d.openai;

import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;
import run.halo.live2d.Live2dSetting;
import run.halo.live2d.openai.service.OpenAiService;
import run.halo.live2d.openai.service.impl.OpenAIServiceImpl;

@Component
public class OpenAiConfiguration {

    private final Live2dSetting live2dSetting;

    public OpenAiConfiguration(Live2dSetting live2dSetting) {
        this.live2dSetting = live2dSetting;
    }

    @Bean
    public OpenAiService openAiService() {
        return new OpenAIServiceImpl(live2dSetting.getGroup("openai"));
    }
}
