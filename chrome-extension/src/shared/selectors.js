/**
 * Selector Registry for BrSE OS Extension
 * Separates DOM scraping queries from business logic.
 * Ensures single point of update when Jira/Gmail/Chatwork changes their UI.
 */
export const SELECTORS = {
  jira: {
    ticketKeyBreadcrumb: '[data-testid="issue.views.issue-base.foundation.breadcrumbs.breadcrumb-current-issue-container"]',
    titleHeading: 'h1[data-testid="issue.views.issue-base.foundation.summary.heading"], [data-testid="issue.views.issue-base.foundation.summary.heading"], [data-testid="issue-field-summary"]',
    descContainer: '[data-testid="issue.views.field.select-to-edit.description-wrapper"], [data-testid="issue-field-description"], .description-content',
    commentBox: '[data-testid^="issue.activity.comment"], div[id^="comment-"], .comment-thread, .comment-box',
    commentAuthor: '[data-testid^="comment-author"], .comment-author, strong',
    commentText: '[data-testid^="comment-text"], .comment-text, .ak-renderer-document',
    commentToolbars: '[data-testid="comment-edit-view-container"] [role="toolbar"], .ak-editor-secondary-toolbar'
  },
  gmail: {
    composeToolbar: '.btC',
    composeContainer: 'div[role="dialog"], table, .M9',
    textbox: 'div[role="textbox"], div[contenteditable="true"], textarea',
    subjectField: 'input[name="subjectbox"]',
    toField: 'input[name="to"]',
    // Open (reading) email view — primary Gmail classes first, then resilient fallbacks
    openSubject: 'h2.hP, .ha h2, h2[data-thread-perm-id], [role="heading"].hP',
    openSender: '.gD, span[email][name], span[email]',
    openBody: '.a3s.aiL, .ii.gt div.a3s, [data-message-id] .a3s, div[role="listitem"] .a3s'
  },
  chatwork: {
    toolbars: '.chatSendTool, #_sendToolbar',
    textbox: '#_chatText',
    roomTitle: '#_roomTitleName, .roomHeader__roomName'
  }
};
