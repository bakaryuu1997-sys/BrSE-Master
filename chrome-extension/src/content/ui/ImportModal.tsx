import React, { useState } from 'react';
import { createReactShadowRoot } from '../utils/ReactShadowWrapper';
import { safeSendMessage } from '../utils/dom.js';
import { showToast } from '../ui/Toast.js';
import { MESSAGE_TYPES } from '../../shared/messageTypes.js';
import { STORAGE_KEYS } from '../../shared/storage.js';

export type ImportSource = 'jira' | 'gmail';
type Destination = 'qna' | 'operation' | 'todo';

export interface ImportPayload {
  source: ImportSource;
  title: string;
  url: string;
  // Jira-specific
  key?: string;
  desc?: string;
  comments?: Array<{ author: string; text: string }>;
  // Gmail-specific
  subject?: string;
  sender?: string;
  body?: string;
  messageId?: string;
}

interface DerivedFields {
  recordTitle: string;
  question: string;
  background: string;
  project: string;
  sourceKey: string;
}

/**
 * Normalize a Jira ticket or a Gmail message into the shared shape used to
 * build Operation / Todo payloads. Keeping this pure makes it unit-testable.
 */
export function deriveImportFields(payload: ImportPayload): DerivedFields {
  if (payload.source === 'jira') {
    const key = payload.key || '';
    const comments = payload.comments || [];
    return {
      recordTitle: `[${key}] ${payload.title}`.trim(),
      question: payload.desc || payload.title || '',
      background: comments.length
        ? comments.map((c) => `${c.author}: ${c.text}`).join('\n\n')
        : '',
      project: key.split('-')[0] || 'Default',
      sourceKey: key,
    };
  }

  // Gmail
  const subject = payload.subject || payload.title || '';
  return {
    recordTitle: `[Email] ${subject}`.trim(),
    question: subject,
    background: `From: ${payload.sender || ''}\n\n${payload.body || ''}`.trim(),
    project: 'Email',
    sourceKey: payload.messageId ? `gmail:${payload.messageId}` : '',
  };
}

