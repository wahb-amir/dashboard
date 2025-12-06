import { ObjectId } from 'mongodb';
import { NextResponse as Response } from 'next/server';
import connectToDatabase from '@/app/utils/mongodb';
import { verifyToken } from '@/app/utils/token';

export async function PATCH(request) {
    try {
        const authToken = request.cookies.get('authToken')?.value || request.cookies.get('refreshToken')?.value;
        if (!authToken) {
            return Response.json({ ok: false, message: 'No user auth token provided.' }, { status: 401 });
        }

        const { decoded, newAuthToken } = verifyToken(authToken, "AUTH");
        if (!decoded || !decoded.uid) {
            return Response.json({ ok: false, message: 'Invalid or expired user auth token.' }, { status: 401 });
        }

        // Optional: handle token renewal
        if (newAuthToken) {
            const res = Response.json({ ok: true });
            res.cookies.set('authToken', newAuthToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: 'strict',
                maxAge: 60 * 60
            });
        }

        const { db } = await connectToDatabase();
        const userId = decoded.uid;
        const projectId = request.nextUrl.searchParams.get('projectId');

        if (!projectId) {
            return Response.json({ ok: 0, message: "Project ID is required." }, { status: 400 });
        }

        const projectCollection = db.collection('projects');

        // Delete only if _id and userId match
        const deleteResult = await projectCollection.deleteOne({
            _id: new ObjectId(projectId),
            userId: userId
        });

        // Return success even if it was already deleted
        
        if (deleteResult.deletedCount === 0) {
            return Response.json({ ok: 1, message: "Project already deleted or not found." }, { status: 200 });
        }

        return Response.json({ ok: 1, message: "Project cancelled" }, { status: 200 });

    } catch (err) {
        console.error('❌ Error in PATCH:', err.message);
        return Response.json({ ok: 0, message: "Failed to cancel project." }, { status: 500 });
    }
}
