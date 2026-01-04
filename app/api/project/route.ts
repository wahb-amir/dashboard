// app/api/project/route.ts
import { NextResponse } from "next/server";
import { verifyToken } from "@/app/utils/token";
import type { DecodedToken } from "@/app/utils/token";
import connectToDatabase from "@/app/utils/mongodb";
import Project from "@/app/models/Projects";
import User from "@/app/models/User";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

/**
 * Keep the allowed statuses and the StepStatus type at the top so everything
 * that uses StepStatus has it available (no duplicate declarations).
 */
const ALLOWED_STEP_STATUSES = [
  "completed",
  "Completed",
  "pending",
  "done",
  "in-progress",
] as const;

type StepStatus = (typeof ALLOWED_STEP_STATUSES)[number];

function normalizeStepStatus(
  input: unknown,
  fallback: StepStatus = "pending"
): StepStatus {
  if (typeof input !== "string") return fallback;
  const cand = input.trim();
  return (ALLOWED_STEP_STATUSES as readonly string[]).includes(cand)
    ? (cand as StepStatus)
    : fallback;
}

type StepPayload = {
  id?: string;
  step?: string;
  weekday?: string;
  date?: string;
  data?: Record<string, unknown>;
  status?: StepStatus;
  notes?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string | Date;
};

