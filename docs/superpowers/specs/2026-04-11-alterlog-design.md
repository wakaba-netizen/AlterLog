# AlterLog — 設計ドキュメント

**作成日:** 2026-04-11  
**ステータス:** 承認済み

---

## 概要

AlterLog は「究極の自己客観視」を支援する音声ジャーナリング PWA。  
ユーザーが声で本音を吐き出すと、AIが忖度なく認知の歪みを分析し、鋭く突き返す。  
Galaxy S25 などのモバイルブラウザをメインターゲットとし、ホーム画面から起動できる PWA として構築する。

---

## 技術スタック

| 項目 | 選定 |
|------|------|
| フレームワーク | Next.js 14（App Router） |
| スタイリング | Tailwind CSS |
| データベース / Auth | Supabase |
| 音声文字起こし | OpenAI Whisper API |
| テキスト分析 | OpenAI GPT-4o |
| サーバーロジック | Next.js Server Actions |
| PWA | next-pwa（manifest + service worker） |

---

## アーキテクチャ

### ステートマシン（単一 `page.tsx`）

```
'idle' → 'recording' → 'loading' → 'result' → 'idle'
```

- `idle`: 録音前。CTAテキストを表示、タップ待ち。
- `recording`: MediaRecorder が起動。Web Audio API でリアルタイム波形を描画。
- `loading`: 録音停止直後。Whisper + GPT-4o を並列実行。ローディングアニメーション。
- `result`: 分析結果を全画面表示。「もう一度話す」で `idle` に戻る。

### データフロー

```
[ブラウザ]
  MediaRecorder API → audio/webm blob
        ↓
[Server Action: transcribeAndAnalyze(formData)]
  1. OpenAI Whisper API → transcript (string)
  2. OpenAI GPT-4o      → { fact_ratio, emotion_ratio, passive_ratio,
                             thinking_profile, ai_comment }
  (1, 2 は Promise.all で並列)
        ↓
[Supabase]
  entries テーブルに INSERT
        ↓
[ブラウザ]
  result ステートへ遷移、分析結果を表示
```

---

## 画面設計

### 共通デザイン

- **背景:** `background: linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)` 全画面固定
- **フォント:** システムフォント（`-apple-system`, `Hiragino Sans`）
- **カラーパレット:**
  - メインアクセント: `#a78bfa`（紫）
  - セカンダリ: `#38bdf8`（水色）
  - テキスト: `#e2e8f0`
  - ミュート: `#64748b`

---

### 画面1: 録音画面（`idle` / `recording`）

**レイアウト（モバイルファースト、縦320px以上確保）:**

```
[上部]
  "AlterLog" ロゴ（小さく、中央、letter-spacing広め）

[中央 - メイン]
  Waveform（Web Audio API）
  - 11本のバー、中央に向かって高くなる山型
  - idle 時: 微小なランダムアニメーション（存在感を示す）
  - recording 時: AnalyserNode の frequencyData に連動
    - 音量 → バーの高さ（scaleY）
    - 周波数（低/中/高） → バーの色（紫→水色→白のグラデーション）
  - バー下にリップルグロー

[中央 - ボタン]
  円形録音ボタン（96px）
  - idle: 紫のリップルアニメーション、中央に白い円
  - recording: 赤くパルス、中央に四角（停止アイコン）
  タップで recording 開始 / 停止

[下部]
  CTAテキスト（時間帯で動的切替）
  - 5:00-11:00  → 「今のモヤモヤ、全部置いていこう。」
  - 21:00-4:00  → 「今日一日を、全部ここに置いていけ。」
  - その他      → 「さあ、吐き出せ。」
```

---

### 画面2: ローディング画面（`loading`）

```
[全画面、録音と同じ背景を継承]

[中央]
  波形が「呼吸する」スローアニメーション（scaleY 0.3 〜 0.6 をゆっくり往復）
  
  テキスト（フェードイン・アウトをループ）:
  「君の言葉を、僕が咀嚼している…」

[下部 - 処理ステップ（小さく表示）]
  ✓ 音声を受け取った
  ● 言葉を解析中...
  ○ 思考パターンを読み取る
```

