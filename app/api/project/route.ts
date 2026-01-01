// app/api/project/route.ts
import { NextResponse } from "next/server";
import { verifyToken } from "@/app/utils/token";
import type { DecodedToken } from "@/app/utils/token";
import connectToDatabase from "@/app/utils/mongodb";
import Project from "@/app/models/Projects";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

/**
 * StepStatus must match the exact union used in your Mongoose model.
 * Update this list if your schema uses different literals.
 */
type StepStatus =
  | "completed"
  | "Completed"
  | "pending"
  | "done"
  | "in-progress";

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

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60,
  };
}

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const pairs = header.split(";").map((p) => p.trim());
  for (const pair of pairs) {
    const [k, ...rest] = pair.split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

async function resolveToken(authToken: string | null) {
  if (!authToken) return null;
  const maybe = await Promise.resolve(verifyToken(authToken, "AUTH"));
  return (maybe as any) ?? null;
}

const ALLOWED_STEP_STATUSES: StepStatus[] = [
  "completed",
  "Completed",
  "pending",
  "done",
  "in-progress",
];

function normalizeStepStatus(
  input: unknown,
  fallback: StepStatus = "pending"
): StepStatus {
  if (typeof input !== "string") return fallback;
  const cand = input.trim();
  return ALLOWED_STEP_STATUSES.includes(cand as StepStatus)
    ? (cand as StepStatus)
    : fallback;
}

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const authToken =
      parseCookie(cookieHeader, "authToken") ??
      parseCookie(cookieHeader, "refreshToken");

    if (!authToken) {
      return NextResponse.json(
        { ok: false, message: "No user token provided." },
        { status: 401 }
      );
    }

    const tokenRes = (await resolveToken(authToken)) as
      | { decoded?: DecodedToken | null }
      | null
      | undefined;
    const decoded = tokenRes?.decoded ?? null;

    if (!decoded) {
      return NextResponse.json(
        { ok: false, message: "Invalid or expired user auth token." },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const ownerFromToken = {
      name: (decoded as any).name ?? null,
      email: (decoded as any).email ?? null,
      company: (decoded as any).company ?? null,
    };

    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectid")?.trim();

    if (projectId) {
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return NextResponse.json(
          { ok: false, message: "Invalid project id." },
          { status: 400 }
        );
      }

      const project = await Project.findOne({
        _id: projectId,
        userId: (decoded as any).uid,
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
        contactName: project.contactName ?? ownerFromToken.name,
        email: project.email ?? ownerFromToken.email,
        company: project.company ?? ownerFromToken.company,
        owner: ownerFromToken,
      };

      return NextResponse.json(
        { ok: true, project: augmented },
        { status: 200 }
      );
    }

    // pagination & search params
    const rawLimit = url.searchParams.get("limit");
    const rawOffset = url.searchParams.get("offset");
    const q = url.searchParams.get("q")?.trim() || null;

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

    const filter: any = { userId: (decoded as any).uid };

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
      contactName: project.contactName ?? ownerFromToken.name,
      email: project.email ?? ownerFromToken.email,
      company: project.company ?? ownerFromToken.company,
      owner: ownerFromToken,
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
    const authToken =
      parseCookie(cookieHeader, "authToken") ??
      parseCookie(cookieHeader, "refreshToken");

    if (!authToken) {
      return NextResponse.json(
        { ok: false, message: "No user token provided." },
        { status: 401 }
      );
    }

    const tokenRes = (await resolveToken(authToken)) as
      | { decoded?: DecodedToken | null }
      | null
      | undefined;
    const decoded: DecodedToken | null = tokenRes?.decoded ?? null;

    if (!decoded) {
      return NextResponse.json(
        { ok: false, message: "Invalid or expired user auth token." },
        { status: 401 }
      );
    }

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
      typeof payload.company === "string" ? payload.company : null;

    const email =
      typeof payload.email === "string"
        ? payload.email
        : typeof decoded.email === "string"
        ? decoded.email
        : null;

    const contactName =
      typeof payload.contactName === "string"
        ? payload.contactName
        : typeof decoded.name === "string"
        ? decoded.name
        : null;

    const stepsRaw = Array.isArray(payload.steps) ? payload.steps : [];

    if (!title) {
      return NextResponse.json(
        { ok: false, message: "Missing project title (name)." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const userId = decoded.uid;
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

    const created = await Project.create(projectData);

    const createdObj =
      typeof created.toObject === "function" ? created.toObject() : created;
    createdObj.id = createdObj._id?.toString?.() ?? createdObj.id ?? null;
    delete createdObj._id;
    delete createdObj.__v;

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