type ProjectPayload = {
  name: string;
  description?: string | null;
  budget?: number | null;
  deadline?: string | null;
  dueDate?: string | null;
  company?: string | null;
  email?: string | null;
  contactName?: string | null;
  status?: StepStatus;
  steps?: StepPayload[];
};

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const pairs = header.split(";").map((p) => p.trim());
  for (const pair of pairs) {
    const [k, ...rest] = pair.split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export async function validateAndFetchUser(
  refreshToken: string | null
): Promise<
  | { uid: string; user: any; error?: never; redirectTo?: never }
  | { error: NextResponse; redirectTo?: string; uid?: never; user?: never }
  | null
> {
  // If there's an auth token attempt to use it first — but enforce version check
  if (refreshToken) {
    const authRes = verifyToken(refreshToken, "REFRESH");
    if (!authRes?.decoded) {
      const response = NextResponse.json(
        { ok: false, message: "Invalid or expired auth token." },
        { status: 401 }
      );
      response.cookies.delete("authToken");
      response.cookies.delete("refreshToken");
      return { error: response, redirectTo: "login?reason=auth" };
    } else {
      const dec = authRes.decoded as any;
      if (!dec?.uid) {
        const response = NextResponse.json(
          { ok: false, message: "Invalid auth token: missing uid." },
          { status: 401 }
        );
        response.cookies.delete("authToken");
        response.cookies.delete("refreshToken");
        return { error: response, redirectTo: "login?reason=auth" };
      }

      // prefer tokenVersion, fallback to refreshVersion if you used that name
      const tokenVersion =
        typeof dec.version === "number" ? dec.version : undefined;

      const uid = dec.uid as string;

      // Connect DB and fetch user once
      await connectToDatabase();
      const user = await User.findById(uid)
        .select("name email company refreshVersion")
        .lean()
        .exec();

      if (!user) {
        return {
          error: NextResponse.json(
            { ok: false, message: "User not found." },
            { status: 401 }
          ),
        };
      }

      // Immediate revocation check
      if (user.refreshVersion !== tokenVersion) {
        const response = NextResponse.json(
          { ok: false, message: "Auth token revoked." },
          { status: 401 }
        );
        response.cookies.delete("authToken");
        response.cookies.delete("refreshToken");
        return { error: response, redirectTo: "login?reason=auth" };
      }

      // Passed everything
      return { uid, user };
    }
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie");

    const authToken = parseCookie(cookieHeader, "authToken");
    const refreshToken = parseCookie(cookieHeader, "refreshToken");

    if (!authToken && !refreshToken) {
      return NextResponse.json(
        { ok: false, message: "No user token provided." },
        { status: 401 }
      );
    }

    const authResult = await validateAndFetchUser(refreshToken);
    if (!authResult) {
      return NextResponse.json(
        { ok: false, message: "No user token provided." },
        { status: 401 }
      );
    }
    if ("error" in authResult) return authResult.error;

    const { uid, user } = authResult;

    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectid")?.trim();

    if (projectId) {
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return NextResponse.json(
          { ok: false, message: "Invalid project id." },
          { status: 400 }
        );
      }

      // Fetch project AND user already fetched above -> we already have user.
      const project = await Project.findOne({
        _id: projectId,
        userId: uid,
      })
        .lean()
        .exec();

      if (!project) {
        return NextResponse.json(
          { ok: false, message: "Project not found or access denied." },
          { status: 404 }
        );
      }

      const augmented = {
        ...project,
        contactName: project.contactName ?? user.name ?? null,
        email: project.email ?? user.email ?? null,
        company: project.company ?? user.company ?? null,
        owner: {
          name: user.name ?? null,
          email: user.email ?? null,
          company: user.company ?? null,
        },
      };

      return NextResponse.json(
        { ok: true, project: augmented },
        { status: 200 }
      );
    }

    // Pagination & search params
    const urlObj = new URL(request.url);
    const rawLimit = urlObj.searchParams.get("limit");
    const rawOffset = urlObj.searchParams.get("offset");
    const q = urlObj.searchParams.get("q")?.trim() || null;

    const DEFAULT_LIMIT = 5;
    const MAX_LIMIT = 100;
    let limit = DEFAULT_LIMIT;
    let offset = 0;

    if (rawLimit !== null) {
      const parsed = parseInt(rawLimit, 10);
      if (!isNaN(parsed) && parsed > 0) limit = Math.min(MAX_LIMIT, parsed);
    }

    if (rawOffset !== null) {
      const parsed = parseInt(rawOffset, 10);
      if (!isNaN(parsed) && parsed >= 0) offset = parsed;
    }

    const filter: any = { userId: uid };

    if (q) {
      const regex = { $regex: q, $options: "i" };
      filter.$or = [
        { title: regex },
        { name: regex },
        { description: regex },
        { contactName: regex },
        { email: regex },
        { company: regex },
      ];
    }

    // Fetch projects and count in parallel; user already fetched
    const [rows, total] = await Promise.all([
      Project.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(offset)
        .limit(limit)
        .lean()
        .exec(),
      Project.countDocuments(filter),
    ]);

    const augmentedProjects = (rows ?? []).map((project) => ({
      ...project,
      contactName: project.contactName ?? user.name ?? null,
      email: project.email ?? user.email ?? null,
      company: project.company ?? user.company ?? null,
      owner: {
        name: user.name ?? null,
        email: user.email ?? null,
        company: user.company ?? null,
      },
    }));

    return NextResponse.json({
      ok: true,
      projects: augmentedProjects,
      total,
      limit,
      offset,
    });
  } catch (err) {
    console.error("❌ Error in GET /api/project:", err);
    return NextResponse.json(
      { ok: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const authToken = parseCookie(cookieHeader, "authToken");
    const refreshToken = parseCookie(cookieHeader, "refreshToken");

    if (!authToken && !refreshToken) {
      return NextResponse.json(
        { ok: false, message: "No user token provided." },
        { status: 401 }
      );
    }

    const authResult = await validateAndFetchUser(refreshToken);
    if (!authResult) {
      return NextResponse.json(
        { ok: false, message: "No user token provided." },
        { status: 401 }
      );
    }
    if ("error" in authResult) return authResult.error;

    const { uid, user } = authResult;

    const bodyRaw = await request.json().catch(() => null);
    if (!bodyRaw) {
      return NextResponse.json(
        { ok: false, message: "Invalid JSON body." },
        { status: 400 }
      );
    }
    const payload = bodyRaw as Partial<ProjectPayload>;

    const title =
      typeof payload.name === "string" ? payload.name.trim() : undefined;
    const description =
      typeof payload.description === "string" ? payload.description : null;
    const budget = typeof payload.budget === "number" ? payload.budget : null;

    const dueDateStr =
      typeof payload.dueDate === "string"
        ? payload.dueDate
        : typeof payload.deadline === "string"
        ? payload.deadline
        : undefined;

    const company =
      typeof payload.company === "string"
        ? payload.company
        : user.company ?? null;

    // Use user doc for email & contactName (decoded may not include them)
    const email =
      typeof payload.email === "string" ? payload.email : user.email ?? null;

    const contactName =
      typeof payload.contactName === "string"
        ? payload.contactName
        : user.name ?? null;

    const stepsRaw = Array.isArray(payload.steps) ? payload.steps : [];

    if (!title) {
      return NextResponse.json(
        { ok: false, message: "Missing project title (name)." },
        { status: 400 }
      );
    }

    // No need to connect here — validateAndFetchUser already connected and fetched user
    const userId = uid;
    const now = new Date();

    const initialStep: StepPayload = {
      id: uuidv4(),
      step: "Project Created",
      weekday: now.toLocaleDateString("en-US", { weekday: "long" }),
      date: now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      status: normalizeStepStatus("Completed", "Completed"),
      notes: `Project created by ${title}`,
      createdBy: userId,
      createdAt: now,
    };

    const sanitizedSteps: StepPayload[] =
      stepsRaw.length > 0
        ? (stepsRaw.map((s) => ({
            id: typeof s?.id === "string" && s.id ? s.id : uuidv4(),
            step: typeof s?.step === "string" && s.step ? s.step : "Step",
            weekday: typeof s?.weekday === "string" ? s.weekday : undefined,
            date: typeof s?.date === "string" ? s.date : undefined,
            data: s?.data && typeof s.data === "object" ? s.data : {},
            status: normalizeStepStatus(s?.status, "pending"),
            notes: typeof s?.notes === "string" ? s.notes : "",
            createdBy: typeof s?.createdBy === "string" ? s.createdBy : userId,
            createdAt: s?.createdAt ? new Date(s.createdAt) : now,
          })) as StepPayload[])
        : [initialStep];

    const developers = [
      { name: "Wahb", portfolio: "https://wahb.space" },
      { name: "Shahnawaz", portfolio: "https://shahnawaz.buttnetworks.com" },
    ];

    const topStatus = normalizeStepStatus(
      (payload as any).status ?? "pending",
      "pending"
    );

    const projectData = {
      userId,
      title: title.trim(),
      description,
      company: company ?? null,
      dueDate: dueDateStr ? new Date(dueDateStr) : null,
      budget,
      email: email ?? null,
      contactName: contactName ?? null,
      steps: sanitizedSteps,
      currentFocus: "New quote request received.",
      status: topStatus,
      developers: developers.map((d) => ({
        name: d.name,
        portfolio: d.portfolio ?? null,
      })),
      versions: [
        {
          versionId: uuidv4(),
          snapshot: {
            title: title.trim(),
            description,
            company: company ?? null,
            dueDate: dueDateStr ? new Date(dueDateStr) : null,
            budget,
            email: email ?? null,
            contactName: contactName ?? null,
            steps: sanitizedSteps,
            developers: developers.map((d) => ({
              name: d.name,
              portfolio: d.portfolio ?? null,
            })),
            status: topStatus,
            currentFocus: "New quote request received.",
          },
          createdAt: now,
          createdBy: userId,
        },
      ],
    };

    const created = await Project.create(projectData as any);

    const raw =
      typeof created.toObject === "function"
        ? created.toObject()
        : (created as any);

    const { _id, __v, ...rest } = raw;

    const createdObj = {
      ...rest,
      id: _id?.toString?.() ?? null,
    };

    return NextResponse.json(
      { ok: true, message: "Project saved successfully.", project: createdObj },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ Error in POST /api/project:", err);
    return NextResponse.json(
      { ok: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
