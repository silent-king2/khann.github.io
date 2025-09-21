import FormData from "form-data";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { siteName, htmlContent } = req.body || {};
  if (!siteName || !htmlContent) {
    return res.status(400).json({ error: "Missing siteName or htmlContent" });
  }

  const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!VERCEL_TOKEN) {
    return res.status(500).json({ error: "Server misconfigured: VERCEL_TOKEN missing" });
  }

  try {
    // 1. Kirim file ke Telegram (opsional)
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const buf = Buffer.from(htmlContent, "utf8");
      const form = new FormData();
      form.append("chat_id", TELEGRAM_CHAT_ID);
      form.append("document", buf, { filename: "index.html", contentType: "text/html" });

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
        method: "POST",
        headers: form.getHeaders(),
        body: form,
      });
    }

    // 2. Coba buat project (kalau sudah ada → Vercel skip)
    await fetch("https://api.vercel.com/v10/projects", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: siteName, framework: null }),
    });

    // 3. Deploy ke Vercel
    const payload = {
      name: siteName,
      target: "production",
      files: [
        {
          file: "index.html",
          data: htmlContent,
        },
      ],
      projectSettings: { framework: null },
    };

    const resp = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return res.status(500).json({ error: data?.error?.message || "Deploy gagal" });
    }

    const url = data.url ? `https://${data.url}` : `https://${siteName}.vercel.app`;
    return res.status(200).json({ url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}    const payload = {
      name: siteName,
      project: siteName,
      target: "production",
      files: [{ file: "index.html", data: htmlContent }],
      projectSettings: { framework: null }
    };

    const resp = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();
    if (!resp.ok) return res.status(500).json({ error: data?.error?.message || "Deploy gagal" });

    const url = data.url ? `https://${data.url}` : `https://${siteName}.vercel.app`;
    return res.status(200).json({ url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
