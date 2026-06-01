# LLM Wiki Site

Quartz v4 驱动的个人知识库网站，从 `VAULT_DIR` 指向的 knowledge vault Markdown 文件自动生成。

## 功能

- Wikilinks (`[[链接]]`) 自动解析
- Backlinks 反向链接面板
- 全文搜索
- 知识图谱可视化
- Tags 标签浏览
- Sync 按钮一键同步 wiki 内容
- Vault Browser 浏览已发布 wiki 层
- 内容类型标签 (Entity / Concept / Study 等)

## 快速开始

```bash
# 安装依赖
npm ci

# 配置（可选，默认使用 ../llm-knowledge-vault）
cp .env.example .env

# 首次构建
npm run build

# 启动服务
npm start
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

`build.sh` 将 `VAULT_DIR` 中可发布的 wiki 层复制到 Quartz 的 `content/` 目录，然后构建静态站点。默认 `VAULT_DIR` 是 `../llm-knowledge-vault`。发布范围只包括 `10_wiki/` 和 `30_maps/`；`00_raw/`、`05_capture/`、`20_human/`、`20_self/` 和根 manifest 等本地私有内容不会同步或通过 vault browser 暴露。

## API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/status` | GET | 返回同步状态和内容哈希 |
| `/api/sync` | POST | 触发同步构建 |
| `/vault/` | GET | 浏览已发布 vault 层 |

## 配置

复制 `.env.example` 为 `.env` 并按需修改：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VAULT_DIR` | vault 根目录路径 | `../llm-knowledge-vault` |
| `HOST` | 服务绑定地址 | `0.0.0.0` |
| `PORT` | 服务端口 | `49345` |

## 工作流

1. 在 `VAULT_DIR` 指向的 vault 中编辑 Markdown
2. 打开网站，点击底部 **Sync** 按钮
3. 网站自动重新构建并刷新
