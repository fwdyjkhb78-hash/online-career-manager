import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Only handle create events
    if (body?.event?.type !== 'create') {
      return Response.json({ ok: true, skipped: true });
    }

    const announcement = body.data;
    if (!announcement) return Response.json({ ok: true, skipped: 'no data' });

    const typeLabel = announcement.type === 'rules' ? 'Règles'
      : announcement.type === 'presentation' ? 'Présentation'
      : 'Actualité';

    // Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();

    // Create a notification for each user
    await Promise.all(allUsers.map(user =>
      base44.asServiceRole.entities.Notification.create({
        user_id: user.id,
        type: 'announcement',
        title: `📢 ${typeLabel} : ${announcement.title}`,
        message: announcement.content?.substring(0, 150) + (announcement.content?.length > 150 ? '…' : ''),
        is_read: false,
        link_page: 'Community',
      })
    ));

    return Response.json({ ok: true, notified: allUsers.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});