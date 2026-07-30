# zentao

禅道 (Zentao) MCP Server，通过 `mcp__zentao__*` 系列工具供 Agent 操作禅道数据，覆盖需求/Bug/任务/用例/项目/产品/执行/版本/反馈/工单/用户等全部 CRUD。

## 认证

- 优先使用环境变量 `ZENTAO_TOKEN`（API Token）
- 无 Token 时用 `ZENTAO_ACCOUNT` + `ZENTAO_PASSWORD` 自动登录
- 需设置 `ZENTAO_BASE_URL`（禅道根地址，如 `http://172.20.20.211:8099`）

## 工具清单

| 模块 | 工具名 | 功能 |
|------|--------|------|
| 用户 | `zentao_get_my_profile` | 获取当前用户信息 |
| | `zentao_get_user` | 获取用户详情 |
| | `zentao_list_users` | 获取用户列表 |
| | `zentao_create_user` | 创建用户 |
| | `zentao_update_user` | 修改用户 |
| | `zentao_delete_user` | 删除用户 |
| 项目集 | `zentao_list_programs` | 获取项目集列表 |
| | `zentao_get_program` | 获取项目集详情 |
| | `zentao_create_program` | 创建项目集 |
| | `zentao_update_program` | 修改项目集 |
| | `zentao_delete_program` | 删除项目集 |
| 产品 | `zentao_list_products` | 获取产品列表 |
| | `zentao_get_product` | 获取产品详情 |
| | `zentao_create_product` | 创建产品 |
| | `zentao_update_product` | 修改产品 |
| | `zentao_delete_product` | 删除产品 |
| 产品计划 | `zentao_list_plans` | 获取计划列表 |
| | `zentao_get_plan` | 获取计划详情 |
| | `zentao_create_plan` | 创建计划 |
| | `zentao_update_plan` | 修改计划 |
| | `zentao_delete_plan` | 删除计划 |
| | `zentao_link_plan_stories` | 计划关联需求 |
| | `zentao_unlink_plan_stories` | 计划取消关联需求 |
| | `zentao_link_plan_bugs` | 计划关联 Bug |
| | `zentao_unlink_plan_bugs` | 计划取消关联 Bug |
| 发布 | `zentao_list_project_releases` | 获取项目发布列表 |
| | `zentao_list_product_releases` | 获取产品发布列表 |
| 需求 | `zentao_get_story` | 获取需求详情 |
| | `zentao_list_stories` | 列出需求 |
| | `zentao_create_story` | 创建需求 |
| | `zentao_update_story` | 修改需求 |
| | `zentao_delete_story` | 删除需求 |
| | `zentao_change_story` | 变更需求 |
| 项目 | `zentao_list_projects` | 获取项目列表 |
| | `zentao_get_project` | 获取项目详情 |
| | `zentao_create_project` | 创建项目 |
| | `zentao_update_project` | 修改项目 |
| | `zentao_delete_project` | 删除项目 |
| 执行/迭代 | `zentao_list_executions` | 获取执行列表 |
| | `zentao_get_execution` | 获取执行详情 |
| | `zentao_create_execution` | 创建执行/迭代 |
| | `zentao_update_execution` | 修改执行 |
| | `zentao_delete_execution` | 删除执行 |
| 版本 | `zentao_list_project_builds` | 获取项目版本列表 |
| | `zentao_list_execution_builds` | 获取执行版本列表 |
| | `zentao_get_build` | 获取版本详情 |
| | `zentao_create_build` | 创建版本 |
| | `zentao_update_build` | 修改版本 |
| | `zentao_delete_build` | 删除版本 |
| Bug | `zentao_get_bug` | 获取 Bug 详情 |
| | `zentao_list_bugs` | 列出 Bug |
| | `zentao_create_bug` | 创建 Bug |
| | `zentao_update_bug` | 修改 Bug |
| | `zentao_delete_bug` | 删除 Bug |
| 任务 | `zentao_get_task` | 获取任务详情 |
| | `zentao_list_tasks` | 列出任务 |
| 用例 | `zentao_list_testcases` | 获取用例列表 |
| | `zentao_get_testcase` | 获取用例详情 |
| | `zentao_create_testcase` | 创建用例 |
| | `zentao_update_testcase` | 修改用例 |
| | `zentao_delete_testcase` | 删除用例 |
| 测试单 | `zentao_list_testtasks` | 获取测试单列表 |
| | `zentao_list_project_testtasks` | 获取项目测试单 |
| | `zentao_get_testtask` | 获取测试单详情 |
| 反馈 | `zentao_list_feedbacks` | 获取反馈列表 |
| | `zentao_get_feedback` | 获取反馈详情 |
| | `zentao_create_feedback` | 创建反馈 |
| | `zentao_update_feedback` | 修改反馈 |
| | `zentao_delete_feedback` | 删除反馈 |
| | `zentao_assign_feedback` | 指派反馈 |
| | `zentao_close_feedback` | 关闭反馈 |
| 工单 | `zentao_list_tickets` | 获取工单列表 |
| | `zentao_get_ticket` | 获取工单详情 |
| | `zentao_create_ticket` | 创建工单 |
| | `zentao_update_ticket` | 修改工单 |
| | `zentao_delete_ticket` | 删除工单 |

## 行为特性

- **自动重登录**：Token 过期（401）时自动用账号密码重新登录并重试，对调用方透明。
- **错误返回**：失败时以 `isError: true` 返回，文本包含具体原因。
- **禅道版本**：仅支持 v18+ REST API。
