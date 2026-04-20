import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const payload = await req.json().catch(() => ({}));
    const type = payload.type; // "open" or "close"

    const windows = await base44.asServiceRole.entities.MercatoWindow.list('-created_date', 1);
    const currentWindow = windows[0];

    if (!currentWindow) {
      return Response.json({ message: 'No MercatoWindow found' });
    }

    // Only send if the relevant flag is set
    if (type === 'open' && !currentWindow.pending_open_msg) {
      return Response.json({ message: 'No pending open message' });
    }
    if (type === 'close' && !currentWindow.pending_close_msg) {
      return Response.json({ message: 'No pending close message' });
    }

    const msgText = type === 'open'
      ? (currentWindow.open_msg_text || '🟢 Le mercato est maintenant OUVERT ! Vous pouvez faire vos offres et enchères.')
      : (currentWindow.close_msg_text || '🔴 Le mercato est maintenant FERMÉ. Les enchères en attente seront activées à la prochaine ouverture.');

    const title = type === 'open' ? '🟢 Ouverture du Mercato' : '🔴 Fermeture du Mercato';

    // Post announcement in community
    await base44.asServiceRole.entities.Announcement.create({
      type: 'news',
      title,
      content: msgText,
      author_id: currentWindow.opened_by_id || 'system',
      author_name: currentWindow.opened_by_name || 'Staff',
      reactions: {},
    });

    // Notify all managers
    const allUsers = await base44.asServiceRole.entities.User.list();
    const managers = allUsers.filter(u => u.has_selected_club || u.club_id);
    await Promise.all(managers.map(u =>
      base44.asServiceRole.entities.Notification.create({
        user_id: u.id,
        club_id: u.club_id || '',
        type: 'announcement',
        title,
        message: msgText,
        is_read: false,
        link_page: 'TransferMarket',
      })
    ));

    // Clear the pending flag
    await base44.asServiceRole.entities.MercatoWindow.update(currentWindow.id, {
      [type === 'open' ? 'pending_open_msg' : 'pending_close_msg']: false,
    });

    return Response.json({ success: true, sent: managers.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});