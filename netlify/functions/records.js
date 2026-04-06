import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  const store = getStore({ name: "checklists", consistency: "strong" });
  const url = new URL(req.url);

  if (req.method === "DELETE") {
    const id = url.searchParams.get("id");
    if (!id) return new Response(JSON.stringify({ error: "No id" }), { status: 400 });
    await store.delete(id);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const { blobs } = await store.list();
    const records = await Promise.all(
      blobs.map(async (b) => {
        try { return await store.get(b.key, { type: "json" }); }
        catch { return null; }
      })
    );
    const sorted = records
      .filter(Boolean)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return new Response(JSON.stringify(sorted), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
};

export const config = { path: "/api/records" };
