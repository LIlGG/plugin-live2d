package run.halo.live2d.agent;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import run.halo.aifoundation.schema.JsonSchema;
import run.halo.aifoundation.tool.ToolDefinition;
import run.halo.live2d.ai.ConditionalOnHaloAiFoundation;

@Component
@ConditionalOnHaloAiFoundation
@RequiredArgsConstructor
public class AgentToolService {
    private static final String RESPONSE_FORMAT_PROMPT = "\n\n【回复格式】\n"
        + "- 默认使用 Markdown 格式回复，普通聊天也可以只写自然文本。\n"
        + "- 除非回复很短，否则每句话单独成行；不要把多句话连续写在同一段里。\n"
        + "- 每一行只表达一个意思，完整表达后立即换行，让气泡内容更容易阅读。\n"
        + "- 需要分点说明时优先使用 Markdown 列表，每个列表项单独成行，列表前后保留空行。\n"
        + "- 多个列表、段落或不同主题之间使用空行分隔，避免把内容挤在同一段里。\n"
        + "- 不要输出 HTML 标签。";

    private final AgentToolNormalizer normalizer;
    private final HaloAgentPresetToolService haloPresetToolService;

    public AgentToolSet buildTools(AgentSettings settings, AgentAccessMode accessMode,
        boolean authenticated) {
        if (!accessMode.agentAllowed()) {
            return AgentToolSet.disabled();
        }

        var resolvedSettings = settings == null ? AgentSettings.defaults() : settings;
        List<ToolDefinition> tools = new ArrayList<>();
        addBuiltInBrowserTools(tools, resolvedSettings);
        addHaloPresetTools(tools, resolvedSettings);
        normalizer.normalizeCustomTools(resolvedSettings).stream()
            .filter(tool -> isAllowed(tool.requiredAuth(), authenticated))
            .map(this::toBrowserToolDefinition)
            .forEach(tools::add);
        return new AgentToolSet(true, List.copyOf(tools));
    }

    private void addHaloPresetTools(List<ToolDefinition> tools, AgentSettings settings) {
        var builtIn = settings.builtIn();
        if (builtIn.haloContentSearch()) {
            tools.add(ToolDefinition.builder()
                .name("search_halo_resources")
                .description("使用 Halo 自身全文搜索引擎搜索公开内容资源，适合查找文章、页面或其他已接入搜索索引的公开内容。")
                .inputSchema(JsonSchema.object()
                    .property("keyword", JsonSchema.string().description("搜索关键词"))
                    .property("limit", JsonSchema.integer().description("返回数量，1 到 20"))
                    .property("includeTypes", JsonSchema.array(JsonSchema.string().build())
                        .description("可选内容类型列表，只会使用站点允许的类型"))
                    .required("keyword")
                    .build())
                .executor(context -> haloPresetToolService.searchHaloResources(context.getInput(),
                    settings))
                .build());
            tools.add(ToolDefinition.builder()
                .name("get_halo_resource_detail")
                .description("读取已查询到的公开 Halo 资源的有限详情，用于总结或介绍资源内容。")
                .inputSchema(JsonSchema.object()
                    .property("resourceId", JsonSchema.string().description("可信资源 ID"))
                    .required("resourceId")
                    .build())
                .executor(context -> haloPresetToolService.getHaloResourceDetail(context.getInput(),
                    settings))
                .build());
            tools.add(ToolDefinition.builder()
                .name("get_latest_halo_resources")
                .description("查看站点最新公开内容资源。第一版稳定支持最新文章。")
                .inputSchema(JsonSchema.object()
                    .property("limit", JsonSchema.integer().description("返回数量，1 到 20"))
                    .build())
                .executor(context -> haloPresetToolService.getLatestHaloResources(
                    context.getInput()))
                .build());
            tools.add(ToolDefinition.builder()
                .name("get_categories")
                .description("查看站点公开分类列表。")
                .inputSchema(JsonSchema.object()
                    .property("limit", JsonSchema.integer().description("返回数量，1 到 100"))
                    .build())
                .executor(context -> haloPresetToolService.getCategories(context.getInput()))
                .build());
            tools.add(ToolDefinition.builder()
                .name("get_tags")
                .description("查看站点公开标签列表。")
                .inputSchema(JsonSchema.object()
                    .property("limit", JsonSchema.integer().description("返回数量，1 到 100"))
                    .build())
                .executor(context -> haloPresetToolService.getTags(context.getInput()))
                .build());
            tools.add(ToolDefinition.builder()
                .name("get_posts_by_category")
                .description("查看指定分类下的公开文章。")
                .inputSchema(JsonSchema.object()
                    .property("categoryName", JsonSchema.string().description("分类元数据名称"))
                    .property("limit", JsonSchema.integer().description("返回数量，1 到 20"))
                    .required("categoryName")
                    .build())
                .executor(context -> haloPresetToolService.getPostsByCategory(context.getInput()))
                .build());
            tools.add(ToolDefinition.builder()
                .name("get_posts_by_tag")
                .description("查看指定标签下的公开文章。")
                .inputSchema(JsonSchema.object()
                    .property("tagName", JsonSchema.string().description("标签元数据名称"))
                    .property("limit", JsonSchema.integer().description("返回数量，1 到 20"))
                    .required("tagName")
                    .build())
                .executor(context -> haloPresetToolService.getPostsByTag(context.getInput()))
                .build());
            tools.add(ToolDefinition.builder()
                .name("get_pages")
                .description("查看站点公开独立页面列表。")
                .inputSchema(JsonSchema.object()
                    .property("limit", JsonSchema.integer().description("返回数量，1 到 100"))
                    .build())
                .executor(context -> haloPresetToolService.getPages(context.getInput()))
                .build());
        }
        if (builtIn.networkAccess()) {
            tools.add(ToolDefinition.builder()
                .name("fetch_allowed_url")
                .description("通过后端读取站长白名单中的公网 URL。仅支持 GET，只能访问网络访问安全策略允许的 Origin，不能访问 localhost、内网或链路本地地址。适合读取公开 API、公开 JSON、文本页面或文档摘要。")
                .inputSchema(JsonSchema.object()
                    .property("url", JsonSchema.string().description("要读取的完整公网 URL，必须属于站长配置的允许 Origin"))
                    .required("url")
                    .build())
                .executor(context -> haloPresetToolService.fetchAllowedUrl(context.getInput(),
                    settings))
                .build());
        }
        if (builtIn.commentCapability() == AgentCommentCapability.ASSIST
            || builtIn.commentCapability() == AgentCommentCapability.SUBMIT) {
            tools.add(ToolDefinition.builder()
                .name("draft_comment")
                .description("滚动到评论区，并将评论草稿写入当前页面的评论输入框。该工具不会自动提交评论。")
                .inputSchema(JsonSchema.object()
                    .property("content", JsonSchema.string().description("评论草稿内容"))
                    .required("content")
                    .build())
                .build());
        }
        if (builtIn.commentCapability() == AgentCommentCapability.SUBMIT) {
            tools.add(ToolDefinition.builder()
                .name("submit_comment")
                .description("滚动到评论区，写入评论内容，并在访客审批后尝试提交评论。只有站点评论流程允许且必要校验满足时才可成功。")
                .inputSchema(JsonSchema.object()
                    .property("content", JsonSchema.string().description("评论内容"))
                    .required("content")
                    .build())
                .requiresApproval(true)
                .build());
        }
    }

