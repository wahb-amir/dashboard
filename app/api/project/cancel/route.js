// app/api/projects/route.js  (or wherever this lives)
import { NextResponse, NextResponse as Response } from 'next/server';
import connectToDatabase from '@/app/utils/mongodb';
import { verifyToken } from '@/app/utils/token';
import Project from '@/app/models/Projects';
import User from '@/app/models/User';
export async function PATCH(request) {
  try {
    // auth token (either access or refresh)
    const authToken = request.cookies.get('authToken')?.value || request.cookies.get('refreshToken')?.value;
    if (!authToken) {
      return Response.json({ ok: false, message: 'No user auth token provided.' }, { status: 401 });
    }

    const { decoded, newAuthToken } = verifyToken(authToken, 'AUTH');
    if (!decoded?.uid) {
      return Response.json({ ok: false, message: 'Invalid or expired user auth token.' }, { status: 401 });
    }

    // Ensure mongoose connection is ready for model operations
    await connectToDatabase();
    const userDoc = await User.findById(decode.uid);
    if(!userDoc){
        cookieStore.delete("refreshToken");
            cookieStore.delete("authToken");
        return NextResponse.json({message:"Unauthorized - user not found"},{status:401});
    }
    if(userDoc?.refreshVersion!=decoded.version){  
        cookieStore.delete("refreshToken");
            cookieStore.delete("authToken");
            return NextResponse.json({message:"session revoked"},{status:401})
        }
    const userId = decoded.uid;
    const projectId = request.nextUrl.searchParams.get('projectId');

    if (!projectId) {
      return Response.json({ ok: 0, message: 'Project ID is required.' }, { status: 400 });
    }

    // Use the Mongoose model to delete only if it belongs to the user
    const deletedProject = await Project.findOneAndDelete({ _id: projectId, userId });

    const message = deletedProject ? 'Project cancelled' : 'Project already deleted or not found.';
    const status = 200;

    // Build response and attach renewed auth token cookie if available
    const res = Response.json({ ok: 1, message }, { status });

    if (newAuthToken) {
      res.cookies.set('authToken', newAuthToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60, // 1 hour
      });
    }

    return res;
  } catch (err) {
    console.error('❌ Error in PATCH:', err);
    return Response.json({ ok: 0, message: 'Failed to cancel project.' }, { status: 500 });
  }
}
