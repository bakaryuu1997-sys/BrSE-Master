import re

file_path = "frontend/components/LiveRecordingPanel.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix buildLocalLiveAssist signature and calls
content = content.replace(
    'function buildLocalLiveAssist(text: string): LiveMeetingAssistResponse {',
    'function buildLocalLiveAssist(text: string, t?: any): LiveMeetingAssistResponse {'
)

# Replace t() calls inside buildLocalLiveAssist to be safe
content = content.replace('[t("recorder.questionsHint")]', '[t ? t("recorder.questionsHint") : "Questions hint"]')
content = content.replace('[t("recorder.risksHint")]', '[t ? t("recorder.risksHint") : "Risks hint"]')
content = content.replace('[t("recorder.actionsHint")]', '[t ? t("recorder.actionsHint") : "Actions hint"]')
content = content.replace('t("recorder.confirmScope")', 't ? t("recorder.confirmScope") : "Confirm scope"')
content = content.replace('t("recorder.checkEvidence")', 't ? t("recorder.checkEvidence") : "Check evidence"')

# Update calls to buildLocalLiveAssist
content = content.replace('buildLocalLiveAssist("")', 'buildLocalLiveAssist("", t)')
content = content.replace('buildLocalLiveAssist(next)', 'buildLocalLiveAssist(next, t)')
content = content.replace('buildLocalLiveAssist(`${context}\\n${question}`)', 'buildLocalLiveAssist(`${context}\\n${question}`, t)')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
