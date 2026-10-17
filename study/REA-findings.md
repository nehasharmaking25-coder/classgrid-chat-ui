# REA Study — chat.classgrid.in public bundle

## What was downloaded
| File | Size |
| --- | --- |
| index.html | 7.6 KB |
| index-CnzzD6bK.js (main bundle) | 7.8 MB |
| index-CTBzMkR8.css | 590 KB |
| vendor-react / vendor-ui / vendor-utils / vendor-charts | 833 KB |

## Main screens (routes found in the bundle)
- **Chat / agent**: `/agent`, `/agent/chat`, `/agent/profile`, `/agent/settings`, `/platform/chat`, `/public-chat-login`, `/student/agent`
- **Auth**: `/login`, `/admin-login`, `/platform-login`, `/student/login`, `/reset-password`, `/forgot-password`, `/activate`
- **Dashboards**: `/admin/dashboard`, `/student/dashboard`, `/superadmin/dashboard`
- **Student work**: `/student/work/*` (attendance, fees, timetable, library, results, quizzes, etc.)
- **Admissions**: `/admissions`, `/api/admission/*`
- **Admin/superadmin**: `/superadmin/*`, `/admin/*`, `/org/*`
- **Other**: `/about`, `/support`, `/settings`, `/profile`, `/projects`, `/whats-new`

## Components identified (UI-related)
- Chat: `ChatBubble`, `MessageList`, `MessageBox`, `SendMessage`, `Message Info`, `Chat Trend`
- Layout: `Platform Sidebar Logo`, `Platform Sidebar Name`, `DropdownNav`, `ContextMenu`
- Input: `TextBox`, `SearchInputRef`, `EmojiPickerReact`, `EmojiListRef`, `SkinTonePickerRef`
- Modals: `GroupSettingsModal`, `ImageCropperModal`, `CreateDialog`
- Misc: `DataView`, `CreditCard`, `ColorPicker`, `SharedProfilePage`, `OAuthCallback`

## API calls found (204 total `/api/...` routes)
Key groups:
- **AI/chat**: `/api/ai/ask`, `/api/ai/sessions`, `/api/ai/credits/balance`, `/api/ai/generate-image`, `/api/ai/upload`, `/api/ai/my-usage`
- **Auth (chat)**: `/api/auth/chat/send-email-otp`, `/api/auth/chat/verify-email-otp`, `/api/auth/chat/send-whatsapp-otp`, `/api/auth/chat/finalize-onboarding`
- **Admissions**: `/api/admission/*` (applications, merit-list, cet, export, notify)
- **Admin/superadmin**: `/api/admin/*`, `/api/audit/*`, `/api/ai/agent-reviews`

## Secrets found
- **Supabase project URL**: `https://bumxgscngzjadyozdpce.supabase.co`
- **Supabase anon key** (public, `role: anon` JWT): found in the bundle. This is a public client key, not a secret, but it was NOT copied into the rebuild.
- No Razorpay keys, Firebase keys, OAuth client secrets, or private API keys found.

> Note: the anon key is a public client-side key (role `anon`), so it is not a real secret, but per instructions it was not reused.