import { getStore } from "@netlify/blobs";
import nodemailer from "nodemailer";

export default async (req, context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const data = await req.json();
    const id = `checklist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const record = {
      id,
      timestamp: new Date().toISOString(),
      ...data,
    };

    const store = getStore({ name: "checklists", consistency: "strong" });
    await store.setJSON(id, record);

    // Send email if configured
    const emailTo = process.env.NOTIFY_EMAIL;
    if (emailTo && process.env.SMTP_HOST) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const malos = (data.equipo || []).filter((i) => i.valor === "M");
        const malosList =
          malos.length > 0
            ? `<ul style="color:#D95A1E">${malos.map((i) => `<li>${i.nombre}${i.obs ? ` — ${i.obs}` : ""}</li>`).join("")}</ul>`
            : `<p style="color:#00A499">✓ Sin ítems en condición Malo</p>`;

        await transporter.sendMail({
          from: `"Checklist Lomas Bayas" <${process.env.SMTP_USER}>`,
          to: emailTo,
          subject: `Checklist completado — ${data.patente || "Sin patente"} · ${new Date().toLocaleDateString("es-CL")}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
              <div style="background:#00A499;color:white;padding:20px 24px;border-radius:8px 8px 0 0">
                <h2 style="margin:0;font-size:18px">Lista de Verificación — Camionetas</h2>
                <p style="margin:4px 0 0;font-size:13px;opacity:0.85">Lomas Bayas · ${new Date().toLocaleDateString("es-CL")}</p>
              </div>
              <div style="border:1px solid #e5e7eb;border-top:none;padding:20px 24px;border-radius:0 0 8px 8px">
                <table style="width:100%;font-size:14px;border-collapse:collapse">
                  <tr><td style="color:#6b7280;padding:4px 0">Empresa</td><td style="font-weight:500">${data.empresa || "—"}</td></tr>
                  <tr><td style="color:#6b7280;padding:4px 0">Marca / Modelo</td><td style="font-weight:500">${data.marca || "—"} ${data.modelo || ""}</td></tr>
                  <tr><td style="color:#6b7280;padding:4px 0">Placa patente</td><td style="font-weight:500">${data.patente || "—"}</td></tr>
                  <tr><td style="color:#6b7280;padding:4px 0">Kilometraje</td><td style="font-weight:500">${data.km || "—"} km</td></tr>
                  <tr><td style="color:#6b7280;padding:4px 0">Inspector</td><td style="font-weight:500">${data.inspector || "—"}</td></tr>
                  <tr><td style="color:#6b7280;padding:4px 0">Revisor</td><td style="font-weight:500">${data.revisor || "—"}</td></tr>
                </table>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">
                <h3 style="font-size:14px;margin:0 0 10px">Ítems en condición Malo</h3>
                ${malosList}
                ${data.obs_general ? `<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"><h3 style="font-size:14px;margin:0 0 8px">Observaciones generales</h3><p style="font-size:14px;color:#374151">${data.obs_general}</p>` : ""}
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Email error:", emailErr);
      }
    }

    return new Response(JSON.stringify({ ok: true, id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
};

export const config = { path: "/api/submit" };
