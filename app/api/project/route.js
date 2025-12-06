import { NextResponse } from "next/server";
import { verifyToken, validateInternalToken } from "@/app/utils/token";
import connectToDatabase from "@/app/utils/mongodb";
import { v4 as uuidv4 } from "uuid";


function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // 'lax' is a safe default for first-party flows; change to 'none' + secure if cross-site contexts are required
    sameSite: "lax",
    maxAge: 60 * 60, // 1 hour
  };
}

export async function GET(request) {
  try {
    // read token from cookies (works in Next route handlers)
    const authToken = request.cookies.get?.("authToken")?.value || request.cookies.get?.("refreshToken")?.value;
    if (!authToken) {
      return NextResponse.json({ ok: false, message: "No user auth token provided." }, { status: 401 });
    }

    // verify token (your util returns { decoded, newAuthToken })
    const { decoded, newAuthToken } = verifyToken(authToken, "AUTH");
    if (!decoded) {
      return NextResponse.json({ ok: false, message: "Invalid or expired user auth token." }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const projectCollection = db.collection("projects");

    // be explicit about projection if there is sensitive data
    const userProjects = await projectCollection.find({ userId: decoded.uid }).toArray();

    // create response then set cookie (if rotated)
    const response = NextResponse.json({ ok: true, projects: userProjects || [] });
    if (newAuthToken) {
      response.cookies.set("authToken", newAuthToken, cookieOptions());
    }

    return response;
  } catch (err) {
    console.error("❌ Error in GET:", err);
    return NextResponse.json({ ok: false, message: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ ok: false, message: "No auth token provided." }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decode = validateInternalToken(token);
    if (!decode) {
      return NextResponse.json({ ok: false, message: "Invalid or expired auth token." }, { status: 401 });
    }

    if (decode.origin !== process.env.ORIGIN) {
      return NextResponse.json({ ok: false, message: "Invalid token origin." }, { status: 401 });
    }

    const body = await request.json();
    // minimal validation
    const {
      projectTitle: title,
      company,
      dueDate,
      email,
      contactName: name,
      steps = []
    } = body || {};

    if (!title) {
      return NextResponse.json({ ok: false, message: "Missing projectTitle." }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const userId = decode.uid;


    const now = new Date();

    const initialStep = {
      id: uuidv4(),
      step: "Project Created",
      date: now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      status: "Completed",
      notes: `Project created by ${name || "Unknown"}`,
      createdBy: userId,
      createdAt: now.toISOString(),
    };


    // if client provided steps, sanitize and add ids/createdBy/createdAt for each
    const sanitizedSteps = Array.isArray(steps) && steps.length > 0
      ? steps.map(s => ({
        id: s.id || uuidv4(),
        step: s.step || "step",
        data: s.data || {},
        status: s.status || "pending",
        notes: s.notes || "",
        createdBy: userId,
        createdAt: s.createdAt || now.toISOString()
      }))
      : [initialStep];
    const developers = [
      { name: "Wahb", portfolio: "https://wahb.space" },
      { name: "Shahnawaz", portfolio: "https://shahnawaz.buttnetworks.com" }
    ];
    const projectDocument = {
      userId, // keep as string unless converting to ObjectId
      title,
      company: company || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      email: email || null,
      contactName: name || null,
      steps: sanitizedSteps,
      currentFocus: "New quote request received.",
      status: "pending",
      developers: developers?.map(dev => ({
        name: dev.name,
        portfolio: dev.portfolio || null
      })) || [],

      createdAt: now,
      updatedAt: now,
    };


    const insertResult = await db.collection("projects").insertOne(projectDocument);

    if (!insertResult.insertedId) {
      throw new Error("Failed to insert project document.");
    }

    const newProject = {
      _id: insertResult.insertedId.toString(),
      ...projectDocument
    };

    return NextResponse.json({ ok: true, message: "Project saved successfully.", project: newProject }, { status: 201 });
  } catch (err) {
    console.error("❌ Error in POST:", err);
    return NextResponse.json({ ok: false, message: "Internal Server Error" }, { status: 500 });
  }
}
