"use strict";

export function injectGlossaryOverlay(card, shadow, makeSafeSlug, safeSendMessage, MESSAGE_TYPES, showToast, notifyGlossaryUpdated) {
  const glossaryOverlay = document.createElement('div');
  glossaryOverlay.id = 'brse-glossary-overlay';
  glossaryOverlay.className = 'glossary-overlay';
  glossaryOverlay.innerHTML = `
    <h3 style="margin: 0 0 10px 0; color: var(--brse-primary); font-size: 14px; border-bottom: 1px solid rgba(255, 107, 94, 0.2); padding-bottom: 6px; display: flex; justify-content: space-between; align-items: center; font-family: inherit;">
      <span style="display: flex; align-items: center; gap: 6px;">📥 Thêm vào Glossary dự án</span>
      <span id="g-close-x" style="cursor: pointer; color: var(--brse-text-muted); font-size: 14px;" title="Đóng">✕</span>
    </h3>
    <div style="flex: 1; overflow-y: auto; padding-right: 4px; margin-bottom: 10px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
        <div class="glossary-form-group">
          <label class="glossary-form-label">English (Gốc)</label>
          <input type="text" id="g-input-english" class="glossary-form-input" placeholder="Ví dụ: Scalability" />
        </div>
        <div class="glossary-form-group">
          <label class="glossary-form-label">Japanese (Nhật)</label>
          <input type="text" id="g-input-japanese" class="glossary-form-input" placeholder="Ví dụ: 拡張性" />
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
        <div class="glossary-form-group">
          <label class="glossary-form-label">Kana (Cách đọc)</label>
          <input type="text" id="g-input-kana" class="glossary-form-input" placeholder="Ví dụ: かくちょうせい" />
        </div>
        <div class="glossary-form-group">
          <label class="glossary-form-label">Phân loại (Category)*</label>
          <select id="g-input-category" class="glossary-form-select">
            <option value="System Design">System Design</option>
            <option value="Cloud">Cloud</option>
            <option value="Database">Database</option>
            <option value="Security">Security</option>
            <option value="Agile">Agile</option>
            <option value="Frontend">Frontend</option>
            <option value="Backend">Backend</option>
            <option value="Technical">Technical</option>
            <option value="Infrastructure">Infrastructure</option>
            <option value="Process">Process</option>
            <option value="Business">Business</option>
            <option value="Quality">Quality</option>
          </select>
        </div>
      </div>
      <div class="glossary-form-group" style="margin-bottom: 10px;">
        <label class="glossary-form-label">Nghĩa Tiếng Việt*</label>
        <input type="text" id="g-input-vietnamese" class="glossary-form-input" placeholder="Ví dụ: Khả năng mở rộng hệ thống" />
      </div>
      <div class="glossary-form-group" style="margin-bottom: 10px;">
        <label class="glossary-form-label">Vai trò liên quan (Roles)</label>
        <div class="role-tags-group">
          <input type="checkbox" id="g-role-brse" class="role-tag-checkbox" value="BrSE" checked />
          <label for="g-role-brse" class="role-tag-label">BrSE</label>
          
          <input type="checkbox" id="g-role-pm" class="role-tag-checkbox" value="PM" />
          <label for="g-role-pm" class="role-tag-label">PM</label>
          
          <input type="checkbox" id="g-role-ba" class="role-tag-checkbox" value="BA" />
          <label for="g-role-ba" class="role-tag-label">BA</label>
          
          <input type="checkbox" id="g-role-comtor" class="role-tag-checkbox" value="Comtor" />
          <label for="g-role-comtor" class="role-tag-label">Comtor</label>
          
          <input type="checkbox" id="g-role-qa" class="role-tag-checkbox" value="QA" />
          <label for="g-role-qa" class="role-tag-label">QA</label>
          
          <input type="checkbox" id="g-role-dev" class="role-tag-checkbox" value="Dev" />
          <label for="g-role-dev" class="role-tag-label">Dev</label>
        </div>
      </div>
      <div class="glossary-form-group" style="margin-bottom: 10px;">
        <label class="glossary-form-label">Ghi chú (Note)</label>
        <textarea id="g-input-note" class="glossary-form-textarea" placeholder="Nhập ghi chú thêm nếu có..."></textarea>
      </div>
      <div class="glossary-form-group" style="margin-bottom: 10px;">
        <label class="glossary-form-label">Ví dụ minh họa (Example)</label>
        <textarea id="g-input-example" class="glossary-form-textarea" placeholder="Nhập ví dụ minh họa..."></textarea>
      </div>
    </div>
    <div style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px; flex-shrink: 0;">
      <button id="g-btn-cancel" class="glossary-cancel-btn">Hủy bỏ</button>
      <button id="g-btn-submit" class="glossary-submit-btn">Lưu vào Glossary</button>
    </div>
  `;
  card.appendChild(glossaryOverlay);

  const closeX = glossaryOverlay.querySelector('#g-close-x');
  const btnCancel = glossaryOverlay.querySelector('#g-btn-cancel');
  const btnSubmit = glossaryOverlay.querySelector('#g-btn-submit');
  
  const closeGlossary = () => {
    glossaryOverlay.classList.remove('active');
  };
  
  if (closeX) closeX.onclick = closeGlossary;
  if (btnCancel) btnCancel.onclick = closeGlossary;
  
  if (btnSubmit) {
    btnSubmit.onclick = () => {
      const englishVal = glossaryOverlay.querySelector('#g-input-english').value.trim();
      const japaneseVal = glossaryOverlay.querySelector('#g-input-japanese').value.trim();
      const kanaVal = glossaryOverlay.querySelector('#g-input-kana').value.trim();
      const categoryVal = glossaryOverlay.querySelector('#g-input-category').value;
      const vietnameseVal = glossaryOverlay.querySelector('#g-input-vietnamese').value.trim();
      const noteVal = glossaryOverlay.querySelector('#g-input-note').value.trim();
      const exampleVal = glossaryOverlay.querySelector('#g-input-example').value.trim();
      
      if ((!englishVal && !japaneseVal) || !vietnameseVal) {
        showToast("⚠️ Cần nhập English hoặc Japanese, và Nghĩa Tiếng Việt.");
        return;
      }
      
      const checkedRoles = [];
      glossaryOverlay.querySelectorAll('.role-tag-checkbox:checked').forEach(cb => {
        checkedRoles.push(cb.value);
      });
      if (checkedRoles.length === 0) {
        checkedRoles.push("BrSE");
      }
      
      const slugId = makeSafeSlug(englishVal || japaneseVal);
        
      const term = {
        id: slugId,
        english: englishVal,
        japanese: japaneseVal,
        kana: kanaVal || null,
        vietnamese: vietnameseVal,
        roles: checkedRoles,
        category: categoryVal,
        note: noteVal || null,
        example: exampleVal || null
      };
      
      btnSubmit.innerText = "⏳ Đang lưu...";
      btnSubmit.disabled = true;
      
      safeSendMessage({
        type: MESSAGE_TYPES.BRSE_ADD_GLOSSARY_TERM,
        term
      }).then((response) => {
        btnSubmit.innerText = "Lưu vào Glossary";
        btnSubmit.disabled = false;
        
        if (response && response.ok) {
          showToast("✨ Đã thêm thuật ngữ vào Glossary thành công!");
          notifyGlossaryUpdated(response.term || term);
          closeGlossary();
        } else {
          const errorMsg = (response && response.error) ? response.error : "Trùng ID hoặc Lỗi kết nối";
          showToast(`❌ Thêm thất bại: ${errorMsg}`);
        }
      }).catch((err) => {
        btnSubmit.innerText = "Lưu vào Glossary";
        btnSubmit.disabled = false;
        showToast(`❌ Thêm thất bại: ${err.message || "Extension message failed"}`);
      });
    };
  }
}