const IMPORT_MODAL_STYLE = `
  .modal-overlay {
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(10, 10, 16, 0.7);
    backdrop-filter: blur(8px);
    z-index: 100000;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    animation: fadeIn 0.25s ease forwards;
  }
  .modal-card {
    width: 480px;
    background: var(--brse-surface);
    border: 1px solid rgba(255, 107, 94, 0.25);
    border-radius: 16px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 107, 94, 0.15);
    padding: 24px;
    color: var(--brse-text-muted);
    display: flex; flex-direction: column; gap: 20px;
    transform: translateY(20px);
    animation: slideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    box-sizing: border-box;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideIn { from { transform: translateY(20px); } to { transform: translateY(0); } }

  .modal-header {
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid rgba(255, 107, 94, 0.15);
    padding-bottom: 12px;
  }
  .modal-title {
    font-size: 16px; font-weight: 800; color: var(--brse-primary);
    display: flex; align-items: center; gap: 8px;
  }
  .close-btn {
    background: transparent; border: none; color: var(--brse-text-dim);
    font-size: 20px; cursor: pointer; transition: color 0.2s;
    padding: 0; line-height: 1;
  }
  .close-btn:hover { color: var(--brse-error); }

  .ticket-summary-card {
    background: rgba(255, 107, 94, 0.05);
    border: 1.2px solid rgba(255, 107, 94, 0.15);
    border-radius: 8px;
    padding: 12px;
    display: flex; flex-direction: column; gap: 6px;
  }
  .ticket-key {
    font-size: 11px; font-weight: 700; color: var(--brse-accent);
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  .ticket-title {
    font-size: 14px; font-weight: 700; color: var(--brse-text);
  }

  .extraction-checklist {
    display: flex; flex-direction: column; gap: 8px;
  }
  .checklist-item {
    display: flex; align-items: center; gap: 8px;
    font-size: 12.5px; color: var(--brse-success);
  }
  .checklist-item.empty {
    color: var(--brse-warning);
  }

  .import-options {
    display: flex; flex-direction: column; gap: 10px;
  }
  .option-card {
    border: 1px solid rgba(110, 112, 121, 0.3);
    border-radius: 10px;
    padding: 12px 14px;
    cursor: pointer;
    display: flex; align-items: flex-start; gap: 10px;
    transition: all 0.2s ease;
    box-sizing: border-box;
  }
  .option-card:hover {
    border-color: rgba(255, 107, 94, 0.5);
    background: rgba(255, 107, 94, 0.03);
  }
  .option-card.selected {
    border-color: var(--brse-primary);
    background: rgba(255, 107, 94, 0.08);
    box-shadow: 0 0 10px rgba(255, 107, 94, 0.15);
  }
  .option-radio {
    margin-top: 3px;
    accent-color: var(--brse-primary);
    cursor: pointer;
  }
  .option-info {
    display: flex; flex-direction: column; gap: 2px;
  }
  .option-title {
    font-size: 13px; font-weight: 700; color: var(--brse-text);
  }
  .option-desc {
    font-size: 11px; color: var(--brse-text-dim);
    line-height: 1.4;
  }

  .modal-footer {
    display: flex; justify-content: flex-end; gap: 12px;
    margin-top: 10px;
  }
  .btn {
    padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 700;
    cursor: pointer; transition: all 0.2s ease; border: none;
    box-sizing: border-box;
    display: inline-flex; align-items: center; justify-content: center;
  }
  .btn-secondary {
    background: transparent; border: 1px solid rgba(110, 112, 121, 0.4);
    color: var(--brse-text-muted);
  }
  .btn-secondary:hover {
    background: rgba(110, 112, 121, 0.1);
    border-color: rgba(110, 112, 121, 0.7);
  }
  .btn-primary {
    background: var(--brse-primary); color: var(--brse-surface);
    box-shadow: 0 4px 14px rgba(255, 107, 94, 0.4);
  }
  .btn-primary:hover {
    background: var(--brse-primary-bright);
    box-shadow: 0 4px 20px rgba(137, 221, 255, 0.5);
  }

  .loading-container {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 30px 0; gap: 16px;
    width: 100%;
  }
  .spinner {
    width: 36px; height: 36px;
    border: 3px solid rgba(255, 107, 94, 0.1);
    border-top: 3px solid var(--brse-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  .loading-text { font-size: 12.5px; color: var(--brse-primary); font-weight: 600; text-align: center; }
`;

const SOURCE_META: Record<ImportSource, { icon: string; label: string }> = {
  jira: { icon: '🛠️', label: 'Jira' },
  gmail: { icon: '📬', label: 'Gmail' },
};

