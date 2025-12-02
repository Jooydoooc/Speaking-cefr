export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    res.status(500).json({ error: 'Telegram environment variables are not configured.' });
    return;
  }

  try {
    const {
      firstName,
      surname,
      group,
      setName,
      date,
      time,
      audioBase64
    } = req.body || {};

    if (!audioBase64) {
      res.status(400).json({ error: 'audioBase64 is required.' });
      return;
    }

    const safeFirstName = firstName || 'Unknown';
    const safeSurname = surname || 'Student';
    const safeGroup = group || 'Unknown group';
    const safeSetName = setName || 'Unknown set';
    const safeDate = date || '';
    const safeTime = time || '';

    const message = `
📝 New Speaking Test Completed!

👤 Student: ${safeFirstName} ${safeSurname}
👥 Group: ${safeGroup}
📚 Set: ${safeSetName}
📅 Date: ${safeDate}
⏰ Time: ${safeTime}
    `;

    // 1) Send text message
    const msgResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message
        })
      }
    );

    const msgData = await msgResponse.json();
    if (!msgResponse.ok || !msgData.ok) {
      console.error('Telegram sendMessage error:', msgData);
      throw new Error('Failed to send Telegram message');
    }

    // 2) Send the audio file
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const blob = new Blob([audioBuffer], { type: 'audio/webm' });

    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append(
      'audio',
      blob,
      `${safeFirstName}_${safeSurname}_${safeSetName}`.replace(/\s+/g, '_') + '.webm'
    );
    formData.append(
      'caption',
      `🎤 Recording from ${safeFirstName} ${safeSurname} (${safeGroup})`
    );

    const audioResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendAudio`,
      {
        method: 'POST',
        body: formData
      }
    );

    const audioData = await audioResponse.json();
    if (!audioResponse.ok || !audioData.ok) {
      console.error('Telegram sendAudio error:', audioData);
      throw new Error('Failed to send Telegram audio');
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error in /api/sendRecording:', error);
    res.status(500).json({ error: 'Failed to send recording to Telegram.' });
  }
}
