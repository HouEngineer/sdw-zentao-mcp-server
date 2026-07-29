/**
 * 禅道 (Zentao) REST API 客户端
 *
 * 文档: https://www.zentao.net/book/zentaopmshelp/2034.html
 * 端点: <base>/api.php/v1/...
 * 认证: 通过 /api.php/v1/tokens 获取 Token，然后通过 Cookie zentaosid=<token> 认证
 *
 * 注意：禅道 18+ 才有完整 REST API。
 * 使用 Node.js 原生 http/https 模块发请求，绕过 undici fetch 在 ESM 下的 chunked 编码问题。
 */

import http from 'node:http';
import https from 'node:https';

/**
 * 用原生 http/https 模块发起请求并返回响应文本
 * @param {string} method
 * @param {string} url
 * @param {object} [headers]
 * @param {string|undefined} [body]
 * @returns {Promise<{status: number, text: string}>}
 */
function rawRequest(method, url, headers = {}, body) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const transport = parsedUrl.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers,
    };
    const req = transport.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf-8');
        resolve({ status: res.statusCode, text });
      });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

export class ZentaoClient {
  /**
   * @param {object} opts
   * @param {string} opts.baseUrl   禅道根路径，如 http://172.20.20.211:8099
   * @param {string} [opts.token]   预先获取的 Token（作为 zentaosid）
   * @param {string} [opts.account] 用户名（无 token 时用于登录获取）
   * @param {string} [opts.password] 密码（无 token 时用于登录获取）
   */
  constructor(opts) {
    if (!opts || !opts.baseUrl) {
      throw new Error('ZentaoClient: baseUrl is required');
    }
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    // 自动追加 API 前缀（如果 baseUrl 不已包含）
    if (!this.baseUrl.endsWith('/api.php/v1')) {
      this.baseUrl += '/api.php/v1';
    }
    this.token = opts.token || null;
    this.account = opts.account || null;
    this.password = opts.password || null;
  }

  /** 拼接 API 路径 */
  url(path) {
    if (path.startsWith('/')) return `${this.baseUrl}${path}`;
    return `${this.baseUrl}/${path}`;
  }

