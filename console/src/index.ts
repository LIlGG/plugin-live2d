import {definePlugin} from "@halo-dev/console-shared";
import DefaultView from "./views/DefaultView.vue";
import {IconGrid} from "@halo-dev/components";
import "./styles/index.css";
import {markRaw} from "vue";

export default definePlugin({
  name: "PluginStarter",
  components: [],
  routes: [
    {
      parentName: "Root",
      route:
        {
          path: "/hello-world",
          children: [
            {
              path: "",
              name: "HelloWorld",
              component: DefaultView,
              meta: {
                permissions: ["plugin:apples:view"],
                title: "HelloWorld",
                searchable: true,
                menu: {
                  name: "迁移",
                  group: "From PluginStarter",
                  icon: markRaw(IconGrid),
                  priority: 0,
                },
              },
            },
          ],
        },
    }
  ],
  extensionPoints: {},
  activated() {
  },
  deactivated() {
  },
});
