# Halo 前后端服务的 Docker Compose

通过 Docker Compose 的方式启动 Halo 前后端服务快速查看插件效果。

## 开发指引

### 环境要求

- OpenJDK 17
- NodeJS 16+
- pnpm 7+
- Docker
- Docker Compose

### 编译插件

下载前端依赖：

```bash
cd ./plugin-starter

./gradlew.bat pnpmInstall

# or macOS/Linux

./gradlew pnpmInstall
```

构建：

```bash
./gradlew.bat build

# or macOS/Linux

./gradlew build
```

### 启动 Halo

```bash
cd plugin-starter/compose
docker-compose up -d
docker-compose ps
```

### 访问后台

在浏览器中访问 <https://localhost:8090/console> 即可，登录用户名和密码为当前目录中 `application-dev.yaml` 配置中的 `super-admin-username`
和 `super-admin-password`。

然后在左侧菜单中选择 `插件`，即可查看所有插件的状态。

### 开发

修改前端代码或者后端代码，然后运行 `./gradlew.bat build` 或者 `./gradlew build`（macOS/Linux）即可构建插件，无需重启
Halo。但修改配置文件后需要 build 插件以及重启 Halo。