  /** 没有 Token 时用账号密码登录获取 */
  async login() {
    if (!this.account || !this.password) {
      throw new Error('ZentaoClient: ZENTAO_TOKEN missing and no account/password provided');
    }
    const body = JSON.stringify({ account: this.account, password: this.password });
    const { status, text } = await rawRequest('POST', this.url('/tokens'), {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    }, body);
    if (status < 200 || status >= 300) {
      throw new Error(`Zentao login failed: ${status} ${text}`);
    }
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!data?.token) throw new Error(`Zentao login response missing token: ${text}`);
    this.token = data.token;
    return this.token;
  }

  /** 确保已有 Token */
  async ensureToken() {
    if (this.token) return this.token;
    return await this.login();
  }

  /** 通用请求 — 使用 Cookie zentaosid 认证 */
  async request(method, path, { query, body } = {}) {
    await this.ensureToken();
    let url = this.url(path);
    if (query) {
      const qs = Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    }
    const headers = {
      'Cookie': `zentaosid=${this.token}`,
      'Accept': 'application/json',
    };
    let reqBody;
    if (body !== undefined) {
      reqBody = typeof body === 'string' ? body : JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(reqBody);
    }
    const { status, text } = await rawRequest(method, url, headers, reqBody);
    let json;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (e) {
      // 禅道偶尔返回 HTML（如 session 过期）
      throw new Error(`Zentao ${method} ${path} returned non-JSON (status ${status}): ${text.slice(0, 200)}`);
    }
    if (status < 200 || status >= 300) {
      const errMsg = json?.error || json?.message || text || `HTTP ${status}`;
      throw new Error(`Zentao ${method} ${path} failed: ${errMsg}`);
    }
    return json;
  }

  // ========== 用户 (User) ==========
  /** 获取我的个人信息 */
  getMyProfile() {
    return this.request('GET', '/user');
  }

  /** 获取用户信息 */
  getUser(id) {
    return this.request('GET', `/users/${id}`);
  }

  /** 获取用户列表 */
  listUsers({ page = 1, limit = 20 } = {}) {
    return this.request('GET', '/users', { query: { page, limit } });
  }

  /** 创建用户 */
  createUser(data) {
    // data: { account, password, realname?, visions? }
    if (!data.account || !data.password) throw new Error('createUser: account and password are required');
    return this.request('POST', '/users', { body: data });
  }

  /** 修改用户信息 */
  updateUser(id, data) {
    // data: { dept?, role?, mobile?, realname?, email?, phone? }
    return this.request('PUT', `/users/${id}`, { body: data });
  }

  /** 删除用户 */
  deleteUser(id) {
    return this.request('DELETE', `/users/${id}`);
  }

  // ========== 项目集 (Program) ==========
  /** 获取项目集列表 */
  listPrograms({ order } = {}) {
    return this.request('GET', '/programs', { query: { order } });
  }

  /** 获取项目集详情 */
  getProgram(id) {
    return this.request('GET', `/programs/${id}`);
  }

  /** 创建项目集 */
  createProgram(data) {
    // data: { name?, parent?, PM?, budget?, budgetUnit?, desc?, begin?, end?, acl?, whitelist? }
    return this.request('POST', '/programs', { body: data });
  }

  /** 修改项目集 */
  updateProgram(id, data) {
    // data: { name?, parent?, PM?, budget?, budgetUnit?, desc?, begin?, end?, acl?, whitelist? }
    return this.request('PUT', `/programs/${id}`, { body: data });
  }

  /** 删除项目集 */
  deleteProgram(id) {
    return this.request('DELETE', `/programs/${id}`);
  }

  // ========== 产品 (Product) ==========
  /** 获取产品列表 */
  listProducts() {
    return this.request('GET', '/products');
  }

  /** 获取产品详情 */
  getProduct(id) {
    return this.request('GET', `/products/${id}`);
  }

  /** 创建产品 */
  createProduct(data) {
    // data: { name, code, program?, line?, PO?, QD?, RD?, type?, desc?, acl?, whitelist? }
    if (!data.name || !data.code) throw new Error('createProduct: name and code are required');
    return this.request('POST', '/products', { body: data });
  }

  /** 修改产品 */
  updateProduct(id, data) {
    // data: { name?, code?, type?, line?, program?, status?, desc? }
    return this.request('PUT', `/product/${id}`, { body: data });
  }

  /** 删除产品 */
  deleteProduct(id) {
    return this.request('DELETE', `/product/${id}`);
  }

  // ========== 产品计划 (Plan) ==========
  /** 获取产品计划列表 */
  listPlans(productId) {
    return this.request('GET', `/products/${productId}/plans`);
  }

  /** 获取计划详情 */
  getPlan(id) {
    return this.request('GET', `/productplans/${id}`);
  }

  /** 创建计划 */
  createPlan(productId, data) {
    // data: { branch?, title, begin?, end?, desc?, parent? }
    if (!data.title) throw new Error('createPlan: title is required');
    return this.request('POST', `/products/${productId}/plans`, { body: data });
  }

  /** 修改计划 */
  updatePlan(id, data) {
    // data: { branch?, title, begin?, end?, desc? }
    return this.request('PUT', `/productplans/${id}`, { body: data });
  }

  /** 删除计划 */
  deletePlan(id) {
    return this.request('DELETE', `/productsplan/${id}`);
  }

  /** 产品计划关联需求 */
  linkPlanStories(id, stories) {
    // stories: [1, 2, ...]
    return this.request('POST', `/productplans/${id}/linkstories`, { body: { stories } });
  }

  /** 产品计划取消关联需求 */
  unlinkPlanStories(id, stories) {
    return this.request('POST', `/productplans/${id}/unlinkstories`, { body: { stories } });
  }

  /** 产品计划关联 Bug */
  linkPlanBugs(id, bugs) {
    // bugs: [1, 2, ...]
    return this.request('POST', `/products/${id}/linkBugs`, { body: { bugs } });
  }

  /** 产品计划取消关联 Bug */
  unlinkPlanBugs(id, bugs) {
    return this.request('POST', `/productplans/${id}/unlinkbugs`, { body: { bugs } });
  }

  // ========== 发布 (Release) ==========
  /** 获取项目发布列表 */
  listProjectReleases(projectId) {
    return this.request('GET', `/projects/${projectId}/releases`);
  }

  /** 获取产品发布列表 */
  listProductReleases(productId) {
    return this.request('GET', `/products/${productId}/releases`);
  }

  // ========== 需求 (Story) ==========
  /** 获取需求详情 */
  getStory(id) {
    return this.request('GET', `/stories/${id}`);
  }

  /** 列出需求 */
  listStories({ product, execution, project, status, assignedTo, limit = 50 } = {}) {
    if (execution) {
      return this.request('GET', `/executions/${execution}/stories`, {
        query: { status, assignedTo, limit },
      });
    }
    if (project) {
      return this.request('GET', `/projects/${project}/stories`, {
        query: { status, assignedTo, limit },
      });
    }
    if (product) {
      return this.request('GET', `/products/${product}/stories`, {
        query: { status, assignedTo, limit },
      });
    }
    throw new Error('listStories: product, execution or project is required');
  }

  /** 创建需求 */
  createStory(data) {
    // data: { title, product, pri, category, spec?, verify?, source?, sourceNote?, estimate?, keywords? }
    if (!data.title || !data.product) throw new Error('createStory: title and product are required');
    return this.request('POST', '/stories', { body: data });
  }

  /** 修改需求其他字段 */
  updateStory(id, data) {
    // data: { module?, source?, sourceNote?, pri?, category?, estimate?, keywords? }
    return this.request('PUT', `/stories/${id}`, { body: data });
  }

  /** 删除需求 */
  deleteStory(id) {
    return this.request('DELETE', `/stories/${id}`);
  }

  /** 变更需求 */
  changeStory(id, data) {
    // data: { title?, spec?, verify? }
    return this.request('POST', `/stories/${id}/change`, { body: data });
  }

  // ========== 项目 (Project) ==========
  /** 获取项目列表 */
  listProjects({ page, limit } = {}) {
    return this.request('GET', '/projects', { query: { page, limit } });
  }

  /** 获取项目详情 */
  getProject(id) {
    return this.request('GET', `/projects/${id}`);
  }

  /** 创建项目 */
  createProject(data) {
    // data: { name, begin, end, products, code, model?, parent? }
    if (!data.name || !data.begin || !data.end || !data.products || !data.code) {
      throw new Error('createProject: name, begin, end, products and code are required');
    }
    return this.request('POST', '/projects', { body: data });
  }

  /** 修改项目 */
  updateProject(id, data) {
    // data: { name?, code?, parent?, PM?, budget?, budgetUnit?, days?, desc?, acl?, whitelist?, auth? }
    return this.request('PUT', `/projects/${id}`, { body: data });
  }

  /** 删除项目 */
  deleteProject(id) {
    return this.request('DELETE', `/projects/${id}`);
  }

  // ========== 执行 (Execution) ==========
  /** 获取项目执行列表 */
  listExecutions(projectId) {
    return this.request('GET', `/projects/${projectId}/executions`);
  }

  /** 获取执行详情 */
  getExecution(id) {
    return this.request('GET', `/executions/${id}`);
  }

  /** 创建执行 */
  createExecution(data) {
    // data: { project, name, code, begin, end, days?, lifetime?, PO?, PM?, QD?, RD?, teamMembers?, desc?, acl?, whitelist? }
    if (!data.project || !data.name || !data.code || !data.begin || !data.end) {
      throw new Error('createExecution: project, name, code, begin and end are required');
    }
    return this.request('POST', `/projects/${data.project}/executions`, { body: data });
  }

  /** 修改执行 */
  updateExecution(id, data) {
    // data: { project?, name?, code?, begin?, end?, days?, lifetime?, PO?, PM?, QD?, RD?, teamMembers?, desc?, acl?, whitelist? }
    return this.request('PUT', `/executions/${id}`, { body: data });
  }

  /** 删除执行 */
  deleteExecution(id) {
    return this.request('DELETE', `/executions/${id}`);
  }

  // ========== 版本 (Build) ==========
  /** 获取项目版本列表 */
  listProjectBuilds(projectId) {
    return this.request('GET', `/projects/${projectId}/builds`);
  }

  /** 获取执行版本列表 */
  listExecutionBuilds(executionId) {
    return this.request('GET', `/executions/${executionId}/builds`);
  }

  /** 获取版本详情 */
  getBuild(id) {
    return this.request('GET', `/builds/${id}`);
  }

  /** 创建版本 */
  createBuild(data) {
    // data: { execution, product, name, builder, date?, branch?, scmPath?, filePath?, desc? }
    if (!data.execution || !data.product || !data.name || !data.builder) {
      throw new Error('createBuild: execution, product, name and builder are required');
    }
    return this.request('POST', `/projects/${data.execution}/builds`, { body: data });
  }

  /** 修改版本 */
  updateBuild(id, data) {
    return this.request('PUT', `/builds/${id}`, { body: data });
  }

  /** 删除版本 */
  deleteBuild(id) {
    return this.request('DELETE', `/builds/${id}`);
  }

  // ========== Bug ==========
  /** 获取 Bug 详情 */
  getBug(id) {
    return this.request('GET', `/bugs/${id}`);
  }

  /** 列出 Bug */
  listBugs({ product, execution, status, assignedTo, limit = 50 } = {}) {
    if (execution) {
      return this.request('GET', `/executions/${execution}/bugs`, {
        query: { status, assignedTo, limit },
      });
    }
    if (product) {
      return this.request('GET', `/products/${product}/bugs`, {
        query: { status, assignedTo, limit },
      });
    }
    throw new Error('listBugs: product or execution is required');
  }

  /** 创建 Bug */
  createBug(data) {
    // data: { product, title, steps?, severity?, pri?, type?, branch?, module?, execution?, keywords?, os?, browser?, task?, story?, deadline?, openedBuild? }
    if (!data.product) throw new Error('createBug: product is required');
    return this.request('POST', `/products/${data.product}/bugs`, { body: data });
  }

  /** 修改 Bug */
  updateBug(id, data) {
    // data: { branch?, module?, execution?, title?, keywords?, severity?, pri?, type?, os?, browser?, steps?, task?, story?, deadline?, openedBuild? }
    return this.request('PUT', `/bugs/${id}`, { body: data });
  }

  /** 删除 Bug */
  deleteBug(id) {
    return this.request('DELETE', `/bugs/${id}`);
  }

  // ========== 任务 (Task) ==========
  getTask(id) {
    return this.request('GET', `/tasks/${id}`);
  }

  listTasks({ execution, status, assignedTo, limit = 50 } = {}) {
    if (!execution) throw new Error('listTasks: execution is required');
    return this.request('GET', `/executions/${execution}/tasks`, {
      query: { status, assignedTo, limit },
    });
  }

  // ========== 用例 (TestCase) ==========
  /** 获取产品用例列表 */
  listTestCases(productId) {
    return this.request('GET', `/products/${productId}/testcases`);
  }

  /** 获取用例详情 */
  getTestCase(id) {
    return this.request('GET', `/testcases/${id}`);
  }

  /** 创建用例 */
  createTestCase(productId, data) {
    // data: { title, type, steps?, branch?, module?, story?, stage?, precondition?, pri?, keywords? }
    if (!data.title || !data.type) throw new Error('createTestCase: title and type are required');
    return this.request('POST', `/products/${productId}/testcases`, { body: data });
  }

  /** 修改用例 */
  updateTestCase(id, data) {
    // data: { branch?, module?, story?, title?, type?, stage?, precondition?, pri?, steps?, keywords? }
    return this.request('PUT', `/testcases/${id}`, { body: data });
  }

  /** 删除用例 */
  deleteTestCase(id) {
    return this.request('DELETE', `/testcases/${id}`);
  }

  // ========== 测试单 (TestTask) ==========
  /** 获取测试单列表 */
  listTestTasks({ page, limit, order, product, branch } = {}) {
    return this.request('GET', '/testtasks', { query: { page, limit, order, product, branch } });
  }

  /** 获取项目测试单 */
  listProjectTestTasks(projectId) {
    return this.request('GET', `/projects/${projectId}/testtasks`);
  }

  /** 获取测试单详情 */
  getTestTask(id) {
    return this.request('GET', `/testtasks/${id}`);
  }

  // ========== 反馈 (Feedback) ==========
  /** 获取反馈列表 */
  listFeedbacks({ solution, orderBy, page, limit } = {}) {
    return this.request('GET', '/feedbacks', { query: { solution, orderBy, page, limit } });
  }

  /** 获取反馈详情 */
  getFeedback(id) {
    return this.request('GET', `/feedbacks/${id}`);
  }

  /** 创建反馈 */
  createFeedback(data) {
    // data: { product, title, module?, type?, desc?, public?, notify?, notifyEmail?, feedbackBy? }
    if (!data.product || !data.title) throw new Error('createFeedback: product and title are required');
    return this.request('POST', '/feedbacks', { body: data });
  }

  /** 修改反馈 */
  updateFeedback(id, data) {
    // data: { product?, module?, title?, type?, desc?, public?, notify?, notifyEmail?, feedbackBy? }
    return this.request('PUT', `/feedbacks/${id}`, { body: data });
  }

  /** 删除反馈 */
  deleteFeedback(id) {
    return this.request('DELETE', `/feedbacks/${id}`);
  }

  /** 指派反馈 */
  assignFeedback(id, data) {
    // data: { assignedTo?, comment?, mailto? }
    return this.request('POST', `/feedbacks/${id}/assign`, { body: data });
  }

  /** 关闭反馈 */
  closeFeedback(id, data) {
    // data: { closedReason?, comment? }
    return this.request('POST', `/feedbacks/${id}/close`, { body: data });
  }

  // ========== 工单 (Ticket) ==========
  /** 获取工单列表 */
  listTickets({ browseType, param, orderBy, page, limit } = {}) {
    return this.request('GET', '/tickets', { query: { browseType, param, orderBy, page, limit } });
  }

  /** 获取工单详情 */
  getTicket(id) {
    return this.request('GET', `/tickets/${id}`);
  }

  /** 创建工单 */
  createTicket(data) {
    // data: { product, module, title, type? }
    if (!data.product || !data.title) throw new Error('createTicket: product and title are required');
    return this.request('POST', '/tickets', { body: data });
  }

  /** 修改工单 */
  updateTicket(id, data) {
    // data: { product?, module?, title?, type?, desc? }
    return this.request('PUT', `/tickets/${id}`, { body: data });
  }

  /** 删除工单 */
  deleteTicket(id) {
    return this.request('DELETE', `/tickets/${id}`);
  }
}