---

### 画面3: 分析結果画面（`result`）

**インパクト最優先。Galaxy S25 の縦画面いっぱいに展開。**

```
[最上部 - 全画面の40%]
  「思考プロファイル」大見出し
  例: 「焦燥感に駆られた完璧主義者」
  - フォントサイズ: 2.5rem〜3rem（テキスト長に応じて自動縮小）
  - グラデーションテキスト: 紫→水色
  - 下に薄いセパレーター

[中央 - メトリクス 3本]
  ┌─────────────────────────────┐
  │ 事実  ████████░░  72%       │
  │ 感情  ███░░░░░░░  28%       │
  └─────────────────────────────┘
  ┌─────────────────────────────┐
  │ 受動態  ██████░░░░  60%     │
  └─────────────────────────────┘

[下部 - AI コメント]
  短く、鋭く、1〜3文。ZOZOTOWNを作った男に言い放つ熱量。
  例: 「受動態が60%。あなたは主語を手放している。何かに支配されていると感じているなら、
       まずそれを認めることだ。」

[最下部]
  「もう一度話す」ボタン → idle へ遷移

[折りたたみ]
  文字起こし全文（"原文を見る ▼" タップで展開）
```

---

## Supabase スキーマ

```sql
CREATE TABLE entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transcript    TEXT NOT NULL,
  fact_ratio    INTEGER NOT NULL,  -- 0-100
  emotion_ratio INTEGER NOT NULL,  -- 0-100 (100 - fact_ratio)
  passive_ratio INTEGER NOT NULL,  -- 0-100
  thinking_profile TEXT NOT NULL,
  ai_comment    TEXT NOT NULL
);
```

---

## GPT-4o システムプロンプト（分析AI）

```
あなたは「AlterLog」というアプリの分析AIです。
ユーザーの音声ジャーナルを受け取り、徹底的に客観分析します。

【絶対ルール】
- ユーザーを褒めない。慰めない。共感の演技をしない。
- 鋭いビジネス参謀として、核心だけを突く。
- ZOZOTOWNを創業した起業家に語りかけるレベルの熱量と厳しさ。

【出力フォーマット（JSON）】
{
  "fact_ratio": <0-100の整数。発言中の客観的事実の割合>,
  "emotion_ratio": <0-100の整数。100 - fact_ratio>,
  "passive_ratio": <0-100の整数。受動態・他責表現の割合>,
  "thinking_profile": <10文字以内の思考タイプラベル。例:「焦燥感に駆られた完璧主義者」>,
  "ai_comment": <1〜3文。短く鋭く。主語は「あなた」。褒め禁止。>
}
```

---

## ディレクトリ構造

```
/Users/wakabayashiyuki/Projects/AlterLog/
├── .env.local                    # API キーテンプレート
├── next.config.ts
├── tailwind.config.ts
├── public/
│   ├── manifest.json             # PWA マニフェスト
│   ├── icon-192.png
│   └── icon-512.png
└── src/
    └── app/
        ├── layout.tsx            # PWA メタタグ、フォント
        ├── page.tsx              # ステートマシン本体（全4状態）
        ├── globals.css
        └── actions/
            └── analyze.ts        # Server Action: Whisper + GPT-4o + Supabase
```

---

## 環境変数（`.env.local` テンプレート）

```
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## PWA 設定

- `manifest.json`: `display: standalone`, `theme_color: #1a1a2e`, `background_color: #0f3460`
- アイコン: 192×192 と 512×512（紫のグラデーション背景に白の波形アイコン）
- `<meta name="viewport">`: `viewport-fit=cover`（ノッチ対応）
- `<meta name="apple-mobile-web-app-capable">`: YES

---

## スコープ外（今回実装しない）

- ユーザー認証（Supabase Auth）— 後フェーズ
- 過去記録一覧画面 — 後フェーズ
- プッシュ通知 — 後フェーズ