    public String appendCapabilityPrompt(String systemMessage, AgentToolSet toolSet) {
        if (toolSet == null || !toolSet.agentEnabled() || toolSet.tools().isEmpty()) {
            return systemMessage + RESPONSE_FORMAT_PROMPT + "\n\n【Agent 能力边界】\n"
                + "当前站点未向访客开放 Agent 操作能力。你可以正常聊天，但不能承诺打开页面、提交内容或控制站点功能。";
        }
        return systemMessage + RESPONSE_FORMAT_PROMPT + "\n\n【Agent 能力】\n"
            + "- 你可以在工具可用时协助访客执行已授权的站点操作。\n"
            + "- 只能调用当前已声明的工具；不要承诺未声明或未授权的能力。\n"
            + "- 执行评论、表单填写、页面定位等依赖当前页面结构的操作前，应先读取当前页面上下文；如果页面不具备对应能力，应如实说明。\n"
            + "- 需要访客确认的操作必须等待确认，不能声称已经完成。\n"
            + "- 导航、搜索和评论都应以工具结果为准。";
    }

    private void addBuiltInBrowserTools(List<ToolDefinition> tools, AgentSettings settings) {
        var builtIn = settings.builtIn();
        if (builtIn.pageContext()) {
            tools.add(ToolDefinition.builder()
                .name("get_current_page_context")
                .description("读取当前访客页面上下文和可操作能力，例如页面标题、地址、主要标题、选中文本、评论区/评论输入框/提交按钮是否存在、页面表单摘要和站内链接摘要。不会读取表单当前值、Cookie 或本地存储。执行评论、表单填写或页面定位前应先使用该工具判断当前页面是否支持对应操作。")
                .inputSchema(JsonSchema.object().build())
                .build());
        }
        if (builtIn.haloNavigation()) {
            tools.add(ToolDefinition.builder()
                .name("open_halo_resource")
                .description("打开刚由 Halo 查询工具返回的可信资源。只能打开工具结果中出现过的资源。")
                .inputSchema(JsonSchema.object()
                    .property("resourceId", JsonSchema.string().description("可信资源 ID"))
                    .required("resourceId")
                    .build())
                .build());
        }
        if (builtIn.commentCapability() != AgentCommentCapability.OFF) {
            tools.add(ToolDefinition.builder()
                .name("open_comment_area")
                .description("打开或滚动到当前页面评论区。该工具不会自动提交评论。")
                .inputSchema(JsonSchema.object().build())
                .build());
        }
    }

    private ToolDefinition toBrowserToolDefinition(NormalizedAgentTool tool) {
        return ToolDefinition.builder()
            .name(tool.name())
            .description(descriptionWithPolicy(tool))
            .inputSchema(tool.inputSchema())
            .build();
    }

    private String descriptionWithPolicy(NormalizedAgentTool tool) {
        String description = tool.description();
        if (tool.approval() == AgentToolApproval.ALWAYS) {
            description += "。该工具需要访客确认后才会执行。";
        }
        if ("dispatch-event".equals(tool.actionType())) {
            description += "。该工具只会触发站点声明的事件，具体行为由站点实现。";
        }
        if ("registered".equals(tool.actionType())) {
            description += "。该工具由站点注册的前端执行器处理。";
        }
        return description;
    }

    private boolean isAllowed(AgentToolAuth requiredAuth, boolean authenticated) {
        return requiredAuth != AgentToolAuth.AUTHENTICATED || authenticated;
    }

    public static Map<String, Object> emptyObjectSchema() {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("properties", Map.of());
        return schema;
    }
}
