import { NextResponse as Response } from 'next/server';

export async function GET(request) {
    const response = Response.json({ message: 'Logged out', ok: 1 });
    response.cookies.set({
        name: 'authToken',
        value: '',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 0,
    });
    response.cookies.set({
        name: 'refreshToken',
        value: '',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 0,
    });
    return response;
}