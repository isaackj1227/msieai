# MiseAI v5 — Google Gemini (FREE) + Airtable + Vercel

## 완전 무료 스택
- **AI Vision:** Google Gemini 2.5 Flash — 무료 (하루 1,000회)
- **Database:** Airtable — 무료 플랜
- **Hosting:** Vercel — 무료 플랜
- **총 비용: $0**

---

## Step 1 — Google Gemini API 키 (무료, 카드 불필요)

1. **aistudio.google.com** 접속
2. Google 계정으로 로그인
3. 왼쪽 메뉴 **"Get API Key"** 클릭
4. **"Create API Key"** 클릭
5. 키 복사 (AIza...로 시작)

---

## Step 2 — Airtable 세팅

1. **airtable.com** → 무료 가입
2. **Create a base** → 이름: MiseAI

**Inventory 테이블 필드 추가:**
| 필드명       | 타입              |
|------------|-----------------|
| Name       | Single line text |
| Icon       | Single line text |
| Category   | Single line text |
| CurrentQty | Number (decimal) |
| Unit       | Single line text |
| ParLevel   | Number (decimal) |
| ReorderQty | Number (decimal) |
| UnitCost   | Number (decimal) |
| Condition  | Single line text |
| StockLevel | Single line text |
| Notes      | Long text        |
| SupplierName | Single line text |

**Suppliers 테이블 필드 추가:**
| 필드명     | 타입              |
|----------|-----------------|
| Name     | Single line text |
| Phone    | Single line text |
| Email    | Email            |
| LeadTime | Single line text |

**API 토큰 발급:**
- airtable.com/create/tokens
- Scopes: data.records:read, data.records:write, schema.bases:read
- Access: MiseAI base 선택
- 토큰 복사

**Base ID 찾기:**
- MiseAI base URL: airtable.com/appXXXXXXXX/...
- appXXXXXXXX 부분이 Base ID

---

## Step 3 — GitHub에 올리기

1. github.com → 무료 가입
2. New repository → miseai
3. ZIP 압축 해제 후 전체 파일 업로드

---

## Step 4 — Vercel 배포

1. vercel.com → GitHub 계정으로 로그인
2. "Import Project" → miseai 선택
3. Environment Variables 추가:
   - GOOGLE_API_KEY = AIza...
   - AIRTABLE_TOKEN = pat...
   - AIRTABLE_BASE_ID = app...
4. Deploy 클릭

---

## 무료 한도

| 서비스 | 무료 한도 | 실제 사용량 |
|---|---|---|
| Gemini API | 하루 1,000회 | 하루 10~30장 |
| Airtable | 1,000 rows | 충분 |
| Vercel | 100GB bandwidth | 충분 |

