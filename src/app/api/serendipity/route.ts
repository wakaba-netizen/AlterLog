// src/app/api/serendipity/route.ts
// Vercel Cron が定期実行。過去ログから偶発的な閃き（セレンディピティ）を生成し、
// 「⚡ 偶発的な閃きが発生！」の不意打ち通知メールを送る。
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getSupabaseClient } from '@/lib/supabase'
import { generateSpark } from '@/app/actions/spark'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 閃きを生成
  const spark = await generateSpark()
  if (!spark) {
    return NextResponse.json({ generated: false, message: '記録が不足しています' })
  }

  // 通知メール送信（Resend）
  const resend = new Resend(process.env.RESEND_API_KEY)
  const TO_EMAIL = process.env.NOTIFICATION_TO_EMAIL ?? ''

  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: TO_EMAIL,
      subject: `⚡ 偶発的な閃きが発生！｜${spark.logA.date}のメモと繋がったぞ`,
      html: `
<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#000811;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <p style="color:#f59e0b;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;margin:0 0 16px 0;">AlterLog / Serendipity</p>
      <h1 style="color:#c8e0f4;font-size:22px;font-weight:bold;margin:0;line-height:1.5;">
        ⚡ 偶発的な閃きが発生！<br>
        <span style="color:#ffd77a;">${spark.logA.date}のメモと${spark.logB.date}の記録が、裏で繋がったぞ。</span>
      </h1>
    </div>
    <div style="background:#0d0900;border:1px solid rgba(245,158,11,0.4);border-radius:16px;padding:28px;margin-bottom:24px;">
      <p style="color:#f59e0b;font-size:11px;letter-spacing:0.2em;margin:0 0 16px 0;">Tのスパーク解説</p>
      <p style="color:#c8e0f4;font-size:15px;line-height:1.9;margin:0;">${spark.spark_text}</p>
    </div>
    <div style="text-align:center;margin-bottom:40px;">
      <a href="https://alter-log.vercel.app/"
         style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#ffd77a);color:#000811;font-size:15px;font-weight:bold;text-decoration:none;padding:18px 48px;border-radius:50px;letter-spacing:0.05em;">
        今すぐ開け →
      </a>
    </div>
    <p style="color:#3a6a9a;font-size:11px;text-align:center;margin:0;line-height:1.8;">
      AlterLog — ととのう合同会社<br>
      <span style="color:#2a4a6a;">このメールは過去ログの偶発的な交差を検出して自動送信されました</span>
    </p>
  </div>
</body></html>`.trim(),
    })

    // 通知済みフラグ
    const supabase = getSupabaseClient()
    await supabase.from('sparks').update({ notified: true }).eq('id', spark.id)
  } catch (err) {
    console.error('Spark notification failed:', err)
    return NextResponse.json({ generated: true, notified: false, error: String(err) })
  }

  return NextResponse.json({ generated: true, notified: true, sparkId: spark.id })
}
