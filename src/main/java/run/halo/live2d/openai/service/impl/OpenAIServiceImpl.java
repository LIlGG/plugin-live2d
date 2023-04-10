package run.halo.live2d.openai.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.theokanning.openai.OpenAiApi;
import com.theokanning.openai.completion.chat.ChatCompletionChunk;
import com.theokanning.openai.completion.chat.ChatCompletionRequest;
import com.theokanning.openai.completion.chat.ChatCompletionResult;
import io.reactivex.Flowable;
import java.net.InetSocketAddress;
import java.net.Proxy;
import java.time.Duration;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import org.apache.commons.lang3.StringUtils;
import retrofit2.Retrofit;
import run.halo.live2d.openai.service.OpenAiService;

@Slf4j
public class OpenAIServiceImpl implements OpenAiService {
    private final com.theokanning.openai.service.OpenAiService openAiService;
    
    private final JsonNode openAiConfig;
    
    public OpenAIServiceImpl(JsonNode openAiConfig) {
        this.openAiConfig = openAiConfig;
        OpenAiApi api = initOpenAiAPi();
        this.openAiService = new com.theokanning.openai.service.OpenAiService(
            api);
    }
    
    private OpenAiApi initOpenAiAPi() {
        ObjectMapper mapper = defaultObjectMapper();
        OkHttpClient client = defaultClient();
        Retrofit retrofit = defaultRetrofit(client, mapper);
        return retrofit.create(OpenAiApi.class);
    }
    
    Retrofit defaultRetrofit(OkHttpClient client, ObjectMapper mapper) {
        Retrofit retrofit
            = com.theokanning.openai.service.OpenAiService.defaultRetrofit(
            client, mapper);
        if (openAiConfig.has("baseUrl")) {
            retrofit.newBuilder()
                .baseUrl(openAiConfig.get("baseUrl").asText())
                .build();
        }
        return retrofit;
    }
    
    OkHttpClient defaultClient() {
        if (!openAiConfig.has("token") || StringUtils.isEmpty(
            openAiConfig.get("token").asText())) {
            throw new IllegalArgumentException("OpenAI token is required");
        }
        
        OkHttpClient client
            = com.theokanning.openai.service.OpenAiService.defaultClient(
            openAiConfig.get("token").asText(),
            Duration.ofSeconds(openAiConfig.get("timeout").asInt())
        );
        
        if (openAiConfig.get("isProxy").asBoolean()) {
            Proxy proxy = new Proxy(Proxy.Type.HTTP,
                new InetSocketAddress(openAiConfig.get("proxyHost").asText(),
                    openAiConfig.get("proxyPort").asInt()
                )
            );
            client.newBuilder().proxy(proxy).build();
        }
        
        return client;
    }
    
    ObjectMapper defaultObjectMapper() {
        return com.theokanning.openai.service.OpenAiService.defaultObjectMapper();
    }
    
    @Override
    public ChatCompletionResult createChatCompletion(
        ChatCompletionRequest request) {
        return openAiService.createChatCompletion(request);
    }
    
    @Override
    public Flowable<ChatCompletionChunk> streamChatCompletion(
        ChatCompletionRequest request) {
        return openAiService.streamChatCompletion(request);
    }
}
