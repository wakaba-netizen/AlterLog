// src/app/api/capsule-notify/route.ts
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getSupabaseClient } from '@/lib/supabase'

// This endpoint is called by Vercel Cron every morning at 9:00 JST
// It finds capsules whose open_at date has arrived and sends email notifications
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls (optional but good practice)
  const authHeader = request.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 実行時に初期化（ビルド時にAPIキーが不要）
  const resend = new Resend(process.env.RESEND_API_KEY)
  const TO_EMAIL = process.env.NOTIFICATION_TO_EMAIL ?? ''

  const supabase = getSupabaseClient()
  const now = new Date().toISOString()

  // Find capsules that: open_at has passed, not yet opened, not yet notified
  const { data: capsules, error } = await supabase
    .from('time_capsules')
    .select('id, title, content, open_at')
    .lte('open_at', now)
    .eq('is_opened', false)
    .eq('notified', false)

  if (error) {
    console.error('Capsule query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!capsules || capsules.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No capsules to notify' })
  }

  let sent = 0
  const failed: string[] = []

  for (const capsule of capsules) {
    const openDate = new Date(capsule.open_at).toLocaleDateString('ja-JP', {
      year: 'numeric', month: 'long', day: 'numeric'
    })

    try {
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: TO_EMAIL,
        subject: `【Tからの最後通牒】過去の自分から、手紙が届いています`,
        html: `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#000811;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <p style="color:#eb6168;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;margin:0 0 16px 0;">AlterLog / ととのう合同会社</p>
      <h1 style="color:#c8e0f4;font-size:22px;font-weight:bold;margin:0;line-height:1.5;">
        【Tからの最後通牒】<br>
        <span style="color:#a8d8ff;">過去の自分から、手紙が届いています</span>
      </h1>
    </div>

    <!-- T message -->
    <div style="background:#0d0005;border:1px solid rgba(235,97,104,0.4);border-radius:16px;padding:28px;margin-bottom:24px;">
      <p style="color:#eb6168;font-size:11px;letter-spacing:0.2em;margin:0 0 16px 0;">T（ティー）より</p>
      <p style="color:#c8e0f4;font-size:15px;line-height:1.9;margin:0;">
        今の自分を直視しているか？<br>
        過去の自分からのメッセージが届いた。<br><br>
        カプセル：<strong style="color:#a8d8ff;">「${capsule.title}」</strong><br><br>
        今すぐアプリを開き、自分の過去と対話しろ。<br>
        <strong style="color:#eb6168;">逃げるな。</strong>
      </p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:40px;">
      <a href="https://alter-log.vercel.app/capsule"
         style="display:inline-block;background:linear-gradient(135deg,#0054a7,#0075c2);color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;padding:18px 48px;border-radius:50px;letter-spacing:0.05em;">
        手紙を開封する →
      </a>
    </div>

    <!-- Footer -->
    <p style="color:#3a6a9a;font-size:11px;text-align:center;margin:0;line-height:1.8;">
      AlterLog — ととのう合同会社<br>
      <span style="color:#2a4a6a;">このメールはタイムカプセルの開封日に自動送信されました</span>
    </p>

  </div>
</body>
</html>
        `.trim(),
      })

      // Mark as notified
      await supabase
        .from('time_capsules')
        .update({ notified: true })
        .eq('id', capsule.id)

      sent++
    } catch (err) {
      console.error(`Failed to send notification for capsule ${capsule.id}:`, err)
      failed.push(capsule.id)
    }
  }

  return NextResponse.json({
    sent,
    failed: failed.length,
    total: capsules.length,
  })
}
