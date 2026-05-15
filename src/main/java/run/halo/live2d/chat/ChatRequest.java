package run.halo.live2d.chat;

import java.util.List;
import java.util.Locale;
import lombok.Data;
import org.apache.commons.lang3.StringUtils;
import run.halo.aifoundation.Message;

/**
 * @author LIlGG
 */
@Data
public class ChatRequest {
    private List<ChatMessagePayload> message;

    @Data
    public static class ChatMessagePayload {
        private String role;
        private String content;

        public Message toFoundationMessage() {
            if (StringUtils.isBlank(content)) {
                throw new IllegalArgumentException("chat message content must not be blank");
            }
            String normalizedRole = StringUtils.defaultString(role)
                .trim()
                .toLowerCase(Locale.ROOT);
            return switch (normalizedRole) {
                case "assistant" -> Message.assistant(content);
                case "system" -> Message.system(content);
                case "user", "" -> Message.user(content);
                default -> throw new IllegalArgumentException(
                    "unsupported chat message role: " + role);
            };
        }
    }
}
