import express from "express";
import path from "path";

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, "\"")
    .replace(/&rdquo;/g, "\"")
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "—")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

function extractBlocksFromHtml(html: string): { title: string; blocks: { type: string; text: string }[] } {
  // Extract Title
  let title = "Página Web";
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    title = decodeHtmlEntities(titleMatch[1].trim());
  }

  // Strip scripts, styles, head, header, footer, nav, aside
  const cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Find tags
  const blockRegex = /<(h1|h2|h3|h4|h5|h6|p|li)[^>]*>([\s\S]*?)<\/\1>/gi;
  const blocks: { type: string; text: string }[] = [];
  let match;

  while ((match = blockRegex.exec(cleanHtml)) !== null) {
    const type = match[1].toLowerCase();
    const rawText = match[2];
    // Strip nested tags within the block
    const text = decodeHtmlEntities(rawText.replace(/<[^>]+>/g, "").trim());
    if (text.length > 5) {
      blocks.push({ type, text });
    }
  }

  // If no blocks found, parse line by line
  if (blocks.length === 0) {
    const plainText = cleanHtml.replace(/<[^>]+>/g, " ").trim();
    const lines = plainText.split(/\n+/).map(l => l.trim()).filter(l => l.length > 15);
    lines.forEach(line => {
      blocks.push({ type: "p", text: decodeHtmlEntities(line) });
    });
  }

  return { title, blocks };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Serve static assets from /assets/ if present
  app.use("/assets", express.static(path.join(process.cwd(), "assets")));

  // API route to fetch and parse pages
  app.get("/api/fetch-page", async (req, res) => {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ error: "Parâmetro URL é obrigatório" });
    }

    try {
      let targetUrl = url;
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = "https://" + targetUrl;
      }

      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao carregar URL (Status: ${response.status})`);
      }

      const html = await response.text();
      const result = extractBlocksFromHtml(html);
      res.json(result);
    } catch (error: any) {
      console.error("Erro ao processar requisição:", error);
      res.status(500).json({ error: error.message || "Não foi possível acessar a página." });
    }
  });

  // Integration with Vite
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer();