function ImportModalComponent({ payload, onClose }: { payload: ImportPayload; onClose: () => void }) {
  const destinations: Destination[] = payload.source === 'jira'
    ? ['qna', 'operation', 'todo']
    : ['qna', 'todo'];

  const [selectedOption, setSelectedOption] = useState<Destination>('qna');
  const [syncStatus, setSyncStatus] = useState<'form' | 'syncing' | 'error'>('form');
  const [loadingText, setLoadingText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fields = deriveImportFields(payload);
  const meta = SOURCE_META[payload.source];

  const failWith = (msg: string) => {
    setErrorMessage(msg || 'Không rõ nguyên nhân');
    setSyncStatus('error');
  };

  const openSidepanelWithContext = (context: Record<string, unknown>) => {
    chrome.storage.local.set({ [STORAGE_KEYS.CONTEXT]: context }, () => {
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.BRSE_OPEN_SIDEPANEL }, () => {
        chrome.runtime.sendMessage({ type: MESSAGE_TYPES.BRSE_CONTEXT_UPDATED, context });
        onClose();
      });
    });
  };

  const baseContext = () => ({
    source: payload.source,
    key: payload.key || '',
    title: payload.title,
    desc: payload.desc || '',
    comments: payload.comments || [],
    subject: payload.subject || '',
    sender: payload.sender || '',
    body: payload.body || '',
    url: payload.url,
  });

  const syncQna = async () => {
    setLoadingText('Đang tạo bản ghi Q&A (確認事項) trên Backend...');
    const opPayload = {
      type: 'qna',
      title: fields.recordTitle,
      status: 'OPEN',
      priority: 'MEDIUM',
      project_name: fields.project,
      customer_owner: payload.source === 'gmail' ? (payload.sender || '') : '',
      field_a: fields.question,
      field_b: fields.background,
      // field_d carries a stable source id (Jira key / Gmail message id) so the
      // adapter can detect an already-imported item and avoid duplicates.
      field_d: fields.sourceKey,
      field_e: fields.sourceKey ? `${payload.url}\nKey: ${fields.sourceKey}` : payload.url,
    };

    const res = await safeSendMessage({ type: MESSAGE_TYPES.BRSE_CREATE_OPERATION, payload: opPayload });
    if (!res || !res.ok) return failWith(res?.error);

    setLoadingText('✓ Đã tạo Q&A! Đang khởi chạy AI soạn câu hỏi làm rõ...');
    openSidepanelWithContext({ ...baseContext(), type: `${payload.source}_qna_import`, recordId: res.data?.id });
    showToast('✓ Đã tạo Q&A & mở AI làm rõ!');
  };

  const syncOperation = async () => {
    setLoadingText('Đang tạo Operation Record (CR) trên Backend...');
    const opPayload = {
      type: 'cr',
      title: fields.recordTitle,
      status: 'OPEN',
      priority: 'HIGH',
      project_name: fields.project,
      field_a: payload.desc || '',
      field_b: JSON.stringify(payload.comments || []),
      field_c: payload.url,
      field_d: fields.sourceKey,
    };

    const res = await safeSendMessage({ type: MESSAGE_TYPES.BRSE_CREATE_OPERATION, payload: opPayload });
    if (!res || !res.ok) return failWith(res?.error);

    setLoadingText('✓ Đã đồng bộ Operations! Đang khởi chạy AI Phân tích...');
    openSidepanelWithContext({ ...baseContext(), type: `${payload.source}_import`, recordId: res.data?.id });
    showToast('✓ Đã đồng bộ sang Operations & AI!');
  };

  const syncTodo = async () => {
    setLoadingText('Đang tạo Todo Project trên Backend...');
    const projectPayload = {
      name: payload.source === 'jira'
        ? `Jira: ${payload.key} - ${payload.title}`
        : `Email: ${fields.question}`,
      preset: 'standard',
      active_phase: '3. Implementation & Coding',
    };

    const res = await safeSendMessage({ type: MESSAGE_TYPES.BRSE_CREATE_TODO_PROJECT, payload: projectPayload });
    if (!res || !res.ok) return failWith(res?.error);

    setLoadingText('Đang lưu! Đang mở Sidepanel để AI tạo Todo Checklist...');
    openSidepanelWithContext({ ...baseContext(), type: `${payload.source}_todo_import`, projectId: res.data?.id });
    showToast('✓ Đã đồng bộ sang Todo & AI!');
  };

  const handleSync = async () => {
    setSyncStatus('syncing');
    try {
      if (selectedOption === 'qna') await syncQna();
      else if (selectedOption === 'operation') await syncOperation();
      else await syncTodo();
    } catch (err: any) {
      failWith(err?.message || 'Không kết nối được tới Backend');
    }
  };

  if (syncStatus === 'syncing') {
    return (
      <div className="modal-overlay">
        <div className="modal-card">
          <div className="loading-container">
            <div className="spinner"></div>
            <div className="loading-text">{loadingText}</div>
          </div>
        </div>
      </div>
    );
  }

  if (syncStatus === 'error') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">❌ Đồng bộ Thất bại</div>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
          <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--brse-error)', lineHeight: '1.6' }}>
            <p>Có lỗi xảy ra trong quá trình đồng bộ hóa:</p>
            <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', fontSize: '11px', color: 'var(--brse-text)', overflowX: 'auto', marginTop: '8px' }}>
              {errorMessage}
            </pre>
          </div>
          <div className="modal-footer" style={{ marginTop: '15px' }}>
            <button className="btn btn-secondary" onClick={() => setSyncStatus('form')}>Thử lại</button>
            <button className="btn btn-primary" onClick={onClose}>Đóng</button>
          </div>
        </div>
      </div>
    );
  }

  const hasComments = !!(payload.comments && payload.comments.length > 0);
  const isGmail = payload.source === 'gmail';

  const OPTION_INFO: Record<Destination, { title: string; desc: string }> = {
    qna: {
      title: 'Tạo Q&A / 確認事項',
      desc: 'Tạo Operation Q&A và dùng AI soạn 3-5 câu hỏi làm rõ bằng tiếng Nhật Keigo.',
    },
    operation: {
      title: 'Nhập vào Operations (CR) & Phân tích AI',
      desc: 'Tạo Change Request và dùng AI phân tích yêu cầu, rủi ro, mâu thuẫn và Action Items.',
    },
    todo: {
      title: 'Tạo dự án Todo mới',
      desc: 'Tạo dự án Todo chuyên biệt và phân rã các tác vụ con bằng AI.',
    },
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{meta.icon} {meta.label} → BrSE OS</div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="ticket-summary-card">
          {!isGmail && <div className="ticket-key">{payload.key}</div>}
          {isGmail && <div className="ticket-key">{payload.sender || 'Email'}</div>}
          <div className="ticket-title">{isGmail ? (payload.subject || payload.title) : payload.title}</div>
        </div>

        <div className="extraction-checklist">
          {isGmail ? (
            <>
              <div className="checklist-item">
                <span style={{ marginRight: '6px' }}>✓</span> Đã trích xuất Người gửi & Tiêu đề
              </div>
              <div className={`checklist-item ${!payload.body ? 'empty' : ''}`}>
                <span style={{ marginRight: '6px' }}>{payload.body ? '✓' : '⚠️'}</span>
                {payload.body ? `Đã trích xuất nội dung (${payload.body.length} ký tự)` : 'Không lấy được nội dung email'}
              </div>
            </>
          ) : (
            <>
              <div className="checklist-item">
                <span style={{ marginRight: '6px' }}>✓</span> Đã trích xuất Mô tả ({payload.desc?.length || 0} ký tự)
              </div>
              <div className={`checklist-item ${!hasComments ? 'empty' : ''}`}>
                <span style={{ marginRight: '6px' }}>{hasComments ? '✓' : '⚠️'}</span>
                {hasComments ? `Đã tìm thấy ${payload.comments!.length} bình luận` : 'Không có bình luận nào'}
              </div>
            </>
          )}
        </div>

        <div className="import-options">
          {destinations.map((dest) => (
            <div
              key={dest}
              className={`option-card ${selectedOption === dest ? 'selected' : ''}`}
              onClick={() => setSelectedOption(dest)}
            >
              <input
                type="radio"
                name="import-dest"
                className="option-radio"
                checked={selectedOption === dest}
                onChange={() => setSelectedOption(dest)}
              />
              <div className="option-info">
                <span className="option-title">{OPTION_INFO[dest].title}</span>
                <span className="option-desc">{OPTION_INFO[dest].desc}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary" onClick={handleSync}>Bắt đầu Đồng bộ</button>
        </div>
      </div>
    </div>
  );
}

let importModalHost: HTMLDivElement | null = null;
let reactRootRef: any = null;

export function showImportModal(payload: ImportPayload) {
  removeImportModal();

  const mountResults = createReactShadowRoot(
    () => <ImportModalComponent payload={payload} onClose={removeImportModal} />,
    {
      id: 'brse-import-modal-root',
      cssContent: IMPORT_MODAL_STYLE,
    },
  );

  importModalHost = mountResults.host as HTMLDivElement;
  reactRootRef = mountResults.root;
}

export function removeImportModal() {
  if (importModalHost) {
    if (reactRootRef) {
      reactRootRef.unmount();
    }
    importModalHost.remove();
    importModalHost = null;
    reactRootRef = null;
  }
}
