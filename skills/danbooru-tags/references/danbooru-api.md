# Danbooru Tags、Posts、Artists API 参考

本文整理官方 Danbooru（`https://danbooru.donmai.us`）中与标签、帖子和艺术家相关的接口。Danbooru 使用 REST-like 路由，不使用统一的 `/api/v1` 前缀；通常在资源路径后加 `.json` 获取 JSON。

接口清单依据 [官方 API 说明](https://danbooru.donmai.us/wiki_pages/help%3Aapi) 和当前 [routes.rb](https://github.com/danbooru/danbooru/blob/581c5b9b58c5597f06d59a7fc1241686f4171b25/config/routes.rb) 整理，最后核对版本为 `581c5b9`（2026-07-23）。

## 1. 通用约定

### 基础 URL 和格式

```text
https://danbooru.donmai.us
```

例如：

```http
GET /tags.json
GET /posts/123456.json
GET /artists.json
```

大多数资源支持 JSON；部分资源也支持 XML。新项目建议统一使用 JSON。

### HTTP 方法

| 方法 | 用途 |
|---|---|
| `GET` | 查询或读取 |
| `POST` | 创建或提交操作 |
| `PUT/PATCH` | 修改资源 |
| `DELETE` | 删除、撤销或取消资源 |

### 认证

公共读取通常可以匿名调用。写入、个人数据和审核操作需要账号权限。推荐使用 HTTP Basic Auth：

```bash
curl -u "USERNAME:API_KEY" \
  "https://danbooru.donmai.us/tags.json?search[name_matches]=blue_hair&limit=20"
```

也支持 `login` 和 `api_key` 查询参数，但不建议使用，因为 URL 可能进入代理、服务器或浏览器日志。

### 分页和请求体

列表接口通常接受 `page`、`limit`。帖子列表当前单次最多返回 200 条。写请求参数可使用表单编码，例如 `post[tag_string]`，也可使用 JSON 请求体：

```json
{
  "post": {
    "tag_string": "1girl solo blue_hair",
    "rating": "s"
  }
}
```

写入接口受到用户等级、对象状态和速率限制约束。

## 2. Tags 接口

### 2.1 标签资源

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/tags.json` | 搜索、分页列出标签 |
| `GET` | `/tags/:id.json` | 获取单个标签 |
| `PUT/PATCH` | `/tags/:id.json` | 修改标签分类、废弃状态等 |
| `GET` | `/tag_versions.json` | 查询标签修改历史 |
| `GET` | `/tag_versions/:id.json` | 获取单条标签历史 |

标签记录通常在创建或更新帖子时自动建立；标签控制器当前主要提供读取和受限修改，不应把 `/tags` 当作通用标签创建/删除接口。

常用标签搜索参数：

| 参数 | 说明 |
|---|---|
| `search[name_matches]` | 通配符匹配，例如 `blue_*` |
| `search[fuzzy_name_matches]` | 模糊名称匹配；可配合 `order=similarity` |
| `search[name_normalize]` | 精确匹配规范化名称；多个名称用逗号分隔 |
| `search[category]` | 按分类筛选 |
| `search[is_deprecated]` | 是否已废弃 |
| `hide_empty=true` | 仅返回 `post_count > 0` 的标签 |
| `order=name|date|count|similarity` | 排序方式 |
| `page`、`limit` | 分页 |

Danbooru 标签分类值：

| 值 | 分类 |
|---:|---|
| `0` | general |
| `1` | artist |
| `3` | copyright |
| `4` | character |
| `5` | meta |

常见返回字段包括 `id`、`name`、`category`、`post_count`、`is_deprecated`、`created_at` 和 `updated_at`。

示例：

```http
GET /tags.json?search[name_normalize]=blue_hair,solo&limit=20
GET /tags.json?search[name_matches]=hatsune_*&search[category]=4&order=count
```

### 2.2 别名和蕴含关系

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/tag_aliases.json` | 搜索标签别名关系 |
| `GET` | `/tag_aliases/:id.json` | 获取单条别名关系 |
| `DELETE` | `/tag_aliases/:id.json` | 删除别名关系；需要权限 |
| `GET` | `/tag_implications.json` | 搜索标签蕴含关系 |
| `GET` | `/tag_implications/:id.json` | 获取单条蕴含关系 |
| `DELETE` | `/tag_implications/:id.json` | 删除蕴含关系；需要权限 |
| `GET` | `/bulk_update_requests.json` | 查询批量标签修改请求 |
| `POST` | `/bulk_update_requests.json` | 提交别名、蕴含、改名或批量加标签请求 |
| `POST` | `/bulk_update_requests/:id/approve.json` | 批准批量修改请求 |

别名和蕴含关系的新建通常通过 `bulk_update_requests` 提交，不是直接 `POST /tag_aliases` 或 `POST /tag_implications`。

### 2.3 标签补全、相关标签和 AI 标签

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/autocomplete.json` | 标签、艺术家、Wiki、用户等自动补全 |
| `GET` | `/related_tag.json` | 根据标签查询相关标签 |
| `GET` | `/ai_tags.json` | 查询图片的自动标注结果 |
| `PUT` | `/ai_tags/:media_asset_id/:tag_id/tag.json` | 将预测标签应用到图片 |

自动补全示例：

```http
GET /autocomplete.json?search[query]=blue_h&search[type]=tag_query&limit=10
```

返回结果通常包含 `type`、`label`、`value`、`category`、`post_count`，部分结果还包含 `id`、`antecedent` 或关联对象。

### 2.4 用于标签验证的最小规则

把一个候选标签判定为有效时，至少同时满足：

1. 返回记录中的 `name` 与规范化后的候选名称完全一致；
2. `post_count > 0`；
3. `is_deprecated` 为 `false`。

HTTP 200 本身不代表标签有效。不存在、空标签和废弃标签都应拒绝。遇到 `429` 或 `5xx` 时可进行有限的指数退避重试；重试耗尽、返回 HTML 挑战页或响应不是合法 JSON 时，应按验证失败处理。

## 3. Posts 接口

### 3.1 帖子查询和单帖读取

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/posts.json` | 按标签和元标签搜索帖子 |
| `GET` | `/posts/:id.json` | 获取单个帖子 |
| `GET` | `/posts/random.json` | 按标签查询随机帖子 |
| `GET` | `/counts/posts.json` | 获取查询结果数量 |
| `GET` | `/post_versions.json` | 查询帖子修改历史 |
| `GET` | `/post_events.json` | 查询帖子事件 |
| `GET` | `/posts/:post_id/events.json` | 查询指定帖子的事件 |
| `GET` | `/recommended_posts.json` | 获取推荐帖子 |
| `GET` | `/explore/posts/popular.json` | 热门帖子 |
| `GET` | `/explore/posts/viewed.json` | 浏览量排行 |

帖子搜索使用 `tags` 参数，语法与网站搜索框基本一致，可包含普通标签和元标签：

```http
GET /posts.json?tags=1girl+solo+blue_hair&limit=20&page=1
GET /posts.json?tags=artist%3Ahatsune_miku+rating%3As+order%3Aid
GET /posts.json?md5=MD5_HASH
GET /posts/random.json?tags=landscape
```

单帖 JSON 常见字段：

| 字段 | 说明 |
|---|---|
| `id` | 帖子 ID |
| `created_at`、`updated_at` | 创建和更新时间 |
| `file`、`media_asset` | 文件和媒体信息 |
| `rating` | `s`、`q` 或 `e` |
| `score`、`fav_count` | 得分和收藏数 |
| `parent_id`、`has_children` | 父子关系 |
| `source` | 来源 URL |
| `tag_string` | 完整标签字符串 |
| `tag_string_general` | general 标签 |
| `tag_string_artist` | artist 标签 |
| `tag_string_copyright` | copyright 标签 |
| `tag_string_character` | character 标签 |
| `tag_string_meta` | meta 标签 |
| `file_url`、`large_file_url`、`preview_file_url` | 可见时返回的文件 URL |

不可见或受限帖子可能隐藏部分字段，例如 `md5` 或文件 URL。

### 3.2 创建、修改和删除帖子

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/posts.json` | 从已有上传媒体资源创建帖子 |
| `PUT/PATCH` | `/posts/:id.json` | 修改标签、评分、来源、父帖子等 |
| `DELETE` | `/posts/:id.json` | 删除帖子；通常需要 Approver 权限 |
| `POST` | `/post_regenerations.json` | 请求重新生成派生媒体或元数据 |
| `GET/POST/PUT` | `/post_replacements.json` | 管理文件替换请求 |
| `GET` | `/post_flags.json` | 查询帖子举报 |
| `POST` | `/post_flags.json` | 提交帖子举报 |
| `GET/POST` | `/post_appeals.json` | 查询或提交申诉 |

创建帖子通常不是直接上传二进制文件到 `/posts`。常见流程是：

1. 使用 `/uploads` 创建上传任务；
2. 使用 `/upload_media_assets` 获取解析出的媒体资源；
3. `POST /posts.json`，提交 `upload_media_asset_id`、`tag_string`、`rating`、`source` 等字段。

创建示例：

```bash
curl -u "USERNAME:API_KEY" \
  -X POST "https://danbooru.donmai.us/posts.json" \
  -d "upload_media_asset_id=123" \
  -d "post[tag_string]=1girl solo blue_hair" \
  -d "post[rating]=s" \
  -d "post[source]=https://example.com/image/1"
```

更新示例：

```bash
curl -u "USERNAME:API_KEY" \
  -X PATCH "https://danbooru.donmai.us/posts/123456.json" \
  -d "post[tag_string]=1girl solo blue_hair smile" \
  -d "post[rating]=s"
```

## 4. Artists 接口

### 4.1 艺术家资源

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/artists.json` | 搜索、分页列出艺术家 |
| `GET` | `/artists/:id.json` | 获取艺术家详情 |
| `POST` | `/artists.json` | 创建艺术家记录 |
| `PUT/PATCH` | `/artists/:id.json` | 修改艺术家名称、别名、分组和网址 |
| `DELETE` | `/artists/:id.json` | 删除艺术家记录 |
| `GET` | `/artists/show_or_new.json` | 按名称查找；不存在时返回新建上下文 |
| `PUT` | `/artists/:id/revert.json` | 恢复某个艺术家历史版本 |
| `PUT` | `/artists/:id/ban.json` | 屏蔽艺术家；通常需要管理员权限 |
| `PUT` | `/artists/:id/unban.json` | 解除艺术家屏蔽 |
| `GET` | `/artist_urls.json` | 查询艺术家网址关系 |
| `GET` | `/artist_versions.json` | 查询艺术家修改历史 |
| `GET` | `/artist_versions/:id.json` | 获取单条艺术家历史 |

艺术家搜索参数：

| 参数 | 说明 |
|---|---|
| `search[any_name_matches]` | 匹配规范名、其他名称或组合名 |
| `search[any_name_or_url_matches]` | 匹配名称或网址；也可传来源 URL |
| `search[url_matches]` | 按网址匹配 |
| `search[any_other_name_like]` | 按其他名称匹配 |
| `search[is_deleted]`、`search[is_banned]` | 按状态筛选 |
| `search[order]=name` | 按名称排序 |
| `search[order]=updated_at` | 按更新时间排序 |
| `search[order]=post_count` | 按关联帖子数排序 |
| `page`、`limit` | 分页 |

### 4.2 艺术家字段和写入

常见字段包括：

- `id`、`name`
- `other_names`
- `group_name`
- `urls`
- `is_deleted`、`is_banned`
- 关联的 `tag`、`wiki_page` 和版本信息

创建或更新时常用字段：

```json
{
  "artist": {
    "name": "example_artist",
    "other_names": ["Example Artist", "example_painter"],
    "group_name": "example_circle",
    "url_string": "https://example.com/artist"
  }
}
```

艺术家名称会被规范化为标签格式。艺术家记录必须对应有效的 artist 类标签；已废弃或被别名替代的标签不能直接建立艺术家条目。

## 5. 与三类接口组合使用的典型流程

### 验证一批标签

```http
GET /tags.json?search[name_normalize]=1girl,blue_hair,solo&limit=100
```

检查返回记录的 `name`、`category`、`post_count` 和 `is_deprecated`。仅 HTTP 200 不代表标签有效；不存在、空标签或已废弃标签应视为未通过验证。

### 获取某帖子的分组标签

```http
GET /posts/123456.json
```

读取 `tag_string_general`、`tag_string_character`、`tag_string_copyright`、`tag_string_artist` 和 `tag_string_meta`。

### 从标签找到艺术家

```http
GET /artists.json?search[any_name_or_url_matches]=example_artist
GET /tags.json?search[name_normalize]=example_artist
```

### 标签补全后查询帖子

```http
GET /autocomplete.json?search[query]=blue_h&search[type]=tag_query
GET /posts.json?tags=blue_hair&limit=20
```

## 6. 错误、权限和稳定性注意事项

- `401`：缺少或无效认证。
- `403`：账号等级或 API Key 没有该操作权限。
- `404`：资源不存在，或资源对当前用户不可见。
- `422`：参数、标签、评分或资源状态不合法。
- `429`：触发速率限制；应使用有上限的指数退避重试。
- `5xx`：服务端或依赖服务异常，可有限重试。

不要把 API Key 写入日志、提交到 Git 或保存到公开报告。接口字段和权限可能随站点版本变化；生产代码应针对返回字段缺失和速率限制做容错。
