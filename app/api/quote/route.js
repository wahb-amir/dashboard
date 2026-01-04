import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { generateInternalToken, verifyToken } from "@/app/utils/token";
import axios from "axios";

/**
 * Internal helper to save the quote into MongoDB
 * This calls the GET/POST logic we set up in /api/quote
 */
const saveQuoteInternally = async (payload, uid) => {
  try {
    const internalToken = generateInternalToken(uid);
    
    // Mapping the Form Entries to our Quote Schema
    const quoteData = {
      name: payload.projectTitle || payload.name,
      email: payload.email,
      description: payload.details || payload.description,
      budget: payload.budget ? parseInt(payload.budget.replace(/[^0-9]/g, "")) : 0,
      deadline: payload.deadline,
      status: "pending"
    };

    const response = await axios.post(`${process.env.ORIGIN}/api/quote`, quoteData, {
      headers: {
        'Authorization': `Bearer ${internalToken}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (err) {
    console.error('❌ Error saving quote internally:', err.response?.data || err.message);
    throw err;
  }
}

export async function POST(request) {
  try {
    // --- 1. Authentication ---
    const cookieHeader = request.headers.get("cookie");
    const authToken = request.cookies.get('authToken')?.value || request.cookies.get('refreshToken')?.value;
    
    if (!authToken) {
      return NextResponse.json({ ok: false, message: 'No user auth token provided.' }, { status: 401 });
    }

    const { decoded, newAuthToken } = verifyToken(authToken, "AUTH");
    if (!decoded || !decoded.uid) {
      return NextResponse.json({ ok: false, message: 'Invalid or expired user auth token.' }, { status: 401 });
    }

    const uid = decoded.uid;
    const formData = await request.formData();
    const entries = Object.fromEntries(formData.entries());

    // --- 2. Extract Attachments ---
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

    // --- 3. Build Email Body ---
    const htmlBody = `
      <div style="font-family: sans-serif; padding:20px; border:1px solid #eee; border-radius:10px;">
        <h2 style="color:#2563eb;">📋 New Quote Request Received</h2>
        <p>A user has submitted a new quote request via the dashboard.</p>
        <hr />
        <p><b>Project:</b> ${entries.projectTitle || "—"}</p>
        <p><b>Client:</b> ${entries.contactName || "—"} (${entries.email || "—"})</p>
        <p><b>Budget:</b> ${entries.budget || "—"}</p>
        <p><b>Deadline:</b> ${entries.deadline || "—"}</p>
        <div style="background:#f9fafb; padding:15px; border-radius:5px;">
          <b>Project Details:</b><br/>
          <p>${entries.details || "—"}</p>
        </div>
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
      from: `"Quote System" <${process.env.MAIL_USER}>`,
      to: process.env.MAIL_TO || process.env.MAIL_USER,
      subject: `💬 Quote Request: ${entries.projectTitle || "New Request"}`,
      html: htmlBody,
      attachments,
    });

    // --- 5. Save to Database ---
    const quoteSaveResult = await saveQuoteInternally(entries, uid);

    if (!quoteSaveResult.ok) {
      throw new Error(quoteSaveResult.message || "Failed to save quote to database.");
    }

    // --- 6. Final Response ---
    const response = NextResponse.json({
      ok: 1,
      message: "Quote sent and saved successfully!",
      quote: quoteSaveResult.quote // Return the new quote object to the UI
    });

    // Handle token renewal in response headers if necessary
    if (newAuthToken) {
      response.cookies.set('authToken', newAuthToken, { 
        httpOnly: true, 
        secure: true, 
        sameSite: 'strict', 
        maxAge: 3600 
      });
    }

    return response;

  } catch (err) {
    console.error("❌ Final Route Error:", err);
    return NextResponse.json({ 
      ok: 0, 
      error: err.message || "An error occurred while processing your request." 
    }, { status: 500 });
  }
}