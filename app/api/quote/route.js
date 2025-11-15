import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { generateInternalToken, verifyToken } from "@/app/utils/token";
import axios from "axios";

const updateProject = async (payload, uid) => {
  try {
    // Generate token for internal service communication
    const internalToken = generateInternalToken(uid);

    // Call the internal /api/project route to save the data
    const response = await axios.post(`${process.env.ORIGIN}/api/project`, payload, {
      headers: {
        'Authorization': `Bearer ${internalToken}`,
        // Must set Content-Type as JSON for the receiving endpoint
        'Content-Type': 'application/json'
      }
    });

    // The /api/project route returns { ok: true, project: newProject }
    return response.data;
  } catch (err) {
    console.error('❌ Error saving project internally:', err.message);
    // Re-throw the error so it can be caught and handled in the main POST function
    throw err;
  }
}

// Ensure multipart/form-data is handled correctly by converting it to a standard object first
export async function POST(request) {
  try {
    // --- 1. Authentication and Data Parsing ---
    const authToken = request.cookies.get('authToken')?.value || request.cookies.get('refreshToken')?.value;
    if (!authToken) {
      return Response.json({ ok: false, message: 'No user auth token provided.' }, { status: 401 });
    }

    const { decoded, newAuthToken } = verifyToken(authToken, "AUTH");
    if (!decoded || !decoded.uid) {
      return Response.json({ ok: false, message: 'Invalid or expired user auth token.' }, { status: 401 });
    }

    // Optional: handle token renewal if needed
    if (newAuthToken) {
      response.cookies.set('authToken', newAuthToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 60 * 60 });
    }
    const uid = decoded.uid;

    const formData = await request.formData();
    const entries = Object.fromEntries(formData.entries()); // Use this for fields passed to API

    // --- 2. Extract Attachments for Email ---
    const attachments = [];
    for (const [key, value] of formData.entries()) {
      if (key === "attachment" && value instanceof File) {
        const arrayBuffer = await value.arrayBuffer();
        attachments.push({
          filename: value.name,
          content: Buffer.from(arrayBuffer),
        });
      }
    }

    // --- 3. Build Email Body (Omitted for brevity, using existing logic) ---
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; line-height:1.6; color:#333; padding:20px;">
        <h2 style="color:#0070f3;">📋 New Quote request</h2>
        <table style="width:100%; border-collapse: collapse;">
          <tr><td><b>Project Title:</b></td><td>${entries.projectTitle || "—"}</td></tr>
          <tr><td><b>Company:</b></td><td>${entries.company || "—"}</td></tr>
          <tr><td><b>Contact Name:</b></td><td>${entries.contactName || "—"}</td></tr>
          <tr><td><b>Email:</b></td><td>${entries.email || "—"}</td></tr>
          <tr><td><b>Phone:</b></td><td>${entries.phone || "—"}</td></tr>
          <tr><td><b>Project Type:</b></td><td>${entries.projectType || "—"}</td></tr>
          <tr><td><b>Budget:</b></td><td>${entries.budget || "—"}</td></tr>
          <tr><td><b>Deadline:</b></td><td>${entries.deadline || "—"}</td></tr>
          <tr><td><b>Priority:</b></td><td>${entries.priority || "—"}</td></tr>
          <tr><td colspan="2" style="padding-top:10px;"><b>Details:</b><br>
            <pre style="white-space: pre-wrap; background:#f8f9fa; padding:10px; border-radius:5px;">${entries.details || "—"}</pre>
          </td></tr>
        </table>
        <p style="margin-top:20px;">⚡ Sent via your Next.js quote form.</p>
      </div>
    `;

    // --- 4. Send Email ---
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Quote Bot" <${process.env.MAIL_USER}>`,
      to: process.env.MAIL_TO || process.env.MAIL_USER,
      subject: `💬 Quote request: ${entries.projectTitle || "Untitled Project"}`,
      html: htmlBody,
      attachments,
    });

    // --- 5. Save Project Internally and Capture Result ---
    // The entries object is already correctly structured to be sent as JSON body to /api/project
    // updateProject returns { ok: true, message: ..., project: newProject }
    const projectSaveResult = await updateProject(entries, uid);

    // Ensure the internal project save was successful and we got a project object back
    if (!projectSaveResult.ok || !projectSaveResult.project) {
      throw new Error(projectSaveResult.message || "Failed to save project internally.");
    }

    // --- 6. Return Success Response with New Project Data ---
    // The frontend can now use this 'project' object to update its state
    return NextResponse.json({
      ok: 1,
      message: "Quote sent and project saved successfully!",
      project: projectSaveResult.project // 🔑 The newly created project object
    });

  } catch (err) {
    console.error("❌ Quote send error:", err);
    // Ensure the error message is correctly relayed to the client
    return NextResponse.json({ ok: 0, error: err.message || "An unknown error occurred." }, { status: 500 });
  }
}