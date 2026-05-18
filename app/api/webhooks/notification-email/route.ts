import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

type NotificationRecord = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  entity_type: string;
  entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_SMTP_USER!,
    pass: process.env.GMAIL_SMTP_APP_PASSWORD!,
  },
});

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getNotificationLink(notification: NotificationRecord) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    return null;
  }

  if (
    notification.entity_type === 'payment_request' &&
    notification.entity_id
  ) {
    return `${appUrl}/payment-requests/${notification.entity_id}`;
  }

  return `${appUrl}/notifications`;
}

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get('x-notification-email-secret');

    if (!secret || secret !== process.env.NOTIFICATION_EMAIL_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    const notification = payload.record as NotificationRecord | undefined;

    if (!notification?.id || !notification.user_id) {
      return NextResponse.json(
        { error: 'Invalid notification payload' },
        { status: 400 },
      );
    }

    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.getUserById(notification.user_id);

    if (userError || !userData.user?.email) {
      return NextResponse.json(
        {
          error: 'Receiver email not found',
          detail: userError?.message,
        },
        { status: 404 },
      );
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', notification.user_id)
      .maybeSingle();

    const receiverEmail = userData.user.email;
    const receiverName = profile?.full_name ?? receiverEmail;
    const link = getNotificationLink(notification);

    const safeReceiverName = escapeHtml(receiverName);
    const safeTitle = escapeHtml(notification.title);
    const safeBody = notification.body ? escapeHtml(notification.body) : '';

    await transporter.sendMail({
      from: `"Hệ thống DNTT" <${process.env.GMAIL_SMTP_USER}>`,
      to: receiverEmail,
      subject: notification.title,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <p>Xin chào ${safeReceiverName},</p>

          <h2 style="margin: 0 0 12px;">${safeTitle}</h2>

          ${safeBody ? `<p style="margin: 0 0 16px;">${safeBody}</p>` : ''}

          ${
            link
              ? `
                <p style="margin: 24px 0;">
                  <a href="${link}" style="background: #111827; color: #ffffff; padding: 10px 16px; text-decoration: none; border-radius: 6px;">
                    Xem chi tiết
                  </a>
                </p>
              `
              : ''
          }

          <p style="font-size: 12px; color: #6b7280;">
            Email này được gửi tự động từ hệ thống DNTT.
          </p>
        </div>
      `,
    });

    return NextResponse.json({
      ok: true,
      notification_id: notification.id,
      email: receiverEmail,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
