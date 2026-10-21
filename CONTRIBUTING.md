# 参与开发

开发环境使用 Node.js 24.19+ 和 npm 12。测试通过 Node.js 直接运行 TypeScript 模块。

## 常用命令

在项目目录运行以下命令；开发服务器运行期间，可在另一个终端执行检查。

| 命令                | 用途                                 |
| ------------------- | ------------------------------------ |
| `npm run dev`       | 启动开发服务器                       |
| `npm run check`     | 检查 Biome 格式、lint 与 import 排序 |
| `npm run check:fix` | 格式化并应用安全修复                 |
| `npm run format`    | 仅自动格式化                         |
| `npm run lint`      | 仅检查代码问题                       |
| `npm test`          | 运行税务及城市缴费测试               |
| `npm run build`     | 执行 TypeScript 检查并生成 `dist/`   |
| `npm run preview`   | 本地预览已有构建产物                 |

本地预览需先构建：

```bash
npm run build
npm run preview
```

访问终端显示的预览地址。预览命令仅供本地验证，不作为生产服务器。

## 提交前检查

安装开发依赖时，Husky 通过 `prepare` 安装 Git hooks。提交时，lint-staged 会处理暂存文件：

- JavaScript、TypeScript、JSON、JSONC、CSS、HTML 和 SVG 文件：执行 Biome 格式化、import 排序和安全修复，并更新暂存区；未解决的错误或警告会阻止提交。
- Markdown 文件：由 Prettier 格式化。
- `package-lock.json` 不由 Biome 格式化。

部分暂存文件的未暂存改动由 lint-staged 默认机制暂时隐藏。接入方式参考 [Biome Git hooks 文档](https://biomejs.dev/recipes/git-hooks/)。

## 代码结构

计算逻辑与界面分离：

| 文件 | 职责 |
| --- | --- |
| [src/tax.ts](src/tax.ts) | 综合所得与奖金计税 |
| [src/cities.ts](src/cities.ts) | 城市缴费规则与个人缴费估算 |
| [tests/tax.test.mjs](tests/tax.test.mjs) | 计税案例、税率边界、奖金跳档与零收入测试 |
| [tests/cities.test.mjs](tests/cities.test.mjs) | 分险种基数、公积金取整、医保档次与税额联动测试 |

计算口径与政策来源见[计算口径与限制](docs/calculation.md)，城市规则见[五城政策资料](docs/city-policies.md)。更新政策数据时，需同步修改城市配置、资料和相关测试。
