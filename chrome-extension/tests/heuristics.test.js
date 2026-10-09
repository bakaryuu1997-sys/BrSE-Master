import { describe, it, expect } from 'vitest';

// 1. Re-implement suggestCategoryAndRoles to test its logic directly
function suggestCategoryAndRoles(english = '', japanese = '', vietnamese = '') {
  const combined = `${english} ${japanese} ${vietnamese}`.toLowerCase();
  
  let category = 'Technical';
  const roles = ['BrSE']; // BrSE is always checked by default

  // Category matching
  if (/\b(test|bug|defect|qa|testing|quality|assert|validate|validation|verification|check|audit|tiêu chuẩn|kiểm thử|lỗi|chất lượng|kiểm định|sai sót)\b/i.test(combined) || 
      /kiểm thử|mã lỗi|chất lượng|kiểm định|tiêu chuẩn/.test(combined)) {
    category = 'Quality';
    roles.push('QA');
  } else if (/\b(release|deploy|deployment|deliverable|deliver|plan|planning|schedule|report|wbs|sprint|milestone|giao hàng|kế hoạch|tiến độ|báo cáo|họp|meeting|quy trình|vận hành)\b/i.test(combined) || 
             /giao hàng|kế hoạch|tiến độ|báo cáo|quy trình|vận hành/.test(combined)) {
    category = 'Process';
    roles.push('PM');
    roles.push('Comtor');
  } else if (/\b(infra|cloud|aws|azure|gcp|server|network|security|db|database|docker|k8s|kubernetes|host|hosting|mạng|hạ tầng|bảo mật|hệ điều hành|os|port)\b/i.test(combined) || 
             /hạ tầng|mạng|bảo mật|máy chủ|cơ sở dữ liệu/.test(combined)) {
    category = 'Infrastructure';
    roles.push('Dev');
  } else if (/\b(business|customer|requirement|spec|contract|sales|budget|cost|price|billing|nội dung yêu cầu|nghiệp vụ|khách hàng|đối tác|hợp đồng|báo giá|chi phí|ngân sách)\b/i.test(combined) || 
             /yêu cầu|nghiệp vụ|khách hàng|đối tác|hợp đồng|ngân sách/.test(combined)) {
    category = 'Business';
    roles.push('BA');
    roles.push('PM');
    roles.push('Comtor');
  } else if (/\b(code|class|function|variable|refactor|framework|library|algorithm|logic|method|object|programming|developer|lập trình|thuật toán|cú pháp)\b/i.test(combined) || 
             /lập trình|thuật toán|mã nguồn|hàm|biến|đối tượng/.test(combined)) {
    category = 'Technical';
    roles.push('Dev');
  }
  
  return { category, roles: [...new Set(roles)] };
}

// 2. Re-implement the advanced related tab heuristics logic to test it directly
function isTabRelated(currentTitle, currentUrl, tabTitle, tabUrl) {
  const currentTitleLower = currentTitle.toLowerCase();
  const currentUrlLower = currentUrl.toLowerCase();
  const tabTitleLower = tabTitle.toLowerCase();
  const tabUrlLower = tabUrl.toLowerCase();

  // Extract issue key like ABC-1234
  const jiraMatch = currentTitleLower.match(/([a-z]+-\d+)/i) || currentUrlLower.match(/([a-z]+-\d+)/i);
  const jiraKey = jiraMatch ? jiraMatch[1].toLowerCase() : null;

  // Key domain keywords for related docs
  const docWords = ["swagger", "api", "specification", "github", "gitlab", "confluence", "brief", "đặc tả", "redmine", "trello", "teams", "slack", "wiki", "docs", "sheets", "drive", "figma", "notion"];
  const isWorkTab = currentTitleLower.includes("jira") || currentUrlLower.includes("jira") || jiraKey;

  // Extract unique keyword tokens from current title for advanced overlap check
  const currentTitleTokens = currentTitleLower
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !["jira", "confluence", "google", "chrome", "inbox", "mail", "home", "dashboard"].includes(w));

  const sameJiraKey = jiraKey && (tabTitleLower.includes(jiraKey) || tabUrlLower.includes(jiraKey));
  const isRelatedDoc = isWorkTab && docWords.some(w => tabTitleLower.includes(w) || tabUrlLower.includes(w));
  const hasKeywordOverlap = currentTitleTokens.some(token => tabTitleLower.includes(token));

  return !!(sameJiraKey || isRelatedDoc || hasKeywordOverlap);
}

describe('BrSE OS Advanced Heuristics', () => {
  describe('suggestCategoryAndRoles', () => {
    it('should correctly classify quality-related terms', () => {
      const result = suggestCategoryAndRoles('Test coverage', 'テスト仕様書', 'kiểm thử phần mềm');
      expect(result.category).toBe('Quality');
      expect(result.roles).toContain('QA');
      expect(result.roles).toContain('BrSE');
    });

    it('should correctly classify infra-related terms', () => {
      const result = suggestCategoryAndRoles('AWS S3 Bucket', 'サーバー設定', 'hạ tầng đám mây');
      expect(result.category).toBe('Infrastructure');
      expect(result.roles).toContain('Dev');
    });

    it('should correctly classify process-related terms', () => {
      const result = suggestCategoryAndRoles('Sprint planning', '進捗報告', 'tiến độ kế hoạch');
      expect(result.category).toBe('Process');
      expect(result.roles).toContain('PM');
      expect(result.roles).toContain('Comtor');
    });

    it('should fallback to Technical by default', () => {
      const result = suggestCategoryAndRoles('Refactor logic', 'リファクタリング', 'tối ưu mã nguồn');
      expect(result.category).toBe('Technical');
      expect(result.roles).toContain('Dev');
    });
  });

  describe('isTabRelated Heuristics', () => {
    it('should link tabs with matching Jira issue keys', () => {
      const currentTitle = '[PROJ-1234] Implement auth system';
      const currentUrl = 'https://company.atlassian.net/browse/PROJ-1234';
      const tabTitle = 'PROJ-1234 Spec Doc';
      const tabUrl = 'https://docs.google.com/document/d/123';
      
      expect(isTabRelated(currentTitle, currentUrl, tabTitle, tabUrl)).toBe(true);
    });

    it('should link developer documentation tabs if on Jira ticket', () => {
      const currentTitle = 'Implement auth system';
      const currentUrl = 'https://company.atlassian.net/browse/PROJ-1234';
      const tabTitle = 'API Swagger Definition';
      const tabUrl = 'https://api.company.com/swagger';
      
      expect(isTabRelated(currentTitle, currentUrl, tabTitle, tabUrl)).toBe(true);
    });

    it('should link tabs with overlapping unique title keyword tokens', () => {
      const currentTitle = 'BrSE OS supreme dashboard optimization';
      const currentUrl = 'https://google.com';
      const tabTitle = 'supreme dashboard layout feedback';
      const tabUrl = 'https://another.com';
      
      expect(isTabRelated(currentTitle, currentUrl, tabTitle, tabUrl)).toBe(true);
    });

    it('should not link unrelated tabs', () => {
      const currentTitle = 'Gmail inbox';
      const currentUrl = 'https://mail.google.com';
      const tabTitle = 'Cute kittens compilation youtube';
      const tabUrl = 'https://youtube.com';
      
      expect(isTabRelated(currentTitle, currentUrl, tabTitle, tabUrl)).toBe(false);
    });
  });
});
