# BrSE OS Shared API Contracts

**Status:** active shared-contract inventory  
**Owner:** backend schemas and routers are source of truth  
**Rule:** browser UI uses `/api`; Chrome Extension uses `DEFAULT_API_BASE` from `chrome-extension/src/shared/api.js`.

This file lists API surfaces used by both the web app and Chrome Extension, or by one surface with an explicit shared-contract risk. Keep it small and update it with any endpoint shape change.

| Surface | Endpoint | Backend owner | Frontend client | Chrome Extension client | Request owner | Response owner |
| --- | --- | --- | --- | --- | --- | --- |
| AI status | `/ai/status` | `backend/app/api/routes/ai.py` | `frontend/components/NineRouterStatus.tsx`, `frontend/components/AiChatWidget.tsx`, `frontend/lib/validationHelpers.ts` | `chrome-extension/src/background/modelSync.js`, `chrome-extension/src/shared/settingsStatus.js` | Query flag `check_runtime` in router | Runtime status JSON from router/runtime service |
| AI model sync | `/ai/model` | `backend/app/api/routes/ai.py` | `frontend/components/NineRouterStatus.tsx` | `chrome-extension/src/background/modelSync.js` | Model ID from canonical model list | Active model payload from AI router |
| AI model smoke | `/ai/model-smoke` | `backend/app/api/routes/ai.py` | `frontend/components/NineRouterStatus.tsx`, `scripts/check-ai-models.py` | none currently | Optional smoke prompt | Per-model green/red reachability results |
| AI provider config | `/ai/config` | `backend/app/api/routes/ai.py` | none currently | `chrome-extension/src/options/options.js` | `AiProviderConfigUpdate` partial schema (URLs/model in full; empty secret = keep) | Non-secret endpoints + `configured` boolean map; secret values never returned |
| AI chat | `/ai/chat` | `backend/app/api/routes/ai.py` | `frontend/components/AiChatWidget.tsx`, `frontend/components/dashboard/DashboardMorningBriefPanel.tsx` | `chrome-extension/src/shared/api.js`, `chrome-extension/src/background/backendBridge.js` | Chat payload in AI router | `{ reply }` JSON |
| AI stream | `/ai/chat/stream` | `backend/app/api/routes/ai.py` | none currently | `chrome-extension/src/background/aiStream.js` | Chat stream payload in AI router | Server-sent `data:` chunks |
| AI Keigo | `/ai/keigo` | `backend/app/api/routes/ai.py` | Keigo route/components | `chrome-extension/src/background/backendBridge.js` | Keigo request JSON schema | Keigo suggestion JSON |
| OCR | `/ai/ocr` | `backend/app/api/routes/ai.py` | none currently | `chrome-extension/src/background/background.js`, `chrome-extension/src/content/ui/quickbox/chatComposer.js` | OCR request schema (`base64_image` \| `image_url` \| `text`, `mode`) | Multilingual OCR region response |
| Glossary | `/glossary` | `backend/app/api/routes/glossary.py` | Glossary route/lib | `chrome-extension/src/background/glossarySync.js` | `GlossaryTerm` schema | `GlossaryPagination` / term JSON |
| Knowledge | `/knowledge` | `backend/app/api/routes/knowledge.py` | `frontend/lib/knowledge.ts` | `chrome-extension/src/background/glossarySync.js` reads knowledge-linked term cache | `KnowledgeItem` schema | Knowledge item/list JSON |
| Client state | `/client-state/entry` | `backend/app/api/routes/client_state.py` | `frontend/lib/clientState.ts`, `frontend/lib/projectSettings.ts` | `chrome-extension/src/background/glossarySync.js` | Client-state key/value schema | Client-state record JSON |
| Operations | `/operations` | `backend/app/api/routes/operations.py` | `frontend/lib/operations.ts` | `chrome-extension/src/shared/api.js`, `chrome-extension/src/background/backendBridge.js` | `OperationRecord` schema | Operation record/list JSON |
| Todo projects | `/todos/projects` | `backend/app/api/routes/todos.py` | `frontend/lib/brseTodo.ts` | `chrome-extension/src/background/backendBridge.js`, `chrome-extension/src/sidepanel/specPreview.js` | Todo project/state/item schemas | Todo project/state/item JSON |
| Meeting minutes | `/meeting-minutes` | `backend/app/api/routes/meeting_minutes.py` | `frontend/lib/meetingMinutes.ts` | `chrome-extension/src/background/backendBridge.js` | Meeting minutes schema | Meeting minutes JSON |
| Meeting upload | `/meetings/upload` | `backend/app/api/routes/meetings_upload.py` | `frontend/lib/meetings.ts` | `chrome-extension/src/content/ui/MeetingRecorder.js` | Multipart upload schema | Meeting job record JSON |

## Change Rules

- Add backend schema/router tests before changing a listed request or response shape.
- Update both clients through their canonical helpers when a surface is shared.
- Do not add direct `localhost:8000` or `127.0.0.1:8000` calls to browser/extension code.
- Keep `scripts/check-api-contract.cjs` passing after any endpoint or base URL change.
