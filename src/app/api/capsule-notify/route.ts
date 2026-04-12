// src/app/api/capsule-notify/route.ts
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getSupabaseClient } from '@/lib/supabase'

const resend = new Resend(process.env.RESEND_API_KEY)
const TO_EMAIL = process.env.NOTIFICATION_TO_EMAIL ?? ''

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
        subject: `💌 過去のあなたから、手紙が届いています`,
        html: `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>タイムカプセル開封</title>
</head>
<body style="margin:0;padding:0;background:#000811;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:40px;">
      <p style="color:#eb6168;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;margin:0 0 16px 0;">AlterLog</p>
      <h1 style="color:#a8d8ff;font-size:24px;font-weight:bold;margin:0;line-height:1.4;">
        過去のあなたから、<br>手紙が届いています
      </h1>
      <p style="color:#5a9abf;font-size:12px;margin:16px 0 0 0;">${openDate} に書かれた手紙</p>
    </div>

    <!-- Capsule Title -->
    <div style="background:rgba(0,84,167,0.1);border:1px solid rgba(0,84,167,0.3);border-radius:16px;padding:24px;margin-bottom:24px;">
      <p style="color:#4db8ff;font-size:11px;letter-spacing:0.2em;margin:0 0 8px 0;">📬 タイムカプセル</p>
      <p style="color:#c8e0f4;font-size:18px;font-weight:bold;margin:0;">${capsule.title}</p>
    </div>

    <!-- T message -->
    <div style="background:rgba(235,97,104,0.08);border:1px solid rgba(235,97,104,0.2);border-radius:16px;padding:24px;margin-bottom:32px;">
      <p style="color:#eb6168;font-size:11px;letter-spacing:0.2em;margin:0 0 12px 0;">T からの一言</p>
      <p style="color:#c8e0f4;font-size:14px;line-height:1.8;margin:0;">
        過去の自分が、今の自分に問いかけている。<br>
        あの日の熱量は、まだ残っているか？<br>
        逃げていないか。腐っていないか。<br>
        <strong style="color:#a8d8ff;">今すぐアプリを開いて、手紙を受け取れ。</strong>
      </p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:40px;">
      <a href="https://alter-log.vercel.app/capsule"
         style="display:inline-block;background:linear-gradient(135deg,#0054a7,#0075c2);color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;padding:16px 40px;border-radius:50px;letter-spacing:0.05em;">
        手紙を開封する →
      </a>
    </div>

    <!-- Footer -->
    <p style="color:#3a6a9a;font-size:11px;text-align:center;margin:0;">
      AlterLog — ととのう合同会社
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
