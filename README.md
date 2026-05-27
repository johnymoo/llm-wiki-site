# LLM Wiki Site

Quartz v4 驱动的个人知识库网站，从 [llm-wiki](../llm-wiki) Markdown 文件自动生成。

## 功能

- Wikilinks (`[[链接]]`) 自动解析
- Backlinks 反向链接面板
- 全文搜索
- 知识图谱可视化
- Tags 标签浏览
- Sync 按钮一键同步 wiki 内容
- 内容类型标签 (Entity / Concept / Study 等)

## 快速开始

```bash
# 安装依赖
npm install

# 首次构建
./build.sh

# 启动服务
node server.js
```

访问 http://localhost:49345

## 架构

```
llm-wiki-site/
├── build.sh              # 同步 wiki 内容 + 构建 Quartz
├── server.js             # Express 服务器 (API + 静态文件)
├── package.json
├── overrides/            # 自定义配置和组件
│   ├── quartz.config.ts  # Quartz 配置
│   ├── quartz.layout.ts  # 页面布局
│   ├── index.md          # 自定义首页
│   └── components/
│       ├── SyncBar.tsx   # 底部同步栏
│       └── TypeBadge.tsx # 内容类型标签
└── quartz/               # Quartz v4.4.1 (gitignored)
```

`build.sh` 将 `../llm-wiki/` 的内容（排除 `code/` 和 `queries/`）复制到 Quartz 的 `content/` 目录，然后构建静态站点。

## API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/status` | GET | 返回同步状态和内容哈希 |
| `/api/sync` | POST | 触发同步构建 |

## 配置

环境变量：

- `PORT` — 服务端口，默认 `49345`
- `HOST` — 绑定地址，默认 `0.0.0.0`

## 工作流

1. 在 `../llm-wiki/` 中编辑 Markdown
2. 打开网站，点击底部 **Sync** 按钮
3. 网站自动重新构建并刷新
