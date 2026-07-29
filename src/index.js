#!/usr/bin/env node
/**
 * Zentao MCP Server
 *
 * 暴露禅道 (Zentao) 的需求/Bug/任务/用例等读写工具，供 Claude Code Agent 调用。
 *
 * 环境变量:
 *   ZENTAO_BASE_URL  必填，禅道根地址，如 http://172.20.20.211:8099
 *   ZENTAO_ACCOUNT   必填（无 Token 时），禅道登录账号
 *   ZENTAO_PASSWORD  必填（无 Token 时），禅道登录密码
 *   ZENTAO_TOKEN     可选，预先生成的 API Token；优先使用
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { ZentaoClient } from './zentao-client.js';

const baseUrl = process.env.ZENTAO_BASE_URL;
if (!baseUrl) {
  console.error('[bre-mcp-server-zentao] ZENTAO_BASE_URL is not set');
  process.exit(1);
}

const client = new ZentaoClient({
  baseUrl,
  token: process.env.ZENTAO_TOKEN,
  account: process.env.ZENTAO_ACCOUNT,
  password: process.env.ZENTAO_PASSWORD,
});

const server = new McpServer({
  name: 'zentao',
  version: '1.0.0',
});

/** 把任意结果包成 MCP tool result（JSON text） */
function ok(data) {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

/** 错误统一转成结构化文本 */
function fail(err) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    isError: true,
    content: [{ type: 'text', text: `Zentao error: ${message}` }],
  };
}

// ============ 用户 (User) ============
server.registerTool(
  'zentao_get_my_profile',
  {
    description: '获取当前登录用户的个人信息',
    inputSchema: {},
  },
  async () => {
    try { return ok(await client.getMyProfile()); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_get_user',
  {
    description: '获取禅道用户信息',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('用户 ID') },
  },
  async ({ id }) => {
    try { return ok(await client.getUser(id)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_list_users',
  {
    description: '获取禅道用户列表',
    inputSchema: {
      page: z.number().int().positive().optional().describe('当前页数，默认 1'),
      limit: z.number().int().positive().optional().describe('每页用户数，默认 20'),
    },
  },
  async (args) => {
    try { return ok(await client.listUsers(args)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_create_user',
  {
    description: '创建禅道用户',
    inputSchema: {
      account: z.string().describe('账号'),
      password: z.string().describe('密码'),
      realname: z.string().optional().describe('真实姓名'),
      visions: z.array(z.string()).optional().describe('界面 [rnd, lite]'),
    },
  },
  async (args) => {
    try { return ok(await client.createUser(args)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_update_user',
  {
    description: '修改禅道用户信息',
    inputSchema: {
      id: z.union([z.number(), z.string()]).describe('用户 ID'),
      dept: z.number().int().optional().describe('所属部门'),
      role: z.string().optional().describe('角色'),
      mobile: z.string().optional().describe('手机号'),
      realname: z.string().optional().describe('真实姓名'),
      email: z.string().optional().describe('邮箱'),
      phone: z.string().optional().describe('电话号码'),
    },
  },
  async ({ id, ...rest }) => {
    try { return ok(await client.updateUser(id, rest)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_delete_user',
  {
    description: '删除禅道用户',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('用户 ID') },
  },
  async ({ id }) => {
    try { return ok(await client.deleteUser(id)); } catch (e) { return fail(e); }
  },
);

// ============ 项目集 (Program) ============
server.registerTool(
  'zentao_list_programs',
  {
    description: '获取禅道项目集列表',
    inputSchema: {
      order: z.string().optional().describe('排序，默认 order_asc；排序字段+下划线+asc/desc'),
    },
  },
  async (args) => {
    try { return ok(await client.listPrograms(args)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_get_program',
  {
    description: '获取禅道项目集详情',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('项目集 ID') },
  },
  async ({ id }) => {
    try { return ok(await client.getProgram(id)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_create_program',
  {
    description: '创建禅道项目集',
    inputSchema: {
      name: z.string().optional().describe('项目名称'),
      parent: z.string().optional().describe('父项目集，0 表示没有'),
      PM: z.string().optional().describe('项目负责人'),
      budget: z.number().optional().describe('预算金额'),
      budgetUnit: z.string().optional().describe('预算币种 CNY/USD'),
      desc: z.string().optional().describe('项目集描述'),
      begin: z.string().optional().describe('预计开始日期'),
      end: z.string().optional().describe('预计结束日期'),
      acl: z.string().optional().describe('访问控制：open 公开 | private 私有'),
      whitelist: z.array(z.any()).optional().describe('白名单'),
    },
  },
  async (args) => {
    try { return ok(await client.createProgram(args)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_update_program',
  {
    description: '修改禅道项目集',
    inputSchema: {
      id: z.union([z.number(), z.string()]).describe('项目集 ID'),
      name: z.string().optional().describe('项目名称'),
      parent: z.string().optional().describe('父项目集'),
      PM: z.string().optional().describe('项目负责人'),
      budget: z.number().optional().describe('预算金额'),
      budgetUnit: z.string().optional().describe('预算币种 CNY/USD'),
      desc: z.string().optional().describe('项目集描述'),
      begin: z.string().optional().describe('预计开始日期'),
      end: z.string().optional().describe('预计结束日期'),
      acl: z.string().optional().describe('访问控制：open | private'),
      whitelist: z.array(z.any()).optional().describe('白名单'),
    },
  },
  async ({ id, ...rest }) => {
    try { return ok(await client.updateProgram(id, rest)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_delete_program',
  {
    description: '删除禅道项目集',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('项目集 ID') },
  },
  async ({ id }) => {
    try { return ok(await client.deleteProgram(id)); } catch (e) { return fail(e); }
  },
);

// ============ 产品 (Product) ============
server.registerTool(
  'zentao_list_products',
  {
    description: '获取禅道产品列表',
    inputSchema: {},
  },
  async () => {
    try { return ok(await client.listProducts()); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_get_product',
  {
    description: '获取禅道产品详情',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('产品 ID') },
  },
  async ({ id }) => {
    try { return ok(await client.getProduct(id)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_create_product',
  {
    description: '创建禅道产品',
    inputSchema: {
      name: z.string().describe('产品名称'),
      code: z.string().describe('产品代号'),
      program: z.number().int().optional().describe('所属项目集'),
      line: z.number().int().optional().describe('所属产品线'),
      PO: z.string().optional().describe('产品负责人'),
      QD: z.string().optional().describe('测试负责人'),
      RD: z.string().optional().describe('发布负责人'),
      type: z.string().optional().describe('产品类型：normal | branch | platform'),
      desc: z.string().optional().describe('产品描述'),
      acl: z.string().optional().describe('访问控制：open | private'),
      whitelist: z.array(z.any()).optional().describe('白名单'),
    },
  },
  async (args) => {
    try { return ok(await client.createProduct(args)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_update_product',
  {
    description: '修改禅道产品',
    inputSchema: {
      id: z.union([z.number(), z.string()]).describe('产品 ID'),
      name: z.string().optional().describe('产品名称'),
      code: z.string().optional().describe('产品代号'),
      type: z.string().optional().describe('产品类型：normal | branch | platform'),
      line: z.number().int().optional().describe('所属产品线'),
      program: z.number().int().optional().describe('所属项目集'),
      status: z.string().optional().describe('产品状态：normal | closed'),
      desc: z.string().optional().describe('产品描述'),
    },
  },
  async ({ id, ...rest }) => {
    try { return ok(await client.updateProduct(id, rest)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_delete_product',
  {
    description: '删除禅道产品',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('产品 ID') },
  },
  async ({ id }) => {
    try { return ok(await client.deleteProduct(id)); } catch (e) { return fail(e); }
  },
);

// ============ 产品计划 (Plan) ============
server.registerTool(
  'zentao_list_plans',
  {
    description: '获取禅道产品计划列表',
    inputSchema: {
      product: z.union([z.number(), z.string()]).describe('产品 ID'),
    },
  },
  async ({ product }) => {
    try { return ok(await client.listPlans(product)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_get_plan',
  {
    description: '获取禅道计划详情',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('计划 ID') },
  },
  async ({ id }) => {
    try { return ok(await client.getPlan(id)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_create_plan',
  {
    description: '创建禅道产品计划',
    inputSchema: {
      product: z.union([z.number(), z.string()]).describe('产品 ID'),
      title: z.string().describe('计划名称'),
      branch: z.number().int().optional().describe('所属分支'),
      begin: z.string().optional().describe('计划开始日期'),
      end: z.string().optional().describe('计划结束日期'),
      desc: z.string().optional().describe('计划描述'),
      parent: z.number().int().optional().describe('所属父计划'),
    },
  },
  async ({ product, ...rest }) => {
    try { return ok(await client.createPlan(product, rest)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_update_plan',
  {
    description: '修改禅道计划',
    inputSchema: {
      id: z.union([z.number(), z.string()]).describe('计划 ID'),
      branch: z.number().int().optional().describe('所属分支'),
      title: z.string().optional().describe('计划名称'),
      begin: z.string().optional().describe('计划开始日期'),
      end: z.string().optional().describe('计划结束日期'),
      desc: z.string().optional().describe('计划描述'),
    },
  },
  async ({ id, ...rest }) => {
    try { return ok(await client.updatePlan(id, rest)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_delete_plan',
  {
    description: '删除禅道计划',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('计划 ID') },
  },
  async ({ id }) => {
    try { return ok(await client.deletePlan(id)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_link_plan_stories',
  {
    description: '禅道产品计划关联需求',
    inputSchema: {
      id: z.union([z.number(), z.string()]).describe('计划 ID'),
      stories: z.array(z.number()).describe('关联的需求 ID 数组，如 [1, 2]'),
    },
  },
  async ({ id, stories }) => {
    try { return ok(await client.linkPlanStories(id, stories)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_unlink_plan_stories',
  {
    description: '禅道产品计划取消关联需求',
    inputSchema: {
      id: z.union([z.number(), z.string()]).describe('计划 ID'),
      stories: z.array(z.number()).describe('取消关联的需求 ID 数组，如 [1, 2]'),
    },
  },
  async ({ id, stories }) => {
    try { return ok(await client.unlinkPlanStories(id, stories)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_link_plan_bugs',
  {
    description: '禅道产品计划关联 Bug',
    inputSchema: {
      id: z.union([z.number(), z.string()]).describe('计划 ID'),
      bugs: z.array(z.number()).describe('关联的 Bug ID 数组，如 [1, 2]'),
    },
  },
  async ({ id, bugs }) => {
    try { return ok(await client.linkPlanBugs(id, bugs)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_unlink_plan_bugs',
  {
    description: '禅道产品计划取消关联 Bug',
    inputSchema: {
      id: z.union([z.number(), z.string()]).describe('计划 ID'),
      bugs: z.array(z.number()).describe('取消关联的 Bug ID 数组，如 [1, 2]'),
    },
  },
  async ({ id, bugs }) => {
    try { return ok(await client.unlinkPlanBugs(id, bugs)); } catch (e) { return fail(e); }
  },
);

// ============ 发布 (Release) ============
server.registerTool(
  'zentao_list_project_releases',
  {
    description: '获取禅道项目发布列表',
    inputSchema: {
      project: z.union([z.number(), z.string()]).describe('项目 ID'),
    },
  },
  async ({ project }) => {
    try { return ok(await client.listProjectReleases(project)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_list_product_releases',
  {
    description: '获取禅道产品发布列表',
    inputSchema: {
      product: z.union([z.number(), z.string()]).describe('产品 ID'),
    },
  },
  async ({ product }) => {
    try { return ok(await client.listProductReleases(product)); } catch (e) { return fail(e); }
  },
);

// ============ 需求 (Story) ============
server.registerTool(
  'zentao_get_story',
  {
    description: '获取禅道需求 (Story) 详情',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('需求 ID') },
  },
  async ({ id }) => {
    try { return ok(await client.getStory(id)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_list_stories',
  {
    description: '列出禅道需求；按 product / execution / project 查询，可过滤 status / assignedTo',
    inputSchema: {
      product: z.union([z.number(), z.string()]).optional().describe('产品 ID'),
      execution: z.union([z.number(), z.string()]).optional().describe('项目/执行 ID'),
      project: z.union([z.number(), z.string()]).optional().describe('项目 ID'),
      status: z.string().optional().describe('需求状态：active/changed/draft/closed 等'),
      assignedTo: z.string().optional().describe('指派给的用户名'),
      limit: z.number().int().positive().max(200).optional().describe('最多返回数量，默认 50'),
    },
  },
  async (args) => {
    try { return ok(await client.listStories(args)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_create_story',
  {
    description: '创建禅道需求',
    inputSchema: {
      title: z.string().describe('需求标题'),
      product: z.union([z.number(), z.string()]).describe('所属产品'),
      pri: z.number().int().min(1).max(4).describe('优先级 1-4'),
      category: z.string().describe('需求类型：feature/interface/performance/safe/experience/improve/other'),
      spec: z.string().optional().describe('需求描述'),
      verify: z.string().optional().describe('验收标准'),
      source: z.string().optional().describe('需求来源：customer/user/po/market'),
      sourceNote: z.string().optional().describe('来源备注'),
      estimate: z.number().optional().describe('预计工时'),
      keywords: z.string().optional().describe('关键词'),
    },
  },
  async (args) => {
    try { return ok(await client.createStory(args)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_update_story',
  {
    description: '修改禅道需求其他字段',
    inputSchema: {
      id: z.union([z.number(), z.string()]).describe('需求 ID'),
      module: z.union([z.number(), z.string()]).optional().describe('所属模块'),
      source: z.string().optional().describe('来源'),
      sourceNote: z.string().optional().describe('来源备注'),
      pri: z.number().int().min(1).max(4).optional().describe('优先级 1-4'),
      category: z.string().optional().describe('类型：feature/interface/performance/safe/experience/improve/other'),
      estimate: z.number().optional().describe('预计工时'),
      keywords: z.string().optional().describe('关键词'),
    },
  },
  async ({ id, ...rest }) => {
    try { return ok(await client.updateStory(id, rest)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_delete_story',
  {
    description: '删除禅道需求',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('需求 ID') },
  },
  async ({ id }) => {
    try { return ok(await client.deleteStory(id)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_change_story',
  {
    description: '变更禅道需求',
    inputSchema: {
      id: z.union([z.number(), z.string()]).describe('需求 ID'),
      title: z.string().optional().describe('需求标题'),
      spec: z.string().optional().describe('需求描述'),
      verify: z.string().optional().describe('验收标准'),
    },
  },
  async ({ id, ...rest }) => {
    try { return ok(await client.changeStory(id, rest)); } catch (e) { return fail(e); }
  },
);

// ============ 项目 (Project) ============
server.registerTool(
  'zentao_list_projects',
  {
    description: '获取禅道项目列表',
    inputSchema: {
      page: z.string().optional().describe('第几页，默认 1'),
      limit: z.string().optional().describe('每页项目数，默认 20'),
    },
  },
  async (args) => {
    try { return ok(await client.listProjects(args)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_get_project',
  {
    description: '获取禅道项目详情',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('项目 ID') },
  },
  async ({ id }) => {
    try { return ok(await client.getProject(id)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_create_project',
  {
    description: '创建禅道项目',
    inputSchema: {
      name: z.string().describe('项目名称'),
      begin: z.string().describe('计划开始日期'),
      end: z.string().describe('计划结束日期'),
      products: z.array(z.number()).describe('关联产品，如 [1, 2]'),
      code: z.string().describe('项目编号'),
      model: z.string().optional().describe('项目模型，默认 scrum'),
      parent: z.number().int().optional().describe('所属项目集，默认 0'),
    },
  },
  async (args) => {
    try { return ok(await client.createProject(args)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_update_project',
  {
    description: '修改禅道项目',
    inputSchema: {
      id: z.union([z.number(), z.string()]).describe('项目 ID'),
      name: z.string().optional().describe('项目名称'),
      code: z.string().optional().describe('项目代号'),
      parent: z.number().int().optional().describe('所属项目集'),
      PM: z.string().optional().describe('项目负责人'),
      budget: z.number().optional().describe('项目预算金额'),
      budgetUnit: z.string().optional().describe('预算币种 CNY/USD'),
      days: z.number().int().optional().describe('可用工作日'),
      desc: z.string().optional().describe('项目描述'),
      acl: z.string().optional().describe('访问控制：open | private'),
      whitelist: z.array(z.any()).optional().describe('白名单'),
      auth: z.string().optional().describe('权限控制：extend | reset'),
    },
  },
  async ({ id, ...rest }) => {
    try { return ok(await client.updateProject(id, rest)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_delete_project',
  {
    description: '删除禅道项目',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('项目 ID') },
  },
  async ({ id }) => {
    try { return ok(await client.deleteProject(id)); } catch (e) { return fail(e); }
  },
);

// ============ 执行 (Execution) ============
server.registerTool(
  'zentao_list_executions',
  {
    description: '获取禅道项目的执行列表',
    inputSchema: {
      project: z.union([z.number(), z.string()]).describe('项目 ID'),
    },
  },
  async ({ project }) => {
    try { return ok(await client.listExecutions(project)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_get_execution',
  {
    description: '获取禅道执行详情',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('执行 ID') },
  },
  async ({ id }) => {
    try { return ok(await client.getExecution(id)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_create_execution',
  {
    description: '创建禅道执行（迭代/阶段）',
    inputSchema: {
      project: z.union([z.number(), z.string()]).describe('所属项目'),
      name: z.string().describe('执行名称'),
      code: z.string().describe('执行代号'),
      begin: z.string().describe('计划开始日期'),
      end: z.string().describe('计划结束日期'),
      days: z.number().int().optional().describe('可用工作日'),
      lifetime: z.string().optional().describe('类型：short | long | ops'),
      PO: z.string().optional().describe('产品负责人'),
      PM: z.string().optional().describe('迭代负责人'),
      QD: z.string().optional().describe('测试负责人'),
      RD: z.string().optional().describe('发布负责人'),
      teamMembers: z.array(z.string()).optional().describe('团队成员，如 ["admin"]'),
      desc: z.string().optional().describe('迭代描述'),
      acl: z.string().optional().describe('访问控制：private | open'),
      whitelist: z.array(z.any()).optional().describe('白名单'),
    },
  },
  async (args) => {
    try { return ok(await client.createExecution(args)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_update_execution',
  {
    description: '修改禅道执行',
    inputSchema: {
      id: z.union([z.number(), z.string()]).describe('执行 ID'),
      project: z.union([z.number(), z.string()]).optional().describe('所属项目'),
      name: z.string().optional().describe('执行名称'),
      code: z.string().optional().describe('执行代号'),
      begin: z.string().optional().describe('计划开始日期'),
      end: z.string().optional().describe('计划结束日期'),
      days: z.number().int().optional().describe('可用工作日'),
      lifetime: z.string().optional().describe('类型：short | long | ops'),
      PO: z.string().optional().describe('产品负责人'),
      PM: z.string().optional().describe('迭代负责人'),
      QD: z.string().optional().describe('测试负责人'),
      RD: z.string().optional().describe('发布负责人'),
      teamMembers: z.array(z.string()).optional().describe('团队成员'),
      desc: z.string().optional().describe('迭代描述'),
      acl: z.string().optional().describe('访问控制：private | open'),
      whitelist: z.array(z.any()).optional().describe('白名单'),
    },
  },
  async ({ id, ...rest }) => {
    try { return ok(await client.updateExecution(id, rest)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_delete_execution',
  {
    description: '删除禅道执行',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('执行 ID') },
  },
  async ({ id }) => {
    try { return ok(await client.deleteExecution(id)); } catch (e) { return fail(e); }
  },
);

// ============ 版本 (Build) ============
server.registerTool(
  'zentao_list_project_builds',
  {
    description: '获取禅道项目版本列表',
    inputSchema: {
      project: z.union([z.number(), z.string()]).describe('项目 ID'),
    },
  },
  async ({ project }) => {
    try { return ok(await client.listProjectBuilds(project)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_list_execution_builds',
  {
    description: '获取禅道执行版本列表',
    inputSchema: {
      execution: z.union([z.number(), z.string()]).describe('执行 ID'),
    },
  },
  async ({ execution }) => {
    try { return ok(await client.listExecutionBuilds(execution)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_get_build',
  {
    description: '获取禅道版本详情',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('版本 ID') },
  },
  async ({ id }) => {
    try { return ok(await client.getBuild(id)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_create_build',
  {
    description: '创建禅道版本',
    inputSchema: {
      execution: z.union([z.number(), z.string()]).describe('所属执行'),
      product: z.union([z.number(), z.string()]).describe('所属产品'),
      name: z.string().describe('版本名称'),
      builder: z.string().describe('构建者'),
      date: z.string().optional().describe('打包日期'),
      branch: z.number().int().optional().describe('所属分支'),
      scmPath: z.string().optional().describe('源代码地址'),
      filePath: z.string().optional().describe('下载地址'),
      desc: z.string().optional().describe('版本描述'),
    },
  },
  async (args) => {
    try { return ok(await client.createBuild(args)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_update_build',
  {
    description: '修改禅道版本',
    inputSchema: {
      id: z.union([z.number(), z.string()]).describe('版本 ID'),
      name: z.string().optional().describe('版本名称'),
      scmPath: z.string().optional().describe('源代码地址'),
      filePath: z.string().optional().describe('下载地址'),
      desc: z.string().optional().describe('版本描述'),
      builder: z.string().optional().describe('构建者'),
      date: z.string().optional().describe('打包日期'),
    },
  },
  async ({ id, ...rest }) => {
    try { return ok(await client.updateBuild(id, rest)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_delete_build',
  {
    description: '删除禅道版本',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('版本 ID') },
  },
  async ({ id }) => {
    try { return ok(await client.deleteBuild(id)); } catch (e) { return fail(e); }
  },
);

// ============ Bug ============
server.registerTool(
  'zentao_get_bug',
  {
    description: '获取禅道 Bug 详情',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('Bug ID') },
  },
  async ({ id }) => {
    try { return ok(await client.getBug(id)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_list_bugs',
  {
    description: '列出禅道 Bug；按 product 或 execution 查询',
    inputSchema: {
      product: z.union([z.number(), z.string()]).optional(),
      execution: z.union([z.number(), z.string()]).optional(),
      status: z.string().optional().describe('Bug 状态：active/resolved/closed'),
      assignedTo: z.string().optional(),
      limit: z.number().int().positive().max(200).optional(),
    },
  },
  async (args) => {
    try { return ok(await client.listBugs(args)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_create_bug',
  {
    description: '在指定产品下创建禅道 Bug',
    inputSchema: {
      product: z.union([z.number(), z.string()]).describe('产品 ID'),
      title: z.string().describe('Bug 标题'),
      steps: z.string().optional().describe('重现步骤（HTML 或纯文本）'),
      severity: z.number().int().min(1).max(4).optional().describe('严重程度 1-4'),
      pri: z.number().int().min(1).max(4).optional().describe('优先级 1-4'),
      type: z.string().optional().describe('Bug 类型：codeerror/config/install/security/performance/standard/automation/designdefect/others'),
      assignedTo: z.string().optional().describe('指派给'),
      module: z.union([z.number(), z.string()]).optional().describe('所属模块 ID'),
      branch: z.number().int().optional().describe('所属分支'),
      execution: z.union([z.number(), z.string()]).optional().describe('所属执行'),
      keywords: z.string().optional().describe('关键词'),
      os: z.string().optional().describe('操作系统'),
      browser: z.string().optional().describe('浏览器'),
      task: z.number().int().optional().describe('相关任务'),
      story: z.number().int().optional().describe('相关需求'),
      deadline: z.string().optional().describe('截止日期'),
      openedBuild: z.array(z.string()).optional().describe('影响版本'),
    },
  },
  async (args) => {
    try { return ok(await client.createBug(args)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_update_bug',
  {
    description: '修改禅道 Bug',
    inputSchema: {
      id: z.union([z.number(), z.string()]).describe('Bug ID'),
      branch: z.number().int().optional().describe('所属分支'),
      module: z.union([z.number(), z.string()]).optional().describe('所属模块'),
      execution: z.union([z.number(), z.string()]).optional().describe('所属执行'),
      title: z.string().optional().describe('Bug 标题'),
      keywords: z.string().optional().describe('关键词'),
      severity: z.number().int().min(1).max(4).optional().describe('严重程度 1-4'),
      pri: z.number().int().min(1).max(4).optional().describe('优先级 1-4'),
      type: z.string().optional().describe('Bug 类型'),
      os: z.string().optional().describe('操作系统'),
      browser: z.string().optional().describe('浏览器'),
      steps: z.string().optional().describe('重现步骤'),
      task: z.number().int().optional().describe('相关任务'),
      story: z.number().int().optional().describe('相关需求'),
      deadline: z.string().optional().describe('截止日期'),
      openedBuild: z.array(z.string()).optional().describe('影响版本'),
    },
  },
  async ({ id, ...rest }) => {
    try { return ok(await client.updateBug(id, rest)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_delete_bug',
  {
    description: '删除禅道 Bug',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('Bug ID') },
  },
  async ({ id }) => {
    try { return ok(await client.deleteBug(id)); } catch (e) { return fail(e); }
  },
);

// ============ 任务 (Task) ============
server.registerTool(
  'zentao_get_task',
  {
    description: '获取禅道任务详情',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('任务 ID') },
  },
  async ({ id }) => {
    try { return ok(await client.getTask(id)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_list_tasks',
  {
    description: '列出禅道任务；必须传 execution',
    inputSchema: {
      execution: z.union([z.number(), z.string()]).describe('项目/执行 ID'),
      status: z.string().optional().describe('任务状态：wait/doing/done/closed/cancel'),
      assignedTo: z.string().optional().describe('指派给的用户名'),
      limit: z.number().int().positive().max(200).optional().describe('最多返回数量，默认 50'),
    },
  },
  async (args) => {
    try { return ok(await client.listTasks(args)); } catch (e) { return fail(e); }
  },
);

// ============ 用例 (TestCase) ============
server.registerTool(
  'zentao_list_testcases',
  {
    description: '获取禅道产品用例列表',
    inputSchema: {
      product: z.union([z.number(), z.string()]).describe('产品 ID'),
    },
  },
  async ({ product }) => {
    try { return ok(await client.listTestCases(product)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_get_testcase',
  {
    description: '获取禅道用例详情',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('用例 ID') },
  },
  async ({ id }) => {
    try { return ok(await client.getTestCase(id)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_create_testcase',
  {
    description: '创建禅道用例',
    inputSchema: {
      product: z.union([z.number(), z.string()]).describe('产品 ID'),
      title: z.string().describe('用例标题'),
      type: z.string().describe('用例类型：feature/performance/config/install/security/interface/unit/other'),
      steps: z.array(z.object({ desc: z.string(), expect: z.string() })).optional().describe('用例步骤'),
      branch: z.number().int().optional().describe('所属分支'),
      module: z.number().int().optional().describe('所属模块'),
      story: z.number().int().optional().describe('所属需求'),
      stage: z.string().optional().describe('适用阶段：unittest/feature/intergrate/system/smoke/bvt'),
      precondition: z.string().optional().describe('前置条件'),
      pri: z.number().int().optional().describe('优先级'),
      keywords: z.string().optional().describe('关键词'),
    },
  },
  async ({ product, ...rest }) => {
    try { return ok(await client.createTestCase(product, rest)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_update_testcase',
  {
    description: '修改禅道用例',
    inputSchema: {
      id: z.union([z.number(), z.string()]).describe('用例 ID'),
      branch: z.number().int().optional().describe('所属分支'),
      module: z.number().int().optional().describe('所属模块'),
      story: z.number().int().optional().describe('所属需求'),
      title: z.string().optional().describe('用例标题'),
      type: z.string().optional().describe('用例类型'),
      stage: z.string().optional().describe('适用阶段'),
      precondition: z.string().optional().describe('前置条件'),
      pri: z.number().int().optional().describe('优先级'),
      steps: z.array(z.object({ desc: z.string(), expect: z.string() })).optional().describe('用例步骤'),
      keywords: z.string().optional().describe('关键词'),
    },
  },
  async ({ id, ...rest }) => {
    try { return ok(await client.updateTestCase(id, rest)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_delete_testcase',
  {
    description: '删除禅道用例',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('用例 ID') },
  },
  async ({ id }) => {
    try { return ok(await client.deleteTestCase(id)); } catch (e) { return fail(e); }
  },
);

// ============ 测试单 (TestTask) ============
server.registerTool(
  'zentao_list_testtasks',
  {
    description: '获取禅道测试单列表',
    inputSchema: {
      page: z.string().optional().describe('当前页数，默认 1'),
      limit: z.string().optional().describe('每页测试单数，默认 20'),
      order: z.string().optional().describe('排序，默认 id_desc'),
      product: z.string().optional().describe('所属产品'),
      branch: z.string().optional().describe('所属分支'),
    },
  },
  async (args) => {
    try { return ok(await client.listTestTasks(args)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_list_project_testtasks',
  {
    description: '获取禅道项目的测试单',
    inputSchema: {
      project: z.union([z.number(), z.string()]).describe('项目 ID'),
    },
  },
  async ({ project }) => {
    try { return ok(await client.listProjectTestTasks(project)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_get_testtask',
  {
    description: '获取禅道测试单详情',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('测试单 ID') },
  },
  async ({ id }) => {
    try { return ok(await client.getTestTask(id)); } catch (e) { return fail(e); }
  },
);

// ============ 反馈 (Feedback) ============
server.registerTool(
  'zentao_list_feedbacks',
  {
    description: '获取禅道反馈列表',
    inputSchema: {
      solution: z.string().optional().describe('反馈处理结果：unclosed/all/public/tostory/totask/tobug/totodo/review/assigntome'),
      orderBy: z.string().optional().describe('排序，默认 id_desc'),
      page: z.string().optional().describe('第几页，默认 1'),
      limit: z.string().optional().describe('每页反馈数量，默认 20'),
    },
  },
  async (args) => {
    try { return ok(await client.listFeedbacks(args)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_get_feedback',
  {
    description: '获取禅道反馈详情',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('反馈 ID') },
  },
  async ({ id }) => {
    try { return ok(await client.getFeedback(id)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_create_feedback',
  {
    description: '创建禅道反馈',
    inputSchema: {
      product: z.union([z.number(), z.string()]).describe('所属产品'),
      title: z.string().describe('标题'),
      module: z.number().int().optional().describe('所属分类'),
      type: z.string().optional().describe('类型：story/task/bug/todo/advice/issue/risk/opportunity'),
      desc: z.string().optional().describe('描述'),
      public: z.number().int().optional().describe('是否公开 0/1'),
      notify: z.number().int().optional().describe('是否通知 0/1'),
      notifyEmail: z.string().optional().describe('通知邮箱'),
      feedbackBy: z.string().optional().describe('反馈者'),
    },
  },
  async (args) => {
    try { return ok(await client.createFeedback(args)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_update_feedback',
  {
    description: '修改禅道反馈',
    inputSchema: {
      id: z.union([z.number(), z.string()]).describe('反馈 ID'),
      product: z.number().int().optional().describe('所属产品'),
      module: z.number().int().optional().describe('所属分类'),
      title: z.string().optional().describe('标题'),
      type: z.string().optional().describe('类型'),
      desc: z.string().optional().describe('描述'),
      public: z.number().int().optional().describe('是否公开'),
      notify: z.number().int().optional().describe('是否通知'),
      notifyEmail: z.string().optional().describe('通知邮箱'),
      feedbackBy: z.string().optional().describe('反馈者'),
    },
  },
  async ({ id, ...rest }) => {
    try { return ok(await client.updateFeedback(id, rest)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_delete_feedback',
  {
    description: '删除禅道反馈',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('反馈 ID') },
  },
  async ({ id }) => {
    try { return ok(await client.deleteFeedback(id)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_assign_feedback',
  {
    description: '指派禅道反馈',
    inputSchema: {
      id: z.union([z.number(), z.string()]).describe('反馈 ID'),
      assignedTo: z.string().optional().describe('指派给（用户 account）'),
      comment: z.string().optional().describe('备注'),
      mailto: z.string().optional().describe('抄送给，用户 account 用逗号分隔'),
    },
  },
  async ({ id, ...rest }) => {
    try { return ok(await client.assignFeedback(id, rest)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_close_feedback',
  {
    description: '关闭禅道反馈',
    inputSchema: {
      id: z.union([z.number(), z.string()]).describe('反馈 ID'),
      closedReason: z.string().optional().describe('关闭原因：commented/repeat/refuse'),
      comment: z.string().optional().describe('备注'),
    },
  },
  async ({ id, ...rest }) => {
    try { return ok(await client.closeFeedback(id, rest)); } catch (e) { return fail(e); }
  },
);

// ============ 工单 (Ticket) ============
server.registerTool(
  'zentao_list_tickets',
  {
    description: '获取禅道工单列表',
    inputSchema: {
      browseType: z.string().optional().describe('工单状态：all/wait/doing/done/finishedbyme/openedbyme/assignedtome'),
      param: z.string().optional().describe('模块 ID，默认 0'),
      orderBy: z.string().optional().describe('排序，默认 id_desc'),
      page: z.string().optional().describe('第几页，默认 1'),
      limit: z.string().optional().describe('每页工单数量，默认 20'),
    },
  },
  async (args) => {
    try { return ok(await client.listTickets(args)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_get_ticket',
  {
    description: '获取禅道工单详情',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('工单 ID') },
  },
  async ({ id }) => {
    try { return ok(await client.getTicket(id)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_create_ticket',
  {
    description: '创建禅道工单',
    inputSchema: {
      product: z.union([z.number(), z.string()]).describe('所属产品 ID'),
      module: z.union([z.number(), z.string()]).optional().describe('所属模块 ID'),
      title: z.string().describe('工单名称'),
      type: z.string().optional().describe('工单类型：code/data/stuck/security/affair'),
    },
  },
  async (args) => {
    try { return ok(await client.createTicket(args)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_update_ticket',
  {
    description: '修改禅道工单',
    inputSchema: {
      id: z.union([z.number(), z.string()]).describe('工单 ID'),
      product: z.number().int().optional().describe('所属产品 ID'),
      module: z.number().int().optional().describe('所属模块 ID'),
      title: z.string().optional().describe('工单名称'),
      type: z.string().optional().describe('工单类型'),
      desc: z.string().optional().describe('工单描述'),
    },
  },
  async ({ id, ...rest }) => {
    try { return ok(await client.updateTicket(id, rest)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'zentao_delete_ticket',
  {
    description: '删除禅道工单',
    inputSchema: { id: z.union([z.number(), z.string()]).describe('工单 ID') },
  },
  async ({ id }) => {
    try { return ok(await client.deleteTicket(id)); } catch (e) { return fail(e); }
  },
);

// ============ 启动 ============
const transport = new StdioServerTransport();
await server.connect(transport);

// 用 stderr 打日志（stdout 是 MCP 协议通道）
console.error(`[zentao] ready, baseUrl=${baseUrl}`);
